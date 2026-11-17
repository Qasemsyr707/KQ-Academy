import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireRolePage } from '@/lib/rbac';
import { listAdminCategories } from '@/lib/category-admin';
import CategoriesClient from './CategoriesClient';

export const dynamic = 'force-dynamic';

/** Course taxonomy management: administrators and the owner only. */
export default async function AdminCategoriesPage() {
  await requireRolePage(['ADMIN']);
  const categories = await listAdminCategories(prisma);

  return (
    <div style={{ padding: '2rem 5%', minHeight: '100vh', background: 'var(--background)', color: 'var(--text-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 1.2rem + 1.5vw, 2.5rem)', fontWeight: 'bold' }}>تصنيفات الكورسات</h1>
          <p style={{ color: 'var(--text-3)', marginTop: '0.35rem' }}>
            التصنيفات الرئيسية والفرعية التي يختار منها المدربون، وتستخدمها اقتراحات البحث. يظهر التصنيف في البحث فقط عندما يحتوي كورساً منشوراً.
          </p>
        </div>
        <Link href="/admin/courses" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          إدارة الكورسات <ArrowRight size={18} />
        </Link>
      </div>
      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
