'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';

export default function ApproveButton({ paymentId, courseId, userId }: { paymentId: string, courseId: string, userId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm('هل أنت متأكد من موافقتك على هذا الإيصال؟ سيتم تفعيل الكورس للطالب فوراً.')) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, courseId, userId })
      });

      if (!res.ok) throw new Error('فشل في الموافقة');

      router.refresh();
    } catch (err) {
      alert('حدث خطأ أثناء محاولة الموافقة على الطلب.');
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleApprove}
      disabled={isLoading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'var(--success)', color: '#000', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', border: 'none', opacity: isLoading ? 0.7 : 1 }}
    >
      {isLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
      قبول وتفعيل الكورس
      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </button>
  );
}
