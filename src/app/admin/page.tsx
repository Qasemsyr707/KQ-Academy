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

  // Fetch Pending Payments
  const pendingPayments = await prisma.payment.findMany({
    where: { status: 'PENDING' },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true, price: true } }
    },
    orderBy: { createdAt: 'desc' }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>لوحة الإدارة العليا</h1>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/admin/users" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', border: '1px solid var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> إدارة المستخدمين
          </Link>
          <Link href="/admin/wallet" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', border: '1px solid var(--primary)', borderRadius: '8px' }}>
            إدارة المحافظ وسعر الصرف
          </Link>
          <Link href="/dashboard" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            العودة للوحة القيادة
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={32} color="#22c55e" />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>إجمالي الأرباح</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalRevenue.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--primary)' }}>ل.س</span></h3>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={32} color="var(--primary)" />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>إجمالي المستخدمين</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalUsers}</h3>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={32} color="#3b82f6" />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>الكورسات المتاحة</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{totalCourses}</h3>
          </div>
        </div>
      </div>

      <AdminClient initialPayments={pendingPayments} initialCoupons={coupons} />

    </div>
  );
}
