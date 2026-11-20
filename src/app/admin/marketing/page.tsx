import { requireRolePage } from '@/lib/rbac';
import { Suspense } from 'react';
import MarketingAdminClient from './MarketingAdminClient';

export const metadata = { title: 'إدارة التسويق | لوحة الأدمن' };

export default async function AdminMarketingPage() {
  await requireRolePage(['ADMIN'], '/dashboard', 'SETTINGS');
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--background)' }} />}>
      <MarketingAdminClient />
    </Suspense>
  );
}
