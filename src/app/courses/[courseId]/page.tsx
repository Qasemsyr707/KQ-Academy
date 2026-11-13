import { prisma } from '@/lib/db';
import { notFound, unstable_rethrow } from 'next/navigation';
import CourseDetailsClient from './CourseDetailsClient';
import { Metadata } from 'next';
import { protectCourseLessonSources } from '@/lib/lesson-links';
import { getBunnyPlaybackUrl } from '@/lib/bunny-playback';
import { serializeJsonLd } from '@/lib/safe-json-ld';
import { getCourseAccess, getCourseViewer } from '@/lib/course-access';
import { publicCourseDetailsSelect } from '@/lib/public-course';

export async function generateMetadata({ params }: { params: Promise<{ courseId: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const course = await prisma.course.findUnique({
      where: { id: resolvedParams.courseId },
      select: {
        id: true, title: true, category: true, thumbnail: true, status: true, instructorId: true,
        instructor: { select: { name: true } },
      }
    });

    if (!course || (course.status !== 'PUBLISHED'
      && !(await getCourseAccess(course, await getCourseViewer())).canView)) {
      return { title: 'كورس غير موجود | KQ Academy' };
    }

    const title = `${course.title} - أفضل كورس في سوريا والوطن العربي | KQ Academy`;
    const description = `تعلم ${course.title} مع ${course.instructor.name}. كورس احترافي معتمد في سوريا، الأردن، العراق، والسعودية. احصل على شهادة معتمدة وابدأ رحلتك المهنية الآن.`;
    
    return {
      title,
      description,
      keywords: [course.title, course.category, 'كورس', 'دورة', 'سوريا', 'الأردن', 'العراق', 'السعودية', 'الخليج', 'تعلم', 'أونلاين', course.instructor.name, 'KQ Academy'],
      openGraph: {
        title,
        description,
        url: `https://kqacademy.com/courses/${course.id}`,
        images: course.thumbnail ? [{ url: course.thumbnail }] : [],
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    return { title: 'الكورس | KQ Academy' };
  }
}

export default async function CourseDetailsPage({ params }: { params: Promise<{ courseId: string }> }) {
  try {
    const resolvedParams = await params;
    const course = await prisma.course.findUnique({
      where: { id: resolvedParams.courseId },
      select: publicCourseDetailsSelect
    });

    if (!course) {
      if (resolvedParams.courseId !== 'demo123') {
        return notFound();
      }
    }

    const viewer = await getCourseViewer();
    const access = course ? await getCourseAccess(course, viewer) : { canView: true, isEnrolled: false };
    if (!access.canView) notFound();
    const isEnrolled = access.isEnrolled;

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

    let previewVideoUrl: string | null = null;
    try {
      if (course?.previewVideoUrl) previewVideoUrl = getBunnyPlaybackUrl(course.previewVideoUrl);
    } catch {
      // A missing signing configuration must not expose an unsigned fallback.
    }
    const playerCourse = protectCourseLessonSources({ ...displayCourse, previewVideoUrl });

    const courseSchema = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": displayCourse.title,
      "description": displayCourse.description || `أفضل كورس لتعلم ${displayCourse.title} في سوريا والوطن العربي.`,
      "provider": {
        "@type": "Organization",
        "name": "KQ Academy",
        "sameAs": "https://kqacademy.com"
      },
      "author": {
        "@type": "Person",
        "name": displayCourse.instructor.name
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": displayCourse.rating > 0 ? displayCourse.rating : 5,
        "ratingCount": displayCourse.reviews?.length > 0 ? displayCourse.reviews.length : 1
      },
      "offers": {
        "@type": "Offer",
        "price": displayCourse.price,
        "priceCurrency": "USD"
      }
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(courseSchema) }}
        />
        <CourseDetailsClient course={playerCourse} isEnrolled={isEnrolled} />
      </>
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Error loading course details:", error);
    // Render a friendly error page instead of crashing with 500
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: '#fff', padding: '2rem', textAlign: 'center' }}>
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
