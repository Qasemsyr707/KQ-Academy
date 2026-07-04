'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, CreditCard, Image as ImageIcon, Smartphone, Building, ArrowRight, Copy, Tag, Wallet } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get('courseId');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [checkoutInfo, setCheckoutInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Coupon State
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [finalPriceSYP, setFinalPriceSYP] = useState(0);
  const [finalPriceUSD, setFinalPriceUSD] = useState(0);
  const [couponError, setCouponError] = useState('');

  // Wallet specific state
  const [walletCurrencyChoice, setWalletCurrencyChoice] = useState<'SYP'|'USD'>('SYP');

  useEffect(() => {
    if (!courseId) return;
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/checkout/info?courseId=${courseId}`);
        if (res.ok) {
          const data = await res.json();
          setCheckoutInfo(data);
          setFinalPriceSYP(data.course.priceSYP);
          setFinalPriceUSD(data.course.price);
        } else {
          alert('خطأ في جلب بيانات الكورس');
        }
      } catch (e) {
        console.error(e);
      }
      setLoadingInfo(false);
    };
    fetchInfo();
  }, [courseId]);

  const paymentMethods = [
    { id: 'wallet', name: 'الدفع من المحفظة', icon: <Wallet size={24} /> },
    { id: 'shamcash', name: 'شام كاش', icon: <Smartphone size={24} /> },
    { id: 'binance', name: 'بينانس (Binance)', icon: <Building size={24} /> },
    { id: 'syriatel', name: 'سيريتل كاش', icon: <Smartphone size={24} /> },
    { id: 'alharam', name: 'الهرم للحوالات', icon: <Building size={24} /> },
  ];

  const handleApplyCoupon = async () => {
    if (!promoCode || !courseId) return;
    setIsApplyingCoupon(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, courseId })
      });
      const data = await res.json();
      if (res.ok) {
        setDiscountPercent(data.discount);
        // Calculate new prices
        setFinalPriceSYP(checkoutInfo.course.priceSYP * (1 - data.discount / 100));
        setFinalPriceUSD(checkoutInfo.course.price * (1 - data.discount / 100));
        setCouponApplied(true);
      } else {
        setCouponError(data.error);
      }
    } catch (err) {
      setCouponError('حدث خطأ أثناء التحقق من الكوبون');
    }
    setIsApplyingCoupon(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم النسخ بنجاح');
  };

  const handleWalletPurchase = async () => {
    if (!confirm('هل أنت متأكد من رغبتك بالشراء من المحفظة؟')) return;
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/checkout/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, paymentCurrency: walletCurrencyChoice })
      });
      const data = await res.json();
      if (res.ok) {
        setStep(3);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('حدث خطأ');
    }
    setIsUploading(false);
  };

  const renderPaymentDetails = () => {
    switch (selectedMethod) {
      case 'wallet':
        // Wallet logic
        const needsConversion = walletCurrencyChoice === 'SYP' && checkoutInfo.wallet.walletSYP < finalPriceSYP;
        const canPay = 
          (walletCurrencyChoice === 'SYP' && (checkoutInfo.wallet.walletSYP >= finalPriceSYP || checkoutInfo.wallet.walletUSD >= (finalPriceSYP / checkoutInfo.exchangeRate))) ||
          (walletCurrencyChoice === 'USD' && checkoutInfo.wallet.walletUSD >= finalPriceUSD);
        
        const deductedUSD = needsConversion ? (finalPriceSYP / checkoutInfo.exchangeRate).toFixed(2) : finalPriceUSD;

        return (
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>الدفع عبر المحفظة</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                رصيد ل.س: <strong style={{ color: 'var(--primary)' }}>{checkoutInfo.wallet.walletSYP.toLocaleString()}</strong>
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                رصيد $: <strong style={{ color: '#22c55e' }}>{checkoutInfo.wallet.walletUSD.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>اختر عملة الدفع:</label>
              <select 
                value={walletCurrencyChoice}
                onChange={e => setWalletCurrencyChoice(e.target.value as any)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff' }}
              >
                <option value="SYP">الليرة السورية ({finalPriceSYP.toLocaleString()} ل.س)</option>
                <option value="USD">الدولار الأمريكي (${finalPriceUSD.toLocaleString()})</option>
              </select>
            </div>

            {needsConversion && (
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '1rem', borderRadius: '8px', color: '#facc15', marginBottom: '1rem' }}>
                <strong>تنبيه تحويل العملة:</strong> رصيدك بالليرة السورية غير كافٍ. سيتم خصم المبلغ من رصيدك بالدولار بناءً على سعر الصرف ({checkoutInfo.exchangeRate.toLocaleString()} ل.س).
                <br/> المبلغ المخصوم: <strong>${deductedUSD}</strong>
              </div>
            )}

            {!canPay && (
              <div style={{ color: '#ef4444', marginBottom: '1rem' }}>رصيدك غير كافٍ لإتمام العملية. يرجى شحن المحفظة أولاً.</div>
            )}

            <button 
              onClick={handleWalletPurchase}
              disabled={!canPay || isUploading}
              className="btn btn-solid" 
              style={{ width: '100%', opacity: !canPay ? 0.5 : 1, cursor: !canPay ? 'not-allowed' : 'pointer' }}
            >
              {isUploading ? 'جاري المعالجة...' : 'تأكيد الشراء الفوري'}
            </button>
          </div>
        );

      case 'shamcash':
        return (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>الرجاء التحويل بقيمة <strong>{finalPriceSYP.toLocaleString()} ل.س</strong></p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>f698bd6104ecfc91435335321b7978fc</span>
              <button onClick={() => copyToClipboard('f698bd6104ecfc91435335321b7978fc')} className="btn" style={{ padding: '0.5rem', minWidth: 'auto' }}><Copy size={18} /></button>
            </div>
          </div>
        );
      case 'binance':
        return (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>الرجاء تحويل <strong>${finalPriceUSD.toLocaleString()}</strong> عبر Binance Pay ID:</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
              <button onClick={() => copyToClipboard('1014947222')} className="btn" style={{ padding: '0.5rem', minWidth: 'auto' }}><Copy size={18} /></button>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' }}>1014947222</span>
            </div>
          </div>
        );
      case 'syriatel':
        return (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>الرجاء تحويل <strong>{finalPriceSYP.toLocaleString()} ل.س</strong> إلى حساب سيريتل كاش التالي:</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <button onClick={() => copyToClipboard('0983635096')} className="btn" style={{ padding: '0.5rem', minWidth: 'auto' }}><Copy size={18} /></button>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px' }}>0983635096</span>
            </div>
          </div>
        );
      case 'alharam':
        return (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>الرجاء إرسال حوالة بقيمة <strong>{finalPriceSYP.toLocaleString()} ل.س</strong> عبر شركة الهرم بالبيانات التالية:</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <button onClick={() => copyToClipboard('قاسم عبد السلام السخني')} className="btn" style={{ padding: '0.5rem', minWidth: 'auto' }}><Copy size={18} /></button>
              <span style={{ fontSize: '1.1rem' }}><strong>قاسم عبد السلام السخني</strong></span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleManualUpload = () => {
    if (!file) return;
    setIsUploading(true);
    // Submit standard pending payment
    setTimeout(() => {
      setIsUploading(false);
      setStep(3);
    }, 1500);
  };

  if (loadingInfo) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: '#fff' }}>جاري التحميل...</div>;
  }

  if (!checkoutInfo) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: '#fff' }}>حدث خطأ!</div>;
  }

  return (
    <div className="container" style={{ padding: '4rem 5%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <motion.div 
        className="glass-card" 
        style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '3rem' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CreditCard size={48} color="var(--primary)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>شراء: {checkoutInfo.course.title}</h1>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1.5rem', borderRadius: '20px' }}>
                السعر: <strong style={{ color: '#22c55e' }}>${finalPriceUSD.toLocaleString()}</strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1.5rem', borderRadius: '20px' }}>
                السعر: <strong style={{ color: 'var(--primary)' }}>{finalPriceSYP.toLocaleString()} ل.س</strong>
              </div>
            </div>

            {/* Promo Code */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Tag size={18} color="var(--primary)" /> هل تملك كود خصم؟
              </h3>
              {!couponApplied ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="أدخل كود الخصم"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    style={{ flex: 1, padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                  />
                  <button onClick={handleApplyCoupon} disabled={isApplyingCoupon || !promoCode} style={{ background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', padding: '0 1.5rem', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isApplyingCoupon ? 'تحقق...' : 'تطبيق'}
                  </button>
                </div>
              ) : (
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.8rem', borderRadius: '8px', fontWeight: 'bold' }}>
                  تم تطبيق الخصم ({discountPercent}%) بنجاح!
                </div>
              )}
              {couponError && <div style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.9rem' }}>{couponError}</div>}
            </div>

            <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>اختر طريقة الدفع المناسبة:</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem',
                    background: selectedMethod === method.id ? 'rgba(203, 161, 83, 0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedMethod === method.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px', color: '#fff', cursor: 'pointer', transition: 'all 0.3s'
                  }}
                >
                  <div style={{ color: selectedMethod === method.id ? 'var(--primary)' : '#fff' }}>
                    {method.icon}
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: selectedMethod === method.id ? 700 : 400 }}>{method.name}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={() => setStep(2)} 
              disabled={!selectedMethod}
              className="btn btn-solid" 
              style={{ width: '100%', opacity: !selectedMethod ? 0.5 : 1, cursor: !selectedMethod ? 'not-allowed' : 'pointer' }}
            >
              التالي <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button onClick={() => setStep(1)} className="btn" style={{ marginBottom: '2rem', padding: '0.5rem 1rem' }}>الرجوع لاختيار الدفع</button>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>تأكيد الدفع</h1>
            
            <div style={{ background: 'rgba(203, 161, 83, 0.1)', border: '1px solid var(--primary)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
              {renderPaymentDetails()}
            </div>

            {selectedMethod !== 'wallet' && (
              <>
                <p style={{ opacity: 0.8, marginBottom: '2rem' }}>بعد التحويل، يرجى رفع صورة الإيصال ليتم تفعيل حسابك.</p>
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '2px dashed var(--border-light)', borderRadius: '16px', padding: '3rem 2rem', marginBottom: '2rem' }}>
                  <input type="file" accept="image/*" id="receipt-upload" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                  <label htmlFor="receipt-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    {file ? (
                      <><ImageIcon size={40} color="var(--success)" /><span style={{ color: 'var(--success)' }}>{file.name}</span></>
                    ) : (
                      <><Upload size={40} color="var(--primary)" /><span>اختر صورة الإيصال</span></>
                    )}
                  </label>
                </div>
                <button 
                  onClick={handleManualUpload} 
                  disabled={!file || isUploading}
                  className="btn btn-solid" 
                  style={{ width: '100%', opacity: (!file || isUploading) ? 0.5 : 1 }}
                >
                  {isUploading ? 'جاري الرفع...' : 'رفع وتأكيد'}
                </button>
              </>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h2 style={{ fontSize: '2rem', color: 'var(--success)', marginBottom: '1rem' }}>تمت العملية بنجاح!</h2>
            <p style={{ opacity: 0.8, marginBottom: '2rem' }}>
              تم استلام طلبك. ستتمكن من الدخول للكورس فوراً إذا كان الدفع عبر المحفظة، أو بعد مراجعة الإدارة للصورة.
            </p>
            <Link href="/dashboard" className="btn btn-solid">الذهاب إلى لوحة الطالب</Link>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: '#fff' }}>جاري التحميل...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
