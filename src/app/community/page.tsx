'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Heart, Share2, Users, TrendingUp, Star, Send, BookOpen, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const topStudents = [
  { name: 'أحمد الخالد', points: 4850, courses: 12, avatar: 'أ', color: '#cba153' },
  { name: 'محمد العلي', points: 4200, courses: 9, avatar: 'م', color: '#ef4444' },
  { name: 'سارة المحمد', points: 3900, courses: 8, avatar: 'س', color: '#8b5cf6' },
  { name: 'خالد إبراهيم', points: 3500, courses: 7, avatar: 'خ', color: '#22c55e' },
  { name: 'ليلى حسن', points: 3100, courses: 6, avatar: 'ل', color: '#10b981' },
];

export default function CommunityPage() {
  const { data: session } = useSession();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch('/api/community');
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);

  const toggleLike = async (id: string) => {
    const isLiking = !liked[id];
    setLiked(prev => ({ ...prev, [id]: isLiking }));
    setPosts(prev => prev.map(p => p.id === id ? { ...p, upvotes: p.upvotes + (isLiking ? 1 : -1) } : p));
    
    try {
      await fetch(`/api/community/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: isLiking })
      });
    } catch (e) {
      console.error('Failed to update like');
    }
  };

  const toggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }
    setActiveCommentsPostId(postId);
    if (!comments[postId]) {
      setLoadingComments(true);
      try {
        const res = await fetch(`/api/community/${postId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setComments(prev => ({ ...prev, [postId]: data }));
        }
      } catch (e) {
        console.error('Failed to load comments');
      }
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (postId: string) => {
    if (!newComment.trim() || !session) return;
    try {
      const res = await fetch(`/api/community/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data]
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, _count: { comments: p._count.comments + 1 } } : p));
        setNewComment('');
      }
    } catch (e) {
      console.error('Failed to post comment');
    }
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/community#post-${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setSharedPostId(postId);
      setTimeout(() => setSharedPostId(null), 2000);
    });
  };

  const handlePost = async () => {
    if (!newPost.trim() || !session) return;
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost, title: 'منشور جديد' })
      });
      if (res.ok) {
        const data = await res.json();
        setPosts([data, ...posts]);
        setNewPost('');
      } else {
        alert('حدث خطأ أثناء النشر.');
      }
    } catch (e) {
      alert('تعذر الاتصال بالخادم.');
    }
    setSubmitting(false);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#cba153', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4'];
    return colors[name.length % colors.length];
  };

  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2rem) 3%', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900,
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '1 1 min(100%, 600px)', minWidth: 0 }}>
          {/* New Post */}
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(203,161,83,0.2)', 
            borderRadius: '16px', padding: '1.5rem' 
          }}>
            {!session ? (
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <p style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>يجب تسجيل الدخول لتتمكن من النشر في المجتمع.</p>
                <Link href="/login" className="btn btn-solid">تسجيل الدخول</Link>
              </div>
            ) : (
              <>
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
                    disabled={submitting || !newPost.trim()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'var(--primary)', color: '#000',
                      border: 'none', borderRadius: '10px',
                      padding: '0.75rem 1.5rem', fontWeight: 700,
                      fontSize: '0.95rem', cursor: submitting || !newPost.trim() ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', opacity: submitting || !newPost.trim() ? 0.7 : 1
                    }}
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                    {submitting ? 'جاري النشر...' : 'نشر'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Posts */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--primary)' }}>
              <Loader2 size={32} className="animate-spin mx-auto" />
              <p style={{ marginTop: '1rem' }}>جاري تحميل المنشورات...</p>
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
              لا يوجد منشورات حتى الآن. كن أول من ينشر!
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} id={`post-${post.id}`} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '1.5rem',
                transition: 'border-color 0.3s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: getAvatarColor(post.user.name), color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '1.1rem', flexShrink: 0
                  }}>
                    {post.user.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {post.user.name}
                      {post.user.role === 'INSTRUCTOR' && <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>مدرب</span>}
                      {post.user.role === 'ADMIN' && <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>إدارة</span>}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(post.createdAt).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
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
                    {post.upvotes}
                  </button>
                  <button 
                    onClick={() => toggleComments(post.id)}
                    style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: activeCommentsPostId === post.id ? 'var(--primary)' : 'rgba(255,255,255,0.5)', fontFamily: 'inherit',
                    fontSize: '0.9rem', fontWeight: 600,
                    transition: 'color 0.2s'
                  }}>
                    <MessageSquare size={18} />
                    {post._count.comments} تعليق
                  </button>
                  <button 
                    onClick={() => handleShare(post.id)}
                    style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: sharedPostId === post.id ? 'var(--success)' : 'rgba(255,255,255,0.5)', fontFamily: 'inherit',
                    fontSize: '0.9rem', fontWeight: 600, marginRight: 'auto',
                    transition: 'color 0.2s'
                  }}>
                    <Share2 size={18} /> {sharedPostId === post.id ? 'تم النسخ!' : 'مشاركة'}
                  </button>
                </div>

                {/* Comments Section */}
                {activeCommentsPostId === post.id && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {loadingComments ? (
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                        <Loader2 size={24} className="animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {comments[post.id]?.map(comment => (
                          <div key={comment.id} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: getAvatarColor(comment.user.name), color: '#000',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 900, fontSize: '0.9rem', flexShrink: 0
                            }}>
                              {comment.user.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {comment.user.name}
                                {comment.user.role === 'INSTRUCTOR' && <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#000', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>مدرب</span>}
                              </div>
                              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0, whiteSpace: 'pre-wrap' }}>
                                {comment.content}
                              </p>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem' }}>
                                {new Date(comment.createdAt).toLocaleDateString('ar-SA')}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!comments[post.id] || comments[post.id].length === 0) && (
                          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', padding: '1rem' }}>
                            لا توجد تعليقات بعد. كن أول من يعلق!
                          </div>
                        )}
                        
                        {/* Add Comment Input */}
                        {session && (
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="اكتب تعليقاً..."
                              style={{
                                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '20px', padding: '0.6rem 1rem', color: '#fff', fontSize: '0.9rem', outline: 'none'
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePostComment(post.id);
                              }}
                            />
                            <button
                              onClick={() => handlePostComment(post.id)}
                              disabled={!newComment.trim()}
                              style={{
                                background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '50%',
                                width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: newComment.trim() ? 'pointer' : 'not-allowed', opacity: newComment.trim() ? 1 : 0.5
                              }}
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar - Leaderboard */}
        <div style={{ position: 'sticky', top: '100px', flex: '1 1 300px', width: '100%' }}>
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
