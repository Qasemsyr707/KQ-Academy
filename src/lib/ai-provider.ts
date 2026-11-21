import { consume, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

/**
 * Google Gemini, called from the server only (the key never reaches the browser).
 * The model is configurable (GEMINI_MODEL); the default is a current, supported model.
 * Nothing is simulated: without a key, or when the provider fails, the caller gets an honest error.
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const AI_RULE = { name: 'ai', burst: 10, perMinute: 6 } as const;

export class AiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function aiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured && /^[a-z0-9.-]{3,60}$/i.test(configured) ? configured : DEFAULT_GEMINI_MODEL;
}

/** Per-user limit so the platform key cannot be drained by one account. */
export function limitAi(userId: string) {
  const result = consume(AI_RULE, userId);
  if (!result.allowed) throw new AiError(429, RATE_LIMIT_MESSAGE);
}

type Turn = { role: 'user' | 'model'; text: string };

export async function generate(turns: Turn[], options: { system?: string; maxOutputTokens?: number; temperature?: number } = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError(503, 'المساعد الذكي غير مفعّل حالياً على المنصة (لم يُضبط مفتاح الخدمة).');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiModel())}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
      contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
      generationConfig: { maxOutputTokens: options.maxOutputTokens ?? 2000, temperature: options.temperature ?? 0.7 },
    }),
  }).catch(() => null);
  if (!response) throw new AiError(503, 'تعذّر الوصول إلى خدمة الذكاء الاصطناعي، حاول بعد قليل.');
  if (!response.ok) {
    console.error('[ai] provider error', response.status);
    throw new AiError(503, response.status === 429 ? 'خدمة الذكاء الاصطناعي مشغولة حالياً، حاول بعد قليل.' : 'تعذّرت معالجة الطلب لدى خدمة الذكاء الاصطناعي.');
  }
  const data = await response.json().catch(() => null) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
  if (!text) throw new AiError(502, 'لم تُرجع خدمة الذكاء الاصطناعي إجابة.');
  return text;
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
export type StructuredResult = { json: unknown; truncated: boolean };

/**
 * One Gemini call that must answer JSON matching `schema` (Gemini structured output).
 * Used with a PDF part: Gemini reads the document's real pages (text and scanned images).
 * Throws AiError on a missing key or a provider failure; never fabricates a result.
 */
export async function generateStructured(parts: Part[], schema: object, options: { system?: string; maxOutputTokens?: number; temperature?: number; timeoutMs?: number } = {}): Promise<StructuredResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError(503, 'المساعد الذكي غير مفعّل حالياً على المنصة (لم يُضبط مفتاح الخدمة GEMINI_API_KEY).');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(aiModel())}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(options.timeoutMs ?? 120_000),
    body: JSON.stringify({
      ...(options.system ? { systemInstruction: { parts: [{ text: options.system }] } } : {}),
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: options.maxOutputTokens ?? 16_384, temperature: options.temperature ?? 0.4,
        responseMimeType: 'application/json', responseSchema: schema,
      },
    }),
  }).catch(() => null);
  if (!response) throw new AiError(503, 'تعذّر الوصول إلى خدمة الذكاء الاصطناعي أو انتهت مهلة الطلب.');
  if (!response.ok) {
    console.error('[ai] provider error', response.status);
    if (response.status === 429) throw new AiError(503, 'خدمة الذكاء الاصطناعي مشغولة حالياً أو تجاوزت حصتها، حاول بعد قليل.');
    if (response.status === 400) throw new AiError(422, 'رفضت خدمة الذكاء الاصطناعي هذا الملف أو الطلب (قد يكون الملف كبيراً جداً أو غير مقروء).');
    if (response.status === 401 || response.status === 403) throw new AiError(503, 'مفتاح خدمة الذكاء الاصطناعي غير صالح أو لا يملك صلاحية هذا النموذج.');
    throw new AiError(503, 'تعذّرت معالجة الطلب لدى خدمة الذكاء الاصطناعي.');
  }
  const data = await response.json().catch(() => null) as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[]; promptFeedback?: { blockReason?: string } } | null;
  if (data?.promptFeedback?.blockReason) throw new AiError(422, 'رفضت خدمة الذكاء الاصطناعي معالجة محتوى هذا الملف.');
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map(p => p.text ?? '').join('').trim();
  const truncated = candidate?.finishReason === 'MAX_TOKENS';
  if (!text) throw new AiError(502, 'لم تُرجع خدمة الذكاء الاصطناعي إجابة.');
  try { return { json: JSON.parse(text), truncated }; }
  catch { return { json: null, truncated: true }; }
}
