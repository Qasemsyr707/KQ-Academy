import { Suspense } from 'react';
import MarketingAdminClient from './MarketingAdminClient';

export const metadata = { title: 'إدارة التسويق | لوحة الأدمن' };

export default function AdminMarketingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050505' }} />}>
      <MarketingAdminClient />
    </Suspense>
  );
}
