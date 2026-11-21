import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
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

export default async function QuizzesPage() {
  const { session } = await requireRolePage(['ADMIN', 'INSTRUCTOR'], '/dashboard', 'COURSES');
  const courses = await prisma.course.findMany({
    where: { instructorId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, status: true,
      chapters: { orderBy: { order: 'asc' }, select: { id: true, title: true, quizzes: { orderBy: { createdAt: 'asc' }, select: QUIZ_SUMMARY } } },
      finalExams: { where: { kind: 'FINAL' }, select: QUIZ_SUMMARY },
    },
  });
  const data: CourseExams[] = courses.map(course => ({
    id: course.id, title: course.title, status: course.status,
    chapters: course.chapters.map(chapter => ({ id: chapter.id, title: chapter.title, quizzes: chapter.quizzes.map(summary) })),
    finalExam: course.finalExams[0] ? summary(course.finalExams[0]) : null,
  }));
  return <QuizzesListClient courses={data} />;
}
