'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CommunityFeature() {
  const [posts, setPosts] = useState([
    { id: 1, author: 'سارة', text: 'كيف يمكنني حل المسألة رقم 5 في درس التفاضل؟', reported: false },
    { id: 2, author: 'أحمد', text: 'شكراً للأستاذ خالد على الشرح الرائع اليوم!', reported: false },
  ]);
  const [newPost, setNewPost] = useState('');
  const [warning, setWarning] = useState('');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    // Simulate bad word filter (UGC Compliance)
    const badWords = ['سيء', 'غبي', 'اكره'];
    const hasBadWord = badWords.some(word => newPost.includes(word));

    if (hasBadWord) {
      setWarning('تم حظر هذه المشاركة لاحتوائها على كلمات غير لائقة. يرجى الالتزام بقواعد المجتمع.');
      return;
    }

    setPosts([{ id: Date.now(), author: 'أنت', text: newPost, reported: false }, ...posts]);
    setNewPost('');
    setWarning('');
  };

  const reportPost = (id: number) => {
    setPosts(posts.map(p => p.id === id ? { ...p, reported: true } : p));
    alert('تم الإبلاغ عن هذه المشاركة. سيقوم المشرفون بمراجعتها خلال 24 ساعة.');
  };

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/">العودة للرئيسية</Link>
        <Link href="/features/gamification">الميزة التالية ➡️</Link>
      </nav>

      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="feature-title">👥 مجتمع الطلاب والمنتديات (مراقب)</h2>
        <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
          متوافق مع سياسات آبل وجوجل للمحتوى من إنشاء المستخدمين (UGC). يحتوي على فلتر للكلمات السيئة وزر إبلاغ.
        </p>

        <form onSubmit={handlePost} style={{ marginBottom: '2rem' }}>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="شارك سؤالك أو فكرتك مع زملائك... (جرب كتابة 'غبي' لاختبار الفلتر)"
            style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--secondary)', color: 'white', minHeight: '100px', marginBottom: '1rem' }}
          />
          {warning && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>⚠️ {warning}</p>}
          <button type="submit" className="btn">نشر</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map(post => (
            <div key={post.id} style={{ background: 'var(--glass)', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)', position: 'relative' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{post.author}</h4>
              <p>{post.text}</p>
              
              <button 
                onClick={() => reportPost(post.id)}
                disabled={post.reported}
                style={{ position: 'absolute', top: '1rem', left: '1rem', background: post.reported ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: post.reported ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
              >
                {post.reported ? 'تم الإبلاغ 🚩' : 'إبلاغ 🚩'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
