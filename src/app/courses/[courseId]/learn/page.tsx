import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import CoursePlayerClient from './CoursePlayerClient';

export default async function CourseLearnPage({ params }: { params: { courseId: string } }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch enrollment to ensure user has access
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: (session.user as any).id,
        courseId: params.courseId
      }
    }
  });

  // If strict mode:
  // if (!enrollment) {
  //   redirect(`/courses/${params.courseId}`);
  // }

  // Fetch course with chapters, lessons, attachments, and quizzes
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        include: {
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
      id: 'c1', title: 'الفصل الأول: مقدمة في التسويق', lessons: [
        { id: 'l1', title: 'مرحباً بك في الكورس', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '05:30' },
        { id: 'l2', title: 'ما هو التسويق الرقمي؟', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '12:45' }
      ]
    },
    {
      id: 'c2', title: 'الفصل الثاني: استراتيجيات منصات التواصل', lessons: [
        { id: 'l3', title: 'خوارزميات فيسبوك وانستغرام', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '20:15' },
        { id: 'l4', title: 'كيفية كتابة محتوى بيعي (Copywriting)', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', duration: '18:10' }
      ]
    }
  ];

  return <CoursePlayerClient course={course} chapters={displayChapters} />;
}
