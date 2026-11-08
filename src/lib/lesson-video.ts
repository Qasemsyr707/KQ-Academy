import { parseBunnyEmbed } from '@/lib/bunny-embed';
import { BunnyServerError } from '@/lib/bunny-upload-server';

/** Keep established local document/legacy player workflows, while the explicit
 * video-link flow accepts only an Academy Bunny reference. Existing rows never
 * pass through this function on a title-only update. */
export function normalizeLessonVideoReference(input: unknown, source?: unknown): string {
  if (source !== undefined && source !== 'file' && source !== 'url') {
    throw new BunnyServerError(400, 'مصدر الفيديو غير صالح');
  }
  const embed = parseBunnyEmbed(input);
  if (embed) {
    const libraryId = process.env.BUNNY_LIBRARY_ID;
    if (!libraryId || !/^[1-9]\d*$/.test(libraryId)) {
      throw new BunnyServerError(503, 'خدمة الفيديو غير متاحة حالياً، يرجى التواصل مع إدارة المنصة');
    }
    if (embed.libraryId !== libraryId) {
      throw new BunnyServerError(400, 'يرجى إدخال رابط فيديو من مكتبة الأكاديمية');
    }
    return embed.url;
  }
  if (source === undefined && typeof input === 'string' && input.length <= 2048) {
    // Relative references only; encoded traversal, queries, and protocol-relative
    // addresses are not local files. Document ownership is checked separately.
    if (/^\/(?:uploads\/[A-Za-z0-9_.-]+|api\/files\/[A-Za-z0-9_-]+)$/.test(input)
      && !input.includes('..')) return input;
    try {
      const legacy = new URL(input);
      if (legacy.protocol === 'https:' && !legacy.username && !legacy.password && !legacy.port
        && ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'].includes(legacy.hostname)) return input;
    } catch { /* Return the same safe, user-facing validation error below. */ }
  }
  throw new BunnyServerError(400, 'يرجى إدخال رابط فيديو صالح');
}
