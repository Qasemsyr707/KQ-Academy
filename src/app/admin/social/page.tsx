import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import SocialAdminClient from './SocialAdminClient';

export const dynamic = 'force-dynamic';

export default async function SocialAdminPage() {
  await requireRolePage(['ADMIN'], '/dashboard', 'MARKETING');
  const links = await prisma.socialLink.findMany({ orderBy: [{ order: 'asc' }, { platform: 'asc' }], select: { platform: true, url: true, isActive: true, order: true } });
  return <main dir="rtl" style={{ maxWidth: 1000, margin: 'auto', padding: 'clamp(1rem, 3vw, 2rem)' }}>
    <Link href="/admin">العودة إلى الإدارة</Link>
    <h1 style={{ margin: '1rem 0 0.5rem' }}>روابط التواصل الاجتماعي</h1>
    <p style={{ opacity: 0.75, lineHeight: 1.8, marginBottom: '1.5rem' }}>
      روابط صفحات الأكاديمية الرسمية فقط، تظهر في تذييل الموقع وصفحة التواصل. لا يتصل الموقع بحساباتك ولا يحفظ أي كلمة مرور.
      تظهر الروابط المفعّلة والصحيحة فقط.
    </p>
    <SocialAdminClient initial={links} />
  </main>;
}
