'use client';

import { useState, useRef } from 'react';
import { Upload, PlusCircle, History, ImageIcon, CheckCircle, Clock, XCircle, Smartphone, Building2, Globe } from 'lucide-react';

const PAYMENT_METHODS = [
  {
    id: 'syriatel',
    name: 'سيريتل كاش',
    nameEn: 'Syriatel Cash',
    subtitle: 'تحويل سريع عبر الهاتف',
    account: '0983635096',
    accountName: 'قاسم السخني',
    accountLabel: 'رقم المحفظة',
    icon: '🔴',
    color: '#e63946',
    bg: 'rgba(230,57,70,0.08)',
    border: 'rgba(230,57,70,0.3)',
    currency: 'SYP',
    type: 'local',
  },
  {
    id: 'mtn',
    name: 'MTN كاش',
    nameEn: 'MTN Cash',
    subtitle: 'تحويل سريع عبر الهاتف',
    account: '0983635096',
    accountName: 'قاسم السخني',
    accountLabel: 'رقم المحفظة',
    icon: '🟡',
    color: '#f6c90e',
    bg: 'rgba(246,201,14,0.08)',
    border: 'rgba(246,201,14,0.3)',
    currency: 'SYP',
    type: 'local',
  },
  {
    id: 'cham',
    name: 'الشام كاش',
    nameEn: 'Cham Cash',
    subtitle: 'محفظة سورية رقمية',
    account: 'f698bd6104ecfc91435335321b7978fc',
    accountLabel: 'رقم الحساب',
    icon: '🟢',
    color: '#06d6a0',
    bg: 'rgba(6,214,160,0.08)',
    border: 'rgba(6,214,160,0.3)',
    currency: 'SYP',
    type: 'local',
    qrImage: '/cham-cash-qr.png'
  },
  {
    id: 'hawalet',
    name: 'حوالات الهرم',
    nameEn: 'Al-Haram Transfer',
    subtitle: 'حوالة مالية',
    account: '0983635096',
    accountName: 'قاسم عبد السلام السخني (دمشق)',
    accountLabel: 'رقم المستلم',
    icon: '🏢',
    color: '#4361ee',
    bg: 'rgba(67,97,238,0.08)',
    border: 'rgba(67,97,238,0.3)',
    currency: 'SYP',
    type: 'local',
  },
  {
    id: 'binance',
    name: 'Binance Pay',
    nameEn: 'Binance Pay',
    subtitle: 'يُحوَّل حسب سعر الصرف الرسمي',
    account: '1014947222',
    accountLabel: 'معرّف Binance Pay',
    icon: '₿',
    color: '#f0b90b',
    bg: 'rgba(240,185,11,0.08)',
    border: 'rgba(240,185,11,0.3)',
    currency: 'USD',
    type: 'international',
  },
  {
    id: 'card',
    name: 'بطاقة بنكية',
    nameEn: 'Credit / Debit Card',
    subtitle: 'يُحوَّل حسب سعر الصرف الرسمي',
    account: 'عبر بوابة الدفع الآمنة',
    accountLabel: 'طريقة الدفع',
    icon: '💳',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.3)',
    currency: 'USD',
    type: 'international',
  },
];

