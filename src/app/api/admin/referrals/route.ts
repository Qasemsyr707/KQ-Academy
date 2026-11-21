import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { hasPermission } from '@/lib/permission-check';
import { COMMISSION_SETTING, MAX_COMMISSION_PERCENT } from '@/lib/referrals';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
class ReferralAdminError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(error: unknown) {
  if (error instanceof RequestUserError || error instanceof ReferralAdminError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers });
  console.error('[admin referrals]', error);
  return NextResponse.json({ error: 'تعذّر تنفيذ العملية' }, { status: 500, headers });
}

/** Commission percentage (MARKETING). Changing it affects only commissions created afterwards. */
export async function PUT(req: Request) {
  try {
    const user = await requireRequestUser(req, ['ADMIN', 'OWNER'], 'MARKETING');
    const body = await req.json();
    const percent = Number(body?.commissionPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > MAX_COMMISSION_PERCENT) throw new ReferralAdminError(400, `النسبة بين 0 و${MAX_COMMISSION_PERCENT}`);
    const value = String(Math.round(percent * 100) / 100);
    await prisma.setting.upsert({ where: { key: COMMISSION_SETTING }, create: { key: COMMISSION_SETTING, value }, update: { value } });
    console.info('[admin referrals] commission percent', { value, by: user.id });
    return NextResponse.json({ success: true, commissionPercent: Number(value) }, { headers });
  } catch (error) { return fail(error); }
}

/**
 * Approve or reverse commissions: { ids: [...], decision: 'APPROVE' | 'REVERSE', reason }.
 * Approval releases money to the referrer's wallet, so it also needs the WALLETS permission.
 * Only PENDING rows change (APPROVE), or PENDING/APPROVED rows (REVERSE): a paid commission is never touched.
 */
export async function POST(req: Request) {
  try {
    const user = await requireRequestUser(req, ['ADMIN', 'OWNER'], 'MARKETING');
    if (user.role === 'ADMIN' && !await hasPermission(user.id, 'WALLETS')) throw new ReferralAdminError(403, 'اعتماد العمولات يتطلب صلاحية المحافظ والأرصدة أيضاً');
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200) : [];
    if (!ids.length || ids.length > 200) throw new ReferralAdminError(400, 'اختر عمولة واحدة على الأقل');
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;
    if (body?.decision === 'APPROVE') {
      // A referrer cannot approve their own commissions.
      const result = await prisma.affiliateEarning.updateMany({
        where: { id: { in: ids }, status: 'PENDING', sourceKey: { not: null }, ownerId: { not: user.id } },
        data: { status: 'APPROVED', approvedAt: new Date(), reviewedById: user.id, reason },
      });
      return NextResponse.json({ success: true, changed: result.count }, { headers });
    }
    if (body?.decision === 'REVERSE') {
      if (!reason) throw new ReferralAdminError(400, 'اكتب سبب الإلغاء (مثل استرداد المبلغ)');
      const result = await prisma.affiliateEarning.updateMany({
        where: { id: { in: ids }, status: { in: ['PENDING', 'APPROVED'] }, ownerId: { not: user.id } },
        data: { status: 'REVERSED', reversedAt: new Date(), reviewedById: user.id, reason },
      });
      return NextResponse.json({ success: true, changed: result.count }, { headers });
    }
    throw new ReferralAdminError(400, 'القرار غير صالح');
  } catch (error) { return fail(error); }
}
