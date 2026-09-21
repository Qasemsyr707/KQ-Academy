'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ChevronDown, MessageCircle, Mail, HelpCircle, BookOpen, CreditCard, Award, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const faqCategories = [
  {
    id: 'general',
    title: 'أسئلة عامة',
    icon: <HelpCircle size={24} />,
    questions: [
      {
        q: 'ما هي منصة KQ Academy؟',
        a: 'أكاديمية KQ هي منصة تعليمية رائدة تهدف إلى تقديم دورات تدريبية عالية الجودة في مختلف المجالات التقنية والمهنية. نجمع بين أفضل المدربين وأحدث تقنيات التعليم لتقديم تجربة تعليمية فريدة وممتعة.'
      },
      {
        q: 'هل يمكنني الوصول إلى الدورات في أي وقت؟',
        a: 'نعم! بمجرد اشتراكك في أي دورة مدفوعة، ستحصل على وصول كامل ومدى الحياة (Lifetime Access) لمحتوى الدورة، ويمكنك التعلم بالسرعة التي تناسبك وفي أي وقت ومن أي جهاز.'
      },
      {
        q: 'هل أحتاج إلى خبرة سابقة للبدء؟',
        a: 'ليس بالضرورة. العديد من دوراتنا تبدأ من الصفر (مستوى المبتدئين) وتتدرج معك خطوة بخطوة حتى تصل إلى الاحتراف. يمكنك قراءة متطلبات كل دورة في صفحة التفاصيل الخاصة بها.'
      }
    ]
  },
  {
    id: 'payments',
    title: 'المدفوعات والاشتراكات',
    icon: <CreditCard size={24} />,
    questions: [
      {
        q: 'ما هي طرق الدفع المتاحة؟',
        a: 'نوفر طرق دفع متنوعة وآمنة تناسب الجميع، بما في ذلك الدفع عبر البطاقات الائتمانية (Visa, MasterCard)، البوابات الإلكترونية المعتمدة، وطرق الدفع المحلية مثل (سيرياتيل كاش وMTN كاش).'
      },
      {
        q: 'هل يمكنني استرداد أموالي إذا لم تعجبني الدورة؟',
        a: 'بالتأكيد. نحن نثق بجودة محتوانا، ولذلك نقدم ضمان استرداد الأموال خلال 30 يوماً من تاريخ الشراء في حال لم تكن الدورة تلبي توقعاتك (تطبق الشروط والأحكام).'
      },
      {
        q: 'كيف يعمل نظام المحفظة (Wallet)؟',
        a: 'المحفظة هي رصيدك الإلكتروني داخل المنصة. يمكنك شحن محفظتك واستخدام الرصيد لشراء الدورات أو إهداء الرصيد لأصدقائك. كما يتم تحويل أرباح المدربين مباشرة إلى محافظهم.'
      }
    ]
  },
  {
    id: 'certificates',
    title: 'الشهادات والتقييم',
    icon: <Award size={24} />,
    questions: [
      {
        q: 'هل أحصل على شهادة بعد إتمام الدورة؟',
        a: 'نعم، عند إكمالك لجميع دروس الدورة واجتياز الاختبارات القصيرة (إن وجدت)، ستحصل تلقائياً على شهادة إكمال إلكترونية تحمل اسمك واسم الدورة.'
      },
      {
        q: 'هل الشهادات معتمدة؟',
        a: 'شهاداتنا هي شهادات إتمام تثبت أنك اكتسبت المهارات المذكورة في الدورة. تأتي الشهادة برابط تحقق فريد (QR Code) يمكن لأصحاب العمل استخدامه للتأكد من مصداقية شهادتك مباشرة عبر موقعنا.'
      },
      {
        q: 'كيف يمكنني تحميل الشهادة الخاصة بي؟',
        a: 'يمكنك العثور على جميع شهاداتك في لوحة التحكم الخاصة بك ضمن قسم "الشهادات". يمكنك تحميلها بصيغة PDF عالية الدقة أو طباعتها مباشرة.'
      }
    ]
  },
  {
    id: 'instructors',
    title: 'التدريس في الأكاديمية',
    icon: <UserCheck size={24} />,
    questions: [
      {
        q: 'كيف يمكنني الانضمام كمدرب؟',
        a: 'نحن نرحب دائماً بالخبراء! يمكنك زيارة صفحة "انضم كمدرب" من أسفل الموقع لتقديم طلبك. سيقوم فريقنا بمراجعة خبراتك والتواصل معك لتفعيل حساب المدرب الخاص بك.'
      },
      {
        q: 'كم تبلغ نسبة أرباح المدرب؟',
        a: 'نقدم للمدربين نظام مشاركة أرباح من أفضل الأنظمة في السوق. يحصل المدرب على نسبة عالية جداً من مبيعات دوراته، وتضاف الأرباح شهرياً إلى محفظته حيث يمكنه سحبها بسهولة.'
      },
      {
        q: 'هل أحتفظ بحقوق ملكية دوراتي؟',
        a: 'نعم، أنت تحتفظ بالملكية الفكرية الكاملة لمحتواك. أكاديمية KQ توفر لك المنصة، الحماية (DRM لمنع السرقة)، والتسويق، بينما تبقى الدورة ملكاً لك.'
      }
    ]
  }
];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState(faqCategories[0].id);
  const [openQuestionIndex, setOpenQuestionIndex] = useState<number | null>(0);

  const currentCategory = faqCategories.find(c => c.id === activeCategory);

  return (
    <div style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <Navbar />

      <style>{`
        .faq-wrapper {
          padding-top: 100px;
          padding-bottom: 80px;
        }
        .hero-section {
          padding: 80px 0;
          text-align: center;
          border-bottom: 1px solid var(--border-light);
        }
        .faq-container {
          display: flex;
          flex-wrap: wrap;
          gap: 40px;
          align-items: flex-start;
          max-width: 1200px;
          margin: 0 auto;
          padding: 60px 0;
        }
        .faq-sidebar {
          flex: 1 1 300px;
          position: sticky;
          top: 100px;
        }
        .faq-content {
          flex: 2 1 600px;
        }
        .category-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 16px;
          width: 100%;
          text-align: right;
          transition: all 0.3s;
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          margin-bottom: 12px;
          font-family: inherit;
          font-size: 1.1rem;
        }
        .category-btn:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }
        .category-btn.active {
          background: rgba(203,161,83,0.1);
          border-color: rgba(203,161,83,0.3);
          color: var(--primary);
          box-shadow: 0 0 20px rgba(203,161,83,0.1);
          font-weight: bold;
        }
        .category-icon {
          padding: 8px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
        }
        .category-btn.active .category-icon {
          background: rgba(203,161,83,0.2);
        }
        .question-card {
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          margin-bottom: 16px;
          overflow: hidden;
          transition: all 0.3s;
        }
        .question-card.active {
          border-color: rgba(203,161,83,0.4);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .question-btn {
          width: 100%;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-family: inherit;
          font-size: 1.1rem;
          font-weight: bold;
          text-align: right;
        }
        .question-btn h3 {
          padding-right: 12px;
          border-right: 2px solid transparent;
          transition: all 0.3s;
        }
        .question-card.active .question-btn h3 {
          color: var(--primary);
          border-right-color: var(--primary);
        }
        .chevron-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          transition: all 0.3s;
        }
        .question-card.active .chevron-icon {
          background: var(--primary);
          color: #000;
          transform: rotate(180deg);
        }
        .question-answer {
          padding: 0 24px 24px;
          color: rgba(255,255,255,0.7);
          line-height: 1.8;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 10px;
          padding-top: 20px;
          font-size: 1.05rem;
        }
        .contact-box {
          margin-top: 40px;
          background: linear-gradient(135deg, #111, #0a0a0a);
          padding: 32px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .contact-btn {
          display: inline-block;
          width: 100%;
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          text-align: center;
          border-radius: 12px;
          font-weight: bold;
          transition: all 0.3s;
          margin-top: 20px;
        }
        .contact-btn:hover {
          background: rgba(203,161,83,0.1);
          color: var(--primary);
          border-color: rgba(203,161,83,0.5);
        }
      `}</style>

      <main className="faq-wrapper">
        
        {/* Premium Hero Section */}
        <section className="hero-section">
          <div className="container" style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(203,161,83,0.1)', border: '1px solid rgba(203,161,83,0.2)', marginBottom: '24px', color: 'var(--primary)', boxShadow: '0 0 30px rgba(203,161,83,0.2)' }}>
              <MessageCircle size={40} />
            </div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '24px' }}>الأسئلة <span style={{ color: 'var(--primary)' }}>الشائعة</span></h1>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', maxWidth: '800px', margin: '0 auto', lineHeight: 1.8 }}>
              جمعنا لك الإجابات الشاملة والمفصلة لجميع استفساراتك لتتمتع بتجربة تعليمية سلسة وواضحة.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="container">
            <div className="faq-container">
              
              {/* Sidebar Categories */}
              <div className="faq-sidebar">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '24px', paddingRight: '16px', borderRight: '3px solid var(--primary)' }}>أقسام المساعدة</h3>
                
                {faqCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setOpenQuestionIndex(0);
                    }}
                    className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                  >
                    <div className="category-icon">
                      {category.icon}
                    </div>
                    <span>{category.title}</span>
                  </button>
                ))}

                {/* Contact Box */}
                <div className="contact-box">
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(203,161,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '24px', border: '1px solid rgba(203,161,83,0.3)' }}>
                    <Mail size={24} />
                  </div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '12px' }}>لم تجد إجابتك؟</h4>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                    فريق الدعم الفني الخاص بنا متواجد دائماً للرد على جميع استفساراتك ومساعدتك.
                  </p>
                  <Link href="/contact" className="contact-btn">
                    تواصل معنا الآن
                  </Link>
                </div>
              </div>

              {/* FAQ Content Area */}
              <div className="faq-content">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ padding: '12px', backgroundColor: 'rgba(203,161,83,0.1)', borderRadius: '16px', color: 'var(--primary)', border: '1px solid rgba(203,161,83,0.2)' }}>
                        {currentCategory?.icon}
                      </div>
                      <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{currentCategory?.title}</h2>
                    </div>

                    {currentCategory?.questions.map((item, index) => {
                      const isOpen = openQuestionIndex === index;
                      return (
                        <div key={index} className={`question-card ${isOpen ? 'active' : ''}`}>
                          <button
                            onClick={() => setOpenQuestionIndex(isOpen ? null : index)}
                            className="question-btn"
                          >
                            <h3>{item.q}</h3>
                            <div className="chevron-icon">
                              <ChevronDown size={20} />
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="question-answer">
                                  {item.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
