import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AlertTriangle, ShieldCheck, CreditCard, RefreshCcw, Info, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'سياسة الاسترجاع | أكاديمية KQ',
  description: 'تعرف على سياسة وشروط استرجاع الأموال في أكاديمية KQ لضمان حقوقك وتجربة تعليمية آمنة.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30" dir="rtl">
      <Navbar />

      <main className="pt-24 pb-20">
        
        {/* Header Section */}
        <section className="relative py-16 border-b border-white/5 overflow-hidden">
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-full max-w-4xl h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border border-primary/20 mb-6 text-primary shadow-[0_0_30px_rgba(203,161,83,0.2)]">
              <RefreshCcw size={40} />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-6">سياسة <span className="text-primary">الاسترجاع</span></h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              في أكاديمية KQ، نضع جودة التعليم ورضاك في قمة أولوياتنا. لقد صممنا سياسة استرجاع عادلة وشفافة لضمان حقوقك بالكامل.
            </p>
          </div>
        </section>

        {/* Policy Content */}
        <section className="py-16">
          <div className="container mx-auto px-6 max-w-4xl">
            
            <div className="space-y-8">
              
              {/* Important Alert */}
              <div className="bg-primary/10 border border-primary/30 p-6 rounded-2xl flex gap-4 items-start shadow-[0_0_20px_rgba(203,161,83,0.1)]">
                <ShieldCheck className="text-primary shrink-0 mt-1" size={28} />
                <div>
                  <h3 className="text-xl font-bold text-primary mb-2">ضمان الجودة والمطابقة</h3>
                  <p className="text-gray-300 leading-relaxed">
                    نحن نضمن لك أن محتوى الكورسات مطابق تماماً للوصف المذكور في صفحة الدورة. في حال وجدت أن المحتوى غير مطابق للوصف الفني والعلمي المذكور، يحق لك المطالبة باسترداد أموالك بالكامل دون أي تعقيدات.
                  </p>
                </div>
              </div>

              {/* Conditions Card */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 md:p-10 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
                  <div className="p-3 bg-white/5 rounded-xl text-white">
                    <CheckCircle2 size={28} className="text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">متى يحق لك الاسترجاع؟</h2>
                </div>
                
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold mb-1">عدم مطابقة المحتوى للوصف</h4>
                      <p className="text-gray-400 leading-relaxed">
                        إذا كان محتوى الدورة مختلفاً بشكل جوهري عما تم ذكره في تفاصيل ومحاور الدورة قبل الشراء.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2.5 shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold mb-1">المرونة في الوقت والمشاهدة</h4>
                      <p className="text-gray-400 leading-relaxed">
                        نحن نثق بجودتنا! لذلك قمنا بإلغاء قيود الوقت (كشرط الـ 7 أيام) وإلغاء شرط الحد الأقصى للمشاهدة. يحق لك التقييم براحة تامة.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Exclusions Card */}
              <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 md:p-10 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6">
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                    <AlertTriangle size={28} />
                  </div>
                  <h2 className="text-2xl font-bold">الحالات التي لا يشملها الاسترجاع</h2>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>مبالغ الاشتراكات الشهرية الشاملة.</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>عمليات الدفع التي تمت باستخدام رصيد المحفظة المجاني أو الهدايا.</span>
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span>تغيير الرأي الشخصي بعد تحميل ملفات الدورة (PDF والمرفقات) بالكامل.</span>
                  </li>
                </ul>
              </div>

              {/* How to request */}
              <div className="bg-gradient-to-br from-[#111] to-[#0a0a0a] border border-white/10 rounded-3xl p-8 md:p-10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-colors pointer-events-none" />
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="p-3 bg-white/5 rounded-xl text-primary">
                    <Info size={28} />
                  </div>
                  <h2 className="text-2xl font-bold">آلية طلب الاسترجاع</h2>
                </div>
                
                <p className="text-gray-300 leading-relaxed mb-6 relative z-10 text-lg">
                  لتقديم طلب استرجاع، يرجى مراسلة الدعم الفني مباشرة وتزويدنا بالمعلومات التالية:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 relative z-10">
                  <div className="bg-black/50 border border-white/5 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary font-bold">1</div>
                    <span>رقم الطلب أو الفاتورة</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 p-4 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary font-bold">2</div>
                    <span>اسم الدورة واسم الحساب</span>
                  </div>
                  <div className="bg-black/50 border border-white/5 p-4 rounded-xl flex items-center gap-3 sm:col-span-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-primary font-bold">3</div>
                    <span>شرح واضح لسبب عدم مطابقة المحتوى للوصف</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20 relative z-10">
                  <CreditCard className="text-primary shrink-0 mt-1" size={24} />
                  <p className="text-gray-300 text-sm leading-relaxed">
                    سيتم مراجعة طلبك بدقة، وفي حال الموافقة، سيتم إعادة المبلغ إلى محفظتك في الأكاديمية لتتمكن من شراء دورة أخرى، أو إعادته إلى وسيلة الدفع الأصلية حسب ما تقتضيه الشروط التقنية ومزود خدمة الدفع لديك.
                  </p>
                </div>

              </div>

            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
