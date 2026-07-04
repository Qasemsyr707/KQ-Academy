'use client';

import { useState, useEffect } from 'react';
import { Brain, ArrowRight, Plus, FolderOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const router = useRouter();

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/flashcards');
      if (res.ok) {
        const data = await res.json();
        setDecks(data.decks || []);
      }
    } catch (e) {
      console.error('Failed to fetch decks');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      if (res.ok) {
        setNewTitle('');
        setIsCreating(false);
        fetchDecks();
      }
    } catch (e) {
      console.error('Failed to create deck');
    }
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('هل أنت متأكد من حذف هذه الحزمة؟')) return;

    try {
      const res = await fetch(`/api/flashcards/${deckId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDecks();
      }
    } catch (e) {
      console.error('Failed to delete deck');
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '6rem 2rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', marginBottom: '3rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowRight size={18} /> العودة للوحة التحكم
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Brain color="var(--primary)" /> البطاقات الذكية
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>أنشئ حزم البطاقات التعليمية الخاصة بك وراجعها بسهولة</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="btn btn-solid" 
            style={{ padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={20} /> إنشاء حزمة جديدة
          </button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '800px' }}>
        {isCreating && (
          <form onSubmit={handleCreateDeck} className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '16px' }}>
            <h3 style={{ marginBottom: '1rem', color: '#fff' }}>حزمة جديدة</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="اسم الحزمة (مثال: مصطلحات الفيزياء)"
                style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff' }}
                autoFocus
              />
              <button type="submit" className="btn btn-solid" style={{ padding: '0.8rem 1.5rem' }}>حفظ</button>
              <button type="button" onClick={() => setIsCreating(false)} className="btn" style={{ padding: '0.8rem 1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>إلغاء</button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--primary)' }}>جاري تحميل الحزم...</div>
        ) : decks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {decks.map(deck => (
              <Link href={`/features/flashcards/${deck.id}`} key={deck.id} style={{ textDecoration: 'none' }}>
                <div className="glass-card feature-card" style={{ padding: '2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', position: 'relative' }}>
                  <button 
                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                    style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                    title="حذف الحزمة"
                  >
                    <Trash2 size={20} />
                  </button>
                  <FolderOpen size={32} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.3rem', color: '#fff', margin: 0 }}>{deck.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>
                    تحتوي على {deck._count.flashcards} بطاقة
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>لم تقم بإنشاء أي حزم بطاقات بعد.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="btn btn-solid" 
              style={{ padding: '0.8rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} /> ابدأ بإنشاء حزمتك الأولى
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
