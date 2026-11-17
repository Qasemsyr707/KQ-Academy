import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { createCategory, listAdminCategories } from '@/lib/category-admin';
import { TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';

const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };

/** Category management: administrators (and the owner) only. */
export async function GET() {
  const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
  if (!authorized) return errorResponse;
  try {
    return NextResponse.json({ categories: await listAdminCategories(prisma) }, { headers: HEADERS });
  } catch (error) {
    console.error('[admin categories] list', error);
    return NextResponse.json({ error: 'تعذّر تحميل التصنيفات' }, { status: 500, headers: HEADERS });
  }
}

export async function POST(req: Request) {
  const { authorized, errorResponse } = await requireRoleApi(['ADMIN']);
  if (!authorized) return errorResponse;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers: HEADERS });
    }
    const category = await createCategory(prisma, body);
    invalidateCatalogueSearch();
    return NextResponse.json({ category, message: 'تمت إضافة التصنيف' }, { status: 201, headers: HEADERS });
  } catch (error) {
    if (error instanceof TaxonomyError) return NextResponse.json({ error: error.message }, { status: error.status, headers: HEADERS });
    console.error('[admin categories] create', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers: HEADERS });
  }
}
