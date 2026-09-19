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
      icon: <Users size={32} className="text-primary" />,
      title: 'جمهور عالمي ومتعطش للتعلم',
      description: 'قم بالوصول إلى آلاف الطلاب من مختلف أنحاء العالم الذين يبحثون بشغف عن المعرفة التي تمتلكها. منصتنا تضمن لك الانتشار الواسع.'
    },
    {
      icon: <DollarSign size={32} className="text-primary" />,
      title: 'مصادر دخل متعددة ومستدامة',
      description: 'اربح المال في كل مرة يشتري فيها طالب دورتك، واحصل على عوائد مجزية بفضل نظامنا المالي الشفاف وعمولات المدربين المرتفعة.'
    },
    {
      icon: <Video size={32} className="text-primary" />,
      title: 'أدوات تقنية متطورة وحصرية',
      description: 'نوفر لك استوديو افتراضي لرفع دروسك، إنشاء اختبارات تفاعلية، إدارة طلابك، وإقامة بث مباشر عالي الدقة بكل سهولة.'
    },
    {
      icon: <Shield size={32} className="text-primary" />,
      title: 'حماية كاملة لمحتواك',
      description: 'نستخدم أقوى أنظمة التشفير وحماية حقوق الملكية (DRM) لضمان عدم سرقة فيديوهاتك أو تحميلها بطرق غير مشروعة.'
    }
  ];

  const steps = [
    {
      step: '01',
      title: 'بناء المنهج وتخطيط الدورة',
      description: 'ابدأ بوضع خطة واضحة ومقسمة لفصول ودروس. نحن نوفر لك أدلة شاملة لمساعدتك في صياغة محتوى احترافي يجذب الطلاب ويحقق أهدافهم.',
      icon: <Target size={24} className="text-primary" />
    },
    {
      step: '02',
      title: 'تسجيل وإنتاج المحتوى',
      description: 'استخدم أدواتك لتسجيل الفيديوهات بوضوح، أضف المرفقات (PDFs, الكود المصدري)، وقم بإعداد الاختبارات القصيرة لقياس فهم الطلاب.',
      icon: <Video size={24} className="text-primary" />
    },
    {
      step: '03',
      title: 'الإطلاق والبدء بجني الأرباح',
      description: 'بمجرد نشر الدورة، سيبدأ فريق التسويق لدينا بالترويج لها. راقب أرباحك وتفاعل مع أسئلة طلابك في منتدى الدورة لزيادة تقييماتك.',
      icon: <Rocket size={24} className="text-primary" />
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30" dir="rtl">
      <Navbar />

      <main className="pt-24 pb-0">
        
        {/* Advanced Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute top-40 -left-40 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                <Star size={16} className="text-primary fill-primary" />
                <span className="text-sm font-medium">انضم إلى أكثر من 500 مدرب محترف</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-[1.2] tracking-tight">
                حوّل <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary via-yellow-200 to-primary">معرفتك</span> إلى تأثير عالمي<br/>ودخل مستدام
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                منصة KQ Academy هي شريكك التقني للنجاح. نحن نوفر لك التكنولوجيا والجمهور، وكل ما عليك فعله هو مشاركة إبداعك وخبرتك.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/contact" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-primary to-yellow-500 text-black font-bold rounded-2xl hover:scale-105 transition-all duration-300 text-lg shadow-[0_10px_40px_rgba(203,161,83,0.4)] flex items-center justify-center gap-2">
                  ابدأ التدريس الآن <TrendingUp size={20} />
                </Link>
                <Link href="/courses" className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 font-bold rounded-2xl transition-all duration-300 text-lg flex items-center justify-center gap-3 backdrop-blur-sm group">
                  استكشف المنصة <ArrowLeft size={20} className="transform group-hover:-translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid - Why Teach With Us */}
        <section className="py-24 bg-black relative border-y border-white/5">
          {/* Subtle Grid Pattern Background */}
          <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.03]" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">لماذا تختار <span className="text-primary">KQ Academy</span>؟</h2>
              <p className="text-xl text-gray-400">نقدم لك بيئة متكاملة تضمن لك التركيز على الإبداع بينما نتولى نحن الجانب التقني والتسويقي.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {reasons.map((reason, index) => (
                <div key={index} className="group relative bg-[#0a0a0a] p-10 rounded-3xl border border-white/5 hover:border-primary/30 transition-all duration-500 overflow-hidden">
                  {/* Hover Gradient Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10 flex gap-6 items-start">
                    <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-500 shadow-lg">
                      {reason.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-primary transition-colors">{reason.title}</h3>
                      <p className="text-gray-400 leading-relaxed text-lg">{reason.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vertical Timeline - How it Works */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full bg-primary/5 blur-[150px] pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-20 max-w-7xl mx-auto">
              
              {/* Text Side */}
              <div className="lg:w-1/2">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">رحلتك نحو النجاح<br/>تبدأ بـ <span className="text-primary">3 خطوات بسيطة</span></h2>
                <p className="text-xl text-gray-400 mb-12 leading-relaxed">
                  لقد صممنا لوحة تحكم المدربين لتكون بديهية وسهلة الاستخدام. لا تحتاج إلى خبرة برمجية لرفع دوراتك ومتابعة تقدمك.
                </p>
                <div className="hidden lg:flex items-center gap-4 text-primary font-bold text-lg">
                  <span>اكتشف كيف تعمل المنصة</span>
                  <ArrowLeft size={24} className="animate-pulse" />
                </div>
              </div>

              {/* Timeline Side */}
              <div className="lg:w-1/2 w-full relative">
                {/* Vertical Line */}
                <div className="absolute right-8 top-8 bottom-8 w-1 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent rounded-full" />
                
                <div className="flex flex-col gap-12">
                  {steps.map((step, index) => (
                    <div key={index} className="relative flex gap-8 items-start group">
                      {/* Number Node */}
                      <div className="shrink-0 w-16 h-16 rounded-full bg-black border-2 border-primary flex items-center justify-center text-primary font-bold text-xl relative z-10 group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(203,161,83,0.2)]">
                        {step.step}
                      </div>
                      
                      {/* Content Card */}
                      <div className="bg-[#0a0a0a] p-8 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors w-full shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-2xl font-bold">{step.title}</h3>
                          <div className="p-2 bg-white/5 rounded-lg text-primary">
                            {step.icon}
                          </div>
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Requirements Section - Sleek List */}
        <section className="py-24 bg-white/5 border-t border-white/10">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16 items-center">
              
              <div className="md:w-1/3">
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mb-8 border border-primary/30">
                  <Award size={40} className="text-primary" />
                </div>
                <h2 className="text-4xl font-bold mb-6">ماذا نتوقع منك؟</h2>
                <p className="text-xl text-gray-400 leading-relaxed">
                  نحن نبحث عن الخبراء الشغوفين بنقل المعرفة. إذا كنت تمتلك المهارة، نحن نمتلك المنصة.
                </p>
              </div>
              
              <div className="md:w-2/3 w-full">
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                  {[
                    'شغف حقيقي بالتعليم ومشاركة المعرفة.',
                    'خبرة عملية ومثبتة في المجال الذي تود تدريسه.',
                    'القدرة على تسجيل فيديو وصوت بجودة واضحة وممتازة.',
                    'الالتزام بتقديم محتوى حصري وعالي الجودة لطلابنا.',
                    'التفاعل المستمر مع أسئلة الطلاب في قسم المجتمع.',
                    'تجهيز منهج دراسي منظم وتسلسل منطقي للمعلومات.'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="shrink-0 mt-1 bg-primary/20 p-1 rounded-full text-primary">
                        <CheckCircle size={18} />
                      </div>
                      <span className="text-gray-300 text-lg leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Premium CTA Section */}
        <section className="py-32 relative overflow-hidden bg-black">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-50" />
          <div className="container mx-auto px-6 relative z-10 text-center">
            <h2 className="text-5xl md:text-6xl font-black mb-8 tracking-tight">هل أنت مستعد <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-white">لترك بصمتك</span>؟</h2>
            <p className="text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              انضم إلينا اليوم وابدأ ببناء إرثك التعليمي مع أكاديمية KQ. سجل الآن وتواصل مع الدعم الفني لتفعيل حساب المدرب الخاص بك.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <Link href="/register" className="w-full sm:w-auto px-12 py-5 bg-primary text-black font-extrabold rounded-2xl hover:scale-105 transition-all duration-300 text-xl shadow-[0_0_40px_rgba(203,161,83,0.5)]">
                إنشاء حساب مجاني
              </Link>
              <Link href="/contact" className="w-full sm:w-auto px-12 py-5 bg-transparent border-2 border-white text-white font-bold rounded-2xl hover:bg-white/10 transition-all duration-300 text-xl">
                تواصل مع الإدارة
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
