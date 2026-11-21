import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import { commissionPercent } from '@/lib/referrals';
import ReferralsAdminClient from './ReferralsAdminClient';

export const dynamic = 'force-dynamic';

export default async function ReferralsAdminPage() {
  const { session } = await requireRolePage(['ADMIN'], '/dashboard', 'MARKETING');
  const [percent, totals, referredUsers, topReferrers, earnings] = await Promise.all([
    commissionPercent(prisma),
    prisma.affiliateEarning.groupBy({ by: ['status'], _sum: { amount: true }, _count: { _all: true } }),
    prisma.user.count({ where: { referredById: { not: null } } }),
    prisma.affiliateEarning.groupBy({ by: ['ownerId'], where: { status: { in: ['PENDING', 'APPROVED', 'PAID'] } }, _sum: { amount: true }, _count: { _all: true }, orderBy: { _sum: { amount: 'desc' } }, take: 10 }),
    prisma.affiliateEarning.findMany({
      orderBy: { createdAt: 'desc' }, take: 200,
      select: { id: true, amount: true, status: true, createdAt: true, baseAmount: true, baseCurrency: true, ratePercent: true, sourceKey: true, reason: true,
        owner: { select: { id: true, name: true } }, buyer: { select: { name: true } } },
    }),
  ]);
  const names = new Map((await prisma.user.findMany({ where: { id: { in: topReferrers.map(r => r.ownerId) } }, select: { id: true, name: true } })).map(u => [u.id, u.name]));
  return <main dir="rtl" style={{ maxWidth: 1200, margin: 'auto', padding: 'clamp(1rem, 3vw, 2rem)' }}>
    <Link href="/admin">العودة إلى الإدارة</Link>
    <h1 style={{ margin: '1rem 0 0.5rem' }}>الإحالات والعمولات</h1>
    <p style={{ opacity: 0.75, lineHeight: 1.8, marginBottom: '1.5rem' }}>
      العمولات تُنشأ تلقائياً من المدفوعات المؤكدة فقط، مرة واحدة لكل دفعة، لمن سجّل عبر رابط إحالة.
      تبدأ «قيد المراجعة»، وبعد الاعتماد يستطيع صاحبها تحويلها إلى محفظته.
    </p>
    <ReferralsAdminClient
      viewerId={session.user.id}
      commissionPercent={percent}
      referredUsers={referredUsers}
      totals={totals.map(t => ({ status: t.status, amount: Math.round((t._sum.amount ?? 0) * 100) / 100, count: t._count._all }))}
      topReferrers={topReferrers.map(r => ({ name: names.get(r.ownerId) ?? '—', amount: Math.round((r._sum.amount ?? 0) * 100) / 100, count: r._count._all }))}
      earnings={earnings.map(e => ({ ...e, createdAt: e.createdAt.toISOString(), legacy: e.sourceKey === null }))}
    />
  </main>;
}
