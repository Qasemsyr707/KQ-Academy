import Link from 'next/link';
import { BookOpen, Briefcase, ArrowLeft, Users, Award, Zap } from 'lucide-react';
import { prisma } from '@/lib/db';

async function getCourses() {
  try {
    const courses = await prisma.course.findMany({
      include: { instructor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return courses;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const courses = await getCourses();

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        background: 'radial-gradient(circle at top, rgba(203,161,83,0.12), transparent 65%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(203,161,83,0.06), transparent)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(203,161,83,0.1)', border: '1px solid rgba(203,161,83,0.3)',
            padding: '0.4rem 1rem', borderRadius: '2rem', marginBottom: '2rem',
            color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 600
          }}>
            <Zap size={14} /> المنصة التعليمية الأولى في سوريا
          </div>

          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', 
            fontWeight: 900, 
            lineHeight: 1.15, 
            marginBottom: '1.5rem',
            color: '#fff'
          }}>
            أكاديمية KQ..{' '}
            <span style={{ 
              background: 'linear-gradient(135deg, var(--primary), #e0b86a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>بوابتك نحو التميز!</span>
          </h1>
          
          <p style={{ 
            fontSize: 'clamp(1rem, 2vw, 1.3rem)', 
            color: 'rgba(255,255,255,0.65)', 
            maxWidth: '700px', 
            margin: '0 auto 3rem auto',
            lineHeight: 1.7
          }}>
            نجمع بين قوة المناهج المدرسية (بكالوريا وتاسع) وأحدث المهارات المطلوبة في سوق العمل لضمان تفوقك الأكاديمي والمهني المستمر.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
            <Link href="/courses" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--primary)', color: '#000',
              padding: '0.9rem 2rem', borderRadius: '2rem', fontWeight: 700,
              textDecoration: 'none', fontSize: '1.05rem',
              boxShadow: '0 0 30px rgba(203,161,83,0.3)',
              transition: 'all 0.3s'
            }}>
              <BookOpen size={20} /> تصفح كل الكورسات
            </Link>
            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)', color: '#fff',
              padding: '0.9rem 2rem', borderRadius: '2rem', fontWeight: 700,
              textDecoration: 'none', fontSize: '1.05rem',
              border: '1px solid rgba(255,255,255,0.15)',
              transition: 'all 0.3s'
            }}>
              ابدأ مجاناً الآن 🚀
            </Link>
          </div>

          {/* Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '2rem',
            borderTop: '1px solid rgba(203,161,83,0.2)',
            paddingTop: '2.5rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {[
              { num: '+100K', label: 'طالب مسجل' },
              { num: '+150', label: 'كورس ومادة علمية' },
              { num: '4.9/5', label: 'تقييم الطلاب' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '2rem', fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--primary), #e0b86a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '0.25rem'
                }}>{stat.num}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section style={{ padding: '5rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(203,161,83,0.1)', borderRadius: '10px' }}>
                  <BookOpen size={24} color="var(--primary)" />
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>أحدث الكورسات</h2>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem' }}>المناهج السورية والمهارات المهنية في مكان واحد</p>
            </div>
            <Link href="/courses" style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              color: 'var(--primary)', fontWeight: 700, textDecoration: 'none'
            }}>
              عرض الكل <ArrowLeft size={18} />
            </Link>
          </div>

          {courses.length === 0 ? (
            <div style={{ 
              textAlign: 'center', padding: '5rem 2rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(203,161,83,0.3)',
              borderRadius: '20px',
              color: 'rgba(255,255,255,0.5)'
            }}>
              <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>قريباً جداً...</p>
              <p style={{ marginTop: '0.5rem' }}>يتم الآن تجهيز المحتوى التعليمي المميز</p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {courses.map((course) => (
                <Link 
                  key={course.id} 
                  href={`/courses/${course.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    background: 'rgba(15,15,15,0.8)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid rgba(203,161,83,0.15)',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  className="course-card"
                  >
                    <div style={{ 
                      height: '180px', 
                      background: 'linear-gradient(135deg, rgba(203,161,83,0.2), rgba(0,0,0,0.5))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <BookOpen size={48} color="rgba(203,161,83,0.4)" />
                      )}
                      <div style={{ 
                        position: 'absolute', top: '0.75rem', right: '0.75rem',
                        background: 'var(--primary)', color: '#000',
                        padding: '0.25rem 0.75rem', borderRadius: '2rem',
                        fontSize: '0.75rem', fontWeight: 700
                      }}>
                        {course.category}
                      </div>
                    </div>
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', lineHeight: 1.4 }}>
                        {course.title}
                      </h3>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        {(course as any).instructor?.name || 'المدرب'}
                      </p>
                      <div style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        marginTop: 'auto'
                      }}>
                        <div>
                          {course.price > 0 ? (
                            <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>
                              ${course.price}
                            </span>
                          ) : (
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>مجاني</span>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '0.8rem', fontWeight: 600,
                          background: 'rgba(203,161,83,0.1)', color: 'var(--primary)',
                          padding: '0.35rem 0.85rem', borderRadius: '2rem',
                          border: '1px solid rgba(203,161,83,0.2)'
                        }}>
                          التفاصيل
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section style={{ 
        padding: '5rem 2rem',
        background: 'rgba(203,161,83,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.04)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '3rem', color: '#fff' }}>
            لماذا تختار <span style={{ color: 'var(--primary)' }}>KQ Academy</span>؟
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            {[
              { icon: BookOpen, title: 'المناهج السورية', desc: 'كورسات البكالوريا والتاسع مع أفضل المدرسين السوريين', color: '#cba153' },
              { icon: Briefcase, title: 'مهارات السوق', desc: 'تطوير مهني حقيقي مطلوب في سوق العمل', color: '#22c55e' },
              { icon: Award, title: 'شهادات معتمدة', desc: 'احصل على شهادات موثقة ومعترف بها دولياً', color: '#3b82f6' },
              { icon: Users, title: 'مجتمع تعليمي', desc: 'تفاعل مع الطلاب والمدربين في بيئة تعليمية نشطة', color: '#8b5cf6' },
            ].map((feat) => (
              <div key={feat.title} className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: `${feat.color}15`, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem'
                }}>
                  <feat.icon size={28} color={feat.color} />
                </div>
                <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '0.75rem' }}>{feat.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.6 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .course-card:hover {
          transform: translateY(-6px);
          border-color: rgba(203, 161, 83, 0.4) !important;
          box-shadow: 0 20px 50px rgba(203, 161, 83, 0.08);
        }
      `}</style>
    </div>
  );
}
