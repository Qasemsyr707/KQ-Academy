import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { AiError } from '@/lib/ai-provider';
import {
  AI_PDF_MAX_BYTES, generateQuestionsFromPdf, inspectPdf, limitGeneration, parseGenerationOptions, QuizGenerationError,
} from '@/lib/ai-quiz-generator';

export const runtime = 'nodejs';
export const maxDuration = 300;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const MULTIPART_LIMIT = AI_PDF_MAX_BYTES + 64 * 1024;

async function readForm(req: Request): Promise<FormData> {
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data;')) throw new QuizGenerationError(400, 'أرسل الملف كطلب رفع صالح');
  if (Number(req.headers.get('content-length')) > MULTIPART_LIMIT) { await req.body?.cancel().catch(() => undefined); throw new QuizGenerationError(413, `الحد الأقصى لملف التوليد ${AI_PDF_MAX_BYTES / 1024 / 1024} MiB`); }
  if (!req.body) throw new QuizGenerationError(400, 'الملف مفقود');
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MULTIPART_LIMIT) { await reader.cancel().catch(() => undefined); throw new QuizGenerationError(413, `الحد الأقصى لملف التوليد ${AI_PDF_MAX_BYTES / 1024 / 1024} MiB`); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return await new Response(Buffer.concat(chunks, size), { headers: { 'Content-Type': req.headers.get('content-type')! } }).formData(); }
  catch { throw new QuizGenerationError(400, 'بيانات الطلب غير صالحة'); }
}

/**
 * POST multipart: file (PDF), courseId, count (default 50, max 100), difficulty, language.
 * Returns generated questions for the instructor to review and edit. Nothing is saved here:
 * the reviewed questions are saved through /api/quizzes/create like any other quiz.
 */
export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER'], 'COURSES');
    const form = await readForm(req);
    const courseId = form.get('courseId');
    if (typeof courseId !== 'string' || !courseId || courseId.length > 200) throw new QuizGenerationError(400, 'اختر الكورس');
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
    if (!course) throw new QuizGenerationError(404, 'الكورس غير موجود');
    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) throw new QuizGenerationError(403, 'لا تملك صلاحية إدارة هذا الكورس');
    const options = parseGenerationOptions({ count: form.get('count'), difficulty: form.get('difficulty'), language: form.get('language') });
    const file = form.get('file');
    if (!file || typeof file === 'string' || form.getAll('file').length !== 1) throw new QuizGenerationError(400, 'أرفق ملف PDF واحداً');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { pages } = await inspectPdf(bytes, file.name || '', file.type || '');
    if (!process.env.GEMINI_API_KEY?.trim()) throw new AiError(503, 'المساعد الذكي غير مفعّل حالياً على المنصة (لم يُضبط مفتاح الخدمة GEMINI_API_KEY).');
    limitGeneration(user.id);
    const result = await generateQuestionsFromPdf(bytes, { ...options, pages });
    return NextResponse.json({ ...result, reviewed: false }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof QuizGenerationError || error instanceof AiError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers });
    }
    console.error('[ai quiz from pdf]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'تعذّر توليد الأسئلة من الملف' }, { status: 500, headers });
  }
}
