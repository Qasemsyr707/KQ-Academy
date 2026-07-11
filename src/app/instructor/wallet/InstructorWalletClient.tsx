'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Wallet, DollarSign, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  createdAt: Date;
}

interface InstructorWalletClientProps {
  walletUSD: number;
  walletSYP: number;
  transactions: Transaction[];
}

export default function InstructorWalletClient({ walletUSD, walletSYP, transactions }: InstructorWalletClientProps) {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawMethod) return;

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if (currency === 'USD' && amountNum > walletUSD) {
      alert('الرصيد غير كافٍ');
      return;
    }
    
    if (currency === 'SYP' && amountNum > walletSYP) {
      alert('الرصيد غير كافٍ');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNum, currency, provider: withdrawMethod })
      });

      if (res.ok) {
        alert('تم تقديم طلب السحب بنجاح. قيد المراجعة من الإدارة.');
        setWithdrawAmount('');
        setWithdrawMethod('');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ أثناء تقديم الطلب');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}><CheckCircle size={14} /> مقبول</span>;
      case 'REJECTED': return <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}><XCircle size={14} /> مرفوض</span>;
      default: return <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}><Clock size={14} /> قيد المراجعة</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 5%', color: '#fff' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <Wallet size={32} color="var(--primary)" /> محفظة الأرباح
      </h1>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Left Column: Balances & Withdraw Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Balances */}
          <motion.div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(0,0,0,0.8) 100%)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', opacity: 0.8 }}>الرصيد القابل للسحب (USD)</h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={32} /> {walletUSD.toLocaleString()}
            </div>
          </motion.div>

          <motion.div className="glass-card" style={{ padding: '1.5rem' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', opacity: 0.8 }}>الرصيد القابل للسحب (SYP)</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
              {walletSYP.toLocaleString()} ل.س
            </div>
          </motion.div>

          {/* Withdraw Form */}
          <motion.div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(203,161,83,0.3)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#cba153' }}>طلب سحب أرباح</h3>
            <form onSubmit={handleWithdrawRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>العملة</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                >
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="SYP">ليرة سورية (SYP)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>المبلغ المراد سحبه</label>
                <input 
                  type="number" 
                  min="1"
                  step="any"
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`الحد الأقصى: ${currency === 'USD' ? walletUSD : walletSYP}`}
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>طريقة السحب (مثال: PayPal, Western Union, الهرم)</label>
                <input 
                  type="text" 
                  value={withdrawMethod} 
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  placeholder="أدخل تفاصيل الحساب أو الطريقة"
                  style={{ width: '100%', padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn btn-solid" 
                style={{ width: '100%', marginTop: '0.5rem', opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? 'جاري الإرسال...' : 'تأكيد طلب السحب'}
              </button>
            </form>
          </motion.div>

        </div>

        {/* Right Column: Transaction History */}
        <motion.div className="glass-card" style={{ padding: '2rem' }} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>سجل العمليات</h2>
          
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.5, padding: '3rem 0' }}>
              لا توجد أي عمليات في محفظتك حتى الآن.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transactions.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '0.8rem', borderRadius: '50%', background: tx.type === 'WITHDRAW' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
                      {tx.type === 'WITHDRAW' ? <ArrowUpCircle size={24} color="var(--danger)" /> : <ArrowDownCircle size={24} color="var(--success)" />}
                    </div>
                    <div>
                      <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {tx.type === 'WITHDRAW' ? 'طلب سحب رصيد' : 'إيداع أرباح'}
                      </p>
                      <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(tx.createdAt).toLocaleString('ar-EG')}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: tx.type === 'WITHDRAW' ? '#fff' : 'var(--success)' }}>
                      {tx.type === 'WITHDRAW' ? '-' : '+'}{tx.amount.toLocaleString()} {tx.currency}
                    </p>
                    <div style={{ marginTop: '0.3rem' }}>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
