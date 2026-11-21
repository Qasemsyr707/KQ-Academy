import type { Prisma, PrismaClient } from '@prisma/client';

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Chapter quizzes and the course final exam.
 *
 * A quiz has two independent switches:
 *   - isPublished: students can take it (practice or requirement).
 *   - requiredForCertificate: passing it is needed for the certificate.
 * A quiz counts as a certificate requirement only when it is required, published and can be
 * taken (an automatic quiz with questions, or a file quiz), so an unpublished or empty exam
 * never blocks anyone. Quizzes that existed before this release keep the old rule (required,
 * published, requiredSince null). When an instructor turns the requirement on later,
 * requiredSince records that moment and students enrolled before it are not held to it.
 */
export const COURSE_SELECT = { id: true, instructorId: true, status: true, price: true, priceSYP: true, title: true } as const;

export const QUIZ_CONTEXT_SELECT = {
  id: true, scoringVersion: true, title: true, kind: true, type: true, passingScore: true, totalMarks: true, isPublished: true,
  requiredForCertificate: true, requiredSince: true, maxAttempts: true, instructions: true, fileUrl: true, chapterId: true,
  chapter: { select: { isFree: true, course: { select: COURSE_SELECT } } },
  course: { select: COURSE_SELECT },
} as const satisfies Prisma.QuizSelect;

type QuizCourse = { id: string; instructorId: string; status: string; price: number; priceSYP: number; title: string };
type QuizWithContext = { chapter: { isFree: boolean; course: QuizCourse } | null; course: QuizCourse | null };

/** The course a quiz belongs to: through its chapter, or directly for the final exam. */
export function quizCourse(quiz: QuizWithContext): QuizCourse {
  const course = quiz.chapter?.course ?? quiz.course;
  if (!course) throw new Error('Quiz without a course');
  return course;
}

/** Free preview applies to chapter quizzes of free chapters or free courses; a final exam needs enrollment unless the course is free. */
export function quizPublicPreview(quiz: QuizWithContext): boolean {
  const course = quizCourse(quiz);
  return course.status === 'PUBLISHED' && (!!quiz.chapter?.isFree || (course.price === 0 && course.priceSYP === 0));
}

type RequirementQuiz = {
  id: string; title: string; kind: string; type: string; isPublished: boolean; requiredForCertificate: boolean;
  requiredSince: Date | null; _count: { questions: number };
};

/** Whether this quiz is a certificate requirement for a student enrolled at `enrolledAt`. */
export function isCertificateRequirement(quiz: RequirementQuiz, enrolledAt: Date | null): boolean {
  if (!quiz.requiredForCertificate || !quiz.isPublished) return false;
  if (quiz.type === 'AUTOMATIC' && quiz._count.questions === 0) return false;
  if (quiz.type !== 'AUTOMATIC' && quiz.type !== 'MANUAL_FILE') return false;
  // Versioned requirement: not imposed on students who enrolled before it existed.
  if (quiz.requiredSince && enrolledAt && enrolledAt < quiz.requiredSince) return false;
  return true;
}

const REQUIREMENT_SELECT = {
  id: true, title: true, kind: true, type: true, isPublished: true, requiredForCertificate: true, requiredSince: true,
  _count: { select: { questions: true } },
} as const;

export interface CertificateChecklist {
  lessons: { completed: number; total: number; done: boolean };
  chapterQuizzes: { id: string; title: string; passed: boolean }[];
  finalExam: { id: string; title: string; status: 'PASSED' | 'PENDING' } | { status: 'NOT_REQUIRED' };
  eligible: boolean;
}

/** All quizzes of a course: chapter quizzes and the final exam. */
export async function courseQuizzes(db: Db, courseId: string) {
  return db.quiz.findMany({
    where: { OR: [{ chapter: { courseId } }, { courseId, kind: 'FINAL' }] },
    select: REQUIREMENT_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

export async function enrollmentDate(db: Db, userId: string, courseId: string): Promise<Date | null> {
  const enrollment = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } }, select: { createdAt: true } });
  return enrollment?.createdAt ?? null;
}

