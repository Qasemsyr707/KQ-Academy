import { createHash } from 'node:crypto';
import { parseBunnyEmbed } from '@/lib/bunny-embed';
import { BunnyServerError } from '@/lib/bunny-upload-server';
import { safeMediaUrl } from '@/lib/media-url';

/** Call only after checking course/lesson access. The key is server-only and is
 * the library's Embed view token key, never its management API access key. */
export function getBunnyPlaybackUrl(input: string): string {
  const embed = parseBunnyEmbed(input);
  if (!embed) {
    if (/mediadelivery\.net/i.test(input) || !safeMediaUrl(input)) {
      throw new BunnyServerError(400, 'رابط الفيديو غير صالح');
    }
    // Legacy media remains behind the caller's lesson authorization. Its origin
    // must enforce its own access policy; a Bunny token cannot protect that URL.
    return input;
  }
  if (embed.libraryId !== process.env.BUNNY_LIBRARY_ID) {
    throw new BunnyServerError(503, 'تعذّر تشغيل الفيديو، يرجى التواصل مع إدارة المنصة');
  }
  const key = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY;
  // Never let an omitted/misspelled feature flag downgrade protected playback.
  // The library must also enforce embed tokens; that is a staging acceptance gate.
  if (!key?.trim()) {
    throw new BunnyServerError(503, 'تعذّر تشغيل الفيديو، يرجى التواصل مع إدارة المنصة');
  }
  const url = new URL(embed.url);
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = createHash('sha256').update(`${key}${embed.videoId}${expires}`).digest('hex');
  url.searchParams.set('token', token);
  url.searchParams.set('expires', String(expires));
  return url.toString();
}
