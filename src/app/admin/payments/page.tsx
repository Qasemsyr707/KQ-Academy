import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import ApproveButton from './ApproveButton';
import { CheckCircle, Clock, XCircle, Image as ImageIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  await requireRolePage(['ADMIN']);

  const payments = await prisma.payment.findMany({
    include: {
      user: true,
      course: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>مراجعة الحوالات المالية 💰</h1>
          <p style={{ opacity: 0.7 }}>قم بمراجعة إيصالات الدفع المرفوعة من الطلاب ووافق عليها لتفعيل دوراتهم تلقائياً.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold' }}>
            قيد الانتظار: {payments.filter(p => p.status === 'PENDING').length}
          </div>
        </div>
      </div>

      <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, opacity: 0.8 }}>الطالب</th>
              <th style={{ padding: '1rem', fontWeight: 600, opacity: 0.8 }}>الكورس</th>
              <th style={{ padding: '1rem', fontWeight: 600, opacity: 0.8 }}>طريقة الدفع</th>
              <th style={{ padding: '1rem', fontWeight: 600, opacity: 0.8 }}>المبلغ</th>
              <th style={{ padding: '1rem', fontWeight: 600, opacity: 0.8 }}>الإيصال</th>
              <th style={{ padding: '1rem', fontWeight: 600, opacity: 0.8 }}>الحالة</th>
              <th style={{ padding: '1rem', fontWeight: 600, opacity: 0.8 }}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>لا توجد حوالات مالية حتى الآن.</td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{payment.user.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{payment.user.email}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{payment.course.title}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {payment.paymentMethod}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>{payment.amount} ل.س</td>
                  <td style={{ padding: '1rem' }}>
                    <a href={payment.receiptImage || '#'} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', textDecoration: 'none' }}>
                      <ImageIcon size={16} /> عرض الصورة
                    </a>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {payment.status === 'PENDING' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '24px', fontSize: '0.8rem' }}><Clock size={14} /> قيد المراجعة</span>}
                    {payment.status === 'APPROVED' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '24px', fontSize: '0.8rem' }}><CheckCircle size={14} /> مقبول</span>}
                    {payment.status === 'REJECTED' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '24px', fontSize: '0.8rem' }}><XCircle size={14} /> مرفوض</span>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {payment.status === 'PENDING' && (
                      <ApproveButton paymentId={payment.id} courseId={payment.courseId} userId={payment.userId} />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
