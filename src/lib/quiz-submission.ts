import type { Prisma } from '@prisma/client';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { withPaymentTransaction } from '@/lib/payments/transactions';
import { paymentBody, paymentId } from '@/lib/payments/wallet-operations';
import { rewardFirstQuizPass } from '@/lib/reward-events';
import { syncEnrollmentProgress } from '@/lib/course-progress';
import { notify } from '@/lib/notifications';
import { QUIZ_CONTEXT_SELECT, quizCourse, quizPublicPreview } from '@/lib/course-exams';

const quizSelect = {
  ...QUIZ_CONTEXT_SELECT,
  questions: { select: { id: true, correctAnswer: true, points: true, options: true } },
} as const satisfies Prisma.QuizSelect;
type Quiz = Prisma.QuizGetPayload<{ select: typeof quizSelect }>;

/** Returns true for the course's managers (they may try unpublished quizzes, without attempt limits). */
async function requireQuizAccess(tx: Prisma.TransactionClient, userId: string, quiz: Quiz): Promise<boolean> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, isBanned: true, adminPermissions: true } });
  if (!user || user.isBanned) throw new CheckoutError(401, 'يرجى تسجيل الدخول');
  const course = quizCourse(quiz);
  const manager = (user.role === 'OWNER' || (user.role === 'ADMIN' && user.adminPermissions.includes('COURSES'))) || (user.role === 'INSTRUCTOR' && userId === course.instructorId);
  if (manager) return true;
  if (!quiz.isPublished) throw new CheckoutError(404, 'الاختبار غير متاح حالياً');
  if (quizPublicPreview(quiz)) return false;
  const enrolled = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } }, select: { id: true } });
  if (!enrolled) throw new CheckoutError(403, 'هذا الاختبار متاح للمشتركين في الكورس فقط');
  return false;
}

/** Attempts used and left; the quiz row lock serialises a student's concurrent submissions. */
async function attemptBudget(tx: Prisma.TransactionClient, userId: string, quiz: Quiz, manager: boolean) {
  await tx.$queryRaw`SELECT id FROM "Quiz" WHERE id = ${quiz.id} FOR UPDATE`;
  const used = await tx.quizAttempt.count({ where: { userId, quizId: quiz.id } });
  if (!manager && quiz.maxAttempts !== null && used >= quiz.maxAttempts) {
    throw new CheckoutError(409, `استنفدت عدد المحاولات المسموح (${quiz.maxAttempts})`);
  }
  return { used: used + 1, remaining: manager || quiz.maxAttempts === null ? null : quiz.maxAttempts - used - 1 };
}

function calculateScore(quiz: Quiz, input: unknown) {
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
  // Quizzes from before the exam settings (scoringVersion 1) keep the rule the course player always applied
  // (50% of the questions answered correctly), so no student's result changes for an old quiz.
  // New quizzes use the instructor's pass mark, stored in points (see course-exams.ts parseSettings).
  const legacyRule = quiz.scoringVersion < 2 || !Number.isFinite(quiz.passingScore) || quiz.passingScore <= 0 || quiz.passingScore > total;
  if (legacyRule) {
    return { score: Math.round(correct / quiz.questions.length * 10000) / 100, passed: correct / quiz.questions.length >= 0.5, total: 100 };
  }
  return { score, passed: score >= quiz.passingScore, total };
}

export async function submitQuiz(userId: string, quizId: string, input: Record<string, unknown>, legacy = false) {
  if (!paymentId(quizId)) throw new CheckoutError(400, 'الاختبار غير صالح');
  return withPaymentTransaction(async tx => {
    const quiz = await tx.quiz.findUnique({ where: { id: quizId }, select: quizSelect });
    if (!quiz) throw new CheckoutError(404, 'الاختبار غير موجود');
    const manager = await requireQuizAccess(tx, userId, quiz);
    if (quiz.type === 'MANUAL_FILE') {
      if (typeof input.answerFileUrl !== 'string' || !input.answerFileUrl) throw new CheckoutError(400, 'يجب إرفاق ملف الإجابة');
      await attemptBudget(tx, userId, quiz, manager);
      await tx.quizAttempt.create({ data: { userId, quizId, score: null, passed: false, status: 'PENDING_GRADING', answerFileUrl: input.answerFileUrl } });
      return { status: 'PENDING_GRADING' as const, message: 'تم استلام الإجابة بنجاح وهي قيد المراجعة' };
    }
    if (quiz.type !== 'AUTOMATIC') throw new CheckoutError(400, 'نوع الاختبار غير صالح');
    const result = calculateScore(quiz, input.answers);
    const budget = await attemptBudget(tx, userId, quiz, manager);
    if (result.passed && !legacy) await rewardFirstQuizPass(tx, userId, quizId);
    // Only the validated option indexes are stored, never a client-sent score.
    const answers = Object.fromEntries(Object.entries(paymentBody(input.answers)).filter(([, v]) => typeof v === 'number')) as Prisma.InputJsonObject;
    const attempt = await tx.quizAttempt.create({ data: { userId, quizId, score: result.score, passed: result.passed, status: 'COMPLETED', answers, totalPoints: result.total } });
    // A passed quiz may complete the course: keep the saved percentage current.
    if (result.passed) await syncEnrollmentProgress(tx, userId, quizCourse(quiz).id);
    return { attempt, total: result.total, remainingAttempts: budget.remaining, passingScore: quiz.passingScore };
  });
}

export async function gradeQuiz(graderId: string, attemptId: string, score: unknown) {
  if (!paymentId(attemptId) || typeof score !== 'number' || !Number.isFinite(score) || score < 0) throw new CheckoutError(400, 'البيانات غير مكتملة');
  return withPaymentTransaction(async tx => {
    const grader = await tx.user.findUnique({ where: { id: graderId }, select: { role: true, isBanned: true, adminPermissions: true } });
    if (!grader || grader.isBanned || !['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(grader.role)) throw new CheckoutError(403, 'غير مصرح لك بإجراء هذه العملية');
    if (grader.role === 'ADMIN' && !grader.adminPermissions.includes('COURSES')) throw new CheckoutError(403, 'Permission denied');
    const attempt = await tx.quizAttempt.findUnique({ where: { id: attemptId }, include: { quiz: { select: quizSelect } } });
    if (!attempt) throw new CheckoutError(404, 'محاولة الاختبار غير موجودة');
    if (grader.role === 'INSTRUCTOR' && quizCourse(attempt.quiz).instructorId !== graderId) throw new CheckoutError(403, 'لا تملك صلاحية تصحيح هذا الاختبار');
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
    if (passed) await syncEnrollmentProgress(tx, attempt.userId, quizCourse(attempt.quiz).id);
    await notify(tx, { userId: attempt.userId, title: passed ? 'تم تصحيح اختبارك: ناجح' : 'تم تصحيح اختبارك',
      message: `حصلت على ${score} من ${attempt.quiz.totalMarks} في اختبار «${attempt.quiz.title}».`,
      link: `/courses/${quizCourse(attempt.quiz).id}/learn`, dedupeKey: `quiz-graded:${attemptId}` });
    return { passed };
  });
}
