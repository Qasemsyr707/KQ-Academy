/** Shared URL validation only: no credentials, HTML rendering, or network calls. */
export interface BunnyEmbed {
  url: string;
  libraryId: string;
  videoId: string;
}

const VIDEO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOOLEAN_OPTIONS = new Set(['autoplay', 'loop', 'muted', 'preload', 'responsive', 'controls', 'playsinline',
  'disableIosPlayer', 'chromecast', 'disableAirPlay', 'showSpeed', 'showHeatmap', 'compactControls',
  'rememberPosition', 'rememberSettings', 'levelCap']);

/** Extract only a validated src from pasted embed code. Never store its HTML or
 * attributes. Expiring tokens are deliberately excluded from the saved reference. */
export function parseBunnyEmbed(input: unknown): BunnyEmbed | null {
  if (typeof input !== 'string' || input.length > 8192) return null;
  let source = input.trim();
  if (source.startsWith('<')) {
    const frames = source.match(/<iframe\b[^>]*>/gi);
    if (frames?.length !== 1 || /\bsrcdoc\s*=/i.test(frames[0])) return null;
    const sources = [...frames[0].matchAll(/\bsrc\s*=\s*(["'])(.*?)\1/gi)];
    if (sources.length !== 1) return null;
    source = sources[0][2].replace(/&amp;|&#0*38;|&#x0*26;/gi, '&');
  }
  if (!source || /[\s\\<>\u0000-\u001f\u007f]/.test(source)) return null;
  try {
    const parsed = new URL(source);
    if (parsed.protocol !== 'https:' || parsed.port || parsed.username || parsed.password || parsed.hash
      || !['player.mediadelivery.net', 'iframe.mediadelivery.net'].includes(parsed.hostname)) return null;
    const path = /^\/(?:embed|play)\/([1-9]\d*)\/([^/]+)\/?$/.exec(parsed.pathname);
    if (!path || !VIDEO_ID.test(path[2])) return null;
    const [, libraryId, videoId] = path;
    const clean = new URL(`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId.toLowerCase()}`);
    for (const [key, value] of parsed.searchParams) {
      if (BOOLEAN_OPTIONS.has(key) && /^(true|false|0|1)$/.test(value)) clean.searchParams.set(key, value);
      if (key === 't' && /^(?:\d{1,7}(?:\.\d{1,3})?|(?=\d)(?:\d{1,4}h)?(?:\d{1,4}m)?(?:\d{1,4}s)?|\d{1,4}:\d{2}:\d{2})$/.test(value)) clean.searchParams.set(key, value);
      if ((key === 'captions' || key === 'lang') && /^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,2}$/.test(value)) clean.searchParams.set(key, value);
      if (key === 'nativeHls' && ['off', 'auto', 'safari'].includes(value)) clean.searchParams.set(key, value);
    }
    return { url: clean.toString(), libraryId, videoId: videoId.toLowerCase() };
  } catch { return null; }
}
