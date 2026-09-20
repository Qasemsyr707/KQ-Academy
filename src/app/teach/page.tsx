import React from 'react';
import Link from 'next/link';
import { BookOpen, Users, DollarSign, Video, CheckCircle, ArrowLeft, Star, TrendingUp, Shield, Rocket, Target, Award } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'انضم كمدرب | أكاديمية KQ',
  description: 'شارك معرفتك، وألهم ملايين الطلاب حول العالم وحقق دخلاً ممتازاً من خلال التدريس في أكاديمية KQ.',
};

export default function TeachPage() {
  const reasons = [
    {
      icon: <Users size={36} className="text-[#111]" />,
      title: 'جمهور عالمي ومتعطش للتعلم',
      description: 'قم بالوصول إلى آلاف الطلاب من مختلف أنحاء العالم الذين يبحثون بشغف عن المعرفة التي تمتلكها. منصتنا تضمن لك الانتشار الواسع.'
    },
    {
      icon: <DollarSign size={36} className="text-[#111]" />,
      title: 'مصادر دخل متعددة ومستدامة',
      description: 'اربح المال في كل مرة يشتري فيها طالب دورتك، واحصل على عوائد مجزية بفضل نظامنا المالي الشفاف وعمولات المدربين المرتفعة.'
    },
    {
      icon: <Video size={36} className="text-[#111]" />,
      title: 'أدوات تقنية متطورة وحصرية',
      description: 'نوفر لك استوديو افتراضي لرفع دروسك، إنشاء اختبارات تفاعلية، إدارة طلابك، وإقامة بث مباشر عالي الدقة بكل سهولة.'
    },
    {
      icon: <Shield size={36} className="text-[#111]" />,
      title: 'حماية كاملة لمحتواك',
      description: 'نستخدم أقوى أنظمة التشفير وحماية حقوق الملكية (DRM) لضمان عدم سرقة فيديوهاتك أو تحميلها بطرق غير مشروعة.'
    }
  ];

  const steps = [
    {
      step: '1',
      title: 'بناء المنهج وتخطيط الدورة',
      description: 'ابدأ بوضع خطة واضحة ومقسمة لفصول ودروس. نحن نوفر لك أدلة شاملة لمساعدتك.',
      icon: <Target size={28} className="text-primary" />
    },
    {
      step: '2',
      title: 'تسجيل وإنتاج المحتوى',
      description: 'استخدم أدواتك لتسجيل الفيديوهات بوضوح، أضف المرفقات (PDFs, الكود المصدري)، والاختبارات.',
      icon: <Video size={28} className="text-primary" />
    },
    {
      step: '3',
      title: 'الإطلاق والبدء بجني الأرباح',
      description: 'بمجرد نشر الدورة، سيبدأ فريق التسويق لدينا بالترويج لها. راقب أرباحك وتفاعل مع أسئلة طلابك.',
      icon: <Rocket size={28} className="text-primary" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30" dir="rtl">
      <Navbar />

      <main className="pt-24 pb-0">
        
        {/* Advanced Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8 backdrop-blur-sm text-primary">
                <Star size={18} className="fill-primary" />
                <span className="text-sm font-bold tracking-wide">أكثر من 500 مدرب محترف يثقون بنا</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-[1.2] tracking-tight">
                حوّل <span className="text-black bg-primary px-4 py-1 rounded-2xl mx-2 shadow-[0_0_30px_rgba(203,161,83,0.5)]">معرفتك</span> إلى تأثير عالمي
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                منصة KQ Academy هي شريكك التقني للنجاح. نحن نوفر لك التكنولوجيا المتطورة والجمهور الكبير، وكل ما عليك فعله هو إبداعك ومشاركة خبراتك.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/contact" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-primary to-yellow-600 text-black font-black rounded-2xl hover:scale-105 transition-all duration-300 text-lg shadow-[0_0_40px_rgba(203,161,83,0.5)] flex items-center justify-center gap-2">
                  ابدأ مسيرتك كمدرب الآن <TrendingUp size={24} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Teach With Us - Centered Vibrant Grid */}
        <section className="py-24 relative bg-gradient-to-b from-[#0a0a0a] to-[#050505] border-t border-white/5">
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-6xl font-black mb-6">لماذا تختار <span className="text-primary">KQ Academy</span>؟</h2>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-6 shadow-[0_0_15px_rgba(203,161,83,0.6)]" />
              <p className="text-xl text-gray-400">نقدم لك بيئة متكاملة تضمن لك التركيز على الإبداع بينما نتولى نحن الجانب التقني والتسويقي بأعلى المعايير.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {reasons.map((reason, index) => (
                <div key={index} className="group flex flex-col items-center text-center bg-[#111] p-10 rounded-[2rem] border border-white/5 hover:border-primary/50 transition-all duration-500 hover:shadow-[0_10px_50px_rgba(203,161,83,0.15)] hover:-translate-y-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(203,161,83,0.4)] group-hover:scale-110 transition-transform duration-500">
                    {reason.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-primary transition-colors">{reason.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-lg">{reason.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Horizontal Steps - Distinctive Design */}
        <section className="py-32 relative overflow-hidden bg-[#050505]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] bg-primary/5 blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-8">رحلتك نحو النجاح بـ <span className="text-primary border-b-4 border-primary pb-2">3 خطوات</span></h2>
            <p className="text-xl text-gray-400 mb-20 max-w-3xl mx-auto">لقد صممنا كل شيء ليكون بديهياً ومريحاً لك. ابدأ الآن واجعل العالم صفك الدراسي.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-12 right-1/6 left-1/6 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent z-0" />
              
              {steps.map((step, index) => (
                <div key={index} className="relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-3xl bg-[#111] border-2 border-primary flex items-center justify-center text-4xl font-black text-primary mb-8 shadow-[0_0_40px_rgba(203,161,83,0.3)] transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    {step.step}
                  </div>
                  <div className="p-4 bg-primary/10 rounded-full mb-6">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-lg">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements Section - Centered & Colorful */}
        <section className="py-24 bg-gradient-to-b from-[#111] to-[#0a0a0a] border-y border-white/10">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex w-24 h-24 bg-primary rounded-full items-center justify-center mb-8 shadow-[0_0_50px_rgba(203,161,83,0.5)]">
              <Award size={48} className="text-black" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6">ماذا نتوقع منك كمدرب؟</h2>
            <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-16">
              نحن نبحث عن النخبة. إذا كنت تمتلك الشغف والمعرفة، نحن نرحب بك في منصتنا لتكون جزءاً من قصة نجاحنا.
            </p>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                'شغف حقيقي بالتعليم',
                'خبرة عملية ومثبتة بالمجال',
                'تصوير فيديو وصوت عالي الدقة',
                'محتوى حصري وقيّم',
                'تفاعل مستمر مع الطلاب',
                'منهج دراسي منظم ومنطقي'
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-4 p-8 bg-black border border-primary/20 rounded-3xl hover:bg-primary/5 hover:border-primary/50 transition-colors">
                  <CheckCircle size={36} className="text-primary" />
                  <span className="text-white font-bold text-xl">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Premium CTA Section */}
        <section className="py-32 relative overflow-hidden bg-black text-center">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-50" />
          <div className="container mx-auto px-6 relative z-10 text-center">
            <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tight">هل أنت مستعد <span className="text-primary drop-shadow-[0_0_20px_rgba(203,161,83,0.8)]">للانطلاق</span>؟</h2>
            <p className="text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              ابدأ ببناء إرثك التعليمي مع أكاديمية KQ. سجل الآن وتواصل مع الإدارة لتفعيل حسابك كمدرب.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link href="/register" className="w-full sm:w-auto px-12 py-5 bg-primary text-black font-black rounded-full hover:scale-105 transition-all duration-300 text-2xl shadow-[0_0_50px_rgba(203,161,83,0.6)]">
                إنشاء حساب مجاني
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