export function buildChecklist(
  lessons: { completed: number; total: number },
  requirements: RequirementQuiz[],
  passedQuizIds: Set<string>,
): CertificateChecklist {
  const chapterQuizzes = requirements.filter(q => q.kind !== 'FINAL').map(q => ({ id: q.id, title: q.title, passed: passedQuizIds.has(q.id) }));
  const final = requirements.find(q => q.kind === 'FINAL');
  const finalExam = final ? { id: final.id, title: final.title, status: passedQuizIds.has(final.id) ? 'PASSED' as const : 'PENDING' as const }
    : { status: 'NOT_REQUIRED' as const };
  // A course with nothing to complete never makes a certificate (as before).
  const lessonsDone = lessons.completed === lessons.total && (lessons.total > 0 || requirements.length > 0);
  const eligible = lessonsDone && chapterQuizzes.every(q => q.passed) && finalExam.status !== 'PENDING';
  return { lessons: { ...lessons, done: lessonsDone }, chapterQuizzes, finalExam, eligible };
}

export class ExamError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export interface QuestionInput { text: string; options: string[]; correctAnswer: number; points: number }

/** Validated multiple-choice questions from an instructor form. */
export function parseQuestions(value: unknown): QuestionInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) throw new ExamError(400, 'أضف سؤالاً واحداً على الأقل (200 كحد أقصى)');
  return value.map((raw, index) => {
    const q = raw as Record<string, unknown>;
    const n = index + 1;
    if (!q || typeof q.text !== 'string' || !q.text.trim() || q.text.length > 2000) throw new ExamError(400, `نص السؤال ${n} غير صالح`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8
      || q.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 500)) throw new ExamError(400, `خيارات السؤال ${n} غير صالحة (2 إلى 8 خيارات)`);
    const correct = Number(q.correctAnswer);
    if (!Number.isInteger(correct) || correct < 0 || correct >= q.options.length) throw new ExamError(400, `حدد الإجابة الصحيحة للسؤال ${n}`);
    const points = q.points === undefined || q.points === '' ? 1 : Number(q.points);
    if (!Number.isFinite(points) || points <= 0 || points > 100) throw new ExamError(400, `علامة السؤال ${n} غير صالحة`);
    return { text: q.text.trim(), options: (q.options as string[]).map(o => o.trim()), correctAnswer: correct, points };
  });
}

/** Quiz settings from an instructor form. The pass mark is entered as a percentage and stored in points. */
export function parseSettings(body: Record<string, unknown>, totalPoints: number) {
  const percent = body.passingPercent === undefined ? 50 : Number(body.passingPercent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new ExamError(400, 'نسبة النجاح يجب أن تكون بين 1 و100');
  let maxAttempts: number | null = null;
  if (body.maxAttempts !== undefined && body.maxAttempts !== null && body.maxAttempts !== '' && body.maxAttempts !== 0) {
    const value = Number(body.maxAttempts);
    if (!Number.isInteger(value) || value < 1 || value > 100) throw new ExamError(400, 'عدد المحاولات يجب أن يكون بين 1 و100 (أو فارغاً لغير محدود)');
    maxAttempts = value;
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 200) throw new ExamError(400, 'عنوان الاختبار مطلوب');
  const instructions = typeof body.instructions === 'string' && body.instructions.trim() ? body.instructions.trim().slice(0, 5000) : null;
  return {
    title, instructions, maxAttempts,
    isPublished: body.isPublished === true,
    requiredForCertificate: body.requiredForCertificate === true,
    passingScore: Math.round((percent / 100) * totalPoints * 100) / 100,
    // Saving the settings form moves a quiz to the instructor's pass mark.
    scoringVersion: 2,
    totalMarks: totalPoints,
  };
}

export const passingPercent = (quiz: { passingScore: number; totalMarks: number | null }) =>
  quiz.totalMarks ? Math.round((quiz.passingScore / quiz.totalMarks) * 100) : 50;
