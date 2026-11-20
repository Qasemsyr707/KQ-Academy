import { courseContentUpdate, CourseUpdateError } from './course-update';
import { prisma } from './db';
import { CHANGE_REQUEST_FIELDS, FIELD_LABELS, type ChangeField } from './course-change-request-labels';

export { CHANGE_REQUEST_FIELDS, FIELD_LABELS, type ChangeField };

/**
 * Instructor edits to a course go through a review: the request stores the proposed values and
 * a snapshot of the live values, and nothing on the course changes until a reviewer approves.
 */
export type CourseChanges = Partial<Record<ChangeField, unknown>>;

const PRICE_LIMITS = { price: 100000, priceSYP: 1000000000 };

function price(value: unknown, field: 'price' | 'priceSYP'): number {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > PRICE_LIMITS[field]) {
    throw new CourseUpdateError(400, `${FIELD_LABELS[field]} غير صالح`);
  }
  return Math.round(number * 100) / 100;
}

/** Validated proposed values, keeping only the fields that differ from the live course. */
export function parseChangeRequest(body: Record<string, unknown>, live: Record<ChangeField, unknown>): { changes: CourseChanges; previous: CourseChanges } {
  const { price: rawPrice, priceSYP: rawSYP, ...content } = body;
  const proposed: CourseChanges = { ...courseContentUpdate(content) };
  if (Object.hasOwn(body, 'price')) proposed.price = price(rawPrice, 'price');
  if (Object.hasOwn(body, 'priceSYP')) proposed.priceSYP = price(rawSYP, 'priceSYP');
  const changes: CourseChanges = {};
  const previous: CourseChanges = {};
  for (const [key, value] of Object.entries(proposed) as [ChangeField, unknown][]) {
    if (same(value, live[key])) continue;
    changes[key] = value ?? null;
    previous[key] = live[key] ?? null;
  }
  if (!Object.keys(changes).length) throw new CourseUpdateError(400, 'لم تغيّر أي قيمة عن الكورس الحالي');
  return { changes, previous };
}

/** Empty lists and empty values count as unset, so resubmitting an untouched form changes nothing. */
function same(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => (v === undefined || v === '' || (Array.isArray(v) && !v.length) ? null : v);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/** True when every field the request touches still holds the value the instructor saw. */
export function stillMatches(previous: CourseChanges, live: Record<string, unknown>): boolean {
  return Object.entries(previous).every(([key, value]) => same(live[key], value));
}

export const LIVE_SELECT = {
  title: true, description: true, thumbnail: true, previewVideoUrl: true, includes: true, category: true, price: true, priceSYP: true,
} as const;

/** The owner and every unbanned administrator holding the course-review permission. */
export async function notifyCourseReviewers(title: string, message: string, link: string) {
  const reviewers = await prisma.user.findMany({
    where: { isBanned: false, OR: [{ role: 'OWNER' }, { role: 'ADMIN', adminPermissions: { has: 'COURSE_PUBLISHING' } }] },
    select: { id: true },
  });
  if (reviewers.length) await prisma.notification.createMany({ data: reviewers.map(r => ({ userId: r.id, title, message, link })) });
}
