import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { paymentBody, paymentId, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';
import { submitQuiz } from '@/lib/quiz-submission';
import { assertOwnedDocumentReference } from '@/lib/owned-document';
import { PrivateFileError } from '@/lib/private-file-storage';

export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req);
    const body = paymentBody(await req.json());
    if (!paymentId(body.quizId)) throw new CheckoutError(400, 'بيانات ناقصة');
    if (body.answerFileUrl) await assertOwnedDocumentReference(user, body.answerFileUrl);
    const result = await submitQuiz(user.id, body.quizId, body, true);
    if ('status' in result) return NextResponse.json(result, { headers: WALLET_HEADERS });
    return NextResponse.json({ attempt: result.attempt, message: 'تم إرسال الاختبار وتصحيحه' }, { status: 201, headers: WALLET_HEADERS });
  } catch (error) {
    if (error instanceof PrivateFileError) return NextResponse.json({ error: error.message }, { status: error.status, headers: WALLET_HEADERS });
    return walletError(error);
  }
}
