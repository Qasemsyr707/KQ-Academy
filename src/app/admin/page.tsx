import { requireRolePage } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { CreditCard, Users, BookOpen, Tag, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import AdminClient from './AdminClient';
import { hasPermission } from '@/lib/permission-check';
import { PERMISSION_KEYS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const { session } = await requireRolePage(['ADMIN'], '/dashboard', 'DASHBOARD');
  const permissions = (await Promise.all(PERMISSION_KEYS.map(async key =>
    await hasPermission(session.user.id, key) ? key : null))).filter(key => key !== null);

  // Real counts from the database; financial totals only for PAYMENTS, split by currency.
  const [totalUsers, totalCourses, activeInstructors, liveStreams, pendingWallets, pendingPaymentCount, pendingCourseReviews, pendingReferrals] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.user.count({ where: { role: 'INSTRUCTOR', isBanned: false } }),
    prisma.liveClass.count({ where: { status: 'live' } }),
    prisma.walletTransaction.count({ where: { status: 'PENDING', type: 'DEPOSIT' } }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.course.count({ where: { status: 'PENDING' } }).then(async n => n + await prisma.courseChangeRequest.count({ where: { status: 'PENDING' } })),
    prisma.affiliateEarning.count({ where: { status: 'PENDING', sourceKey: { not: null } } }),
  ]);
  const revenueRows = permissions.includes('PAYMENTS')
    ? await prisma.payment.groupBy({ by: ['currency'], where: { status: 'APPROVED' }, _sum: { amount: true }, _count: { _all: true } })
    : [];
  const revenue = {
    USD: revenueRows.find(r => r.currency === 'USD')?._sum.amount ?? 0,
    SYP: revenueRows.find(r => r.currency === 'SYP')?._sum.amount ?? 0,
    unrecorded: revenueRows.filter(r => r.currency !== 'USD' && r.currency !== 'SYP').reduce((n, r) => n + r._count._all, 0),
  };

  // Fetch Pending Payments
  const pendingPayments = permissions.includes('PAYMENTS') ? await prisma.payment.findMany({
    where: { status: 'PENDING' },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true, price: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  }) : [];

  // Fetch Coupons
  const coupons = permissions.includes('MARKETING') ? await prisma.coupon.findMany({
    include: {
      course: { select: { title: true } }
    },
    orderBy: { createdAt: 'desc' }
  }) : [];

  // Fetch Settings
  const allSettings = permissions.includes('SETTINGS') ? await prisma.setting.findMany({
    where: { key: { startsWith: 'ENABLE_' } },
  }) : [];
  const paymentSettings: Record<string, string> = {};
  allSettings.forEach(s => {
    paymentSettings[s.key] = s.value;
  });

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: 'var(--background)', color: '#fff' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>لوحة الإدارة الشاملة</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>نظرة عامة على المنصة والإحصائيات الرئيسية</p>
        </div>
        <Link href="/dashboard" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          العودة للوحة الطالب
        </Link>
      </div>

      <AdminClient 
        permissions={permissions}
        isOwner={session.user.role === 'OWNER'}
        initialPayments={pendingPayments} 
        initialCoupons={coupons} 
        stats={{
          totalUsers,
          totalCourses,
          revenue,
          activeInstructors,
          liveStreams,
          pendingWallets,
          pendingPayments: pendingPaymentCount,
          pendingCourseReviews,
          pendingReferrals,
          paymentSettings
        }} 
      />

    </div>
  );
}
