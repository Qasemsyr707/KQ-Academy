import { createHash } from 'node:crypto';
import { parseBunnyEmbed } from '@/lib/bunny-embed';
import { BunnyServerError } from '@/lib/bunny-upload-server';

/** Call only after checking course/lesson access. The key is server-only and is
 * the library's Embed view token key, never its management API access key. */
export function getBunnyPlaybackUrl(input: string): string {
  const embed = parseBunnyEmbed(input);
  if (!embed) {
    if (/mediadelivery\.net/i.test(input)) throw new BunnyServerError(400, 'رابط الفيديو غير صالح');
    return input;
  }
  if (embed.libraryId !== process.env.BUNNY_LIBRARY_ID) {
    throw new BunnyServerError(503, 'تعذّر تشغيل الفيديو، يرجى التواصل مع إدارة المنصة');
  }
  const key = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY;
  if (!key && process.env.BUNNY_STREAM_TOKEN_AUTH_ENABLED === 'true') {
    throw new BunnyServerError(503, 'تعذّر تشغيل الفيديو، يرجى التواصل مع إدارة المنصة');
  }
  const url = new URL(embed.url);
  if (key) {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = createHash('sha256').update(`${key}${embed.videoId}${expires}`).digest('hex');
    url.searchParams.set('token', token);
    url.searchParams.set('expires', String(expires));
  }
  return url.toString();
}
