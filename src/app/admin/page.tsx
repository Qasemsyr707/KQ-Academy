import { requireRolePage } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { CreditCard, Users, BookOpen, Tag, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const { session } = await requireRolePage(['ADMIN']);

  // Fetch stats
  const totalUsers = await prisma.user.count();
  const totalCourses = await prisma.course.count();
  const totalRevenueAggr = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: 'APPROVED' }
  });
  const totalRevenue = totalRevenueAggr._sum.amount || 0;

  // Additional Stats
  const activeInstructors = await prisma.user.count({ where: { role: 'INSTRUCTOR', isBanned: false } });
  const liveStreams = await prisma.liveClass.count({ where: { status: 'live' } });
  const pendingWallets = await prisma.walletTransaction.count({ where: { status: 'PENDING', type: 'DEPOSIT' } });

  // Fetch Pending Payments
  const pendingPayments = await prisma.payment.findMany({
    where: { status: 'PENDING' },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true, price: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Fetch Coupons
  const coupons = await prisma.coupon.findMany({
    include: {
      course: { select: { title: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      
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
        initialPayments={pendingPayments} 
        initialCoupons={coupons} 
        stats={{
          totalUsers,
          totalCourses,
          totalRevenue,
          activeInstructors,
          liveStreams,
          pendingWallets
        }} 
      />

    </div>
  );
}
