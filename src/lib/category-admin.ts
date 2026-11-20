import { randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { normalizeText, slugify } from '@/lib/search-normalize';
import { CATEGORY_LIMITS, CURRICULUM_ROOT_SLUG, cleanLabel } from '@/lib/taxonomy-shared';
import { TaxonomyError } from '@/lib/course-taxonomy';

type Db = Prisma.TransactionClient | PrismaClient;

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  aliases: string[];
  parentId: string | null;
  order: number;
  isActive: boolean;
  /** Courses linked to this category itself. */
  courseCount: number;
  /** Courses in it and its subcategories, any status. */
  totalCourses: number;
  /** Published courses in it and its subcategories. */
  publishedCourses: number;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** All categories (inactive included) with their course counts. */
export async function listAdminCategories(db: Db): Promise<AdminCategory[]> {
  const [categories, grouped, published] = await Promise.all([
    db.category.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    db.course.groupBy({ by: ['categoryId'], where: { categoryId: { not: null } }, _count: { _all: true } }),
    db.course.groupBy({ by: ['categoryId'], where: { categoryId: { not: null }, status: 'PUBLISHED' }, _count: { _all: true } }),
  ]);
  const direct = new Map(grouped.map(row => [row.categoryId, row._count._all]));
  const directPublished = new Map(published.map(row => [row.categoryId, row._count._all]));
  const subtree = (id: string, counts: Map<string | null, number>) =>
    (counts.get(id) ?? 0) + categories.filter(c => c.parentId === id).reduce((sum, c) => sum + (counts.get(c.id) ?? 0), 0);
  return categories.map(category => ({
    id: category.id, slug: category.slug, name: category.name, nameEn: category.nameEn, aliases: category.aliases ?? [],
    parentId: category.parentId, order: category.order, isActive: category.isActive,
    courseCount: direct.get(category.id) ?? 0,
    totalCourses: subtree(category.id, direct),
    publishedCourses: subtree(category.id, directPublished),
  }));
}

function cleanAliases(input: unknown): string[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > CATEGORY_LIMITS.aliasMax) {
    throw new TaxonomyError(400, `الأسماء البديلة: حتى ${CATEGORY_LIMITS.aliasMax} اسماً`);
  }
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const raw of input) {
    const alias = cleanLabel(raw, CATEGORY_LIMITS.aliasLength);
    const key = alias ? normalizeText(alias) : '';
    if (!alias || key.length < 2) throw new TaxonomyError(400, 'كل اسم بديل يجب أن يكون من حرفين إلى 40 حرفاً');
    if (!seen.has(key)) { seen.add(key); aliases.push(alias); }
  }
  return aliases;
}

function cleanName(value: unknown, field: string): string {
  const name = cleanLabel(value, CATEGORY_LIMITS.nameMax);
  if (!name || normalizeText(name).length < CATEGORY_LIMITS.nameMin) {
    throw new TaxonomyError(400, `${field} مطلوب (من 2 إلى ${CATEGORY_LIMITS.nameMax} حرفاً)`);
  }
  return name;
}

function cleanOrder(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const order = Number(value);
  if (!Number.isInteger(order) || order < 0 || order > 100000) throw new TaxonomyError(400, 'الترتيب يجب أن يكون رقماً صحيحاً موجباً');
  return order;
}

/** A parent must be an existing main category: the taxonomy has two levels. */
async function validParent(db: Db, parentId: unknown, selfId?: string) {
  if (parentId === null || parentId === undefined || parentId === '') return null;
  if (typeof parentId !== 'string' || parentId === selfId) throw new TaxonomyError(400, 'التصنيف الرئيسي غير صالح');
  const parent = await db.category.findUnique({ where: { id: parentId }, select: { id: true, slug: true, parentId: true } });
  if (!parent) throw new TaxonomyError(400, 'التصنيف الرئيسي غير موجود');
  if (parent.parentId) throw new TaxonomyError(400, 'لا يمكن إضافة تصنيف فرعي داخل تصنيف فرعي');
  return parent;
}

