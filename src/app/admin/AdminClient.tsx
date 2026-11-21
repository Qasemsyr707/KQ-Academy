'use client';

import type { Permission } from '@/lib/permissions';
import { useState } from 'react';
import { Tag, CheckCircle, XCircle, Users, BookOpen, CreditCard, Video, Shield, Settings, Activity, Megaphone, Award, ShieldCheck, ClipboardCheck, Layers, Film, Receipt, Share2, Globe } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

type AdminStats = { totalUsers: number; totalCourses: number; liveStreams: number; pendingWallets: number; pendingPayments?: number; pendingCourseReviews?: number; pendingReferrals?: number };
type AdminItem = { permission: Permission; href: string; icon: typeof Users; color: string; title: string; subtitle: (s: AdminStats) => string };

/** Every administrative page, grouped; each card shows only with its permission (OWNER has all). */
const ADMIN_SECTIONS: { title: string; items: AdminItem[] }[] = [
  { title: 'المستخدمون والفريق', items: [
    { permission: 'USERS', href: '/admin/users', icon: Users, color: '#3b82f6', title: 'إدارة المستخدمين', subtitle: s => `${s.totalUsers} مستخدم` },
  ] },
  { title: 'المحتوى التعليمي', items: [
    { permission: 'COURSES', href: '/admin/courses', icon: BookOpen, color: '#8b5cf6', title: 'إدارة الكورسات', subtitle: s => `${s.totalCourses} كورس` },
    { permission: 'COURSE_PUBLISHING', href: '/admin/course-requests', icon: ClipboardCheck, color: '#0ea5e9', title: 'مراجعة الكورسات', subtitle: s => s.pendingCourseReviews ? `${s.pendingCourseReviews} بانتظار المراجعة` : 'كورسات جديدة وطلبات تعديل' },
    { permission: 'COURSES', href: '/admin/categories', icon: Layers, color: '#14b8a6', title: 'التصنيفات', subtitle: () => 'تصنيفات المهارات والفروع' },
    { permission: 'CERTIFICATES', href: '/admin/certificates', icon: Award, color: '#f59e0b', title: 'الشهادات', subtitle: () => 'سجل الشهادات المصدرة' },
    { permission: 'LIVE_CLASSES', href: '/admin/live', icon: Video, color: '#ef4444', title: 'البث المباشر', subtitle: s => s.liveStreams ? `${s.liveStreams} بث مباشر الآن` : 'لا يوجد بث الآن' },
    { permission: 'MODERATION', href: '/admin/shorts', icon: Film, color: '#ec4899', title: 'الإشراف على الفيديوهات القصيرة', subtitle: () => 'مراجعة المقاطع المنشورة' },
  ] },
  { title: 'المال', items: [
    { permission: 'PAYMENTS', href: '/admin/payments', icon: Receipt, color: '#22c55e', title: 'المدفوعات', subtitle: s => s.pendingPayments ? `${s.pendingPayments} إيصال بانتظار المراجعة` : 'سجل المدفوعات' },
    { permission: 'WALLETS', href: '/admin/wallet', icon: CreditCard, color: '#10b981', title: 'المحافظ', subtitle: s => s.pendingWallets ? `${s.pendingWallets} طلب شحن معلّق` : 'طلبات الشحن والأرصدة' },
  ] },
  { title: 'التسويق والتواصل', items: [
    { permission: 'MARKETING', href: '/admin/marketing', icon: Megaphone, color: '#CBA153', title: 'التسويق والنمو', subtitle: () => 'حزم • اشتراكات • إيميل' },
    { permission: 'MARKETING', href: '/admin/referrals', icon: Share2, color: '#a855f7', title: 'الإحالات والعمولات', subtitle: s => s.pendingReferrals ? `${s.pendingReferrals} عمولة بانتظار المراجعة` : 'التقارير ونسبة العمولة' },
    { permission: 'MARKETING', href: '/admin/social', icon: Globe, color: '#38bdf8', title: 'روابط التواصل الاجتماعي', subtitle: () => 'روابط صفحات الأكاديمية الرسمية' },
  ] },
];

