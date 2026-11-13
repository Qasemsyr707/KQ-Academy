import { NextResponse } from 'next/server';
import { requireRequestUser } from '@/lib/request-user';
import { paymentBody, walletError, WALLET_HEADERS } from '@/lib/payments/wallet-operations';
import { submitQuiz } from '@/lib/quiz-submission';
import { assertOwnedDocumentReference } from '@/lib/owned-document';
import { PrivateFileError } from '@/lib/private-file-storage';

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRequestUser(req);
    const { id } = await props.params;
    const body = paymentBody(await req.json());
    if (body.answerFileUrl) await assertOwnedDocumentReference(user, body.answerFileUrl);
    const result = await submitQuiz(user.id, id, body);
    if ('status' in result) return NextResponse.json(result, { headers: WALLET_HEADERS });
    return NextResponse.json({
      attempt: { score: result.attempt.score, passed: result.attempt.passed },
      message: result.attempt.passed ? 'مبروك! لقد اجتزت الاختبار' : 'للأسف لم تجتز الاختبار، حاول مرة أخرى.',
      total: result.total,
    }, { headers: WALLET_HEADERS });
  } catch (error) {
    if (error instanceof PrivateFileError) return NextResponse.json({ error: error.message }, { status: error.status, headers: WALLET_HEADERS });
    return walletError(error);
  }
}
