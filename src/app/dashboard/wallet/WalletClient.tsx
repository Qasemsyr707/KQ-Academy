'use client';

import { useState, useRef } from 'react';
import { Upload, History, ImageIcon, CheckCircle, Clock, XCircle, Smartphone, Globe, CreditCard, Building, Building2, Copy, ShieldCheck, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PAYMENT_METHODS = [
  {
    id: 'syriatel',
    name: 'سيريتل كاش',
    nameEn: 'Syriatel Cash',
    subtitle: 'تحويل سريع عبر الهاتف',
    account: '0983635096',
    accountName: 'قاسم السخني',
    accountLabel: 'رقم المحفظة',
    icon: <Smartphone size={24} />,
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
    icon: <Smartphone size={24} />,
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
    icon: <Wallet size={24} />,
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
    icon: <Building2 size={24} />,
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
    icon: <Globe size={24} />,
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
    icon: <CreditCard size={24} />,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.3)',
    currency: 'USD',
    type: 'international',
  },
];

import { Wallet } from 'lucide-react';

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
    if (!receiptBase64 && selectedMethod !== 'card') { setErrorMsg('الرجاء إرفاق صورة وصل التحويل'); return; }

    if (selectedMethod === 'card') {
       // redirect to checkout route or stripe top-up session
       return;
    }

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
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '3rem' }}>

      {/* Left Column: Deposit Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Step 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,15,15,0.6)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: '1.1rem' }}>1</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>أدخل المبلغ وعملة الشحن</h3>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="مثال: 50000"
                min="1"
                style={{ width: '100%', padding: '1.2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontSize: '1.2rem', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <button
                onClick={() => setCurrency('SYP')}
                style={{ padding: '0 1.5rem', background: currency === 'SYP' ? 'var(--primary)' : 'transparent', color: currency === 'SYP' ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
              >
                ل.س
              </button>
              <button
                onClick={() => setCurrency('USD')}
                style={{ padding: '0 1.5rem', background: currency === 'USD' ? '#3b82f6' : 'transparent', color: currency === 'USD' ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}
              >
                USD
              </button>
            </div>
          </div>
          {currency === 'USD' && amount && (
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={14} color="var(--primary)" /> يعادل تقريباً {(parseFloat(amount) * 14500).toLocaleString()} ل.س بسعر الصرف الرسمي.
            </p>
          )}
        </motion.div>

        {/* Step 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,15,15,0.6)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: '1.1rem' }}>2</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>اختر طريقة الدفع</h3>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '2rem', gap: '4px' }}>
            <button
              onClick={() => { setTab('local'); setSelectedMethod(null); }}
              style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'local' ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === 'local' ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s' }}
            >
              <Smartphone size={18} /> محلي (سوريا)
            </button>
            <button
              onClick={() => { setTab('international'); setSelectedMethod(null); }}
              style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: 'none', background: tab === 'international' ? 'rgba(255,255,255,0.08)' : 'transparent', color: tab === 'international' ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s' }}
            >
              <Globe size={18} /> دولي (عالمي)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {activeMethods.map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id === selectedMethod ? null : method.id)}
                className="group"
                style={{
                  padding: '1.5rem',
                  background: selectedMethod === method.id ? method.bg : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${selectedMethod === method.id ? method.color : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10" style={{ background: `radial-gradient(circle at center, ${method.color} 0%, transparent 70%)`, transition: 'opacity 0.3s' }} />
                
                {selectedMethod === method.id && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: '12px', left: '12px', color: method.color }}>
                    <CheckCircle size={24} fill={`${method.color}33`} />
                  </motion.div>
                )}
                
                <div style={{ color: selectedMethod === method.id ? method.color : '#fff', marginBottom: '0.8rem' }}>
                  {method.icon}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: selectedMethod === method.id ? method.color : '#fff', marginBottom: '0.2rem' }}>{method.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{method.subtitle}</div>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedMethodData && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: selectedMethodData.bg, border: `1px solid ${selectedMethodData.border}`, borderRadius: '16px' }}>
                  
                  {selectedMethodData.accountName && (
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>الاسم المسجل:</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: selectedMethodData.color }}>{selectedMethodData.accountName}</span>
                        <button onClick={() => { navigator.clipboard.writeText(selectedMethodData.accountName || ''); alert('تم النسخ'); }} className="btn btn-outline" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                          <Copy size={14} /> نسخ
                        </button>
                      </div>
                    </div>
                  )}

                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>{selectedMethodData.accountLabel}:</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: selectedMethodData.color, direction: 'ltr' }}>{selectedMethodData.account}</span>
                    <button onClick={() => { navigator.clipboard.writeText(selectedMethodData.account); alert('تم النسخ'); }} className="btn btn-outline" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                      <Copy size={14} /> نسخ
                    </button>
                  </div>

                  {selectedMethodData.qrImage && (
                    <div style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px' }}>
                      <p style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '1rem' }}>امسح الباركود باستخدام تطبيق {selectedMethodData.name}</p>
                      <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '12px', display: 'inline-block' }}>
                        <img src={selectedMethodData.qrImage} alt="QR Code" style={{ width: '150px', height: '150px', objectFit: 'contain' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <ShieldCheck color={selectedMethodData.color} style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
                      بعد إتمام عملية التحويل للحساب المذكور أعلاه، يرجى حفظ صورة إيصال التحويل (سكرين شوت) ورفعه في الخطوة التالية لإثبات الدفع.
                    </p>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Step 3 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,15,15,0.6)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: '1.1rem' }}>3</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: 0 }}>إثبات التحويل</h3>
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

          {receiptPreview ? (
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--primary)' }}>
              <img src={receiptPreview} alt="receipt" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }} />
              <button
                onClick={() => { setReceiptPreview(''); setReceiptBase64(''); }}
                style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.8)', border: 'none', color: '#ef4444', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <XCircle size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="group"
              style={{
                width: '100%', padding: '3rem 2rem',
                background: 'rgba(255,255,255,0.02)',
                border: '2px dashed rgba(255,255,255,0.2)',
                borderRadius: '16px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(203,161,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Upload size={32} />
              </div>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'block', color: '#fff', marginBottom: '0.3rem' }}>اضغط هنا لرفع صورة الإيصال</span>
                <span style={{ fontSize: '0.85rem' }}>صيغ مدعومة: JPG, PNG - الحد الأقصى 5MB</span>
              </div>
            </button>
          )}

          {/* Alerts */}
          <AnimatePresence>
            {successMsg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                  <CheckCircle size={20} /> {successMsg}
                </div>
              </motion.div>
            )}
            {errorMsg && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                  <XCircle size={20} /> {errorMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleDeposit}
            disabled={isSubmitting}
            className="btn btn-solid"
            style={{
              width: '100%', padding: '1.2rem', marginTop: '2rem',
              fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? (
              <><div className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> جاري الإرسال...</>
            ) : (
              <><ShieldCheck size={24} /> تأكيد وإرسال الطلب</>
            )}
          </button>
        </motion.div>
      </div>

      {/* Right Column: Transaction History */}
      <div style={{ position: 'sticky', top: '2rem' }}>
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="glass-card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,15,15,0.6)', height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#fff' }}>
            <History size={24} color="var(--primary)" /> سجل العمليات
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <History size={48} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: '1rem', maxWidth: '200px' }}>لا توجد عمليات سابقة في محفظتك.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: tx.type === 'DEPOSIT' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tx.type === 'DEPOSIT' ? '#22c55e' : '#ef4444' }}>
                      {tx.type === 'DEPOSIT' ? <Upload size={20} /> : <BookOpen size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '1rem', color: '#fff' }}>
                        {tx.type === 'DEPOSIT' ? 'شحن رصيد' : 'شراء كورس'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(tx.createdAt).toLocaleString('ar-SY')}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: tx.type === 'DEPOSIT' ? '#22c55e' : '#fff' }}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency}
                    </div>
                    <div style={{
                      fontSize: '0.8rem', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      color: tx.status === 'APPROVED' ? '#22c55e' : tx.status === 'REJECTED' ? '#ef4444' : '#f59e0b',
                      justifyContent: 'flex-end', marginTop: '0.4rem'
                    }}>
                      {tx.status === 'APPROVED' ? <><CheckCircle size={14} /> مكتمل</> :
                        tx.status === 'REJECTED' ? <><XCircle size={14} /> مرفوض</> :
                          <><Clock size={14} /> قيد المراجعة</>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
