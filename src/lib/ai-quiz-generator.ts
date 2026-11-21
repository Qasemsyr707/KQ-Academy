import { PDFDocument } from 'pdf-lib';
import { DocumentValidationError, validatePdfBytes } from '@/lib/document-validation';
import { AiError, generateStructured } from '@/lib/ai-provider';
import { consume } from '@/lib/rate-limit';

/**
 * PDF -> multiple-choice questions, for an instructor to review before anything is saved.
 *
 * The real PDF bytes are sent to Gemini (native PDF understanding: text and scanned pages). Questions
 * come back in batches as schema-constrained JSON; every question is validated and de-duplicated on
 * the server. The result says exactly how many valid questions were produced and why there are
 * fewer than requested, if so. Nothing is written to the database here.
 */
// Gemini accepts inline requests up to 20 MB; base64 adds a third, so the PDF itself stays below 14 MiB.
export const AI_PDF_MAX_BYTES = 14 * 1024 * 1024;
export const AI_PDF_MAX_PAGES = 300;
export const DEFAULT_QUESTION_COUNT = 50;
export const MAX_QUESTION_COUNT = 100;
export const BATCH_SIZE = 10;
const MAX_RETRIES_PER_BATCH = 2;
const MAX_EMPTY_BATCHES = 2;
const GENERATION_RULE = { name: 'ai-pdf-quiz', burst: 3, perMinute: 0.3 } as const;

export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type Language = 'ar' | 'en';
export type GeneratedQuestion = { text: string; options: string[]; correctAnswer: number; points: number };
export type GenerationResult = {
  questions: GeneratedQuestion[]; requested: number; generated: number; pages: number;
  batches: number; rejected: number; duplicates: number; limitation: string | null;
};

export class QuizGenerationError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/** Real PDF (signature, complete, parses, not encrypted, has pages), within the size and page limits. */
export async function inspectPdf(bytes: Uint8Array, name: string, declaredType: string): Promise<{ pages: number }> {
  if (!bytes.length) throw new QuizGenerationError(400, 'الملف فارغ');
  if (bytes.length > AI_PDF_MAX_BYTES) throw new QuizGenerationError(413, `الحد الأقصى لملف التوليد ${AI_PDF_MAX_BYTES / 1024 / 1024} MiB`);
  const declared = declaredType.split(';')[0].trim().toLowerCase();
  if (declared && declared !== 'application/pdf' && declared !== 'application/octet-stream') throw new QuizGenerationError(415, 'يُقبل ملف PDF فقط');
  if (!/\.pdf$/i.test(name)) throw new QuizGenerationError(415, 'يُقبل ملف PDF فقط (امتداد ‎.pdf)');
  try { await validatePdfBytes(bytes); }
  catch (error) { if (error instanceof DocumentValidationError) throw new QuizGenerationError(error.status, error.message); throw error; }
  const pages = (await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount();
  if (pages > AI_PDF_MAX_PAGES) throw new QuizGenerationError(413, `الملف يحتوي ${pages} صفحة؛ الحد الأقصى ${AI_PDF_MAX_PAGES}. قسّمه إلى أجزاء.`);
  return { pages };
}

export function parseGenerationOptions(input: { count?: unknown; difficulty?: unknown; language?: unknown }) {
  const raw = input.count === undefined || input.count === null || input.count === '' ? DEFAULT_QUESTION_COUNT : Number(input.count);
  if (!Number.isInteger(raw) || raw < 1 || raw > MAX_QUESTION_COUNT) throw new QuizGenerationError(400, `عدد الأسئلة بين 1 و${MAX_QUESTION_COUNT}`);
  const difficulty = (['easy', 'medium', 'hard', 'mixed'] as const).find(d => d === input.difficulty) ?? 'mixed';
  const language = input.language === 'en' ? 'en' : 'ar';
  return { count: raw, difficulty, language } as { count: number; difficulty: Difficulty; language: Language };
}

/** Per-user cap: a PDF generation is expensive (several large provider calls). */
export function limitGeneration(userId: string) {
  const result = consume(GENERATION_RULE, userId);
  if (!result.allowed) throw new QuizGenerationError(429, `وصلت إلى حد التوليد المؤقت؛ حاول بعد ${Math.max(1, Math.ceil(result.retryAfter / 60))} دقيقة.`);
}

const normalize = (value: string) => value.normalize('NFKC').toLowerCase()
  .replace(/[ً-ٰٟـ]/g, '').replace(/[آأإ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** A usable question or the reason it is not. Options are trimmed; duplicates inside one question are refused. */
export function validateGeneratedQuestion(raw: unknown): GeneratedQuestion | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  if (typeof q.text !== 'string') return null;
  const text = q.text.trim();
  if (text.length < 8 || text.length > 2000) return null;
  if (!Array.isArray(q.options)) return null;
  const options = q.options.map(o => (typeof o === 'string' ? o.trim() : ''));
  if (options.length < 2 || options.length > 8 || options.some(o => !o || o.length > 500)) return null;
  if (new Set(options.map(normalize)).size !== options.length) return null;
  const correct = Number(q.correctAnswer);
  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
  return { text, options, correctAnswer: correct, points: 1 };
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    insufficientContent: { type: 'BOOLEAN', description: 'true when the document has no further material for new, distinct questions' },
    note: { type: 'STRING', description: 'short reason when fewer questions than requested are returned' },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctAnswer: { type: 'INTEGER', description: 'zero-based index of the correct option' },
        },
        required: ['text', 'options', 'correctAnswer'],
      },
    },
  },
  required: ['questions', 'insufficientContent'],
} as const;

