'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Wallet, ShieldCheck, CheckCircle, Tag, AlertTriangle, ArrowRight, Upload, HelpCircle, Lock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { checkoutResult } from '@/lib/payments/checkout-result';

type CheckoutCourse = { title: string; price: number; thumbnail: string | null; instructor: { name: string } };
type WalletBalance = { walletUSD: number; walletSYP: number };
type TrackingWindow = Window & { fbq?: (action: string, event: string, payload: { value: number; currency: string }) => void };

/** Image types the purchase endpoint accepts for a manual-transfer receipt. */
const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
/** Decoded size the purchase endpoint accepts. */
const MAX_RECEIPT_BYTES = 2 * 1024 * 1024;
/** Photos straight from a phone camera are accepted, then shrunk before upload. */
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
/** Small images are sent untouched so screenshots stay pixel-sharp. */
const KEEP_ORIGINAL_BYTES = 400 * 1024;
const RECEIPT_MAX_SIDE = 1600;
/** Slow connections get a reassurance first, then a clear, retryable error. */
const SLOW_HINT_MS = 12_000;
const REQUEST_TIMEOUT_MS = 90_000;

const dataUrlBytes = (url: string) => Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4);

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read')));
    reader.onerror = () => reject(reader.error ?? new Error('read'));
    reader.readAsDataURL(file);
  });
}

/**
 * The receipt travels inside the purchase request, so a multi-megabyte photo can
 * keep the button on "جاري المعالجة" for minutes on a slow mobile connection.
 * Re-encode large images as a compact JPEG (every digit stays readable) that the
 * server accepts unchanged.
 */
