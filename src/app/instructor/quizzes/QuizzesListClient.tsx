'use client';

import Link from 'next/link';
import { FileEdit, Plus, ArrowRight, CheckCircle, Users } from 'lucide-react';

export default function QuizzesListClient({ quizzes }: { quizzes: any[] }) {
  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/instructor" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%', color: '#fff' }}>
            <ArrowRight size={20} />
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>إدارة الاختبارات 📝</h1>
        </div>
        <Link href="/instructor/quizzes/create" className="btn btn-solid" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={20} /> إنشاء اختبار جديد
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', background: '#111', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <FileEdit size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>ليس لديك أي اختبارات حالياً</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>قم بإنشاء اختبارات لتقييم طلابك في الكورسات المختلفة.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {quizzes.map((quiz) => (
            <div key={quiz.id} style={{ background: '#111', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{quiz.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>
                الكورس: {quiz.chapter.course.title} <br/>
                الفصل: {quiz.chapter.title}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{quiz._count.questions}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle size={14} /> سؤال</div>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{quiz._count.attempts}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Users size={14} /> محاولة</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>تعديل</button>
                <button style={{ flex: 1, padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