const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  easy: 'easy (direct recall of facts stated in the document)',
  medium: 'medium (understanding and applying the document\'s ideas)',
  hard: 'hard (analysis, comparison and multi-step reasoning based on the document)',
  mixed: 'a mix of easy, medium and hard',
};

function prompt(batch: number, difficulty: Difficulty, language: Language, avoid: string[]) {
  const lang = language === 'ar' ? 'Modern Standard Arabic' : 'English';
  return [
    `Write exactly ${batch} new multiple-choice exam questions based ONLY on the attached PDF document.`,
    `Language: ${lang}. Difficulty: ${DIFFICULTY_TEXT[difficulty]}.`,
    'Rules:',
    '- Every question must be answerable from the document itself. Never use outside knowledge and never invent facts, numbers or names.',
    '- Exactly 4 options per question, exactly one correct; distractors must be plausible and clearly wrong according to the document.',
    '- correctAnswer is the zero-based index of the correct option. Vary its position.',
    '- Do not repeat or paraphrase any question listed under "Already written".',
    '- If the document does not contain enough distinct material, return fewer questions (or none), set insufficientContent to true and explain briefly in note.',
    '- If the document is unreadable, empty, or not educational material, return no questions and set insufficientContent to true.',
    avoid.length ? `Already written (do not repeat):\n${avoid.map(t => `- ${t}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

type BatchCaller = (parts: Parameters<typeof generateStructured>[0], schema: object) => Promise<{ json: unknown; truncated: boolean }>;

export async function generateQuestionsFromPdf(
  pdf: Uint8Array,
  options: { count: number; difficulty: Difficulty; language: Language; pages: number },
  call: BatchCaller = (parts, schema) => generateStructured(parts, schema, { temperature: 0.4 }),
): Promise<GenerationResult> {
  const data = Buffer.from(pdf).toString('base64');
  const questions: GeneratedQuestion[] = [];
  const seen = new Set<string>();
  let rejected = 0, duplicates = 0, batches = 0, emptyBatches = 0;
  let limitation: string | null = null;
  const maxBatches = Math.ceil(options.count / BATCH_SIZE) + 3;

  while (questions.length < options.count && batches < maxBatches) {
    const want = Math.min(BATCH_SIZE, options.count - questions.length);
    const avoid = questions.slice(-60).map(q => q.text.slice(0, 140));
    let result: { json: unknown; truncated: boolean } | null = null;
    let lastError: unknown = null;
    let size = want;
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_BATCH; attempt++) {
      batches++;
      try {
        result = await call([{ inline_data: { mime_type: 'application/pdf', data } }, { text: prompt(size, options.difficulty, options.language, avoid) }], SCHEMA);
      } catch (error) {
        // A missing or rejected key will not fix itself: report it at once.
        if (error instanceof AiError && /GEMINI_API_KEY|مفتاح/.test(error.message)) throw error;
        lastError = error; result = null;
        continue;
      }
      // Truncated or malformed output: retry the same batch smaller.
      if (result.truncated || !result.json || typeof result.json !== 'object') { size = Math.max(3, Math.ceil(size / 2)); result = null; continue; }
      break;
    }
    if (!result) {
      // Nothing generated at all: the caller gets the provider's real error, never an empty "success".
      if (questions.length === 0 && lastError instanceof AiError) throw lastError;
      if (questions.length === 0) throw new QuizGenerationError(502, 'لم تُرجع خدمة الذكاء الاصطناعي أسئلة صالحة لهذا الملف');
      limitation = lastError instanceof Error ? `توقف التوليد: ${lastError.message}` : 'تعذّر الحصول على إجابة صالحة من خدمة الذكاء الاصطناعي';
      break;
    }

    const body = result.json as { questions?: unknown; insufficientContent?: unknown; note?: unknown };
    let added = 0;
    for (const raw of Array.isArray(body.questions) ? body.questions : []) {
      const q = validateGeneratedQuestion(raw);
      if (!q) { rejected++; continue; }
      const key = normalize(q.text);
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key); questions.push(q); added++;
      if (questions.length >= options.count) break;
    }
    if (body.insufficientContent === true && questions.length < options.count) {
      limitation = typeof body.note === 'string' && body.note.trim()
        ? `محتوى الملف لا يكفي لمزيد من الأسئلة المختلفة: ${body.note.trim().slice(0, 300)}`
        : 'محتوى الملف لا يكفي لمزيد من الأسئلة المختلفة';
      break;
    }
    if (added === 0 && ++emptyBatches >= MAX_EMPTY_BATCHES) { limitation ??= 'لم تُنتج الدفعات الأخيرة أسئلة جديدة صالحة'; break; }
  }
  if (questions.length < options.count && !limitation) limitation = 'بلغ التوليد الحد الأقصى من المحاولات قبل الوصول للعدد المطلوب';
  return {
    questions: questions.slice(0, options.count), requested: options.count, generated: Math.min(questions.length, options.count),
    pages: options.pages, batches, rejected, duplicates, limitation: questions.length >= options.count ? null : limitation,
  };
}
