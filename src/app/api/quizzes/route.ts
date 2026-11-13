import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { paymentBody, paymentId, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const { title, chapterId } = paymentBody(await req.json());
    if (typeof title !== 'string' || !title.trim() || !paymentId(chapterId)) throw new CheckoutError(400, 'بيانات ناقصة');
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }, select: { course: { select: { instructorId: true } } },
    });
    if (!chapter || (user.role === 'INSTRUCTOR' && chapter.course.instructorId !== user.id)) {
      throw new CheckoutError(403, 'الفصل غير موجود أو أنك لا تملك صلاحية إدارته');
    }
    const quiz = await prisma.quiz.create({ data: { title, chapterId } });
    return NextResponse.json({ quiz, message: 'تم إنشاء الاختبار بنجاح' }, { status: 201, headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
