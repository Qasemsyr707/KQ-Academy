import type { Prisma, PrismaClient } from '@prisma/client';
import { normalizeText } from '@/lib/search-normalize';
import { CURRICULUM_ROOT_SLUG, isTrainingType, sanitizeTags, type CategoryOption } from '@/lib/taxonomy-shared';

type Db = Prisma.TransactionClient | PrismaClient;

export class TaxonomyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const CATEGORY_FIELDS = ['categoryId', 'category'] as const;
export const TAXONOMY_FIELDS = [...CATEGORY_FIELDS, 'tags', 'trainingType'] as const;

/** Active categories, mains first, for the course forms. */
export async function activeCategories(db: Db): Promise<CategoryOption[]> {
  const rows = await db.category.findMany({
    where: { isActive: true, OR: [{ parentId: null }, { parent: { isActive: true } }] },
    select: { id: true, slug: true, name: true, nameEn: true, parentId: true, aliases: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
  return rows.map(row => ({ ...row, aliases: row.aliases ?? [] }));
}

interface ResolvedCategory { id: string; name: string; curriculum: boolean }

/** A selectable category: it exists, it is active and so is its main category. */
async function selectableCategory(db: Db, input: { categoryId?: unknown; category?: unknown }): Promise<ResolvedCategory> {
  const select = { id: true, name: true, slug: true, isActive: true, aliases: true, normalizedName: true,
    parent: { select: { slug: true, isActive: true } } } as const;
  let found: Prisma.CategoryGetPayload<{ select: typeof select }> | null = null;
  if (input.categoryId !== undefined && input.categoryId !== null && input.categoryId !== '') {
    if (typeof input.categoryId !== 'string' || input.categoryId.length > 64) throw new TaxonomyError(400, 'التصنيف غير صالح');
    found = await db.category.findUnique({ where: { id: input.categoryId }, select });
  } else if (typeof input.category === 'string' && input.category.trim()) {
    // Older clients send the category name: accept it only when it names exactly one category.
    const key = normalizeText(input.category);
    found = await db.category.findUnique({ where: { normalizedName: key }, select });
    if (!found) {
      const all = await db.category.findMany({ where: { isActive: true }, select });
      const matches = all.filter(category => category.aliases.some(alias => normalizeText(alias) === key));
      found = matches.length === 1 ? matches[0] : null;
    }
  } else {
    throw new TaxonomyError(400, 'يرجى اختيار تصنيف الكورس');
  }
  if (!found || !found.isActive || (found.parent && !found.parent.isActive)) {
    throw new TaxonomyError(400, 'التصنيف المختار غير متاح؛ اختر تصنيفاً من القائمة');
  }
  const rootSlug = found.parent?.slug ?? found.slug;
  return { id: found.id, name: found.name, curriculum: rootSlug === CURRICULUM_ROOT_SLUG };
}

/**
 * An administrator changing a course's type: it must still fit the course's category
 * (school-curriculum categories <-> CURRICULUM). Unlinked courses are not restricted.
 */
export async function assertTypeFitsCategory(db: Db, courseId: string, type: string): Promise<void> {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { taxonomy: { select: { slug: true, parent: { select: { slug: true } } } } },
  });
  if (!course?.taxonomy) return;
  const curriculum = (course.taxonomy.parent?.slug ?? course.taxonomy.slug) === CURRICULUM_ROOT_SLUG;
  if (curriculum !== (type === 'CURRICULUM')) {
    throw new TaxonomyError(400, curriculum
      ? 'الكورس مصنّف في التعليم المدرسي؛ غيّر تصنيفه أولاً قبل تحويله إلى كورس مهاري'
      : 'لتحويل الكورس إلى منهاج دراسي اختر له أولاً تصنيفاً من التعليم المدرسي');
  }
}

export interface TaxonomyData {
  categoryId?: string;
  category?: string;
  tags?: string[];
  trainingType?: string | null;
}

/**
 * Validate the classification fields present in a create/update body.
 * - category: by id (or, for older clients, an exact name/alias); must be active.
 * - school-curriculum categories only for CURRICULUM courses, and the reverse,
 *   so the curriculum visibility switch keeps working.
 * - tags: up to 10 short labels; trainingType: one of TRAINING_TYPES or empty.
 * Fields absent from the body are left out of the result (no change).
 */
export async function resolveCourseTaxonomy(db: Db, body: Record<string, unknown>,
  options: { courseType: string; requireCategory: boolean }): Promise<TaxonomyData> {
  const data: TaxonomyData = {};
  const touchesCategory = CATEGORY_FIELDS.some(field => Object.hasOwn(body, field));
  if (touchesCategory || options.requireCategory) {
    const category = await selectableCategory(db, { categoryId: body.categoryId, category: body.category });
    if (category.curriculum && options.courseType !== 'CURRICULUM') {
      throw new TaxonomyError(400, 'تصنيفات التعليم المدرسي مخصصة لكورسات المنهاج الدراسي');
    }
    if (!category.curriculum && options.courseType === 'CURRICULUM') {
      throw new TaxonomyError(400, 'اختر للمنهاج الدراسي تصنيفاً من التعليم المدرسي');
    }
    data.categoryId = category.id;
    // The text every page shows follows the chosen category.
    data.category = category.name;
  }
  if (Object.hasOwn(body, 'tags')) {
    const tags = sanitizeTags(body.tags);
    if (!tags) throw new TaxonomyError(400, 'الوسوم غير صالحة: حتى 10 وسوم، كل وسم من 2 إلى 30 حرفاً');
    data.tags = tags;
  }
  if (Object.hasOwn(body, 'trainingType')) {
    const value = body.trainingType;
    if (value === null || value === '') data.trainingType = null;
    else if (isTrainingType(value)) data.trainingType = value;
    else throw new TaxonomyError(400, 'نوع التدريب غير صالح');
  }
  return data;
}
