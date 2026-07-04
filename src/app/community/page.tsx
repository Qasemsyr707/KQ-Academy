'use client';

import { useState } from 'react';
import { MessageSquare, Heart, Share2, Users, TrendingUp, Star, Send, BookOpen } from 'lucide-react';

const posts = [
  {
    id: 1,
    author: 'أحمد الخالد',
    avatar: 'أ',
    avatarColor: '#cba153',
    time: 'منذ ساعتين',
    content: 'أخيراً أتممت كورس Python! الشكر الجزيل للأستاذ قاسم على أسلوب الشرح الرائع والمبسط. أنصح كل من يريد تعلم البرمجة بهذا الكورس 🎉',
    likes: 42,
    comments: 8,
    tag: 'برمجة',
    tagColor: '#3b82f6',
  },
  {
    id: 2,
    author: 'سارة المحمد',
    avatar: 'س',
    avatarColor: '#8b5cf6',
    time: 'منذ 5 ساعات',
    content: 'سؤال للمجموعة: هل من نصائح لحفظ معادلات الفيزياء بشكل أفضل قبل امتحان البكالوريا؟ جزاكم الله خيراً 🙏',
    likes: 18,
    comments: 23,
    tag: 'بكالوريا',
    tagColor: '#22c55e',
  },
  {
    id: 3,
    author: 'محمد العلي',
    avatar: 'م',
    avatarColor: '#ef4444',
    time: 'أمس',
    content: 'شاركت في امتحان التحديد الأسبوعي وحصلت على 95/100! المنصة تساعدني كثيراً في التحضير للامتحانات. شكراً KQ Academy! 💪',
    likes: 87,
    comments: 15,
    tag: 'نجاح',
    tagColor: '#f59e0b',
  },
  {
    id: 4,
    author: 'ليلى حسن',
    avatar: 'ل',
    avatarColor: '#10b981',
    time: 'منذ يومين',
    content: 'هل يمكن لأحد مشاركة ملخص لفصل "التفاضل والتكامل" من كورس الرياضيات؟ أحتاجه للمراجعة 📚',
    likes: 31,
    comments: 12,
    tag: 'رياضيات',
    tagColor: '#06b6d4',
  },
];

const topStudents = [
  { name: 'أحمد الخالد', points: 4850, courses: 12, avatar: 'أ', color: '#cba153' },
  { name: 'محمد العلي', points: 4200, courses: 9, avatar: 'م', color: '#ef4444' },
  { name: 'سارة المحمد', points: 3900, courses: 8, avatar: 'س', color: '#8b5cf6' },
  { name: 'خالد إبراهيم', points: 3500, courses: 7, avatar: 'خ', color: '#22c55e' },
  { name: 'ليلى حسن', points: 3100, courses: 6, avatar: 'ل', color: '#10b981' },
];

export default function CommunityPage() {
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [newPost, setNewPost] = useState('');
  const [posts2, setPosts2] = useState(posts);

  const toggleLike = (id: number) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
    setPosts2(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + (liked[id] ? -1 : 1) } : p));
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    setPosts2(prev => [{
      id: Date.now(),
      author: 'أنت',
      avatar: 'أ',
      avatarColor: '#cba153',
      time: 'الآن',
      content: newPost,
      likes: 0,
      comments: 0,
      tag: 'عام',
      tagColor: '#cba153',
    }, ...prev]);
    setNewPost('');
  };

  return (
    <div style={{ padding: '2rem 3%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', fontWeight: 900,
          background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.7))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem'
        }}>
          مجتمع KQ Academy 👥
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>تواصل مع الطلاب والمدربين وشارك تجربتك التعليمية</p>
      </div>

      {/* Stats Bar */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem', marginBottom: '2rem'
      }}>
        {[
          { icon: Users, label: 'عضو نشط', value: '12,450', color: '#cba153' },
          { icon: MessageSquare, label: 'منشور هذا الشهر', value: '3,892', color: '#22c55e' },
          { icon: BookOpen, label: 'سؤال أجيب عليه', value: '8,741', color: '#3b82f6' },
          { icon: TrendingUp, label: 'نسبة التفاعل', value: '94%', color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px', padding: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem'
          }}>
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '10px',
              background: `${stat.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <stat.icon size={22} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        {/* Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* New Post */}
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(203,161,83,0.2)', 
            borderRadius: '16px', padding: '1.5rem' 
          }}>
            <textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="شارك شيئاً مع المجتمع... سؤال، نجاح، أو نصيحة 💡"
              style={{
                width: '100%', minHeight: '100px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '1rem',
                color: '#fff', fontSize: '1rem', resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
                transition: 'border-color 0.3s'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
              <button
                onClick={handlePost}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--primary)', color: '#000',
                  border: 'none', borderRadius: '10px',
                  padding: '0.75rem 1.5rem', fontWeight: 700,
                  fontSize: '0.95rem', cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                <Send size={16} /> نشر
              </button>
            </div>
          </div>

          {/* Posts */}
          {posts2.map(post => (
            <div key={post.id} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px', padding: '1.5rem',
              transition: 'border-color 0.3s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: post.avatarColor, color: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '1.1rem', flexShrink: 0
                }}>
                  {post.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{post.author}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{post.time}</div>
                </div>
                <span style={{
                  background: `${post.tagColor}20`, color: post.tagColor,
                  padding: '0.2rem 0.75rem', borderRadius: '2rem',
                  fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${post.tagColor}40`
                }}>
                  {post.tag}
                </span>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: '1rem' }}>
                {post.content}
              </p>

              <div style={{ 
                display: 'flex', gap: '1rem', paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                <button
                  onClick={() => toggleLike(post.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: liked[post.id] ? '#ef4444' : 'rgba(255,255,255,0.5)',
                    fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600,
                    transition: 'color 0.2s'
                  }}
                >
                  <Heart size={18} fill={liked[post.id] ? '#ef4444' : 'none'} />
                  {post.likes}
                </button>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)', fontFamily: 'inherit',
                  fontSize: '0.9rem', fontWeight: 600
                }}>
                  <MessageSquare size={18} />
                  {post.comments} تعليق
                </button>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.5)', fontFamily: 'inherit',
                  fontSize: '0.9rem', fontWeight: 600, marginRight: 'auto'
                }}>
                  <Share2 size={18} /> مشاركة
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar - Leaderboard */}
        <div style={{ position: 'sticky', top: '100px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)'
            }}>
              <Star size={18} fill="var(--primary)" /> أوائل الطلاب
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topStudents.map((s, i) => (
                <div key={s.name} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem',
                  background: i === 0 ? 'rgba(203,161,83,0.08)' : 'transparent',
                  borderRadius: '10px',
                  border: i === 0 ? '1px solid rgba(203,161,83,0.2)' : '1px solid transparent'
                }}>
                  <div style={{ 
                    fontSize: '1.1rem', fontWeight: 900, width: '24px', textAlign: 'center',
                    color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)'
                  }}>
                    {i + 1}
                  </div>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: s.color, color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '0.9rem', flexShrink: 0
                  }}>
                    {s.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {s.points.toLocaleString()} نقطة · {s.courses} كورس
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
