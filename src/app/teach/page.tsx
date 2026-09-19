import React from 'react';
import Link from 'next/link';
import { BookOpen, Users, DollarSign, Video, CheckCircle, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'انضم كمدرب | أكاديمية KQ',
  description: 'شارك معرفتك، وألهم ملايين الطلاب حول العالم وحقق دخلاً ممتازاً من خلال التدريس في أكاديمية KQ.',
};

export default function TeachPage() {
  const reasons = [
    {
      icon: <Users size={40} className="text-primary mb-4" />,
      title: 'إلهام الطلاب',
      description: 'ساعد في تمكين المتعلمين على اكتساب مهارات جديدة، وتحقيق أهدافهم المهنية والشخصية بفضل خبرتك.'
    },
    {
      icon: <DollarSign size={40} className="text-primary mb-4" />,
      title: 'تحقيق دخل ممتاز',
      description: 'اربح المال في كل مرة يشتري فيها طالب دورتك المدفوعة، واحصل على دفعات شهرية منتظمة ومستقرة.'
    },
    {
      icon: <Video size={40} className="text-primary mb-4" />,
      title: 'أدوات متطورة',
      description: 'استفد من أدواتنا المبتكرة لإنشاء الكورسات بسهولة، سواء فيديوهات مسجلة أو غرف بث مباشر تفاعلية.'
    }
  ];

  const steps = [
    {
      step: '1',
      title: 'خطط للمنهج',
      description: 'اختر موضوعك وقم بإعداد المادة العلمية. نحن نقدم لك إرشادات كاملة لمساعدتك في بناء محتوى قوي ومفيد.'
    },
    {
      step: '2',
      title: 'سجل الفيديو',
      description: 'استخدم أدوات التصوير البسيطة أو المتقدمة لتسجيل دروسك بجودة عالية، وأضف المرفقات والاختبارات.'
    },
    {
      step: '3',
      title: 'انطلق واربح',
      description: 'انشر الدورة واستقبل طلابك. سنقوم بالتسويق لدورتك لضمان وصولها لأكبر عدد ممكن من المهتمين.'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <Navbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                شارك معرفتك، وألهم <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-yellow-300">ملايين الطلاب</span>
              </h1>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                انضم إلى نخبة المدربين في منصة KQ Academy، وقم ببناء مسيرتك المهنية بينما تساعد الآخرين في بناء مسيرتهم.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact" className="w-full sm:w-auto px-8 py-4 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all text-lg shadow-[0_0_20px_rgba(203,161,83,0.3)] text-center">
                  قدم طلب انضمام كمدرب
                </Link>
                <Link href="/courses" className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 font-bold rounded-xl transition-all text-lg flex items-center justify-center gap-2">
                  استكشف دوراتنا <ArrowLeft size={20} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Teach Section */}
        <section className="py-20 bg-white/5 border-y border-white/10">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">لماذا تُدرّس في KQ Academy؟</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {reasons.map((reason, index) => (
                <div key={index} className="bg-black/50 p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group">
                  <div className="transform group-hover:scale-110 transition-transform duration-300 origin-right">
                    {reason.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{reason.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-lg">{reason.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">كيف تبدأ رحلتك؟</h2>
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Connecting Line */}
                <div className="hidden md:block absolute top-1/2 right-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 z-0" />
                
                {steps.map((step, index) => (
                  <div key={index} className="relative z-10 flex flex-col items-center text-center bg-[#050505] p-8 rounded-2xl border border-white/5">
                    <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center text-2xl font-bold mb-6">
                      {step.step}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                    <p className="text-gray-400 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section className="py-20 bg-gradient-to-b from-transparent to-primary/5">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto bg-[#111] rounded-3xl p-8 md:p-12 border border-primary/20 shadow-[0_0_30px_rgba(203,161,83,0.1)]">
              <h2 className="text-3xl font-bold mb-8 text-center">ماذا نحتاج منك؟</h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  'شغف حقيقي بالتعليم ومشاركة المعرفة.',
                  'خبرة عملية في المجال الذي تود تدريسه.',
                  'القدرة على تسجيل فيديو وصوت بجودة واضحة.',
                  'الالتزام بتقديم محتوى حصري وعالي الجودة.',
                  'التفاعل مع أسئلة الطلاب في قسم المجتمع.',
                  'تجهيز منهج دراسي منظم وتسلسل منطقي للمعلومات.'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className="text-primary shrink-0 mt-1" size={20} />
                    <span className="text-gray-300 text-lg leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold mb-6">جاهز لبدء التدريس؟</h2>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              تواصل معنا الآن وسنقوم بمراجعة طلبك وإعطائك الصلاحيات اللازمة للبدء في نشر دوراتك وتحقيق أرباحك.
            </p>
            <Link href="/contact" className="inline-block px-10 py-5 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all text-xl shadow-[0_0_20px_rgba(203,161,83,0.3)] hover:scale-105 duration-300">
              تواصل معنا لتفعيل حسابك كمدرب
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
