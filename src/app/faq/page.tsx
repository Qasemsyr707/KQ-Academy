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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30" dir="rtl">
      <Navbar />

      <main className="pt-24 pb-20">
        
        {/* Premium Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-24 border-b border-white/5">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 mb-8 text-primary shadow-[0_0_30px_rgba(203,161,83,0.2)]">
              <MessageCircle size={40} />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">الأسئلة <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-yellow-200">الشائعة</span></h1>
            <p className="text-xl text-gray-400 leading-relaxed">
              جمعنا لك الإجابات الشاملة والمفصلة لجميع استفساراتك لتتمتع بتجربة تعليمية سلسة وواضحة.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-6 max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-12 items-start">
              
              {/* Sidebar Categories */}
              <div className="w-full lg:w-1/3 flex flex-col gap-3 sticky top-32 z-10">
                <h3 className="text-lg font-bold mb-4 px-4 border-r-2 border-primary">أقسام المساعدة</h3>
                {faqCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setOpenQuestionIndex(0); // Reset open question when changing category
                    }}
                    className={`flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 text-right ${
                      activeCategory === category.id 
                      ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_20px_rgba(203,161,83,0.1)] border' 
                      : 'bg-[#0a0a0a] border-white/5 text-gray-400 hover:bg-white/5 hover:text-white border'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${activeCategory === category.id ? 'bg-primary/20' : 'bg-white/5'}`}>
                      {category.icon}
                    </div>
                    <span className="font-bold text-lg">{category.title}</span>
                  </button>
                ))}

                {/* Contact Box */}
                <div className="mt-8 bg-gradient-to-br from-[#111] to-[#0a0a0a] p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] group-hover:bg-primary/20 transition-colors" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6 border border-primary/30">
                      <Mail size={24} />
                    </div>
                    <h4 className="text-xl font-bold mb-3">لم تجد إجابتك؟</h4>
                    <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                      فريق الدعم الفني الخاص بنا متواجد دائماً للرد على جميع استفساراتك ومساعدتك.
                    </p>
                    <Link href="/contact" className="inline-block w-full py-3 bg-white/5 border border-white/10 hover:border-primary/50 text-center rounded-xl font-bold transition-colors hover:bg-primary/10 hover:text-primary">
                      تواصل معنا الآن
                    </Link>
                  </div>
                </div>
              </div>

              {/* FAQ Content Area */}
              <div className="w-full lg:w-2/3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategory}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                        {currentCategory?.icon}
                      </div>
                      <h2 className="text-3xl font-bold">{currentCategory?.title}</h2>
                    </div>

                    {currentCategory?.questions.map((item, index) => {
                      const isOpen = openQuestionIndex === index;
                      return (
                        <div 
                          key={index} 
                          className={`bg-[#0a0a0a] border transition-all duration-300 overflow-hidden ${
                            isOpen ? 'border-primary/40 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]' : 'border-white/5 rounded-2xl hover:border-white/10'
                          }`}
                        >
                          <button
                            onClick={() => setOpenQuestionIndex(isOpen ? null : index)}
                            className="w-full p-6 flex justify-between items-center text-right focus:outline-none group"
                          >
                            <h3 className={`font-bold text-lg pr-2 border-r-2 transition-colors duration-300 ${isOpen ? 'text-primary border-primary' : 'text-gray-200 border-transparent group-hover:text-white'}`}>
                              {item.q}
                            </h3>
                            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-primary text-black rotate-180' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white'}`}>
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
                                <div className="p-6 pt-0 text-gray-400 leading-relaxed text-lg border-t border-white/5 mt-2">
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
