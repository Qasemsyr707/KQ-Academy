import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRoleApi } from '@/lib/rbac';
import { deleteCategory, updateCategory } from '@/lib/category-admin';
import { TaxonomyError } from '@/lib/course-taxonomy';
import { invalidateCatalogueSearch } from '@/lib/course-search';

const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const failure = (error: unknown, action: string) => {
  if (error instanceof TaxonomyError) return NextResponse.json({ error: error.message }, { status: error.status, headers: HEADERS });
  console.error(`[admin categories] ${action}`, error);
  return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500, headers: HEADERS });
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { authorized, errorResponse } = await requireRoleApi(['ADMIN'], 'COURSES');
  if (!authorized) return errorResponse;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400, headers: HEADERS });
    }
    const category = await updateCategory(prisma, id, body);
    invalidateCatalogueSearch();
    return NextResponse.json({ category, message: 'تم حفظ التصنيف' }, { headers: HEADERS });
  } catch (error) { return failure(error, 'update'); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { authorized, errorResponse } = await requireRoleApi(['ADMIN'], 'COURSES');
  if (!authorized) return errorResponse;
  try {
    await deleteCategory(prisma, (await params).id);
    invalidateCatalogueSearch();
    return NextResponse.json({ message: 'تم حذف التصنيف' }, { headers: HEADERS });
  } catch (error) { return failure(error, 'delete'); }
}
