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
    <div style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', direction: 'rtl', fontFamily: "'Cairo', sans-serif" }}>
      <Navbar />

      <main style={{ paddingTop: '100px', paddingBottom: '0' }}>
        
        {/* Header Section */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0', borderBottom: '1px solid var(--border-light)', textAlign: 'center' }}>
          <div className="container" style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(203,161,83,0.1)', border: '1px solid rgba(203,161,83,0.2)', marginBottom: '24px', boxShadow: '0 0 30px rgba(203,161,83,0.2)' }}>
              <RefreshCcw size={40} color="var(--primary)" />
            </div>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '24px' }}>سياسة <span style={{ color: 'var(--primary)' }}>الاسترجاع</span></h1>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)', maxWidth: '800px', margin: '0 auto', lineHeight: 1.8 }}>
              في أكاديمية KQ، نضع جودة التعليم ورضاك في قمة أولوياتنا. لقد صممنا سياسة استرجاع عادلة وشفافة لضمان حقوقك بالكامل.
            </p>
          </div>
        </section>

        {/* Policy Content */}
        <section style={{ padding: '80px 0' }}>
          <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Important Alert */}
              <div style={{ backgroundColor: 'rgba(203,161,83,0.1)', border: '1px solid rgba(203,161,83,0.3)', padding: '24px', borderRadius: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start', boxShadow: '0 0 20px rgba(203,161,83,0.1)' }}>
                <div style={{ flexShrink: 0, marginTop: '4px' }}>
                  <ShieldCheck size={28} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px' }}>ضمان الجودة والمطابقة</h3>
                  <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.8 }}>
                    نحن نضمن لك أن محتوى الكورسات مطابق تماماً للوصف المذكور في صفحة الدورة. في حال وجدت أن المحتوى غير مطابق للوصف الفني والعلمي المذكور، يحق لك المطالبة باسترداد أموالك بالكامل دون أي تعقيدات.
                  </p>
                </div>
              </div>

              {/* Conditions Card */}
              <div style={{ backgroundColor: '#0a0a0a', border: '1px solid var(--border-light)', borderRadius: '24px', padding: '40px', transition: 'border-color 0.3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <CheckCircle2 size={28} color="var(--primary)" />
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>متى يحق لك الاسترجاع؟</h2>
                </div>
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '10px', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px' }}>عدم مطابقة المحتوى للوصف</h4>
                      <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
                        إذا كان محتوى الدورة مختلفاً بشكل جوهري عما تم ذكره في تفاصيل ومحاور الدورة قبل الشراء.
                      </p>
                    </div>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '10px', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px' }}>المرونة في الوقت والمشاهدة</h4>
                      <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
                        نحن نثق بجودتنا! لذلك قمنا بإلغاء قيود الوقت وإلغاء شرط الحد الأقصى للمشاهدة. يحق لك التقييم براحة تامة.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Exclusions Card */}
              <div style={{ backgroundColor: '#0a0a0a', border: '1px solid var(--border-light)', borderRadius: '24px', padding: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '12px' }}>
                    <AlertTriangle size={28} color="#ef4444" />
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>الحالات التي لا يشملها الاسترجاع</h2>
                </div>
                
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                    <span>مبالغ الاشتراكات الشهرية الشاملة.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                    <span>عمليات الدفع التي تمت باستخدام رصيد المحفظة المجاني أو الهدايا.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                    <span>تغيير الرأي الشخصي بعد تحميل ملفات الدورة (PDF والمرفقات) بالكامل.</span>
                  </li>
                </ul>
              </div>

              {/* How to request */}
              <div style={{ background: 'linear-gradient(135deg, #111, #0a0a0a)', border: '1px solid var(--border-light)', borderRadius: '24px', padding: '40px', position: 'relative', overflow: 'hidden' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', position: 'relative', zIndex: 10 }}>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    <Info size={28} color="var(--primary)" />
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>آلية طلب الاسترجاع</h2>
                </div>
                
                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, marginBottom: '24px', fontSize: '1.1rem', position: 'relative', zIndex: 10 }}>
                  لتقديم طلب استرجاع، يرجى مراسلة الدعم الفني مباشرة وتزويدنا بالمعلومات التالية:
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>1</div>
                    <span>رقم الطلب أو الفاتورة</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>2</div>
                    <span>اسم الدورة واسم الحساب</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', gridColumn: '1 / -1' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>3</div>
                    <span>شرح واضح لسبب عدم مطابقة المحتوى للوصف</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: 'rgba(203,161,83,0.05)', borderRadius: '12px', border: '1px solid rgba(203,161,83,0.2)', position: 'relative', zIndex: 10 }}>
                  <div style={{ flexShrink: 0, marginTop: '4px' }}>
                    <CreditCard size={24} color="var(--primary)" />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: 1.8 }}>
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
