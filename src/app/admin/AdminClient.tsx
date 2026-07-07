'use client';

import { useState } from 'react';
import { Tag, CheckCircle, XCircle, Users, BookOpen, CreditCard, Video, Shield, Settings, Activity, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminClient({ initialPayments, initialCoupons, stats }: { initialPayments: any[], initialCoupons: any[], stats: any }) {
  const [payments, setPayments] = useState(initialPayments);
  const [coupons, setCoupons] = useState(initialCoupons);

  // New Coupon State
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  const handleUpdatePayment = async (paymentId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setPayments(payments.filter(p => p.id !== paymentId));
        alert(status === 'APPROVED' ? 'تم قبول الدفع وتسجيل الطالب في الكورس' : 'تم رفض الدفع');
      } else {
        alert('حدث خطأ');
      }
    } catch (e) {
      alert('Error updating payment');
    }
  };

  const handleCreateCoupon = async () => {
    if (!code || !discount) return;
    setIsCreatingCoupon(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discount: parseFloat(discount) })
      });
      if (res.ok) {
        const data = await res.json();
        setCoupons([data.coupon, ...coupons]);
        setCode('');
        setDiscount('');
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (e) {
      alert('Error creating coupon');
    }
    setIsCreatingCoupon(false);
  };

  const cardVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Quick Links Bento Grid */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}
      >
        {[
          { href: '/admin/users', icon: Users, color: '#3b82f6', title: 'إدارة المستخدمين', subtitle: `${stats.totalUsers} مستخدم` },
          { href: '/admin/courses', icon: BookOpen, color: '#8b5cf6', title: 'إدارة الكورسات', subtitle: `${stats.totalCourses} كورس` },
          { href: '/admin/live', icon: Video, color: '#ef4444', title: 'البث المباشر', subtitle: `${stats.liveStreams} بث حالي` },
          { href: '/admin/wallet', icon: CreditCard, color: '#22c55e', title: 'إدارة المحافظ', subtitle: `${stats.pendingWallets} طلب معلق` },
          { href: '/admin/marketing', icon: Megaphone, color: '#CBA153', title: 'التسويق والنمو', subtitle: 'حزم • اشتراكات • إيميل' }
        ].map((item, idx) => (
          <motion.div key={idx} variants={cardVariants}>
            <Link 
              href={item.href} 
              className="group"
              style={{ 
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textDecoration: 'none',
                transition: 'all 0.3s ease', cursor: 'pointer', height: '100%'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '50px', height: '50px', background: `${item.color}15`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={24} color={item.color} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: '#fff', fontWeight: 'bold', marginBottom: '0.2rem' }}>{item.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{item.subtitle}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Stats Bento Grid */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}
      >
        {/* Revenue Card (Large) */}
        <motion.div variants={cardVariants} style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.02) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', gap: '1.5rem', gridColumn: '1 / -1' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(251, 191, 36, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={32} color="#fbbf24" />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>إجمالي الأرباح من الكورسات</p>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{stats.totalRevenue.toLocaleString()} <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)' }}>ل.س</span></h3>
          </div>
        </motion.div>

        {/* Instructors Card */}
        <motion.div variants={cardVariants} style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={32} color="#3b82f6" />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>المدربين النشطين</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.activeInstructors}</h3>
          </div>
        </motion.div>
      </motion.div>

      {/* Two Columns Grid for Payments and Coupons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Pending Payments Section */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle color="var(--warning)" /> طلبات شراء الكورسات ({payments.length})
          </h2>
          {payments.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>لا توجد طلبات شراء معلقة.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {payments.map((payment: any) => (
                <div key={payment.id} style={{ background: '#111', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{payment.user.name}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{payment.amount.toLocaleString()} ل.س</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
                    الكورس: {payment.course.title} <br/>
                    طريقة الدفع: {payment.paymentMethod}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => handleUpdatePayment(payment.id, 'APPROVED')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)', cursor: 'pointer', fontWeight: 'bold' }}>
                      <CheckCircle size={18} /> قبول
                    </button>
                    <button onClick={() => handleUpdatePayment(payment.id, 'REJECTED')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: 'bold' }}>
                      <XCircle size={18} /> رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coupons Section */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Tag color="var(--primary)" /> كوبونات الخصم والتسويق
          </h2>
          
          {/* Create Coupon Form */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="الكود (مثال: SALE50)" 
              value={code}
              onChange={e => setCode(e.target.value)}
              style={{ flex: '1 1 150px', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
            />
            <input 
              type="number" 
              placeholder="الخصم (%)" 
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              style={{ flex: '1 1 100px', padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}
            />
            <button onClick={handleCreateCoupon} disabled={isCreatingCoupon} style={{ flex: '1 1 100px', background: 'var(--primary)', color: '#000', padding: '0.8rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
              {isCreatingCoupon ? 'جاري...' : 'إضافة كوبون'}
            </button>
          </div>

          {/* Coupons List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {coupons.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>لا توجد كوبونات حالياً.</p>
            ) : (
              coupons.map((coupon: any) => (
                <div key={coupon.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem', letterSpacing: '1px', color: '#fff' }}>{coupon.code}</span>
                    {coupon.course && <span style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.2rem' }}>مخصص لكورس: {coupon.course.title}</span>}
                  </div>
                  <div style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', fontWeight: 'bold', padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    خصم {coupon.discount}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