export default function WalletClient({ initialTransactions }: { initialTransactions: any[] }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SYP');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [receiptBase64, setReceiptBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tab, setTab] = useState<'local' | 'international'>('local');
  const fileRef = useRef<HTMLInputElement>(null);

  const activeMethods = PAYMENT_METHODS.filter(m => m.type === tab);
  const selectedMethodData = PAYMENT_METHODS.find(m => m.id === selectedMethod);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً (الحد الأقصى 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setReceiptPreview(base64);
      setReceiptBase64(base64);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleDeposit = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    if (!selectedMethod) { setErrorMsg('الرجاء اختيار طريقة الدفع'); return; }
    if (!amount || parseFloat(amount) <= 0) { setErrorMsg('الرجاء إدخال مبلغ صحيح'); return; }
    if (!receiptBase64) { setErrorMsg('الرجاء إرفاق صورة وصل التحويل'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount), currency, receiptImage: receiptBase64, paymentMethod: selectedMethod }),
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions([data.transaction, ...transactions]);
        setAmount('');
        setReceiptPreview('');
        setReceiptBase64('');
        setSelectedMethod(null);
        setSuccessMsg(data.message);
      } else {
        setErrorMsg(data.error || 'حدث خطأ أثناء إرسال الطلب');
      }
    } catch {
      setErrorMsg('خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem' }}>

      {/* Deposit Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Step 1 - Currency Selection */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.75rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>1</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>أدخل المبلغ وعملة الشحن</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="مثال: 50000"
              min="1"
              style={{ flex: 1, padding: '0.9rem 1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', fontSize: '1.1rem', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <button
                onClick={() => setCurrency('SYP')}
                style={{ padding: '0.9rem 1.25rem', background: currency === 'SYP' ? 'var(--primary)' : 'transparent', color: currency === 'SYP' ? '#000' : 'rgba(255,255,255,0.6)', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
              >
                ل.س
              </button>
              <button
                onClick={() => setCurrency('USD')}
                style={{ padding: '0.9rem 1.25rem', background: currency === 'USD' ? '#3b82f6' : 'transparent', color: currency === 'USD' ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
              >
                USD $
              </button>
            </div>
          </div>
          {currency === 'USD' && amount && (
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>
              ≈ {(parseFloat(amount) * 14500).toLocaleString()} ل.س بسعر الصرف الرسمي (14,500)
            </p>
          )}
        </div>

        {/* Step 2 - Payment Method Selection */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.75rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>2</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>اختر طريقة الدفع</h3>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '4px', marginBottom: '1.25rem', gap: '4px' }}>
            <button
              onClick={() => { setTab('local'); setSelectedMethod(null); }}
              style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'local' ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === 'local' ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
            >
              <Smartphone size={15} /> محلي (بالليرة السورية)
            </button>
            <button
              onClick={() => { setTab('international'); setSelectedMethod(null); }}
              style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'international' ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === 'international' ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
            >
              <Globe size={15} /> دولي (بالدولار الأمريكي)
            </button>
          </div>

          {/* Method Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {activeMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id === selectedMethod ? null : method.id)}
                style={{
                  padding: '1rem 1.1rem',
                  background: selectedMethod === method.id ? method.bg : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${selectedMethod === method.id ? method.color : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.25s',
                  fontFamily: 'inherit',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {selectedMethod === method.id && (
                  <div style={{ position: 'absolute', top: '8px', left: '8px', width: '20px', height: '20px', borderRadius: '50%', background: method.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={13} color="#000" />
                  </div>
                )}
                <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{method.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedMethod === method.id ? method.color : '#fff', marginBottom: '0.1rem' }}>{method.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>{method.subtitle}</div>
              </button>
            ))}
          </div>

          {/* Selected method details */}
          {selectedMethodData && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: selectedMethodData.bg, border: `1px solid ${selectedMethodData.border}`, borderRadius: '10px' }}>
              
              {selectedMethodData.accountName && (
                <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>الاسم:</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: selectedMethodData.color, letterSpacing: '0.5px' }}>
                      {selectedMethodData.accountName}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMethodData.accountName || '');
                        alert('تم نسخ الاسم بنجاح');
                      }}
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}
                    >
                      نسخ
                    </button>
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>{selectedMethodData.accountLabel}:</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: selectedMethodData.color, letterSpacing: '0.5px', direction: 'ltr' }}>
                  {selectedMethodData.account}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedMethodData.account);
                    alert('تم النسخ بنجاح');
                  }}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}
                >
                  نسخ
                </button>
              </div>

              {selectedMethodData.qrImage && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontWeight: 'bold' }}>
                    يمكنك مسح الباركود التالي لتسهيل الدفع عبر تطبيق الشام كاش:
                  </p>
                  <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
                    <img src={selectedMethodData.qrImage} alt="QR Code" style={{ width: '200px', height: 'auto', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <a 
                      href={selectedMethodData.qrImage} 
                      download="ChamCash-QR.png"
                      style={{ display: 'inline-block', background: selectedMethodData.color, color: '#000', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem' }}
                    >
                      تحميل الباركود
                    </a>
                  </div>
                </div>
              )}

              <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.6rem' }}>
                ⚡ قم بإرسال المبلغ إلى الحساب أعلاه، ثم ارفع صورة الإيصال في الخطوة التالية.
              </p>
            </div>
          )}
        </div>

        {/* Step 3 - Receipt Upload */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.75rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>3</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>ارفع صورة وصل التحويل</h3>
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

          {receiptPreview ? (
            <div style={{ position: 'relative' }}>
              <img src={receiptPreview} alt="receipt" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(203,161,83,0.3)' }} />
              <button
                onClick={() => { setReceiptPreview(''); setReceiptBase64(''); }}
                style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ef4444', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '2rem 1rem',
                background: 'rgba(203,161,83,0.04)',
                border: '2px dashed rgba(203,161,83,0.25)',
                borderRadius: '12px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
                fontFamily: 'inherit', transition: 'all 0.3s'
              }}
            >
              <ImageIcon size={36} color="rgba(203,161,83,0.4)" />
              <span style={{ fontWeight: 600 }}>اضغط لاختيار صورة الإيصال</span>
              <span style={{ fontSize: '0.75rem' }}>PNG, JPG — حتى 5MB</span>
            </button>
          )}

          {/* Alerts */}
          {successMsg && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#22c55e', padding: '0.85rem 1rem', borderRadius: '10px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} /> <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.85rem 1rem', borderRadius: '10px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle size={18} /> {errorMsg}
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '1rem', marginTop: '1.25rem',
              background: isSubmitting ? 'rgba(203,161,83,0.5)' : 'linear-gradient(135deg, var(--primary) 0%, #b8852a 100%)',
              color: '#000', borderRadius: '10px', border: 'none',
              fontWeight: 700, fontSize: '1.1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.3s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(203,161,83,0.3)',
            }}
          >
            {isSubmitting ? (
              <>
                <div style={{ width: '18px', height: '18px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                جاري الإرسال...
              </>
            ) : (
              <><Upload size={18} /> إرسال طلب الشحن</>
            )}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.75rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', height: 'fit-content', position: 'sticky', top: '100px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <History size={20} /> سجل حركات المحفظة
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto' }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.3)' }}>
              <History size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>لا توجد حركات في محفظتك بعد</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(0,0,0,0.2)', padding: '0.9rem 1.1rem', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.2rem', fontSize: '0.9rem' }}>
                    {tx.type === 'DEPOSIT' ? '⬆️ شحن رصيد' : tx.type === 'PURCHASE' ? '🛒 شراء كورس' : '⬇️ سحب رصيد'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                    {new Date(tx.createdAt).toLocaleString('ar-SY')}
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: tx.type === 'DEPOSIT' ? '#22c55e' : '#ef4444' }}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency}
                  </div>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                    color: tx.status === 'APPROVED' ? '#22c55e' : tx.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                    justifyContent: 'flex-end', marginTop: '0.2rem'
                  }}>
                    {tx.status === 'APPROVED' ? <><CheckCircle size={11} /> مكتمل</> :
                      tx.status === 'REJECTED' ? <><XCircle size={11} /> مرفوض</> :
                        <><Clock size={11} /> قيد المراجعة</>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
