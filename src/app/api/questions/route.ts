import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { paymentBody, paymentId, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const { text, options, correctAnswer, quizId } = paymentBody(await req.json());
    if (typeof text !== 'string' || !text.trim() || !paymentId(quizId)
      || !Array.isArray(options) || options.length < 2 || !options.every(option => typeof option === 'string')
      || typeof correctAnswer !== 'number' || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
      throw new CheckoutError(400, 'بيانات ناقصة');
    }
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }, select: { chapter: { select: { course: { select: { instructorId: true } } } } },
    });
    if (!quiz || (user.role === 'INSTRUCTOR' && quiz.chapter.course.instructorId !== user.id)) {
      throw new CheckoutError(403, 'لا تملك صلاحية إدارة هذا الاختبار');
    }
    const question = await prisma.question.create({ data: { text, options: JSON.stringify(options), correctAnswer, quizId } });
    return NextResponse.json({ question, message: 'تم إضافة السؤال بنجاح' }, { status: 201, headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
