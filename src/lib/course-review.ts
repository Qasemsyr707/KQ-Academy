/**
 * Course review policy (who may put a course in front of students, and at what price).
 *
 *   DRAFT ──submit──▶ PENDING ──staff──▶ PUBLISHED
 *     ▲                  │  ▲
 *     │                staff │ submit
 *     │                  ▼  │
 *     └──────────────── REJECTED
 *
 * - An instructor creates DRAFT courses, edits content in any state and submits a DRAFT or
 *   REJECTED course for review (PENDING). An instructor never publishes.
 * - Only ADMIN / OWNER publish or reject (admin panel, or POST /api/courses/[id]/publish).
 * - Price: what an instructor enters at creation is a PROPOSAL kept on the unpublished course
 *   (nothing can be bought before PUBLISHED). The price students pay is the one an administrator
 *   states explicitly when publishing; an empty price is never silently turned into "free".
 *   After creation an instructor cannot change the price (see course-update.ts).
 * - Staff creating a course with both prices stated explicitly may publish it directly.
 *
 * Course.status is a plain String column: DRAFT needs no schema change. Every place that shows
 * a course to students requires status === 'PUBLISHED' (catalogue-visibility.ts), so DRAFT and
 * PENDING courses are never listed, searched, sold or played publicly.
 */
export const COURSE_STATUSES = ['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED'] as const;
export type CourseStatus = typeof COURSE_STATUSES[number];

export const isCourseStatus = (value: unknown): value is CourseStatus =>
  typeof value === 'string' && (COURSE_STATUSES as readonly string[]).includes(value);

export const isCourseStaff = (role: unknown): boolean => role === 'ADMIN' || role === 'OWNER';

/** States from which the instructor may send the course to the administration. */
export const SUBMITTABLE_STATUSES: readonly string[] = ['DRAFT', 'REJECTED'];

const MAX_PRICE = 1e12;

export class CoursePolicyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/**
 * One price field. undefined / null / '' mean "not stated"; anything else must be a finite
 * number from 0 to MAX_PRICE (a number, or a plain decimal string as HTML number inputs send).
 */
export function parseCoursePrice(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const amount = typeof value === 'number' ? value
    : typeof value === 'string' && /^\s*\d+(?:\.\d+)?\s*$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_PRICE) {
    throw new CoursePolicyError(400, `${label} غير صالح`);
  }
  return amount;
}

/** Status and stored prices of a newly created course. */
export function newCourseState(role: unknown, price: number | undefined, priceSYP: number | undefined, canPublish = isCourseStaff(role)) {
  const pricesStated = price !== undefined && priceSYP !== undefined;
  return {
    // canPublish: OWNER, or an ADMIN holding COURSE_PUBLISHING (granular RBAC).
    status: (isCourseStaff(role) && canPublish && pricesStated ? 'PUBLISHED' : 'DRAFT') as CourseStatus,
    price: price ?? 0,
    priceSYP: priceSYP ?? 0,
  };
}

/**
 * The explicit prices an administrator must state when a course becomes PUBLISHED.
 * Throws 400 when one is missing or invalid.
 */
export function publishPrices(body: Record<string, unknown>) {
  const price = parseCoursePrice(body.price, 'السعر بالدولار');
  const priceSYP = parseCoursePrice(body.priceSYP, 'السعر بالليرة السورية');
  if (price === undefined || priceSYP === undefined) {
    throw new CoursePolicyError(400, 'حدّد السعر المعتمد بالدولار وبالليرة قبل النشر (اكتب 0 صراحةً للكورس المجاني)');
  }
  return { price, priceSYP };
}