async function prepareReceipt(file: File): Promise<string> {
  if (file.size <= KEEP_ORIGINAL_BYTES) return readAsDataUrl(file);
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, RECEIPT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas');
      context.fillStyle = '#ffffff'; // transparent screenshots become white, not black
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.8, 0.7, 0.6]) {
        const url = canvas.toDataURL('image/jpeg', quality);
        if (url.startsWith('data:image/jpeg') && dataUrlBytes(url) <= MAX_RECEIPT_BYTES) return url;
      }
    } finally {
      bitmap.close();
    }
  } catch {
    /* Decoding unavailable: fall back to the original file below. */
  }
  if (file.size > MAX_RECEIPT_BYTES) throw new Error('too-large');
  return readAsDataUrl(file);
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const courseId = searchParams?.get('courseId') || '';

  const [course, setCourse] = useState<CheckoutCourse | null>(null);
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('STRIPE');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [slow, setSlow] = useState(false);
  const [preparingReceipt, setPreparingReceipt] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const submitting = useRef(false);
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);
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
          (window as TrackingWindow).fbq?.('track', 'InitiateCheckout', { value: data.course?.price, currency: 'USD' });
          const available = ['STRIPE', 'PAYPAL', 'TABBY', 'TAMARA', 'WALLET', 'MANUAL'].find(method => data.paymentSettings?.[`ENABLE_${method}`] !== 'false');
          if (available) setPaymentMethod(available);
        } else {
          setError(data.error);
        }
      } catch {
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
    } catch {
      setError('خطأ في التحقق من الكوبون');
    }
  };

  const handleCheckout = async () => {
    if (submitting.current || success || preparingReceipt) return;
    if (paymentMethod === 'MANUAL' && !receiptImage) {
      setError('يرجى إرفاق صورة الإيصال لإتمام طلب التحويل اليدوي');
      return;
    }

    submitting.current = true;
    setProcessing(true);
    setError('');
    // Never leave the customer on an endless spinner: reassure after a few
    // seconds, then stop waiting. Retrying is safe: the gateway request reuses the
    // same operation id, and the wallet endpoint never charges an owned course twice.
    const controller = new AbortController();
    const slowTimer = setTimeout(() => setSlow(true), SLOW_HINT_MS);
    const timeoutTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      if (paymentMethod === 'WALLET') {
        const res = await fetch('/api/checkout/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, paymentCurrency: 'USD', couponCode: coupon || undefined }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setSuccess(true);
          setSuccessMessage('تم الشراء بنجاح، جاري التوجيه...');
          (window as TrackingWindow).fbq?.('track', 'Purchase', { value: finalPrice, currency: 'USD' });
          setTimeout(() => {
            window.location.assign(`/courses/${encodeURIComponent(courseId)}/learn`);
          }, 2000);
        } else {
          setError(data.error || 'فشلت عملية الدفع من المحفظة');
        }
      } else {
        const fingerprint = JSON.stringify([courseId, paymentMethod, coupon, receiptImage]);
        if (operation.current?.fingerprint !== fingerprint) operation.current = { fingerprint, id: crypto.randomUUID() };
        const res = await fetch('/api/checkout/gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            courseId, 
            provider: paymentMethod, 
            operationId: operation.current.id,
            couponCode: coupon || undefined,
            receiptImage: paymentMethod === 'MANUAL' ? receiptImage : undefined
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        
        if (res.ok) {
          const result = checkoutResult(data, paymentMethod);
          if (result.kind === 'redirect') window.location.assign(result.url);
          else if (result.kind === 'enrolled') window.location.assign(`/courses/${encodeURIComponent(courseId)}/learn`);
          else {
            setSuccess(true);
            setSuccessMessage('تم إرسال طلب الدفع وهو قيد المراجعة. سيُفعّل الوصول بعد تأكيد الدفع.');
          }
        } else {
          setError(data.error || 'حدث خطأ في تجهيز بوابة الدفع');
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setError('استغرق الطلب وقتاً أطول من المعتاد بسبب بطء الاتصال، ولم يصلنا تأكيد بعد. اضغط «إتمام الشراء» مرة أخرى للتحقق من حالة طلبك؛ لن يُنشأ طلب مكرر ولن يُخصم المبلغ مرتين.');
      } else if (error instanceof TypeError) {
        setError('تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم اضغط «إتمام الشراء» مرة أخرى؛ لن يُنشأ طلب مكرر.');
      } else {
        setError(error instanceof Error ? error.message : 'تعذّر تأكيد الطلب. أعد المحاولة بنفس البيانات للتحقق من حالته.');
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
      setSlow(false);
      submitting.current = false;
      setProcessing(false);
    }
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

  const finalPrice = (course?.price ?? 0) * (1 - discount / 100);

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

      <div style={{ maxWidth: '1200px', margin: '3rem auto', padding: '0 5%', display: 'flex', gap: 'clamp(1.5rem, 4vw, 4rem)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Payment Details */}
        <div style={{ flex: '1 1 min(100%, 600px)' }}>
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '2rem' }}>اختر طريقة الدفع</h2>
          
          <div className="payment-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
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
                          src="/images/sham-cash-barcode.jpg" 
                          alt="Sham Cash Barcode" 
                          style={{ maxWidth: '200px', width: '100%', height: 'auto', marginBottom: '1rem' }} 
                        />
                        <a href="/images/sham-cash-barcode.jpg" download="sham-cash-barcode.jpg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(62, 237, 196, 0.15)', color: '#000', padding: '0.6rem 1.2rem', borderRadius: '8px', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 'bold', border: '1px solid #3EEDC4' }}>
                           <Upload size={18} /> تحميل الباركود (Download)
                        </a>
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
                        accept={RECEIPT_TYPES.join(',')}
                        style={{ display: 'none' }}
                        disabled={preparingReceipt || processing}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          if (!RECEIPT_TYPES.includes(file.type)) {
                            setError('صيغة الصورة غير مدعومة. يرجى رفع صورة بصيغة JPG أو PNG أو WebP');
                            return;
                          }
                          if (file.size > MAX_SOURCE_BYTES) {
                            setError('حجم الصورة كبير جداً، يرجى اختيار صورة أصغر من 15 ميغابايت');
                            return;
                          }
                          setError('');
                          setPreparingReceipt(true);
                          try {
                            setReceiptImage(await prepareReceipt(file));
                            setReceiptFileName(file.name);
                          } catch {
                            setError('تعذّر تجهيز الصورة، يرجى اختيار صورة أخرى بصيغة JPG أو PNG');
                          } finally {
                            setPreparingReceipt(false);
                          }
                        }}
                      />
                      <Upload size={32} color={receiptImage ? 'var(--success)' : 'rgba(255,255,255,0.5)'} />
                      <span aria-live="polite" style={{ color: receiptImage ? 'var(--success)' : 'rgba(255,255,255,0.7)', fontWeight: receiptImage ? 'bold' : 'normal' }}>
                        {preparingReceipt ? 'جاري تجهيز الصورة...' : receiptFileName ? receiptFileName : 'انقر هنا لاختيار صورة الإيصال (jpg, png)'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>تُضغط الصور الكبيرة تلقائياً لرفع أسرع</span>
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
                  {(walletData?.walletUSD || 0) < finalPrice ? (
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
        <div className="checkout-summary" style={{ flex: '1 1 min(100%, 400px)', position: 'sticky', top: '2rem' }}>
          <div className="glass-card checkout-card" style={{ padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,15,15,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>ملخص الطلب</h2>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              {course?.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <div style={{ width: '80px', height: '60px', background: '#222', borderRadius: '8px' }} />
              )}
              <div>
                <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{course?.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>{course?.instructor.name}</p>
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
                  <span>- ${((course?.price ?? 0) * (discount / 100)).toFixed(2)}</span>
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
                <CheckCircle size={20} /> {successMessage}
              </div>
            )}

            <button 
              onClick={handleCheckout} 
              disabled={processing || success || preparingReceipt}
              className="btn btn-solid"
              style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: processing ? 0.7 : 1 }}
            >
              {processing ? (
                <>{paymentMethod === 'MANUAL' ? 'جاري إرسال الطلب والإيصال' : 'جاري المعالجة'} <div className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /></>
              ) : (
                <><ShieldCheck size={24} /> إتمام الشراء (${finalPrice?.toFixed(2)})</>
              )}
            </button>

            {processing && slow && (
              <p role="status" style={{ marginTop: '1rem', marginBottom: 0, padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid rgba(201,164,92,0.45)', background: 'rgba(201,164,92,0.1)', color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                الاتصال أبطأ من المعتاد، ما زلنا نعالج طلبك. يرجى إبقاء هذه الصفحة مفتوحة.
              </p>
            )}

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <Lock size={12} /> معاملة آمنة ومشفرة بالكامل
            </p>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .checkout-summary { position: static !important; top: 0 !important; }
          .payment-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .checkout-card { padding: 1.5rem !important; }
        }
      `}} />
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
