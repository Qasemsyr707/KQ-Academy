import { redirect } from 'next/navigation';
import { checkRole } from '@/lib/rbac';
import { managedCourseWhere, managedCoursesWithChapters } from '@/lib/managed-courses';
import { listLegacyLiveLessons, listManagedSessions, liveKitConfiguration } from '@/lib/live-sessions';
import LiveManagerClient from './LiveManagerClient';

export const dynamic = 'force-dynamic';

export default async function InstructorLivePage(props: { searchParams: Promise<{ mode?: string }> }) {
  const access = await checkRole(['ADMIN', 'INSTRUCTOR'], 'LIVE_CLASSES');
  if (!access.session) redirect('/login?callbackUrl=/instructor/live');
  if (!access.authorized) {
    return <div dir="rtl" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#fff' }}><h1>لا تملك صلاحية البث المباشر</h1><p style={{ opacity: 0.75 }}>تحتاج دور مدرّب، أو صلاحية «البث المباشر» من المالك.</p></div>;
  }
  const user = { id: access.session.user.id, role: access.role };
  const staff = user.role === 'OWNER' || user.role === 'ADMIN';
  const [courses, sessions, legacy] = await Promise.all([
    managedCoursesWithChapters(user), listManagedSessions(user, staff), listLegacyLiveLessons(managedCourseWhere(user)),
  ]);
  const { mode } = await props.searchParams;
  return <LiveManagerClient courses={courses} sessions={sessions} legacy={legacy} staff={staff}
    initialMode={mode === 'now' ? 'now' : mode === 'schedule' ? 'schedule' : null} livekit={liveKitConfiguration()} />;
}
