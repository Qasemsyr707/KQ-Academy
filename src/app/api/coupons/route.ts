import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';

const CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const FIELDS = new Set(['code', 'discount', 'courseId']);

class CouponInputError extends Error {}

/** Validated coupon fields. Codes are stored upper-cased: checkout only ever submits upper-cased codes. */
function couponInput(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CouponInputError('بيانات الكوبون غير صالحة');
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some(key => !FIELDS.has(key))) throw new CouponInputError('حقول غير معروفة في طلب الكوبون');
  const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
  if (!CODE.test(code)) throw new CouponInputError('الكود يجب أن يكون من 3 إلى 32 حرفاً لاتينياً أو رقماً أو - أو _');
  const discount = typeof input.discount === 'number' ? input.discount
    : typeof input.discount === 'string' && input.discount.trim() !== '' ? Number(input.discount) : NaN;
  // Wallet checkout refuses 100% coupons, so a coupon is a real discount between 1% and 99%.
  if (!Number.isFinite(discount) || discount < 1 || discount > 99) throw new CouponInputError('نسبة الخصم يجب أن تكون بين 1 و99');
  let courseId: string | null = null;
  if (input.courseId !== undefined && input.courseId !== null && input.courseId !== '') {
    if (typeof input.courseId !== 'string' || input.courseId.length > 200) throw new CouponInputError('الكورس غير صالح');
    courseId = input.courseId;
  }
  return { code, discount: Math.round(discount * 100) / 100, courseId };
}

export async function POST(req: Request) {
  try {
    // Role is read from the database on every request; a session that lost its role gets 403.
    const user = await requireRequestUser(req, ['ADMIN', 'OWNER'], 'MARKETING');
    let body: unknown;
    try { body = await req.json(); } catch { throw new CouponInputError('بيانات الكوبون غير صالحة'); }
    const data = couponInput(body);
    if (data.courseId && !await prisma.course.findUnique({ where: { id: data.courseId }, select: { id: true } })) {
      throw new CouponInputError('الكورس غير موجود');
    }
    const coupon = await prisma.coupon.create({
      data,
      select: { id: true, code: true, discount: true, courseId: true, createdAt: true, course: { select: { title: true } } },
    });
    console.info('[coupons] created', { couponId: coupon.id, by: user.id, role: user.role, discount: coupon.discount, courseId: coupon.courseId });
    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof CouponInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'هذا الكود مستخدم مسبقاً' }, { status: 409 });
    }
    console.error('Create Coupon Error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
