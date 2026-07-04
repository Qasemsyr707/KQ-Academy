'use client';

import Link from 'next/link';
import { Briefcase, Target, Map, Award, ArrowLeft, Building2, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CareerMappingFeature() {
  return (
    <div className="container">
      <nav className="nav" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
        <Link href="/features/study-rooms" className="btn" style={{ padding: '0.5rem 1rem' }}>⬅️ الميزة السابقة</Link>
        <Link href="/" className="btn btn-solid" style={{ padding: '0.5rem 1rem' }}>العودة للرئيسية</Link>
      </nav>

      <motion.div 
        className="glass-card" 
        style={{ maxWidth: '1000px', margin: '0 auto' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Briefcase size={36} color="var(--primary)" />
          <h2 className="feature-title" style={{ margin: 0, fontSize: '2.2rem' }}>التوجيه المهني والتدريب المصغر</h2>
        </div>
        <p style={{ opacity: 0.8, marginBottom: '3rem', fontSize: '1.1rem', maxWidth: '700px' }}>
          نحن لا نمنحك دورات فقط، بل نخطط مستقبلك. بناءً على أداءك المتميز في دورات "تطوير الويب"، قام الذكاء الاصطناعي برسم مسارك المهني ووفر لك فرص تدريب حقيقية مع شركات كبرى.
        </p>

        <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* AI Analysis Panel */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '20px', padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
              <Target size={24} color="var(--primary)" /> تحليل الأداء والمهارات
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#fff' }}>المنطق الخوارزمي</span>
                <span style={{ color: 'var(--success)' }}>95% ممتاز</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: '95%', background: 'var(--success)', borderRadius: '3px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: '#fff' }}>تصميم واجهات المستخدم</span>
                <span style={{ color: 'var(--warning)' }}>78% جيد جداً</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: '78%', background: 'var(--warning)', borderRadius: '3px' }} />
              </div>
            </div>

            <div style={{ marginTop: '3rem', padding: '1rem', background: 'rgba(203, 161, 83, 0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.9rem', color: '#fff' }}>
                <strong>توصية الذكاء الاصطناعي:</strong> مسارك المثالي هو <strong>"مهندس برمجيات واجهات أمامية Frontend"</strong>. ننصحك بالبدء في تنفيذ المهام المصغرة أدناه لاكتساب خبرة سوق العمل.
              </p>
            </div>
          </div>

          {/* Micro-Internships / Career Map */}
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
              <Building2 size={24} color="var(--primary)" /> فرص التدريب المصغر (Micro-Internships)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Task 1 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.5rem', transition: 'all 0.3s ease', cursor: 'pointer' }} className="hover:border-primary">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>تطوير صفحة هبوط لمتجر إلكتروني</h4>
                    <p style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>شركة "سيمفوني للتقنية" - دمشق</p>
                  </div>
                  <span style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem' }}>متاح للتقديم</span>
                </div>
                <p style={{ opacity: 0.7, fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                  تحتاج الشركة إلى طالب متفوق لبناء صفحة هبوط سريعة الاستجابة باستخدام React. عند إتمام المهمة بنجاح، ستحصل على شهادة تدريب مصدق ومكافأة مالية قدرها 50 ألف ليرة.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}><Timer size={14} /> المدة المتوقعة: 3 أيام</span>
                  <button className="btn btn-solid" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>ابدأ المهمة <ArrowLeft size={16} /></button>
                </div>
              </div>

              {/* Task 2 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.5rem', opacity: 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>تحسين قاعدة بيانات تطبيق توصيل</h4>
                    <p style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600 }}>شركة "يلا ديليفري"</p>
                  </div>
                  <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem' }}>مغلق - يتطلب مستوى ماسي</span>
                </div>
                <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                  يتطلب هذا التدريب مستوى "ماسي" في دورات قواعد البيانات SQL.
                </p>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
