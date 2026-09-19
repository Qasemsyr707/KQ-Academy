import Link from 'next/link';
import { BookOpen, Briefcase, ArrowLeft, Users, Award, Zap, Search } from 'lucide-react';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getCourses() {
  try {
    const courses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
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

          <form action="/courses" method="GET" style={{ 
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', 
            maxWidth: '600px', margin: '0 auto 2.5rem', padding: '0.4rem', borderRadius: '20px', 
            border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)'
          }}>
            <div style={{ padding: '0 1rem', color: 'rgba(255,255,255,0.5)' }}>
              <Search size={24} />
            </div>
            <input 
              name="q"
              type="text" 
              placeholder="ابحث عن كورس، مدرب، أو مهارة..." 
              style={{ 
                flex: 1, background: 'transparent', border: 'none', color: '#fff', 
                fontSize: '1.1rem', padding: '1rem 0', outline: 'none'
              }} 
            />
            <button type="submit" style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0.8rem 2rem', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
              بحث
            </button>
          </form>

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

      {/* Testimonials Section */}
      <section style={{ padding: '6rem 2rem', background: '#050505' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 800, marginBottom: '3rem', color: '#fff' }}>
            انضم إلى الآخرين الذين يغيرون حياتهم من خلال التعلّم
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            {[
              { 
                text: 'عنجد الكورس كان نقطة تحول بحياتي.. الشرح مو طبيعي قديش سلس وبيدخل العقل بسرعة! حسيت حالي عم اتعلم من حدا بيعرفني من زمان وبيعرف شو اللي بيوقفني. يعطيكون ألف عافية!',
                name: 'سارة الخطيب',
                role: 'طالبة بكالوريا علمي',
                img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop'
              },
              { 
                text: 'الأساتذة بيشرحوا من قلب ورب، ما بيبخلوا علينا بولا معلومة. الكورسات المهنية فادتني كتير وخلتني ألاقي أول شغل إلي كمبرمج. منصة بترفع الراس والله!',
                name: 'أحمد شحادة',
                role: 'مطور ويب',
                img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop'
              },
              { 
                text: 'أحلى شي بالمنصة هي المرونة، بحضر الدروس بالوقت اللي بيناسبني والجودة ممتازة. فكرة إنو كل شي مترتب وبمكان واحد وفرت عليي كتير وقت وضياع.',
                name: 'لينا الحمصي',
                role: 'طالبة جامعية',
                img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop'
              },
              { 
                text: 'ولا أروع من هيك! الأساتذة متابعين معنا خطوة بخطوة، والمنصة سهلة وحلوة كتير.. صرت أنصح كل رفقاتي يسجلوا فيها لأنو صدقاً بتستاهل.',
                name: 'عمر النجار',
                role: 'مسوق رقمي',
                img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop'
              }
            ].map((testi, i) => (
              <div key={i} style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: '12px', 
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: 'var(--primary)', fontSize: '3rem', lineHeight: 0.5, marginBottom: '1.5rem', opacity: 0.5 }}>"</div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', lineHeight: 1.8, marginBottom: '2rem' }}>
                    {testi.text}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                  <img src={testi.img} alt={testi.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{testi.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{testi.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Trusted By Section */}
      <section style={{ 
        position: 'relative', 
        background: '#050505', 
        padding: '5rem 0', 
        borderTop: '1px solid rgba(255,255,255,0.05)', 
        overflow: 'hidden' 
      }}>
        {/* Glow Background */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '100%', background: 'radial-gradient(ellipse at center, rgba(203,161,83,0.08) 0%, transparent 60%)', pointerEvents: 'none' }}></div>
        
        <h2 style={{ 
          fontSize: '1.2rem', 
          fontWeight: 500, 
          marginBottom: '3.5rem', 
          textAlign: 'center',
          color: 'rgba(255,255,255,0.8)',
          letterSpacing: '0.5px',
          position: 'relative',
          zIndex: 1
        }}>
          تحظى <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>KQ Academy</span> بثقة أكثر من 17,000 شركة ومتعلم حول العالم
        </h2>

        <div className="marquee-container" dir="ltr" style={{ display: 'flex', overflow: 'hidden', width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="marquee-track" style={{ display: 'flex' }}>
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '6rem', alignItems: 'center', paddingRight: '6rem' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="trusted-logo" style={{ height: '32px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" className="trusted-logo" style={{ height: '28px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" className="trusted-logo" style={{ height: '28px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" alt="Netflix" className="trusted-logo" style={{ height: '30px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg" alt="Spotify" className="trusted-logo" style={{ height: '35px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="trusted-logo" style={{ height: '32px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg" alt="Cisco" className="trusted-logo" style={{ height: '36px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/Ericsson_logo.svg" alt="Ericsson" className="trusted-logo" style={{ height: '28px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Citi_logo.svg" alt="Citi" className="trusted-logo" style={{ height: '32px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/46/Hewlett_Packard_Enterprise_logo.svg" alt="Hewlett Packard" className="trusted-logo" style={{ height: '30px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/85/Procter_%26_Gamble_logo.svg" alt="P&G" className="trusted-logo" style={{ height: '40px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/9c/Vimeo_Logo.svg" alt="Vimeo" className="trusted-logo" style={{ height: '30px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg" alt="Samsung" className="trusted-logo" style={{ height: '24px' }} />
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg" alt="Volkswagen" className="trusted-logo" style={{ height: '36px' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .trusted-logo {
          filter: brightness(0) invert(1) opacity(0.4);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .trusted-logo:hover {
          filter: brightness(0) invert(1) opacity(1) drop-shadow(0 0 15px rgba(255,255,255,0.4));
          transform: scale(1.1);
        }
        .marquee-container {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
        .marquee-track {
          width: max-content;
          animation: scrollMarquee 40s linear infinite;
        }
        .marquee-container:hover .marquee-track {
          animation-play-state: paused;
        }
        @keyframes scrollMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .course-card:hover {
          transform: translateY(-6px);
          border-color: rgba(203, 161, 83, 0.4) !important;
          box-shadow: 0 20px 50px rgba(203, 161, 83, 0.08);
        }
      `}</style>
    </div>
  );
}
