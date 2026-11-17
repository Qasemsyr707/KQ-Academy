/**
 * What the owner of a course (its instructor, or an administrator) may change
 * through PUT /api/courses/[id]: the course's own content, nothing else.
 *
 * Everything that controls money, visibility, ranking or ownership has its own
 * endpoint and stays out of reach here:
 *   - price, priceSYP, type, isFeatured, instructorId, status (moderation)
 *       -> PUT /api/admin/courses/[id] (administrators only)
 *   - publishing a course                      -> POST /api/courses/[id]/publish
 *   - rating                                   -> derived from reviews
 *   - id, createdAt, updatedAt                 -> never written by clients
 *   - relations (chapters, attachments, ...)   -> their ownership-checked endpoints
 *
 * Production schema version: the course has no duration column, so there is no
 * duration field here (Phase 2 adds it with its own migration).
 */
export const COURSE_CONTENT_FIELDS = ['title', 'description', 'thumbnail', 'previewVideoUrl', 'includes', 'category'] as const;

export class CourseUpdateError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type ContentField = typeof COURSE_CONTENT_FIELDS[number];
export type CourseContentUpdate = Partial<{
  title: string; description: string | null; thumbnail: string | null; previewVideoUrl: string | null;
  includes: string[] | null; category: string;
}>;

const LIMITS = { title: 200, description: 20000, category: 100, includes: 50, include: 300, url: 2048, dataUrl: 3 * 1024 * 1024 * 4 / 3 + 64 };

/** Image sources the site can display: https, same-site paths, base64 raster data URLs, or the default gradient. */
function validThumbnail(value: string): boolean {
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
 * Any other field in the body rejects the whole request (403) instead of being
 * ignored, so nothing is partially saved and a client never believes a change it
 * is not allowed to make was stored.
 */
export function courseContentUpdate(body: Record<string, unknown>): CourseContentUpdate {
  const refused = Object.keys(body).filter(key => !COURSE_CONTENT_FIELDS.includes(key as ContentField));
  if (refused.length) throw new CourseUpdateError(403, `لا يمكن تعديل هذه الحقول من هنا: ${refused.slice(0, 10).join(', ')}`);
  const data: CourseContentUpdate = {};
  if (Object.hasOwn(body, 'title')) data.title = text(body.title, LIMITS.title, 'عنوان الكورس', { required: true })!;
  if (Object.hasOwn(body, 'category')) data.category = text(body.category, LIMITS.category, 'التصنيف', { required: true })!;
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
  return data;
}
