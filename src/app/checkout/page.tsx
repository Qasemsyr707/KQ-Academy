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
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('STRIPE');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});
  const [copiedText, setCopiedText] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };
  useEffect(() => {
    if (!courseId) return;
    async function fetchInfo() {
      try {
        const res = await fetch(`/api/checkout/info?courseId=${courseId}`);
        const data = await res.json();
        if (res.ok) {
          setCourse(data.course);
          setWalletData(data.wallet);
          setPaymentSettings(data.paymentSettings || {});
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
    if (paymentMethod === 'MANUAL' && !receiptImage) {
      setError('يرجى إرفاق صورة الإيصال لإتمام طلب التحويل اليدوي');
      return;
    }

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
          body: JSON.stringify({ 
            courseId, 
            provider: paymentMethod, 
            couponCode: coupon || undefined,
            receiptImage: paymentMethod === 'MANUAL' ? receiptImage : undefined
          })
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA', 'WALLET', 'MANUAL'].filter(m => paymentSettings[`ENABLE_${m}`] !== 'false').map(method => (
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
                  transition: 'all 0.3s',
                  position: 'relative'
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

          <AnimatePresence>
            {paymentMethod === 'MANUAL' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: '3rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--warning)' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--warning)' }}>تعليمات التحويل اليدوي</h3>
                  <div style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    <p style={{ marginBottom: '1rem' }}>يرجى تحويل المبلغ الإجمالي إلى أحد الحسابات التالية. <strong>اضغط على أي نص لنسخه.</strong></p>
                    
                    {/* Sham Cash */}
                    <div style={{ background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                      <h4 style={{ color: '#3EEDC4', fontWeight: 'bold', marginBottom: '0.5rem' }}>1. شام كاش (Sham Cash)</h4>
                      <div 
                        onClick={() => handleCopy('f698bd6104ecfc91435335321b7978fc')} 
                        style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ wordBreak: 'break-all' }}>f698bd6104ecfc91435335321b7978fc</span>
                        <span style={{ fontSize: '0.8rem', color: copiedText === 'f698bd6104ecfc91435335321b7978fc' ? 'var(--success)' : 'rgba(255,255,255,0.5)' }}>
                          {copiedText === 'f698bd6104ecfc91435335321b7978fc' ? 'تم النسخ!' : 'نسخ'}
                        </span>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '1rem', borderRadius: '12px' }}>
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=f698bd6104ecfc91435335321b7978fc" 
                          alt="Sham Cash QR Code" 
                          style={{ width: '150px', height: '150px', marginBottom: '0.5rem' }} 
                        />
                        <span style={{ color: '#000', fontWeight: 'bold', fontSize: '0.9rem' }}>امسح الباركود للدفع</span>
                      </div>
                    </div>

                    {/* Binance */}
                    <div style={{ background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                      <h4 style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.5rem' }}>2. بينانس (Binance)</h4>
                      <div 
                        onClick={() => handleCopy('1014947222')} 
                        style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Pay ID: 1014947222</span>
                        <span style={{ fontSize: '0.8rem', color: copiedText === '1014947222' ? 'var(--success)' : 'rgba(255,255,255,0.5)' }}>
                          {copiedText === '1014947222' ? 'تم النسخ!' : 'نسخ'}
                        </span>
                      </div>
                    </div>

                    {/* Syriatel Cash */}
                    <div style={{ background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                      <h4 style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>3. سيرتيل كاش (Syriatel Cash)</h4>
                      <p style={{ margin: '0 0 0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>باسم: قاسم السخني</p>
                      <div 
                        onClick={() => handleCopy('0983635096')} 
                        style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>0983635096</span>
                        <span style={{ fontSize: '0.8rem', color: copiedText === '0983635096' ? 'var(--success)' : 'rgba(255,255,255,0.5)' }}>
                          {copiedText === '0983635096' ? 'تم النسخ!' : 'نسخ'}
                        </span>
                      </div>
                    </div>

                    {/* Haram */}
                    <div style={{ background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                      <h4 style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '0.5rem' }}>4. شركة الهرم للحوالات</h4>
                      <p style={{ margin: '0 0 0.5rem 0', color: 'rgba(255,255,255,0.7)' }}>الاسم: قاسم عبد السلام السخني<br/>المحافظة: دمشق</p>
                      <div 
                        onClick={() => handleCopy('0983635096')} 
                        style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>0983635096</span>
                        <span style={{ fontSize: '0.8rem', color: copiedText === '0983635096' ? 'var(--success)' : 'rgba(255,255,255,0.5)' }}>
                          {copiedText === '0983635096' ? 'تم النسخ!' : 'نسخ'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>إرفاق صورة الإيصال (إجباري)</label>
                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem', border: `2px dashed ${receiptImage ? 'var(--success)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '12px', cursor: 'pointer', background: 'rgba(0,0,0,0.3)', transition: 'border-color 0.3s' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              setError('حجم الصورة يجب أن لا يتجاوز 2 ميغابايت');
                              return;
                            }
                            setError('');
                            setReceiptFileName(file.name);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setReceiptImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Upload size={32} color={receiptImage ? 'var(--success)' : 'rgba(255,255,255,0.5)'} />
                      <span style={{ color: receiptImage ? 'var(--success)' : 'rgba(255,255,255,0.7)', fontWeight: receiptImage ? 'bold' : 'normal' }}>
                        {receiptFileName ? receiptFileName : 'انقر هنا لاختيار صورة الإيصال (jpg, png)'}
                      </span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {paymentMethod === 'WALLET' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: '3rem' }}>
                <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--success)' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--success)' }}>الدفع عبر المحفظة الداخلية</h3>
                  <div style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                    <span style={{ fontSize: '1.1rem' }}>رصيدك الحالي:</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${walletData?.walletUSD?.toFixed(2) || '0.00'}</span>
                  </div>
                  {(walletData?.walletUSD || 0) < (course?.price - (course?.price * (discount / 100))) ? (
                    <div style={{ color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={18} /> رصيدك غير كافٍ لإتمام عملية الشراء. يرجى شحن محفظتك أولاً.
                    </div>
                  ) : (
                    <div style={{ color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={18} /> رصيدك يكفي لإتمام هذه العملية. سيتم الخصم مباشرة عند التأكيد.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {(paymentMethod === 'TABBY' || paymentMethod === 'TAMARA') && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: '3rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', color: paymentMethod === 'TABBY' ? '#3EEDC4' : '#F18070' }}>
                    الدفع بالتقسيط عبر {paymentMethod === 'TABBY' ? 'تابي (Tabby)' : 'تمارا (Tamara)'}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}>
                    سيتم توجيهك إلى صفحة {paymentMethod === 'TABBY' ? 'تابي' : 'تمارا'} الآمنة لإتمام عملية الشراء بنظام التقسيط المريح بدون أي فوائد إضافية. يتطلب ذلك إدخال رقم هاتفك وبعض التفاصيل الأساسية.
                  </p>
                </div>
              </motion.div>
            )}

            {(paymentMethod === 'STRIPE' || paymentMethod === 'PAYPAL') && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: '3rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem', color: paymentMethod === 'STRIPE' ? 'var(--primary)' : '#3b82f6' }}>
                    الدفع عبر {paymentMethod === 'STRIPE' ? 'البطاقة الائتمانية' : 'باي بال (PayPal)'}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}>
                    سيتم توجيهك إلى بوابة الدفع الآمنة لإدخال تفاصيل الدفع الخاصة بك. جميع بياناتك مشفرة بالكامل ولا نقوم بتخزين أي معلومات متعلقة ببطاقتك.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
