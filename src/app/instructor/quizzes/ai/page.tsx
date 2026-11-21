import { redirect } from 'next/navigation';
import { checkRole } from '@/lib/rbac';
import { managedCoursesWithChapters } from '@/lib/managed-courses';
import { AI_PDF_MAX_BYTES, AI_PDF_MAX_PAGES, DEFAULT_QUESTION_COUNT, MAX_QUESTION_COUNT } from '@/lib/ai-quiz-generator';
import { prisma } from '@/lib/db';
import AiQuizClient from './AiQuizClient';

export const dynamic = 'force-dynamic';

export default async function AiQuizPage() {
  const access = await checkRole(['ADMIN', 'INSTRUCTOR'], 'COURSES');
  if (!access.session) redirect('/login?callbackUrl=/instructor/quizzes/ai');
  if (!access.authorized) {
    return <div dir="rtl" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#fff' }}><h1>لا تملك صلاحية إدارة الاختبارات</h1></div>;
  }
  const user = { id: access.session.user.id, role: access.role };
  const courses = await managedCoursesWithChapters(user);
  const finals = new Set((await prisma.quiz.findMany({ where: { kind: 'FINAL', courseId: { in: courses.map(c => c.id) } }, select: { courseId: true } })).map(q => q.courseId));
  return <AiQuizClient
    courses={courses.map(c => ({ id: c.id, title: c.title, chapters: c.chapters, hasFinal: finals.has(c.id) }))}
    aiReady={!!process.env.GEMINI_API_KEY?.trim()}
    limits={{ maxMiB: AI_PDF_MAX_BYTES / 1024 / 1024, maxPages: AI_PDF_MAX_PAGES, defaultCount: DEFAULT_QUESTION_COUNT, maxCount: MAX_QUESTION_COUNT }} />;
}
