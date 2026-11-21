import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRequestUser, RequestUserError } from '@/lib/request-user';
import { commissionPercent } from '@/lib/referrals';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const round = (n: number) => Math.round(n * 100) / 100;

/** The signed-in user's referral link, real referrals and commissions by status. */
export async function GET(req: Request) {
  try {
    const viewer = await requireRequestUser(req);
    const user = await prisma.user.findUnique({
      where: { id: viewer.id },
      select: {
        affiliateCode: true,
        // Only first names and join dates: referred people's emails and phones stay private.
        referrals: { select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 },
        _count: { select: { referrals: true } },
        affiliateEarnings: {
          orderBy: { createdAt: 'desc' }, take: 50,
          select: { id: true, amount: true, status: true, createdAt: true, baseAmount: true, baseCurrency: true, ratePercent: true, courseId: true, bundleId: true },
        },
      },
    });
    if (!user) return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404, headers });
    const totals = await prisma.affiliateEarning.groupBy({ by: ['status'], where: { ownerId: viewer.id }, _sum: { amount: true } });
    const sum = (status: string) => round(totals.find(t => t.status === status)?._sum.amount ?? 0);
    const legacyPending = round((await prisma.affiliateEarning.aggregate({ where: { ownerId: viewer.id, status: 'PENDING', sourceKey: null }, _sum: { amount: true } }))._sum.amount ?? 0);
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const percent = await commissionPercent(prisma);
    return NextResponse.json({
      affiliateCode: user.affiliateCode,
      referralLink: user.affiliateCode ? `${base.replace(/\/$/, '')}/register?ref=${encodeURIComponent(user.affiliateCode)}` : null,
      commissionRate: percent / 100,
      commissionPercent: percent,
      totalReferrals: user._count.referrals,
      referrals: user.referrals.map(r => ({ id: r.id, name: r.name.split(/\s+/)[0], createdAt: r.createdAt })),
      pendingEarnings: round(sum('PENDING') - legacyPending),
      approvedEarnings: round(sum('APPROVED') + legacyPending),
      paidEarnings: sum('PAID'),
      reversedEarnings: sum('REVERSED'),
      totalEarned: round(sum('PENDING') + sum('APPROVED') + sum('PAID')),
      claimable: round(sum('APPROVED') + legacyPending),
      earnings: user.affiliateEarnings,
    }, { headers });
  } catch (error) {
    if (error instanceof RequestUserError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    console.error('Affiliate Stats Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500, headers });
  }
}
