import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { checkRole } from '@/lib/rbac';
import { isStaff, managedCourseWhere } from '@/lib/managed-courses';
import { documentStorageStatus } from '@/lib/private-file-storage';
import { passingPercent } from '@/lib/course-exams';
import QuizzesListClient, { type CourseExams, type QuizSummary } from './QuizzesListClient';

export const dynamic = 'force-dynamic';

const QUIZ_SUMMARY = {
  id: true, title: true, kind: true, type: true, isPublished: true, requiredForCertificate: true, maxAttempts: true,
  passingScore: true, totalMarks: true, _count: { select: { questions: true, attempts: true } },
} as const;

type Row = {
  id: string; title: string; type: string; isPublished: boolean; requiredForCertificate: boolean; maxAttempts: number | null;
  passingScore: number; totalMarks: number | null; _count: { questions: number; attempts: number };
};
const summary = (q: Row): QuizSummary => ({
  id: q.id, title: q.title, type: q.type, isPublished: q.isPublished, requiredForCertificate: q.requiredForCertificate,
  maxAttempts: q.maxAttempts, passingPercent: passingPercent(q), questions: q._count.questions, attempts: q._count.attempts,
});

export default async function QuizzesPage(props: { searchParams: Promise<{ new?: string }> }) {
  const access = await checkRole(['ADMIN', 'INSTRUCTOR'], 'COURSES');
  if (!access.session) redirect('/login?callbackUrl=/instructor/quizzes');
  if (!access.authorized) {
    return <div dir="rtl" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#fff' }}><h1>لا تملك صلاحية إدارة الاختبارات</h1><p style={{ opacity: 0.75 }}>تحتاج دور مدرّب، أو صلاحية «إنشاء الكورسات وتعديلها» من المالك.</p></div>;
  }
  const user = { id: access.session.user.id, role: access.role };
  // Same rule as the quiz write APIs: instructors see their courses, OWNER / permitted ADMIN all courses.
  const courses = await prisma.course.findMany({
    where: managedCourseWhere(user),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, status: true, instructorId: true,
      chapters: { orderBy: { order: 'asc' }, select: { id: true, title: true, quizzes: { orderBy: { createdAt: 'asc' }, select: QUIZ_SUMMARY } } },
      finalExams: { where: { kind: 'FINAL' }, select: QUIZ_SUMMARY },
    },
  });
  const data: CourseExams[] = courses.map(course => ({
    id: course.id, title: course.title, status: course.status, ownCourse: course.instructorId === user.id,
    chapters: course.chapters.map(chapter => ({ id: chapter.id, title: chapter.title, quizzes: chapter.quizzes.map(summary) })),
    finalExam: course.finalExams[0] ? summary(course.finalExams[0]) : null,
  }));
  const storage = await documentStorageStatus();
  const { new: open } = await props.searchParams;
  return <QuizzesListClient courses={data} storage={storage} staff={isStaff(user)} openFileQuiz={open === 'file'} />;
}
