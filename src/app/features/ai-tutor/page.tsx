'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Send, Sparkles, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AITutorPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً! أنا المعلم الذكي الخاص بك في أكاديمية K&Q. كيف يمكنني مساعدتك في دراستك اليوم؟'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, history: messages.map(m => ({ role: m.role, content: m.content })) })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.reply }]);
      } else {
        const errorData = await res.json();
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `عذراً، حدث خطأ: ${errorData.error}` }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'عذراً، تعذر الاتصال بالخادم. حاول مرة أخرى لاحقاً.' }]);
    }
    
    setLoading(false);
  };

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <div style={{ textAlign: 'center', padding: '2rem', background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Bot size={64} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>يجب تسجيل الدخول</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>يرجى تسجيل الدخول للتمكن من التحدث مع المعلم الذكي.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', background: '#111', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ width: '50px', height: '50px', background: 'rgba(203, 161, 83, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={28} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            المعلم الذكي <Sparkles size={16} color="var(--primary)" />
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>مساعدك التعليمي المدعوم بالذكاء الاصطناعي</p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <AnimatePresence>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(203, 161, 83, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isUser ? <User size={20} color="#fff" /> : <Bot size={20} color="var(--primary)" />}
                </div>
                
                <div style={{ 
                  background: isUser ? 'var(--primary)' : '#111', 
                  color: isUser ? '#000' : '#fff',
                  padding: '1.2rem', 
                  borderRadius: '16px',
                  borderTopRightRadius: isUser ? 0 : '16px',
                  borderTopLeftRadius: !isUser ? 0 : '16px',
                  maxWidth: '80%',
                  border: isUser ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  lineHeight: 1.6,
                  fontSize: '1rem'
                }}>
                  {isUser ? (
                    msg.content
                  ) : (
                    <div className="markdown-body">
                      <ReactMarkdown
                        components={{
                          code({node, inline, className, children, ...props}: any) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.9em' }} {...props}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(203, 161, 83, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={20} color="var(--primary)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#111', padding: '1rem 1.5rem', borderRadius: '16px', borderTopLeftRadius: 0 }}>
              <Loader2 size={16} className="animate-spin" color="var(--primary)" />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>جاري التفكير...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '2rem', background: 'linear-gradient(to top, #050505 50%, transparent)', position: 'sticky', bottom: 0 }}>
        <form onSubmit={handleSubmit} style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '1rem', background: '#111', padding: '0.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل المعلم الذكي أي سؤال (مثال: اشرح لي React)..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '1rem 1.5rem', fontSize: '1rem', outline: 'none' }}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            style={{ width: '50px', height: '50px', borderRadius: '50%', background: input.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: input.trim() ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
          >
            <Send size={20} style={{ transform: 'translateX(-2px)' }} />
          </button>
        </form>
      </div>
      
      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .markdown-body { color: #fff; }
        .markdown-body p { margin-bottom: 1rem; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body pre { margin: 1rem 0; border-radius: 8px !important; }
      `}</style>
    </div>
  );
}
