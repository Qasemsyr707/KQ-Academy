import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { reviewManualPayment } from '@/lib/payments/admin-review';

export async function POST(req: Request) {
  try {
    await requireRequestUser(req, ['ADMIN', 'OWNER']);
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات الدفع غير صالحة' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.paymentId !== 'string' || !input.paymentId || input.paymentId.length > 200
      || (input.action !== undefined && input.action !== 'APPROVE')
      || (input.status !== undefined && input.status !== 'APPROVED')) {
      return NextResponse.json({ error: 'بيانات الموافقة غير صالحة' }, { status: 400 });
    }
    const payment = await reviewManualPayment(input.paymentId, 'APPROVED');
    return NextResponse.json({ success: true, message: 'تمت الموافقة وتفعيل الكورس بنجاح', payment });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات الدفع غير صالحة' }, { status: 400 });
    console.error('Payment approval failed');
    return NextResponse.json({ error: 'تعذّرت الموافقة على الدفعة، يرجى المحاولة مجدداً' }, { status: 500 });
  }
}
