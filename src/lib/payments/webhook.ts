import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PaymentFactory } from './PaymentFactory';
import { CheckoutError, readCheckoutContext } from './checkout-context';
import { identifier, objectValue } from './provider-validation';
import { withPaymentTransaction } from './transactions';
import { PAYMENT_HEADERS } from './checkout';

const ONLINE_PROVIDERS = ['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA'];
const MAX_BODY_BYTES = 262_144;

async function limitedBody(req: Request): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) throw new CheckoutError(400, 'بيانات الإشعار غير صالحة');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new CheckoutError(413, 'حجم الإشعار يتجاوز الحد المسموح');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

function eventTransaction(provider: string, event: Record<string, unknown>): unknown {
  if (provider === 'STRIPE') {
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(String(event.type))) return null;
    return objectValue(objectValue(event.data)?.object)?.id;
  }
  if (provider === 'PAYPAL') {
    const resource = objectValue(event.resource);
    if (event.event_type === 'CHECKOUT.ORDER.COMPLETED') return resource?.id;
    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return null;
    return objectValue(objectValue(resource?.supplementary_data)?.related_ids)?.order_id;
  }
  return provider === 'TABBY' ? event.id : event.order_id;
}

export async function handlePaymentWebhook(req: Request, provider: string) {
  try {
    if (!ONLINE_PROVIDERS.includes(provider)) throw new CheckoutError(400, 'بوابة دفع غير مدعومة');
    const gateway = PaymentFactory.getProvider(provider);
    const rawBody = await limitedBody(req);
    // An authenticated notification triggers a server-to-server payment lookup;
    // notification status and browser redirects never prove a purchase.
    if (!await gateway.verifyWebhook(req, rawBody)) throw new CheckoutError(401, 'تعذّر التحقق من مصدر الإشعار');
    let parsed: unknown;
    try { parsed = JSON.parse(rawBody); } catch { throw new CheckoutError(400, 'بيانات الإشعار غير صالحة'); }
    const event = objectValue(parsed);
    if (!event) throw new CheckoutError(400, 'بيانات الإشعار غير صالحة');
    const transactionId = eventTransaction(provider, event);
    if (transactionId === null) return NextResponse.json({ received: true }, { headers: PAYMENT_HEADERS });
    if (!identifier(transactionId)) throw new CheckoutError(400, 'مرجع العملية غير صالح');
    const matches = await prisma.payment.findMany({ where: { provider, transactionId }, take: 2 });
    if (matches.length !== 1) throw new CheckoutError(409, 'تعذّر مطابقة طلب الدفع');
    const payment = matches[0];
    const expected = readCheckoutContext(payment);
    if (!expected || !['READY', 'VERIFIED'].includes(expected.state)) throw new CheckoutError(409, 'طلب الدفع يحتاج مراجعة');
    if (payment.status === 'APPROVED' && expected.state === 'VERIFIED') {
      return NextResponse.json({ success: true, received: true }, { headers: PAYMENT_HEADERS });
    }
    if (payment.status !== 'PENDING' || expected.state !== 'READY') throw new CheckoutError(409, 'تمت معالجة طلب الدفع');
    const proof = await gateway.verifyPayment(transactionId, expected);
    if (!proof || proof.transactionId !== transactionId || proof.referenceId !== payment.id
      || proof.amountMinor !== expected.amountMinor || proof.currency !== expected.currency) {
      throw new CheckoutError(422, 'لم يتم تأكيد دفع مطابق لطلب الشراء');
    }
    await withPaymentTransaction(async tx => {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      const context = current && readCheckoutContext(current);
      if (!current || !context || current.provider !== provider || current.transactionId !== transactionId
        || context.userId !== expected.userId || context.courseId !== expected.courseId
        || context.currency !== expected.currency || context.amountMinor !== expected.amountMinor) {
        throw new CheckoutError(409, 'تغيرت بيانات طلب الدفع؛ يرجى مراجعته');
      }
      if (current.status === 'APPROVED' && context.state === 'VERIFIED') return;
      if (current.status !== 'PENDING' || context.state !== 'READY') throw new CheckoutError(409, 'تمت معالجة طلب الدفع');
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, provider, transactionId, status: 'PENDING', providerResponse: current.providerResponse,
          amount: current.amount, userId: expected.userId, courseId: expected.courseId },
        data: { status: 'APPROVED', providerResponse: JSON.stringify({ ...context, state: 'VERIFIED', proof }) },
      });
      if (claimed.count !== 1) throw new CheckoutError(409, 'تمت معالجة طلب الدفع أو تغييره');
      await tx.enrollment.upsert({
        where: { userId_courseId: { userId: expected.userId, courseId: expected.courseId } },
        update: {}, create: { userId: expected.userId, courseId: expected.courseId, progress: 0 },
      });
    });
    return NextResponse.json({ success: true, received: true }, { headers: PAYMENT_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CheckoutError ? error.message : 'تعذّرت معالجة إشعار الدفع' }, {
      status: error instanceof CheckoutError ? error.status : 503, headers: PAYMENT_HEADERS,
    });
  }
}
