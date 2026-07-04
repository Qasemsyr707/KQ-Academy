import { prisma } from '@/lib/db';
import { Star, Clock, User, CheckCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ReviewButton from './ReviewButton';

export const dynamic = 'force-dynamic';

export default async function CourseDetailsPage({ params }: { params: { courseId: string } }) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      instructor: true,
      reviews: {
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      },
      chapters: {
        include: { lessons: true }
      }
    }
  });

  if (!course) {
    // If not found in DB, we can render a beautiful mockup for demo
    if (params.courseId !== 'demo123') {
      return notFound();
    }
  }

  const session = await getServerSession(authOptions);
  let isEnrolled = false;

  if (session?.user && course) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: (session.user as any).id,
          courseId: course.id
        }
      }
    });
    isEnrolled = !!enrollment;
  }

  // Fallback demo data if course is null (to allow previewing without DB seed)
  const displayCourse = course || {
    id: 'demo123',
    title: 'تطوير الويب الشامل (React & Next.js)',
    description: 'تعلم بناء تطبيقات ويب حديثة وسريعة باستخدام أحدث تقنيات React و Next.js 14 مع قواعد البيانات والمصادقة.',
    price: 50000,
    rating: 4.9,
    instructor: { name: 'أ. خالد المبرمج' },
    reviews: [
      { id: '1', user: { name: 'أحمد السوري' }, rating: 5, comment: 'كورس خرافي، المدرب يوصل الفكرة ببساطة شديدة.', createdAt: new Date() },
      { id: '2', user: { name: 'سارة محمد' }, rating: 4, comment: 'استفدت جداً من قسم التطبيقات العملية.', createdAt: new Date() }
    ],
    chapters: []
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', paddingBottom: '5rem' }}>
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, rgba(203, 161, 83, 0.1) 0%, #050505 100%)', padding: '4rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1.5rem', lineHeight: 1.3 }}>{displayCourse.title}</h1>
            <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem', lineHeight: 1.8 }}>
              {displayCourse.description || 'وصف الكورس غير متوفر حالياً.'}
            </p>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star color="var(--warning)" fill="var(--warning)" size={20} />
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{displayCourse.rating.toFixed(1)}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>({displayCourse.reviews.length} تقييم)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                <User size={20} /> {(displayCourse.instructor as any)?.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                <ShieldCheck size={20} color="#22c55e" /> شهادة إتمام معتمدة
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <Link href={`/checkout?courseId=${displayCourse.id}`} style={{ background: 'var(--primary)', color: '#000', padding: '1rem 2.5rem', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                اشترك الآن بـ {displayCourse.price.toLocaleString()} ل.س
              </Link>
            </div>
          </div>
          
          <div style={{ flex: '1 1 400px' }}>
            <div style={{ width: '100%', paddingTop: '56.25%', background: '#111', borderRadius: '24px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayCircle size={64} color="rgba(255,255,255,0.5)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content & Reviews */}
      <div style={{ maxWidth: '1200px', margin: '4rem auto 0 auto', padding: '0 2rem', display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
        
        {/* Reviews Section */}
        <div style={{ flex: '1 1 600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Star color="var(--primary)" fill="var(--primary)" /> آراء الطلاب ({displayCourse.reviews.length})
            </h2>
            {isEnrolled && <ReviewButton courseId={displayCourse.id} />}
          </div>

          {displayCourse.reviews.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>لا توجد تقييمات حتى الآن. كن أول من يشارك رأيه بعد إتمام الكورس!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {displayCourse.reviews.map((review: any) => (
                <div key={review.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{review.user.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{new Date(review.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} fill={i < review.rating ? 'var(--warning)' : 'transparent'} color={i < review.rating ? 'var(--warning)' : 'rgba(255,255,255,0.2)'} />
                      ))}
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Features */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ background: '#111', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>ماذا يتضمن هذا الكورس؟</h3>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                <PlayCircle size={20} color="var(--primary)" /> وصول غير محدود للدروس
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                <CheckCircle size={20} color="var(--primary)" /> دعم فني مباشر من المدرب
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                <ShieldCheck size={20} color="var(--primary)" /> شهادة معتمدة يمكن التحقق منها
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                <Star size={20} color="var(--primary)" /> إمكانية تقييم الكورس بعد الشراء
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
