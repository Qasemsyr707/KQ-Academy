/**
 * What the owner of a course (its instructor, or an administrator) may change
 * through PUT /api/courses/[id]: the course's own content, nothing else.
 *
 * Everything that controls money, visibility, ranking or ownership has its own
 * endpoint and stays out of reach here:
 *   - price, priceSYP, type, isFeatured, instructorId, status (moderation)
 *       -> PUT /api/admin/courses/[id] (administrators only)
 *   - sending for review (instructor)          -> POST /api/courses/[id]/submit
 *   - publishing a course (administrators)     -> POST /api/courses/[id]/publish
 *     (review cycle and price policy: course-review.ts)
 *   - rating                                   -> derived from reviews
 *   - id, createdAt, updatedAt                 -> never written by clients
 *   - relations (chapters, attachments, ...)   -> their ownership-checked endpoints
 */
// The course category is not here: categoryId/category/tags/trainingType go through
// resolveCourseTaxonomy (active categories only), see the course update route.
export const COURSE_CONTENT_FIELDS = ['title', 'description', 'thumbnail', 'previewVideoUrl', 'includes', 'durationHours'] as const;

export class CourseUpdateError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type ContentField = typeof COURSE_CONTENT_FIELDS[number];
export type CourseContentUpdate = Partial<{
  title: string; description: string | null; thumbnail: string | null; previewVideoUrl: string | null;
  includes: string[] | null; durationHours: number | null;
}>;

const LIMITS = { title: 200, description: 20000, category: 100, includes: 50, include: 300, url: 2048, dataUrl: 3 * 1024 * 1024 * 4 / 3 + 64 };

/** Image sources the site can display: https, same-site paths, base64 raster data URLs, or the default gradient. */
export function validThumbnail(value: string): boolean {
  if (/^data:image\/(?:jpeg|png|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(value)) return value.length <= LIMITS.dataUrl;
  // The default the create endpoint stores for courses without an image.
  if (/^linear-gradient\(\d{1,3}deg, #[0-9a-f]{3,8} \d{1,3}%, #[0-9a-f]{3,8} \d{1,3}%\)$/i.test(value)) return true;
  // URLs end up in src attributes and CSS url(): no whitespace, quotes, brackets or backslashes.
  if (value.length > LIMITS.url || /[\s"'()<>\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}

const text = (value: unknown, max: number, field: string, { required = false } = {}): string | null => {
  if (value === null || value === undefined || value === '') {
    if (required) throw new CourseUpdateError(400, `${field} مطلوب`);
    return null;
  }
  if (typeof value !== 'string' || value.length > max) throw new CourseUpdateError(400, `${field} غير صالح`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new CourseUpdateError(400, `${field} مطلوب`);
  return trimmed;
};

/**
 * The validated data for prisma.course.update, built only from allowed fields.
 * Any other field in the body is refused (400) instead of being ignored, so a
 * client never believes a change it is not allowed to make was saved.
 */
export function courseContentUpdate(body: Record<string, unknown>): CourseContentUpdate {
  const refused = Object.keys(body).filter(key => !COURSE_CONTENT_FIELDS.includes(key as ContentField));
  if (refused.length) throw new CourseUpdateError(403, `لا يمكن تعديل هذه الحقول من هنا: ${refused.slice(0, 10).join(', ')}`);
  const data: CourseContentUpdate = {};
  if (Object.hasOwn(body, 'title')) data.title = text(body.title, LIMITS.title, 'عنوان الكورس', { required: true })!;
  if (Object.hasOwn(body, 'description')) data.description = text(body.description, LIMITS.description, 'الوصف');
  if (Object.hasOwn(body, 'thumbnail')) {
    const value = body.thumbnail;
    if (value === null || value === '') data.thumbnail = null;
    else if (typeof value === 'string' && validThumbnail(value)) data.thumbnail = value;
    else throw new CourseUpdateError(400, 'الصورة المصغرة غير صالحة');
  }
  if (Object.hasOwn(body, 'previewVideoUrl')) {
    const value = body.previewVideoUrl;
    if (value === null || value === '') data.previewVideoUrl = null;
    else if (typeof value === 'string' && value.length <= LIMITS.url) data.previewVideoUrl = value;
    else throw new CourseUpdateError(400, 'رابط فيديو المقدمة غير صالح');
  }
  if (Object.hasOwn(body, 'includes')) {
    const value = body.includes;
    if (value === null) data.includes = null;
    else if (Array.isArray(value) && value.length <= LIMITS.includes
      && value.every(item => typeof item === 'string' && item.trim() && item.length <= LIMITS.include)) {
      data.includes = value.map(item => (item as string).trim());
    } else throw new CourseUpdateError(400, 'ميزات الكورس غير صالحة');
  }
  if (Object.hasOwn(body, 'durationHours')) {
    const value = body.durationHours;
    if (value === null || value === '') data.durationHours = null;
    else {
      const hours = Number(value);
      if (typeof value === 'boolean' || !Number.isFinite(hours) || hours <= 0 || hours > 2000) throw new CourseUpdateError(400, 'مدة الكورس غير صالحة');
      data.durationHours = hours;
    }
  }
  return data;
}
