import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { assertOwnedDocumentReference } from '@/lib/owned-document';
import { PrivateFileError } from '@/lib/private-file-storage';
import { PaymentFactory } from './PaymentFactory';
import { amountInMinorUnits, CheckoutError, readCheckoutContext, type CheckoutContext } from './checkout-context';
import { withPaymentTransaction } from './transactions';
import { checkoutAvailable } from './availability';

export const PAYMENT_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const PROVIDERS = ['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA', 'MANUAL'];

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

function receiptReference(value: unknown): string {
  if (typeof value !== 'string') throw new CheckoutError(400, 'يرجى إرفاق إيصال صالح');
  // The existing checkout UI submits FileReader images, not an uploaded file URL.
  // Retain that contract with a strict raster MIME allowlist and decoded size cap.
  if (value.startsWith('data:')) {
    if (value.length > 2_800_000) throw new CheckoutError(400, 'حجم الإيصال يجب ألا يتجاوز 2 ميغابايت');
    const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) throw new CheckoutError(400, 'يرجى إرفاق صورة إيصال صالحة');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > 2 * 1024 * 1024 || bytes.toString('base64') !== match[2]) {
      throw new CheckoutError(400, 'يرجى إرفاق صورة إيصال صالحة بحجم لا يتجاوز 2 ميغابايت');
    }
    return value;
  }
  if (value.length > 2048) throw new CheckoutError(400, 'يرجى إرفاق إيصال صالح');
  if (/^\/(?:api\/files\/[A-Za-z0-9_-]+|uploads\/[A-Za-z0-9_.-]+)$/.test(value) && !value.includes('..')) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === 'i.ibb.co' && !url.username && !url.password && !url.port) return url.href;
  } catch { /* Only existing platform upload origins are permitted. */ }
  throw new CheckoutError(400, 'يرجى رفع الإيصال من داخل المنصة');
}

