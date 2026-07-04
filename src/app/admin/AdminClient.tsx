'use client';

import { useState } from 'react';
import { Tag, CheckCircle, XCircle } from 'lucide-react';

export default function AdminClient({ initialPayments, initialCoupons }: { initialPayments: any[], initialCoupons: any[] }) {
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      
      {/* Pending Payments Section */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle color="var(--warning)" /> عمليات الدفع المعلقة ({payments.length})
        </h2>
        {payments.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>لا توجد عمليات دفع معلقة.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {payments.map(payment => (
              <div key={payment.id} style={{ background: '#111', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>{payment.user.name}</span>
                  <span style={{ color: 'var(--primary)' }}>{payment.amount.toLocaleString()} ل.س</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  الكورس: {payment.course.title} <br/>
                  طريقة الدفع: {payment.paymentMethod}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => handleUpdatePayment(payment.id, 'APPROVED')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    <CheckCircle size={18} /> قبول
                  </button>
                  <button onClick={() => handleUpdatePayment(payment.id, 'REJECTED')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
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
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <input 
            type="text" 
            placeholder="الكود (مثال: K&Q50)" 
            value={code}
            onChange={e => setCode(e.target.value)}
            style={{ flex: 2, padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
          />
          <input 
            type="number" 
            placeholder="الخصم (%)" 
            value={discount}
            onChange={e => setDiscount(e.target.value)}
            style={{ flex: 1, padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
          />
          <button onClick={handleCreateCoupon} disabled={isCreatingCoupon} style={{ background: 'var(--primary)', color: '#000', padding: '0 1rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            {isCreatingCoupon ? 'جاري...' : 'إضافة'}
          </button>
        </div>

        {/* Coupons List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {coupons.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>لا توجد كوبونات حالياً.</p>
          ) : (
            coupons.map(coupon => (
              <div key={coupon.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '1px' }}>{coupon.code}</span>
                  {coupon.course && <span style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>مخصص لكورس: {coupon.course.title}</span>}
                </div>
                <div style={{ background: 'var(--primary)', color: '#000', fontWeight: 'bold', padding: '0.3rem 0.8rem', borderRadius: '20px' }}>
                  خصم {coupon.discount}%
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
