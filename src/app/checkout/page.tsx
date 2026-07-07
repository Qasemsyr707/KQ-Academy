'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Wallet, ShieldCheck, CheckCircle, Tag, AlertTriangle, ArrowRight, Upload, HelpCircle, Lock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams?.get('courseId') || '';

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('STRIPE');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    async function fetchInfo() {
      try {
        const res = await fetch(`/api/checkout/info?courseId=${courseId}`);
        const data = await res.json();
        if (res.ok) {
          setCourse(data.course);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError('تعذر جلب بيانات الكورس.');
      }
      setLoading(false);
    }
    fetchInfo();
  }, [courseId]);

  const handleApplyCoupon = async () => {
    if (!coupon) return;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon, courseId })
      });
      const data = await res.json();
      if (res.ok) {
        setDiscount(data.discount);
        setError('');
      } else {
        setError(data.error);
        setDiscount(0);
      }
    } catch (err) {
      setError('خطأ في التحقق من الكوبون');
    }
  };

  const handleCheckout = async () => {
    setProcessing(true);
    setError('');
    
    try {
      if (paymentMethod === 'WALLET') {
        const res = await fetch('/api/checkout/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, couponCode: coupon || undefined })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = `/courses/${courseId}/learn`;
          }, 2000);
        } else {
          setError(data.error || 'فشلت عملية الدفع من المحفظة');
        }
      } else {
        // Stripe, PayPal, Manual
        const res = await fetch('/api/checkout/gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, provider: paymentMethod, couponCode: coupon || undefined })
        });
        const data = await res.json();
        
        if (res.ok) {
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
          } else {
            setSuccess(true); // Manual receipt uploaded or similar
          }
        } else {
          setError(data.error || 'حدث خطأ في تجهيز بوابة الدفع');
        }
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    }
    setProcessing(false);
  };

  if (!courseId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle size={64} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
          <h2>الكورس غير محدد</h2>
          <Link href="/courses" className="btn btn-outline" style={{ marginTop: '1rem', display: 'inline-block' }}>العودة للكورسات</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}>
        <div className="loader" style={{ width: '50px', height: '50px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const finalPrice = course?.price - (course?.price * (discount / 100));

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff' }}>
      
      {/* Checkout Header */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '2rem 5%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/courses/${courseId}`} style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} /> العودة
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock color="var(--primary)" size={20} /> الدفع الآمن
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '3rem auto', padding: '0 5%', display: 'flex', gap: '4rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Payment Details */}
        <div style={{ flex: '1 1 600px' }}>
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '2rem' }}>اختر طريقة الدفع</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
            {['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA', 'WALLET', 'MANUAL'].map(method => (
              <div 
                key={method} 
                onClick={() => setPaymentMethod(method)}
                style={{
                  background: paymentMethod === method ? 'rgba(203,161,83,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${paymentMethod === method ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}`,
                  padding: '1.5rem',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.3s'
                }}
              >
                {method === 'STRIPE' && <CreditCard size={32} color={paymentMethod === method ? 'var(--primary)' : '#fff'} />}
                {method === 'PAYPAL' && <CreditCard size={32} color={paymentMethod === method ? '#3b82f6' : '#fff'} />}
                {method === 'TABBY' && (
                  <div style={{ padding: '0.2rem 1rem', background: '#3EEDC4', borderRadius: '4px', color: '#000', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '2px' }}>tabby</div>
                )}
                {method === 'TAMARA' && (
                  <div style={{ padding: '0.2rem 1rem', background: '#F18070', borderRadius: '4px', color: '#fff', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '1px' }}>tamara</div>
                )}
                {method === 'WALLET' && <Wallet size={32} color={paymentMethod === method ? 'var(--success)' : '#fff'} />}
                {method === 'MANUAL' && <Upload size={32} color={paymentMethod === method ? 'var(--warning)' : '#fff'} />}
                
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', textAlign: 'center' }}>
                  {method === 'STRIPE' ? 'البطاقة الائتمانية' 
                  : method === 'PAYPAL' ? 'باي بال (PayPal)' 
                  : method === 'TABBY' ? 'قسمها على 4 بدون فوائد'
                  : method === 'TAMARA' ? 'قسمها على 3 بدون فوائد'
                  : method === 'WALLET' ? 'المحفظة الداخلية' 
                  : 'تحويل بنكي / يدوي'}
                </span>
                
                {paymentMethod === method && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <CheckCircle color="var(--primary)" size={20} fill="rgba(203,161,83,0.2)" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem' }}>لديك كوبون خصم؟</h3>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Tag size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="أدخل الرمز هنا" 
                value={coupon}
                onChange={e => setCoupon(e.target.value)}
                style={{ width: '100%', padding: '1rem 3rem 1rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1.1rem' }}
              />
            </div>
            <button onClick={handleApplyCoupon} className="btn btn-outline" style={{ padding: '0 2rem' }}>تطبيق</button>
          </div>

          {/* FAQs during checkout */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
             <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.8)' }}>
               <HelpCircle size={20} /> استفسارات شائعة حول الدفع
             </h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                   <h5 style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.3rem' }}>هل بيانات بطاقتي آمنة؟</h5>
                   <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>نعم، جميع معاملات البطاقات الائتمانية تتم معالجتها عبر مزود الخدمة المعتمد وهي مشفرة ولا يتم تخزينها في خوادمنا اطلاقاً.</p>
                </div>
                <div>
                   <h5 style={{ fontWeight: 'bold', color: '#fff', marginBottom: '0.3rem' }}>ماذا لو فشلت عملية الدفع؟</h5>
                   <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>سيتم إبلاغك فوراً، ولن يتم خصم أي مبلغ. يمكنك تجربة طريقة دفع أخرى كالتحويل اليدوي أو الدفع من المحفظة.</p>
                </div>
             </div>
          </div>

        </div>

        {/* Right Side: Order Summary */}
        <div style={{ flex: '1 1 400px', position: 'sticky', top: '2rem' }}>
          <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,15,15,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>ملخص الطلب</h2>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ width: '80px', height: '60px', background: course?.thumbnail ? `url(${course.thumbnail}) center/cover` : '#222', borderRadius: '8px' }} />
              <div>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{course?.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>{(course?.instructor as any)?.name}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)' }}>
                <span>السعر الأصلي</span>
                <span>${course?.price}</span>
              </div>
              
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>الخصم ({discount}%)</span>
                  <span>- ${(course?.price * (discount / 100)).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>الإجمالي</span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>${finalPrice?.toFixed(2)}</span>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', padding: '1rem', borderRadius: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <AlertTriangle size={20} /> {error}
              </div>
            )}
            
            {success && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid var(--success)', padding: '1rem', borderRadius: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <CheckCircle size={20} /> تمت العملية بنجاح! جاري التوجيه...
              </div>
            )}

            <button 
              onClick={handleCheckout} 
              disabled={processing || success}
              className="btn btn-solid" 
              style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: processing ? 0.7 : 1 }}
            >
              {processing ? (
                <>جاري المعالجة <div className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /></>
              ) : (
                <><ShieldCheck size={24} /> إتمام الشراء (${finalPrice?.toFixed(2)})</>
              )}
            </button>
            
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <Lock size={12} /> معاملة آمنة ومشفرة بالكامل
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' }}><div className="loader" style={{ borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
