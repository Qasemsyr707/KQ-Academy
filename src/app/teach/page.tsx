import React from 'react';
import Link from 'next/link';
import { Users, DollarSign, Video, CheckCircle, ArrowLeft, Star, TrendingUp, Shield, Rocket, Target, Award } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'انضم كمدرب | أكاديمية KQ',
  description: 'شارك معرفتك، وألهم ملايين الطلاب حول العالم وحقق دخلاً ممتازاً من خلال التدريس في أكاديمية KQ.',
};

export default function TeachPage() {
  const reasons = [
    {
      icon: <Users size={36} color="#050505" />,
      title: 'جمهور عالمي ومتعطش للتعلم',
      description: 'قم بالوصول إلى آلاف الطلاب من مختلف أنحاء العالم الذين يبحثون بشغف عن المعرفة التي تمتلكها. منصتنا تضمن لك الانتشار الواسع.'
    },
    {
      icon: <DollarSign size={36} color="#050505" />,
      title: 'مصادر دخل متعددة ومستدامة',
      description: 'اربح المال في كل مرة يشتري فيها طالب دورتك، واحصل على عوائد مجزية بفضل نظامنا المالي الشفاف وعمولات المدربين المرتفعة.'
    },
    {
      icon: <Video size={36} color="#050505" />,
      title: 'أدوات تقنية متطورة وحصرية',
      description: 'نوفر لك استوديو افتراضي لرفع دروسك، إنشاء اختبارات تفاعلية، إدارة طلابك، وإقامة بث مباشر عالي الدقة بكل سهولة.'
    },
    {
      icon: <Shield size={36} color="#050505" />,
      title: 'حماية كاملة لمحتواك',
      description: 'نستخدم أقوى أنظمة التشفير وحماية حقوق الملكية (DRM) لضمان عدم سرقة فيديوهاتك أو تحميلها بطرق غير مشروعة.'
    }
  ];

  const steps = [
    {
      step: '1',
      title: 'بناء المنهج وتخطيط الدورة',
      description: 'ابدأ بوضع خطة واضحة ومقسمة لفصول ودروس. نحن نوفر لك أدلة شاملة لمساعدتك.',
      icon: <Target size={28} color="var(--primary)" />
    },
    {
      step: '2',
      title: 'تسجيل وإنتاج المحتوى',
      description: 'استخدم أدواتك لتسجيل الفيديوهات بوضوح، أضف المرفقات والاختبارات.',
      icon: <Video size={28} color="var(--primary)" />
    },
    {
      step: '3',
      title: 'الإطلاق والبدء بجني الأرباح',
      description: 'بمجرد نشر الدورة، سيبدأ فريق التسويق لدينا بالترويج لها.',
      icon: <Rocket size={28} color="var(--primary)" />
    }
  ];

  const requirements = [
    'شغف حقيقي بالتعليم',
    'خبرة عملية ومثبتة بالمجال',
    'تصوير فيديو وصوت عالي الدقة',
    'محتوى حصري وقيّم',
    'تفاعل مستمر مع الطلاب',
    'منهج دراسي منظم ومنطقي'
  ];

  return (
    <div style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <Navbar />

      <main style={{ paddingTop: '100px', paddingBottom: '0' }}>
        
        {/* Advanced Hero Section */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 0', borderBottom: '1px solid var(--border-light)' }}>
          <div className="container" style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '50px', backgroundColor: 'rgba(203,161,83,0.1)', border: '1px solid rgba(203,161,83,0.3)', marginBottom: '32px', color: 'var(--primary)', fontWeight: 'bold' }}>
                <Star size={18} fill="var(--primary)" />
                <span>أكثر من 500 مدرب محترف يثقون بنا</span>
              </div>
              
              <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '32px', lineHeight: 1.3 }}>
                حوّل <span style={{ backgroundColor: 'var(--primary)', color: '#050505', padding: '5px 20px', borderRadius: '30px', margin: '0 8px', boxShadow: '0 0 30px rgba(203,161,83,0.5)' }}>معرفتك</span> إلى تأثير عالمي
              </h1>
              
              <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', marginBottom: '48px', lineHeight: 1.8 }}>
                منصة KQ Academy هي شريكك التقني للنجاح. نحن نوفر لك التكنولوجيا المتطورة والجمهور الكبير، وكل ما عليك فعله هو إبداعك ومشاركة خبراتك.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <Link href="/contact" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 40px', background: 'linear-gradient(to right, var(--primary), #e0b86a)', color: '#050505', fontWeight: 900, borderRadius: '16px', fontSize: '1.1rem', boxShadow: '0 0 40px rgba(203,161,83,0.4)', transition: 'transform 0.3s' }}>
                  ابدأ مسيرتك كمدرب الآن <TrendingUp size={24} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Teach With Us */}
        <section style={{ padding: '100px 0', backgroundColor: '#0a0a0a', borderBottom: '1px solid var(--border-light)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '16px' }}>لماذا تختار <span style={{ color: 'var(--primary)' }}>KQ Academy</span>؟</h2>
            <div style={{ width: '80px', height: '4px', backgroundColor: 'var(--primary)', margin: '0 auto 30px', borderRadius: '4px', boxShadow: '0 0 15px rgba(203,161,83,0.6)' }} />
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto 60px' }}>نقدم لك بيئة متكاملة تضمن لك التركيز على الإبداع بينما نتولى نحن الجانب التقني والتسويقي بأعلى المعايير.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '1000px', margin: '0 auto' }}>
              {reasons.map((reason, index) => (
                <div key={index} style={{ backgroundColor: '#111', padding: '40px', borderRadius: '30px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', transition: 'all 0.3s' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #e0b86a)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 0 30px rgba(203,161,83,0.4)' }}>
                    {reason.icon}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>{reason.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>{reason.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section style={{ padding: '100px 0', backgroundColor: '#050505', borderBottom: '1px solid var(--border-light)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '20px' }}>رحلتك نحو النجاح بـ <span style={{ color: 'var(--primary)' }}>3 خطوات</span></h2>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto 60px' }}>لقد صممنا كل شيء ليكون بديهياً ومريحاً لك. ابدأ الآن واجعل العالم صفك الدراسي.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>
              {steps.map((step, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
                  <div style={{ width: '90px', height: '90px', borderRadius: '25px', backgroundColor: '#111', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '24px', boxShadow: '0 0 40px rgba(203,161,83,0.3)', transform: 'rotate(5deg)' }}>
                    {step.step}
                  </div>
                  <div style={{ padding: '15px', backgroundColor: 'rgba(203,161,83,0.1)', borderRadius: '50%', marginBottom: '20px' }}>
                    {step.icon}
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px' }}>{step.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Requirements Section */}
        <section style={{ padding: '100px 0', backgroundColor: '#0a0a0a', borderBottom: '1px solid var(--border-light)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <div style={{ width: '90px', height: '90px', backgroundColor: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', boxShadow: '0 0 50px rgba(203,161,83,0.5)' }}>
              <Award size={48} color="#050505" />
            </div>
            <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '20px' }}>ماذا نتوقع منك كمدرب؟</h2>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto 60px' }}>نحن نبحث عن النخبة. إذا كنت تمتلك الشغف والمعرفة، نحن نرحب بك في منصتنا لتكون جزءاً من قصة نجاحنا.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
              {requirements.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '30px', backgroundColor: '#050505', border: '1px solid rgba(203,161,83,0.2)', borderRadius: '24px' }}>
                  <CheckCircle size={36} color="var(--primary)" />
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Premium CTA Section */}
        <section style={{ padding: '120px 0', backgroundColor: '#050505', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '30px' }}>هل أنت مستعد <span style={{ color: 'var(--primary)', textShadow: '0 0 30px rgba(203,161,83,0.8)' }}>للانطلاق</span>؟</h2>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto 50px', lineHeight: 1.8 }}>
              ابدأ ببناء إرثك التعليمي مع أكاديمية KQ. سجل الآن وتواصل مع الإدارة لتفعيل حسابك كمدرب.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <Link href="/register" style={{ padding: '20px 50px', backgroundColor: 'var(--primary)', color: '#050505', fontWeight: 900, borderRadius: '50px', fontSize: '1.2rem', boxShadow: '0 0 50px rgba(203,161,83,0.6)' }}>
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
