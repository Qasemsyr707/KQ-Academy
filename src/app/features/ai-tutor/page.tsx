'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, User, Sparkles, Loader2, Code, FileText, Settings, History } from 'lucide-react';
import Link from 'next/link';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'مرحباً! أنا المساعد الذكي الخاص بك من أكاديمية K&Q. كيف يمكنني مساعدتك في دراستك البرمجية اليوم؟ 😊'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history: messages })
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'عذراً، حدث خطأ أثناء معالجة طلبك.' }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.' }]);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#050505', color: '#fff' }}>
      
      {/* Sidebar - Chat History & Tools */}
      <div style={{ width: '300px', borderRight: '1px solid rgba(255,255,255,0.05)', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/dashboard" style={{ display: 'inline-block', marginBottom: '2rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
            &rarr; العودة للوحة
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, var(--primary), #eab308)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={28} color="#000" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>المساعد الذكي</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>متصل وجاهز</p>
            </div>
          </div>
          <button style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', padding: '0.8rem', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s' }} className="hover:bg-white/10 hover:border-primary">
            <Sparkles size={18} color="var(--primary)" /> محادثة جديدة
          </button>
        </div>

        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={16} /> السجل الأخير
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {['شرح React Hooks', 'حل مشكلة TypeError', 'ما هو الـ JWT؟'].map((item, i) => (
              <button key={i} style={{ textAlign: 'right', padding: '0.8rem 1rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="hover:bg-white/5">
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
          <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
            <Settings size={18} /> إعدادات
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Messages */}
        <div style={{ flex: 1, padding: '2rem 5%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {messages.map((msg, index) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              {/* Avatar */}
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--primary), #eab308)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {msg.role === 'user' ? <User size={20} color="#fff" /> : <Bot size={24} color="#000" />}
              </div>
              
              {/* Message Bubble */}
              <div style={{ 
                background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: msg.role === 'user' ? '#000' : '#fff',
                padding: '1.5rem',
                borderRadius: '16px',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                maxWidth: '80%',
                lineHeight: 1.6,
                fontSize: '1.05rem',
                border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}>
                {/* Parse simulated markdown-like response simply */}
                {msg.content.split('\n').map((line, i) => {
                  if (line.startsWith('```')) {
                    return <div key={i} style={{ background: '#000', color: '#a855f7', padding: '1rem', borderRadius: '8px', margin: '1rem 0', fontFamily: 'monospace', direction: 'ltr' }}>// كود برمجي<br/>{line.replace(/```/g, '')}</div>;
                  }
                  return <p key={i} style={{ marginBottom: line ? '0.5rem' : '0' }}>{line}</p>;
                })}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #eab308)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={24} color="#000" />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', borderTopLeftRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                <Loader2 className="animate-spin" size={20} /> جاري التفكير...
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '2rem 5%', background: 'linear-gradient(0deg, #050505 50%, transparent 100%)' }}>
          <div style={{ position: 'relative', maxWidth: '1000px', margin: '0 auto' }}>
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اسأل المساعد الذكي أي سؤال برمجي..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                paddingLeft: '4rem',
                color: '#fff',
                fontSize: '1.1rem',
                resize: 'none',
                height: '80px',
                fontFamily: 'inherit',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                transition: 'all 0.3s'
              }}
              className="focus:border-primary focus:outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: input.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                color: input.trim() ? '#000' : 'rgba(255,255,255,0.4)',
                border: 'none',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s'
              }}
            >
              <Send size={20} />
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
            المساعد الذكي قد يخطئ أحياناً، يرجى التحقق من الأكواد البرمجية قبل استخدامها في الإنتاج.
          </div>
        </div>
      </div>

      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .hover\\:bg-white\\/10:hover { background-color: rgba(255,255,255,0.1) !important; }
        .hover\\:bg-white\\/5:hover { background-color: rgba(255,255,255,0.05) !important; }
        .hover\\:border-primary:hover { border-color: var(--primary) !important; }
        .focus\\:border-primary:focus { border-color: var(--primary) !important; }
        .focus\\:outline-none:focus { outline: none; }
      `}</style>
    </div>
  );
}
