import { requireRolePage } from '@/lib/rbac';
import ShortsClient from './ShortsClient';
export default async function Page() {
  await requireRolePage(['ADMIN'], '/dashboard', 'MODERATION');
  return <ShortsClient />;
}
