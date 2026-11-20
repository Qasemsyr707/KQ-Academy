import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import RequestsClient from './RequestsClient';

export const dynamic = 'force-dynamic';

export default async function CourseRequestsPage() {
  const { session } = await requireRolePage(['ADMIN'], '/dashboard', 'COURSE_PUBLISHING');
  const [requests, pendingCourses, recent] = await Promise.all([
    prisma.courseChangeRequest.findMany({
      where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, instructorId: true, changes: true, previous: true, createdAt: true, course: { select: { id: true, title: true, instructor: { select: { name: true } } } } },
    }),
    prisma.course.findMany({
      where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, title: true, category: true, price: true, priceSYP: true, createdAt: true, instructorId: true, instructor: { select: { name: true } }, _count: { select: { chapters: true } } },
    }),
    prisma.courseChangeRequest.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } }, orderBy: { reviewedAt: 'desc' }, take: 30,
      select: { id: true, status: true, reason: true, reviewerId: true, reviewedAt: true, course: { select: { title: true } } },
    }),
  ]);
  const reviewerIds = [...new Set(recent.map(r => r.reviewerId).filter((id): id is string => !!id))];
  const reviewers = await prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true } });
  const names = new Map(reviewers.map(r => [r.id, r.name]));
  return <main dir="rtl" style={{ maxWidth: 1200, margin: 'auto', padding: '2rem 1rem' }}>
    <Link href="/admin">العودة إلى الإدارة</Link>
    <h1 style={{ margin: '1rem 0' }}>مراجعة الكورسات وطلبات التعديل</h1>
    <RequestsClient
      viewerId={session.user.id}
      requests={requests.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), changes: r.changes as Record<string, unknown>, previous: r.previous as Record<string, unknown> }))}
      pendingCourses={pendingCourses.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }))}
    />
    <h2 style={{ marginTop: '2rem' }}>آخر القرارات</h2>
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'right' }}>
      <thead><tr><th>الكورس</th><th>القرار</th><th>السبب</th><th>المراجع</th><th>الوقت</th></tr></thead>
      <tbody>{recent.map(r => <tr key={r.id}>
        <td>{r.course.title}</td><td>{r.status === 'APPROVED' ? 'موافقة' : 'رفض'}</td><td>{r.reason || '—'}</td>
        <td>{(r.reviewerId && names.get(r.reviewerId)) || '—'}</td>
        <td>{r.reviewedAt?.toLocaleString('ar-JO', { timeZone: 'Asia/Amman' })}</td>
      </tr>)}</tbody>
    </table></div>
    {!recent.length && <p>لا توجد قرارات بعد.</p>}
  </main>;
}
