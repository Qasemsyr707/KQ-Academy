import type { Prisma } from '@prisma/client';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { paymentBody, paymentId } from '@/lib/payments/wallet-operations';
import { rewardFirstQuizPass } from '@/lib/reward-events';

const quizSelect = {
  id: true, type: true, passingScore: true, totalMarks: true,
  questions: { select: { id: true, correctAnswer: true, points: true, options: true } },
  chapter: { select: { isFree: true, course: { select: { id: true, instructorId: true, status: true, price: true, priceSYP: true } } } },
} as const satisfies Prisma.QuizSelect;
type Quiz = Prisma.QuizGetPayload<{ select: typeof quizSelect }>;

async function requireQuizAccess(tx: Prisma.TransactionClient, userId: string, quiz: Quiz) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isBanned: true } });
  if (!user || user.isBanned) throw new CheckoutError(401, 'يرجى تسجيل الدخول');
  const course = quiz.chapter.course;
  const manager = ['ADMIN', 'OWNER'].includes(user.role) || (user.role === 'INSTRUCTOR' && userId === course.instructorId);
  const preview = course.status === 'PUBLISHED' && (quiz.chapter.isFree || (course.price === 0 && course.priceSYP === 0));
  if (manager || preview) return;
  const enrolled = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } }, select: { id: true } });
  if (!enrolled) throw new CheckoutError(403, 'هذا الاختبار متاح للمشتركين في الكورس فقط');
}

function calculateScore(quiz: Quiz, input: unknown, legacy: boolean) {
  const answers = paymentBody(input);
  if (!quiz.questions.length || Object.keys(answers).some(id => !quiz.questions.some(q => q.id === id))) throw new CheckoutError(400, 'بيانات الإجابة غير صالحة');
  let score = 0;
  let correct = 0;
  let total = 0;
  for (const question of quiz.questions) {
    const options: unknown = JSON.parse(question.options);
    const points = question.points || 1;
    if (!Array.isArray(options) || options.length < 2 || !Number.isInteger(question.correctAnswer)
      || question.correctAnswer < 0 || question.correctAnswer >= options.length || !Number.isFinite(points) || points <= 0) throw new CheckoutError(409, 'إعدادات الاختبار غير صالحة');
    const answer = answers[question.id];
    if (answer !== undefined && (typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer >= options.length)) throw new CheckoutError(400, 'بيانات الإجابة غير صالحة');
    total += points;
    if (answer === question.correctAnswer) { score += points; correct++; }
  }
  if (legacy) return { score: correct / quiz.questions.length * 100, passed: correct / quiz.questions.length >= 0.5, total: 100 };
  if (!Number.isFinite(total) || !Number.isFinite(quiz.passingScore) || quiz.passingScore <= 0 || quiz.passingScore > total) throw new CheckoutError(409, 'إعدادات الاختبار غير صالحة');
  return { score, passed: score >= quiz.passingScore, total: quiz.totalMarks || total };
}

export async function submitQuiz(userId: string, quizId: string, input: Record<string, unknown>, legacy = false) {
  if (!paymentId(quizId)) throw new CheckoutError(400, 'الاختبار غير صالح');
  return withPaymentTransaction(async tx => {
    const quiz = await tx.quiz.findUnique({ where: { id: quizId }, select: quizSelect });
    if (!quiz) throw new CheckoutError(404, 'الاختبار غير موجود');
    await requireQuizAccess(tx, userId, quiz);
    if (quiz.type === 'MANUAL_FILE') {
      if (typeof input.answerFileUrl !== 'string' || !input.answerFileUrl) throw new CheckoutError(400, 'يجب إرفاق ملف الإجابة');
      await tx.quizAttempt.create({ data: { userId, quizId, score: null, passed: false, status: 'PENDING_GRADING', answerFileUrl: input.answerFileUrl } });
      return { status: 'PENDING_GRADING' as const, message: 'تم استلام الإجابة بنجاح وهي قيد المراجعة' };
    }
    if (quiz.type !== 'AUTOMATIC') throw new CheckoutError(400, 'نوع الاختبار غير صالح');
    const result = calculateScore(quiz, input.answers, legacy);
    if (result.passed && !legacy) await rewardFirstQuizPass(tx, userId, quizId);
    const attempt = await tx.quizAttempt.create({ data: { userId, quizId, score: result.score, passed: result.passed, status: 'COMPLETED' } });
    return { attempt, total: result.total };
  });
}

export async function gradeQuiz(graderId: string, attemptId: string, score: unknown) {
  if (!paymentId(attemptId) || typeof score !== 'number' || !Number.isFinite(score) || score < 0) throw new CheckoutError(400, 'البيانات غير مكتملة');
  return withPaymentTransaction(async tx => {
    const grader = await tx.user.findUnique({ where: { id: graderId }, select: { role: true, isBanned: true } });
    if (!grader || grader.isBanned || !['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(grader.role)) throw new CheckoutError(403, 'غير مصرح لك بإجراء هذه العملية');
    const attempt = await tx.quizAttempt.findUnique({ where: { id: attemptId }, include: { quiz: { select: quizSelect } } });
    if (!attempt) throw new CheckoutError(404, 'محاولة الاختبار غير موجودة');
    if (grader.role === 'INSTRUCTOR' && attempt.quiz.chapter.course.instructorId !== graderId) throw new CheckoutError(403, 'لا تملك صلاحية تصحيح هذا الاختبار');
    if (attempt.quiz.type !== 'MANUAL_FILE' || !Number.isFinite(attempt.quiz.totalMarks) || !attempt.quiz.totalMarks
      || score > attempt.quiz.totalMarks || !Number.isFinite(attempt.quiz.passingScore) || attempt.quiz.passingScore <= 0
      || attempt.quiz.passingScore > attempt.quiz.totalMarks) throw new CheckoutError(400, 'العلامة غير صالحة');
    if (attempt.status === 'COMPLETED') {
      if (attempt.score !== score) throw new CheckoutError(409, 'تم تصحيح هذه المحاولة سابقاً');
      return { passed: attempt.passed };
    }
    if (attempt.status !== 'PENDING_GRADING') throw new CheckoutError(409, 'حالة المحاولة غير صالحة');
    const passed = score >= attempt.quiz.passingScore;
    if (passed) await rewardFirstQuizPass(tx, attempt.userId, attempt.quizId);
    const changed = await tx.quizAttempt.updateMany({ where: { id: attemptId, status: 'PENDING_GRADING' }, data: { score, passed, status: 'COMPLETED' } });
    if (changed.count !== 1) throw new CheckoutError(409, 'العملية قيد المعالجة');
    return { passed };
  });
}