async function startCheckout(req: Request, channel: 'web' | 'mobile') {
  const user = await requireRequestUser(req);
  let input: unknown;
  try { input = await req.json(); } catch { throw new CheckoutError(400, 'بيانات الطلب غير صالحة'); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CheckoutError(400, 'بيانات الطلب غير صالحة');
  const body = input as Record<string, unknown>;
  if (!identifier(body.courseId)) throw new CheckoutError(400, 'معرّف الكورس غير صالح');
  const courseId = body.courseId;
  const key = req.headers.get('Idempotency-Key') ?? body.operationId;
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    throw new CheckoutError(400, 'يرجى إرسال معرّف صالح لطلب الدفع');
  }
  let provider: string;
  let currency: 'USD' | 'SYP' = 'USD';
  if (channel === 'mobile') {
    if (!['local', 'online'].includes(String(body.paymentType))) throw new CheckoutError(400, 'طريقة الدفع غير صالحة');
    if (body.paymentType === 'local') { provider = 'MANUAL'; currency = 'SYP'; }
    else provider = typeof body.provider === 'string' ? body.provider.toUpperCase() : 'STRIPE';
  } else provider = typeof body.provider === 'string' ? body.provider.toUpperCase() : '';
  if (!PROVIDERS.includes(provider)) throw new CheckoutError(400, 'طريقة الدفع غير مدعومة');
  if (['TABBY', 'TAMARA'].includes(provider)) {
    throw new CheckoutError(400, 'بوابة الدفع المختارة لا تدعم عملة تسعير الكورس حالياً');
  }
  if (!checkoutAvailable(provider)) throw new CheckoutError(503, 'طريقة الدفع المختارة غير متاحة حالياً');
  const switchSetting = await prisma.setting.findUnique({ where: { key: `ENABLE_${provider}` } });
  if (switchSetting?.value === 'false') throw new CheckoutError(403, 'طريقة الدفع المختارة غير مفعّلة');

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== 'PUBLISHED') throw new CheckoutError(404, 'الكورس غير متاح للشراء');
  let amount = currency === 'SYP' ? course.priceSYP : course.price;
  let couponId: string | undefined;
  if (body.couponCode !== undefined) {
    if (typeof body.couponCode !== 'string' || !body.couponCode || body.couponCode.length > 100) throw new CheckoutError(400, 'الكوبون غير صالح');
    const coupon = await prisma.coupon.findUnique({ where: { code: body.couponCode } });
    if (!coupon || (coupon.courseId && coupon.courseId !== course.id) || !Number.isFinite(coupon.discount)
      || coupon.discount < 0 || coupon.discount > 100) throw new CheckoutError(400, 'الكوبون غير صالح');
    amount *= 1 - coupon.discount / 100;
    couponId = coupon.id;
  }
  const amountMinor = amountInMinorUnits(amount);
  amount = amountMinor / 100;
  const receiptImage = provider === 'MANUAL' ? receiptReference(body.receiptImage) : null;
  if (receiptImage) await assertOwnedDocumentReference(user, receiptImage);
  const paymentId = `checkout_${createHash('sha256').update(`${user.id}\0${key}`).digest('hex')}`;
  const context: CheckoutContext = { version: 1, paymentId, userId: user.id, courseId, amountMinor, currency, state: 'CREATING' };
  const reserve = () => withPaymentTransaction(async tx => {
    const enrolled = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId } } });
    if (enrolled) return { enrolled: true as const };
    const existing = await tx.payment.findUnique({ where: { id: paymentId } });
    if (existing) return { enrolled: false as const, created: false, payment: existing };
    const payment = await tx.payment.create({ data: {
      id: paymentId, amount, paymentMethod: provider, provider, userId: user.id,
      courseId, couponId, receiptImage, status: 'PENDING', providerResponse: JSON.stringify(context),
    } });
    return { enrolled: false as const, created: true, payment };
  });
  let reservation: Awaited<ReturnType<typeof reserve>>;
  try { reservation = await reserve(); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') reservation = await reserve();
    else throw error;
  }
  if (reservation.enrolled) return { success: true, alreadyEnrolled: true, status: 'APPROVED' };
  const saved = readCheckoutContext(reservation.payment);
  if (!saved || reservation.payment.provider !== provider || saved.userId !== user.id || saved.courseId !== courseId
    || saved.currency !== currency || saved.amountMinor !== amountMinor || reservation.payment.couponId !== (couponId ?? null)
    || reservation.payment.receiptImage !== receiptImage) throw new CheckoutError(409, 'معرّف الطلب مستخدم لعملية أخرى');
  if (reservation.payment.status !== 'PENDING') throw new CheckoutError(409, 'تمت معالجة طلب الدفع، يرجى مراجعة حالته');
  if (!reservation.created) {
    if (saved.state !== 'READY') throw new CheckoutError(409, 'طلبك قيد التحقق، أعد الطلب نفسه لاحقاً أو تواصل مع الإدارة');
    return { success: true, paymentId, status: 'PENDING', pending: true, redirectUrl: saved.checkoutUrl, url: saved.checkoutUrl };
  }

  // The reservation is durable before contacting a provider. An uncertain result
  // is never retried by creating another provider payment under the same key.
  const gateway = PaymentFactory.getProvider(provider);
  const intent = await gateway.createPaymentIntent(amount, currency, {
    paymentId, userId: user.id, courseId, amountMinor, currency,
    courseName: course.title, userName: user.name, userEmail: user.email, userPhone: user.phone,
  });
  if (!intent.success || !identifier(intent.transactionId) || (provider !== 'MANUAL' && !intent.checkoutUrl)) {
    throw new CheckoutError(503, 'تعذّر تأكيد إنشاء طلب الدفع، يرجى مراجعة الإدارة قبل المحاولة بطلب جديد');
  }
  const ready: CheckoutContext = { ...context, state: 'READY', checkoutUrl: intent.checkoutUrl };
  const updated = await prisma.payment.updateMany({
    where: { id: paymentId, status: 'PENDING', transactionId: null, providerResponse: JSON.stringify(context) },
    data: { transactionId: intent.transactionId, providerResponse: JSON.stringify(ready) },
  });
  if (updated.count !== 1) throw new CheckoutError(409, 'تعذّر تأكيد حالة طلب الدفع، يرجى مراجعة الإدارة');
  return { success: true, paymentId, status: 'PENDING', pending: true, redirectUrl: intent.checkoutUrl, url: intent.checkoutUrl };
}

export async function handleCourseCheckout(req: Request, channel: 'web' | 'mobile') {
  try { return NextResponse.json(await startCheckout(req, channel), { headers: PAYMENT_HEADERS }); }
  catch (error) {
    const known = error instanceof CheckoutError || error instanceof RequestUserError || error instanceof PrivateFileError;
    return NextResponse.json({ error: known ? error.message : 'تعذّر إتمام طلب الدفع' }, {
      status: known ? error.status : 500, headers: PAYMENT_HEADERS,
    });
  }
}
