'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Settings } from 'lucide-react';

export default function AdminWalletClient({ initialTransactions, initialRate }: { initialTransactions: any[], initialRate: string }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [exchangeRate, setExchangeRate] = useState(initialRate);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  const handleUpdateRate = async () => {
    setIsUpdatingRate(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'exchangeRate', value: exchangeRate })
      });
      if (res.ok) {
        alert('تم تحديث سعر الصرف بنجاح');
      } else {
        alert('حدث خطأ أثناء التحديث');
      }
    } catch (e) {
      alert('Error updating rate');
    }
    setIsUpdatingRate(false);
  };

  const handleApproveReject = async (transactionId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/admin/wallet/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action })
      });
      if (res.ok) {
        setTransactions(transactions.filter(t => t.id !== transactionId));
        alert(action === 'APPROVE' ? 'تم قبول الشحن وإضافة الرصيد' : 'تم رفض العملية');
      } else {
        const data = await res.json();
        alert(data.error || 'حدث خطأ');
      }
    } catch (e) {
      alert('Error processing transaction');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Settings Section */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings color="var(--primary)" /> إعدادات النظام (سعر الصرف)
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem' }}>سعر صرف الدولار =</span>
          <input 
            type="number"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.1rem', width: '150px' }}
          />
          <span style={{ fontSize: '1.1rem' }}>ل.س</span>
          <button onClick={handleUpdateRate} disabled={isUpdatingRate} style={{ background: 'var(--primary)', color: '#000', padding: '0.8rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            {isUpdatingRate ? 'جاري الحفظ...' : 'حفظ التعديل'}
          </button>
        </div>
      </div>

      {/* Pending Transactions */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle color="var(--warning)" /> طلبات شحن المحفظة ({transactions.length})
        </h2>
        
        {transactions.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>لا توجد طلبات شحن معلقة.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {transactions.map(tx => (
              <div key={tx.id} style={{ background: '#111', padding: '1.5rem', borderRadius: '12px', border: tx.type === 'WITHDRAW' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, padding: '0.2rem 1rem', background: tx.type === 'WITHDRAW' ? 'var(--danger)' : 'var(--success)', color: tx.type === 'WITHDRAW' ? '#fff' : '#000', fontSize: '0.8rem', fontWeight: 'bold', borderBottomRightRadius: '8px' }}>
                  {tx.type === 'WITHDRAW' ? 'سحب أرباح' : 'شحن محفظة'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', marginTop: '1rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{tx.user.name}</span>
                  <span style={{ color: tx.type === 'WITHDRAW' ? '#ef4444' : (tx.currency === 'USD' ? '#22c55e' : 'var(--primary)'), fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {tx.type === 'WITHDRAW' ? '-' : '+'}{tx.amount.toLocaleString()} {tx.currency === 'USD' ? '$' : 'ل.س'}
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  البريد: {tx.user.email} <br/>
                  تاريخ الطلب: {new Date(tx.createdAt).toLocaleDateString('ar-SY')}
                </div>
                
                {tx.type === 'WITHDRAW' && tx.provider && (
                  <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#fff', borderLeft: '3px solid var(--danger)' }}>
                    <strong>تفاصيل التحويل:</strong> <br/> {tx.provider}
                  </div>
                )}

                {tx.type !== 'WITHDRAW' && tx.receiptImage && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <a href={tx.receiptImage} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                      عرض صورة الإيصال المرفقة
                    </a>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => handleApproveReject(tx.id, 'APPROVE')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    <CheckCircle size={18} /> {tx.type === 'WITHDRAW' ? 'موافقة وتم التحويل' : 'قبول الشحن'}
                  </button>
                  <button onClick={() => handleApproveReject(tx.id, 'REJECT')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    <XCircle size={18} /> {tx.type === 'WITHDRAW' ? 'رفض واسترجاع' : 'رفض'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
