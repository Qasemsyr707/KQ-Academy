import { NextResponse } from 'next/server';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { CheckoutError } from '@/lib/payments/checkout-context';
import { reviewManualPayment } from '@/lib/payments/admin-review';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRequestUser(req, ['ADMIN', 'OWNER']);
    const { id } = await props.params;
    if (typeof id !== 'string' || !id || id.length > 200) {
      return NextResponse.json({ error: 'معرّف الدفع غير صالح' }, { status: 400 });
    }
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات الدفع غير صالحة' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if ((input.status !== 'APPROVED' && input.status !== 'REJECTED') || input.action !== undefined) {
      return NextResponse.json({ error: 'حالة الدفع غير صالحة' }, { status: 400 });
    }
    const payment = await reviewManualPayment(id, input.status);
    return NextResponse.json({ success: true, payment });
  } catch (error) {
    if (error instanceof RequestUserError || error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات الدفع غير صالحة' }, { status: 400 });
    console.error('Payment review failed');
    return NextResponse.json({ error: 'تعذّر تحديث الدفعة، يرجى المحاولة مجدداً' }, { status: 500 });
  }
}