export default function AdminClient({ initialPayments, initialCoupons, stats, permissions, isOwner }: { permissions: Permission[], isOwner: boolean, initialPayments: any[], initialCoupons: any[], stats: any }) {
  const [payments, setPayments] = useState(initialPayments);
  const [coupons, setCoupons] = useState(initialCoupons);

  // New Coupon State
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

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

  const handleViewReceipt = (base64String: string) => {
    setViewingReceipt(base64String);
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
      
      {/* Receipt Modal */}
      {viewingReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }} onClick={() => setViewingReceipt(null)}>
          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }} onClick={e => e.stopPropagation()}>
            {viewingReceipt.startsWith('data:application/pdf') || viewingReceipt.includes('.pdf') ? (
              <iframe src={viewingReceipt} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', background: '#fff' }} />
            ) : (
              <img 
                src={viewingReceipt} 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }} 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  alert('الصورة غير صالحة أو تالفة.');
                  setViewingReceipt(null);
                }}
              />
            )}
          </div>
          <button onClick={() => setViewingReceipt(null)} style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '50px', height: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
            <XCircle size={30} />
          </button>
        </div>
      )}
      
      {/* Owner-only: granular administrator permissions (checked again on the server). */}
      {isOwner && (
        <Link href="/admin/permissions" className="kq-admin-gold-card"
          style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', marginBottom: '2rem', borderRadius: 20, textDecoration: 'none', color: '#1f1a12',
            background: 'var(--gold-gradient)', boxShadow: '0 18px 40px rgba(201,164,92,0.25)', border: '1px solid var(--gold-300)' }}>
          <span style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.35)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <ShieldCheck size={30} color="#1f1a12" />
          </span>
          <span>
            <strong style={{ display: 'block', fontSize: '1.3rem' }}>إدارة الصلاحيات</strong>
            <span style={{ opacity: 0.85 }}>التحكم بصلاحيات المديرين وسجل التغييرات</span>
          </span>
        </Link>
      )}

      {ADMIN_SECTIONS.map(section => {
        const items = section.items.filter(item => permissions.includes(item.permission));
        if (!items.length) return null;
        return (
          <section key={section.title} aria-label={section.title} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.05rem', color: 'var(--gold-300)', marginBottom: '0.9rem', letterSpacing: 0 }}>{section.title}</h2>
            <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))', gap: '1rem' }}>
              {items.map(item => (
                <motion.div key={item.href} variants={cardVariants}>
                  <Link href={item.href} className="kq-admin-card"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1.25rem',
                      display: 'flex', alignItems: 'center', gap: '0.9rem', textDecoration: 'none', height: '100%', transition: 'transform 0.25s ease, border-color 0.25s ease' }}>
                    <span style={{ width: 46, height: 46, background: `${item.color}1f`, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <item.icon size={22} color={item.color} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ color: '#fff', display: 'block' }}>{item.title}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>{item.subtitle(stats)}</span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        );
      })}
      <style>{`.kq-admin-card:hover{transform:translateY(-3px);border-color:var(--gold-400)!important}.kq-admin-gold-card:hover{filter:brightness(1.04)}@media (prefers-reduced-motion: reduce){.kq-admin-card{transition:none!important}.kq-admin-card:hover{transform:none}}`}</style>

      {/* Main Stats Bento Grid */}
      <motion.div 
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}
      >
        {/* Revenue: financial data, shown only with the PAYMENTS permission. Currencies are never added together. */}
        {permissions.includes('PAYMENTS') && <motion.div variants={cardVariants} style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.02) 100%)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', gap: '1.5rem', gridColumn: '1 / -1', flexWrap: 'wrap' }}>
          <div style={{ width: '60px', height: '60px', background: 'rgba(251, 191, 36, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={32} color="#fbbf24" />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '0.2rem' }}>إيرادات الكورسات المعتمدة</p>
            <h3 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.3rem)', fontWeight: 'bold', color: '#fbbf24' }}>
              ${formatNumber(stats.revenue?.USD ?? 0)} <span style={{ opacity: 0.6, fontSize: '0.6em' }}>+</span> {formatNumber(stats.revenue?.SYP ?? 0)} ل.س
            </h3>
            {stats.revenue?.unrecorded > 0 && <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>{stats.revenue.unrecorded} دفعة قديمة لم تُسجَّل عملتها، غير محتسبة أعلاه.</p>}
          </div>
        </motion.div>}

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem' }}>
        
        {/* Pending Payments Section */}
        {permissions.includes('PAYMENTS') && <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle color="var(--warning)" /> طلبات شراء الكورسات ({payments.length})
          </h2>
          {payments.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>لا توجد طلبات شراء معلقة.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {payments.map((payment: any) => (
                <div key={payment.id} style={{ background: 'var(--ink-3)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{payment.user.name}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>${formatNumber(payment.amount)}</span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
                    الكورس: {payment.course.title} <br/>
                    طريقة الدفع: {payment.paymentMethod} <br/>
                    تاريخ الطلب: {formatDateTime(payment.createdAt)}
                    {payment.receiptImage && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <button onClick={() => handleViewReceipt(payment.receiptImage)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#3EEDC4', textDecoration: 'none', background: 'rgba(62, 237, 196, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                          عرض صورة الإيصال / الحوالة
                        </button>
                      </div>
                    )}
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
        </div>}

        {/* Coupons Section */}
        {permissions.includes('MARKETING') && <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
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
                <div key={coupon.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink-3)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
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
        </div>}

      </div>

      {/* Payment Settings */}
      {permissions.includes('SETTINGS') && <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings color="var(--primary)" /> إعدادات بوابات الدفع
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>يمكنك هنا تفعيل أو تعطيل أي وسيلة دفع في المنصة. الوسائل المعطلة لن تظهر للطلاب في صفحة الدفع.</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
          {['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA', 'WALLET', 'MANUAL'].map(method => (
            <div key={method} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--ink-3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', flex: '1 1 300px' }}>
              <div>
                <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                  {method === 'STRIPE' ? 'البطاقة الائتمانية' 
                  : method === 'PAYPAL' ? 'باي بال' 
                  : method === 'TABBY' ? 'تابي (Tabby)'
                  : method === 'TAMARA' ? 'تمارا (Tamara)'
                  : method === 'WALLET' ? 'المحفظة الداخلية' 
                  : 'التحويل اليدوي'}
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>{method}</p>
              </div>
              <button 
                onClick={async () => {
                   try {
                     const isEnabled = stats.paymentSettings?.[`ENABLE_${method}`] !== 'false';
                     const res = await fetch('/api/admin/settings', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ key: `ENABLE_${method}`, value: isEnabled ? 'false' : 'true' })
                     });
                     if (res.ok) {
                       window.location.reload();
                     } else {
                       alert('ليس لديك صلاحية أو حدث خطأ');
                     }
                   } catch(e) {
                     alert('حدث خطأ');
                   }
                }}
                style={{ 
                  background: stats.paymentSettings?.[`ENABLE_${method}`] !== 'false' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  color: stats.paymentSettings?.[`ENABLE_${method}`] !== 'false' ? '#22c55e' : '#ef4444', 
                  border: `1px solid ${stats.paymentSettings?.[`ENABLE_${method}`] !== 'false' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  padding: '0.6rem 1.5rem', 
                  borderRadius: '20px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minWidth: '100px'
                }}>
                {stats.paymentSettings?.[`ENABLE_${method}`] !== 'false' ? 'مفعل' : 'معطل'}
              </button>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
