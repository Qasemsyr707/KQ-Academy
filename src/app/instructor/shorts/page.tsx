import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UploadShortClient from './UploadShortClient';

export const dynamic = 'force-dynamic';

export default async function InstructorShortsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || (session.user as any).role !== 'INSTRUCTOR') {
    redirect('/login');
  }

  const instructorId = (session.user as any).id;

  // جلب كورسات المدرب الحالية ليتمكن من ربط الفيديو بها
  const courses = await prisma.course.findMany({
    where: { instructorId },
    select: { id: true, title: true }
  });

  // جلب الفيديوهات التي رفعها مسبقاً
  const shorts = await prisma.short.findMany({
    where: { userId: instructorId },
    include: { course: { select: { title: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>الفيديوهات القصيرة (Reels/Shorts)</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>ارفع فيديوهات تسويقية قصيرة واربطها بكورساتك لزيادة المبيعات المباشرة.</p>
      </div>

      <UploadShortClient courses={courses} initialShorts={shorts} />
    </div>
  );
}
