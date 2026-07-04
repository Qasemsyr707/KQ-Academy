'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, ThumbsUp, Send, UserCircle, MessageCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function CommunityPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/community/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    setSubmittingPost(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newPostTitle, content: newPostContent })
      });
      if (res.ok) {
        setNewPostTitle('');
        setNewPostContent('');
        await fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
    setSubmittingPost(false);
  };

  const handleCreateComment = async (postId: string) => {
    if (!commentContent.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: commentContent })
      });
      if (res.ok) {
        setCommentContent('');
        await fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
    setSubmittingComment(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ar });
    } catch {
      return 'منذ فترة';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '4rem 2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} style={{ width: '80px', height: '80px', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Users size={40} color="var(--primary)" />
          </motion.div>
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            مجتمع الطلاب
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)' }}>
            شارك أفكارك، اطرح أسئلتك، وناقش الدروس مع زملائك والمدربين.
          </p>
        </div>

        {/* Create Post Box */}
        {session ? (
          <div style={{ background: '#111', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="var(--primary)" /> إنشاء منشور جديد
            </h3>
            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="عنوان المنشور..." 
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem' }}
                required
              />
              <textarea 
                placeholder="بم تفكر؟" 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', resize: 'vertical' }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  type="submit" 
                  disabled={submittingPost}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#000', padding: '0.8rem 2rem', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: submittingPost ? 0.7 : 1 }}
                >
                  <Send size={18} /> {submittingPost ? 'جاري النشر...' : 'نشر'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', marginBottom: '3rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>يجب تسجيل الدخول للمشاركة في المجتمع.</p>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '2rem' }}>جاري تحميل المنشورات...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '4rem', background: '#111', borderRadius: '16px' }}>
            <MessageCircle size={48} opacity={0.2} style={{ margin: '0 auto 1rem auto' }} />
            لا توجد منشورات حتى الآن. كن أول من يشارك!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  key={post.id} 
                  style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}
                >
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {post.user?.image ? <img src={post.user.image} alt={post.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserCircle size={32} color="rgba(255,255,255,0.5)" />}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{post.user?.name || 'مستخدم'}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{formatDate(post.createdAt)}</span>
                      </div>
                    </div>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{post.title}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.content}</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <ThumbsUp size={18} /> إعجاب
                      </button>
                      <button 
                        onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                        style={{ background: 'none', border: 'none', color: expandedPostId === post.id ? 'var(--primary)' : 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', transition: 'color 0.2s' }}
                      >
                        <MessageSquare size={18} /> {post.comments?.length || 0} تعليقات
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <AnimatePresence>
                    {expandedPostId === post.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          
                          {post.comments?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                              {post.comments.map((comment: any) => (
                                <div key={comment.id} style={{ display: 'flex', gap: '1rem' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                                    {comment.user?.image ? <img src={comment.user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserCircle size={32} color="rgba(255,255,255,0.5)" />}
                                  </div>
                                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                      <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{comment.user?.name || 'مستخدم'}</span>
                                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>لا توجد تعليقات بعد.</p>
                          )}

                          {session ? (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <input 
                                type="text"
                                placeholder="اكتب تعليقاً..."
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                style={{ flex: 1, padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff' }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCreateComment(post.id);
                                }}
                              />
                              <button 
                                onClick={() => handleCreateComment(post.id)}
                                disabled={submittingComment || !commentContent.trim()}
                                style={{ background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '20px', padding: '0 1.5rem', fontWeight: 'bold', cursor: commentContent.trim() ? 'pointer' : 'not-allowed', opacity: commentContent.trim() ? 1 : 0.5 }}
                              >
                                إرسال
                              </button>
                            </div>
                          ) : (
                            <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.9rem' }}>قم بتسجيل الدخول للتعليق.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
