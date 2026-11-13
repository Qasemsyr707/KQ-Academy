import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { paymentBody, paymentId, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';
import { gradeQuiz } from '@/lib/quiz-submission';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req, ['INSTRUCTOR', 'ADMIN', 'OWNER']);
    const { attemptId, score } = paymentBody(await req.json());
    if (!paymentId(attemptId)) throw new CheckoutError(400, 'البيانات غير مكتملة');
    const result = await gradeQuiz(user.id, attemptId, score);
    return NextResponse.json({ message: 'تم رصد العلامة بنجاح', passed: result.passed }, { headers: WALLET_HEADERS });
  } catch (error) { return walletError(error); }
}
