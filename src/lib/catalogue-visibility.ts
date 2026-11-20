import type { Prisma } from '@prisma/client';

/**
 * Temporary, reversible switch for the school-curriculum catalogue (baccalaureate,
 * ninth grade and related content). Nothing is deleted: while hidden, these
 * courses simply stop being offered publicly. Students already enrolled and the
 * course's own instructor/admins keep full access.
 *
 * Hidden by default. To show the curriculum again set KQ_HIDE_CURRICULUM=false
 * in Coolify (available at build and runtime) and Redeploy. Request-time pages
 * and APIs follow the variable immediately after a restart; statically built
 * pages (their navbar link) pick it up at the next build. No data changes.
 */
export const curriculumHidden = (): boolean => process.env.KQ_HIDE_CURRICULUM !== 'false';

/** Category words that mark school-curriculum content even when the type was left as SKILL. */
export const CURRICULUM_CATEGORY_WORDS = ['بكالوريا', 'البكالوريا', 'التاسع', 'تاسع', 'منهاج', 'المنهاج'] as const;

export function isCurriculumCourse(course: { type?: string | null; category?: string | null }): boolean {
  if (course.type === 'CURRICULUM') return true;
  const category = course.category ?? '';
  return CURRICULUM_CATEGORY_WORDS.some(word => category.includes(word));
}

/** Published and currently offered to the public (listing, search, purchase, SEO). */
export function isPubliclyOffered(course: { status: string; type?: string | null; category?: string | null }): boolean {
  return course.status === 'PUBLISHED' && !(curriculumHidden() && isCurriculumCourse(course));
}

/** The same rule as a database filter, for every public course query. */
export function publicCourseWhere(extra: Prisma.CourseWhereInput = {}): Prisma.CourseWhereInput {
  if (!curriculumHidden()) return { status: 'PUBLISHED', ...extra };
  return {
    status: 'PUBLISHED',
    ...extra,
    AND: [
      ...(Array.isArray(extra.AND) ? extra.AND : extra.AND ? [extra.AND] : []),
      { NOT: { OR: [{ type: 'CURRICULUM' }, ...CURRICULUM_CATEGORY_WORDS.map(word => ({ category: { contains: word } }))] } },
    ],
  };
}
