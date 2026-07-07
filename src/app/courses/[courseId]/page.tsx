import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CourseDetailsClient from './CourseDetailsClient';

export default async function CourseDetailsPage({ params }: { params: { courseId: string } }) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        instructor: true,
        reviews: {
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        },
        chapters: {
          include: { lessons: true },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!course) {
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

    // Fallback demo data
    const displayCourse = course || {
      id: 'demo123',
      title: 'تطوير الويب الشامل (React & Next.js)',
      description: 'تعلم بناء تطبيقات ويب حديثة وسريعة باستخدام أحدث تقنيات React و Next.js 14 مع قواعد البيانات والمصادقة.',
      price: 50000,
      priceSYP: 50000,
      rating: 4.9,
      category: 'برمجة',
      thumbnail: null,
      instructor: { name: 'أ. خالد المبرمج', image: null },
      reviews: [
        { id: '1', user: { name: 'أحمد السوري', image: null }, rating: 5, comment: 'كورس خرافي، المدرب يوصل الفكرة ببساطة شديدة.', createdAt: new Date() },
        { id: '2', user: { name: 'سارة محمد', image: null }, rating: 4, comment: 'استفدت جداً من قسم التطبيقات العملية.', createdAt: new Date() }
      ],
      chapters: [
        {
          id: 'c1', title: 'مقدمة في React',
          lessons: [
            { id: 'l1', title: 'ما هو React؟', isLive: false },
            { id: 'l2', title: 'إعداد بيئة العمل', isLive: false }
          ]
        },
        {
          id: 'c2', title: 'مفاهيم متقدمة',
          lessons: [
            { id: 'l3', title: 'إدارة الحالة (State)', isLive: false },
            { id: 'l4', title: 'التوجيه (Routing)', isLive: false }
          ]
        }
      ]
    };

    return <CourseDetailsClient course={displayCourse} isEnrolled={isEnrolled} />;
  } catch (error) {
    console.error("Error loading course details:", error);
    // Render a friendly error page instead of crashing with 500
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--danger)', marginBottom: '1rem' }}>عذراً، حدث خطأ!</h1>
        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', marginBottom: '2rem' }}>
          لم نتمكن من جلب بيانات الكورس في الوقت الحالي. قد يكون هذا بسبب تحديثات جارية على المنصة أو أن الكورس غير متوفر.
        </p>
        <a href="/courses" className="btn btn-solid" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          العودة لتصفح الكورسات
        </a>
      </div>
    );
  }
}
