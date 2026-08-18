import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CoursePlayerClient from './CoursePlayerClient';

export default async function CourseLearnPage(props: { params: Promise<{ courseId: string }>, searchParams: Promise<{ lessonId?: string }> }) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await props.params;
  const resolvedSearchParams = await props.searchParams;

  if (!session) {
    redirect('/login');
  }

  // Fetch enrollment to ensure user has access
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: (session.user as any).id,
        courseId: resolvedParams.courseId
      }
    }
  });

  // Fetch course with chapters, lessons, attachments, and quizzes
  const course = await prisma.course.findUnique({
    where: { id: resolvedParams.courseId },
    include: {
      attachments: true,
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          attachments: true,
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              attachments: true
            }
          },
          quizzes: {
            include: {
              questions: true
            }
          }
        }
      },
      questions: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, role: true } },
          answers: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { name: true, role: true } } }
          }
        }
      }
    }
  });

  if (!course) {
    return <div style={{ color: '#fff', padding: '5rem', textAlign: 'center' }}>الكورس غير موجود</div>;
  }

  // Fallback Mock Data if DB has no chapters yet
  const displayChapters = course.chapters.length > 0 ? course.chapters : [
    {
      id: 'c1', title: 'الفصل الأول: مقدمة في التسويق', isFree: true, lessons: [
        { id: 'l1', title: 'مرحباً بك في الكورس', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '05:30' },
        { id: 'l2', title: 'ما هو التسويق الرقمي؟', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '12:45' }
      ]
    },
    {
      id: 'c2', title: 'الفصل الثاني: استراتيجيات منصات التواصل', isFree: false, lessons: [
        { id: 'l3', title: 'خوارزميات فيسبوك وانستغرام', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '20:15' },
        { id: 'l4', title: 'كيفية كتابة محتوى بيعي (Copywriting)', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '18:10' }
      ]
    }
  ];

  return <CoursePlayerClient 
    course={course} 
    chapters={displayChapters} 
    hasAccess={!!enrollment || course.instructorId === (session.user as any).id || (session.user as any).role === 'ADMIN'} 
    initialLessonId={resolvedSearchParams?.lessonId}
  />;
}