/** Explain which existing category already uses this name or slug. */
async function duplicateError(db: Db, normalizedName: string, slug?: string, exceptId?: string): Promise<TaxonomyError | null> {
  const clash = await db.category.findFirst({
    where: { OR: [{ normalizedName }, ...(slug ? [{ slug }] : [])], ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { name: true, slug: true, normalizedName: true },
  });
  if (!clash) return null;
  return clash.normalizedName === normalizedName
    ? new TaxonomyError(409, `يوجد تصنيف بالاسم نفسه: «${clash.name}»`)
    : new TaxonomyError(409, `المعرّف (slug) مستخدم من قبل التصنيف «${clash.name}»`);
}

const isUniqueViolation = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export async function createCategory(db: PrismaClient, body: Record<string, unknown>) {
  const name = cleanName(body.name, 'اسم التصنيف');
  const nameEn = body.nameEn === undefined || body.nameEn === null || body.nameEn === '' ? null : cleanName(body.nameEn, 'الاسم الإنجليزي');
  const aliases = cleanAliases(body.aliases);
  const order = cleanOrder(body.order) ?? 0;
  const parent = await validParent(db, body.parentId);
  const normalizedName = normalizeText(name);
  let slug: string;
  if (body.slug !== undefined && body.slug !== '') {
    if (typeof body.slug !== 'string' || !SLUG.test(body.slug) || body.slug.length > 60) {
      throw new TaxonomyError(400, 'المعرّف (slug) يقبل أحرفاً إنجليزية صغيرة وأرقاماً وشرطات فقط');
    }
    slug = body.slug;
  } else {
    slug = slugify(nameEn) ?? `category-${randomBytes(4).toString('hex')}`;
  }
  const duplicate = await duplicateError(db, normalizedName, slug);
  if (duplicate) throw duplicate;
  try {
    return await db.category.create({
      data: { name, nameEn, aliases, order, slug, normalizedName, parentId: parent?.id ?? null, isActive: true },
    });
  } catch (error) {
    // Two administrators creating the same name at once: the unique index decides.
    if (isUniqueViolation(error)) throw (await duplicateError(db, normalizedName, slug)) ?? new TaxonomyError(409, 'التصنيف موجود مسبقاً');
    throw error;
  }
}

export async function updateCategory(db: PrismaClient, id: string, body: Record<string, unknown>) {
  const current = await db.category.findUnique({
    where: { id }, include: { parent: { select: { slug: true } }, _count: { select: { children: true, courses: true } } },
  });
  if (!current) throw new TaxonomyError(404, 'التصنيف غير موجود');
  if (Object.hasOwn(body, 'slug') && body.slug !== current.slug) {
    throw new TaxonomyError(400, 'لا يمكن تغيير المعرّف (slug) بعد الإنشاء حتى لا تنكسر الروابط');
  }
  const data: Prisma.CategoryUncheckedUpdateInput = {};
  if (Object.hasOwn(body, 'name')) {
    data.name = cleanName(body.name, 'اسم التصنيف');
    data.normalizedName = normalizeText(data.name);
  }
  if (Object.hasOwn(body, 'nameEn')) {
    data.nameEn = body.nameEn === null || body.nameEn === '' ? null : cleanName(body.nameEn, 'الاسم الإنجليزي');
  }
  if (Object.hasOwn(body, 'aliases')) data.aliases = cleanAliases(body.aliases);
  if (Object.hasOwn(body, 'order')) data.order = cleanOrder(body.order);
  if (Object.hasOwn(body, 'isActive')) {
    if (typeof body.isActive !== 'boolean') throw new TaxonomyError(400, 'حالة التفعيل غير صالحة');
    data.isActive = body.isActive;
  }
  if (Object.hasOwn(body, 'parentId') && (body.parentId || null) !== current.parentId) {
    if (current._count.children > 0) throw new TaxonomyError(400, 'انقل التصنيفات الفرعية أولاً: التصنيف يحتوي تصنيفات فرعية');
    const parent = await validParent(db, body.parentId, id);
    // Moving into or out of the school curriculum would contradict the type of its courses.
    const wasCurriculum = (current.parent?.slug ?? current.slug) === CURRICULUM_ROOT_SLUG;
    const willBeCurriculum = (parent?.slug ?? current.slug) === CURRICULUM_ROOT_SLUG;
    if (current._count.courses > 0 && wasCurriculum !== willBeCurriculum) {
      throw new TaxonomyError(400, 'لا يمكن نقل تصنيف يحتوي كورسات بين التعليم المدرسي وبقية التصنيفات');
    }
    data.parentId = parent?.id ?? null;
  }
  if (typeof data.normalizedName === 'string') {
    const duplicate = await duplicateError(db, data.normalizedName, undefined, id);
    if (duplicate) throw duplicate;
  }
  try {
    return await db.$transaction(async tx => {
      const updated = await tx.category.update({ where: { id }, data });
      // A renamed category: its courses show the new name. Links are unchanged.
      if (typeof data.name === 'string' && data.name !== current.name) {
        await tx.course.updateMany({ where: { categoryId: id }, data: { category: data.name } });
      }
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new TaxonomyError(409, 'يوجد تصنيف بالاسم نفسه');
    throw error;
  }
}

/** Only an empty category can be deleted; otherwise deactivate it. */
export async function deleteCategory(db: PrismaClient, id: string) {
  const current = await db.category.findUnique({ where: { id }, include: { _count: { select: { children: true, courses: true } } } });
  if (!current) throw new TaxonomyError(404, 'التصنيف غير موجود');
  if (current._count.children > 0) throw new TaxonomyError(409, 'لا يمكن حذف تصنيف يحتوي تصنيفات فرعية');
  if (current._count.courses > 0) {
    throw new TaxonomyError(409, `لا يمكن حذف تصنيف مرتبط بـ ${current._count.courses} كورس؛ يمكنك إيقافه بدلاً من ذلك`);
  }
  try {
    await db.category.delete({ where: { id } });
  } catch (error) {
    // A course (or subcategory) linked in the meantime: the foreign key refuses the delete.
    if (isForeignKeyViolation(error)) throw new TaxonomyError(409, 'أصبح التصنيف مرتبطاً بكورس أو تصنيف فرعي؛ لم يُحذف');
    throw error;
  }
}

/**
 * PostgreSQL reports ON DELETE RESTRICT as 23001, which Prisma 5 surfaces as an
 * unknown request error (not P2003); NO ACTION foreign keys report 23503 / P2003.
 */
function isForeignKeyViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === 'P2003' || error.code === 'P2014';
  return error instanceof Prisma.PrismaClientUnknownRequestError && /\b(23001|23503)\b|violates (RESTRICT setting of )?foreign key/i.test(error.message);
}
