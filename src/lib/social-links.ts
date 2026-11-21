/**
 * Official social media links of the Academy: URLs only. There is no account connection,
 * token, posting or analytics here, by design.
 */
export const SOCIAL_PLATFORMS = {
  FACEBOOK: { label: 'فيسبوك', domains: ['facebook.com', 'fb.com'] },
  INSTAGRAM: { label: 'إنستغرام', domains: ['instagram.com'] },
  YOUTUBE: { label: 'يوتيوب', domains: ['youtube.com', 'youtu.be'] },
  TIKTOK: { label: 'تيك توك', domains: ['tiktok.com'] },
  TELEGRAM: { label: 'تيليغرام', domains: ['t.me', 'telegram.me'] },
  WHATSAPP: { label: 'واتساب', domains: ['wa.me', 'whatsapp.com'] },
  LINKEDIN: { label: 'لينكدإن', domains: ['linkedin.com'] },
  X: { label: 'إكس (تويتر)', domains: ['x.com', 'twitter.com'] },
} as const;
export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;
export const SOCIAL_PLATFORM_KEYS = Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[];
export const isSocialPlatform = (value: unknown): value is SocialPlatform =>
  typeof value === 'string' && Object.hasOwn(SOCIAL_PLATFORMS, value);

/** The Facebook page the site already linked to, shown until links are managed in /admin/social. */
export const DEFAULT_SOCIAL_LINKS = [
  { platform: 'FACEBOOK' as SocialPlatform, url: 'https://www.facebook.com/profile.php?id=61594346671502' },
];

export class SocialLinkError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/**
 * A safe https URL on the platform's own domain. Refuses javascript:/data: and every other scheme,
 * credentials, other hosts (including look-alike domains), and redirect links carrying another URL.
 */
export function validateSocialUrl(platform: SocialPlatform, value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) throw new SocialLinkError(400, 'الرابط مطلوب (500 حرف كحد أقصى)');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new SocialLinkError(400, 'الرابط غير صالح'); }
  if (url.protocol !== 'https:') throw new SocialLinkError(400, 'يجب أن يبدأ الرابط بـ https://');
  if (url.username || url.password || url.port) throw new SocialLinkError(400, 'الرابط غير صالح');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const allowed = SOCIAL_PLATFORMS[platform].domains;
  if (!allowed.some(domain => host === domain || host.endsWith(`.${domain}`))) {
    throw new SocialLinkError(400, `الرابط يجب أن يكون على ${allowed.join(' أو ')}`);
  }
  if (/^\/(l|redirect|out)(\.php)?\/?$/i.test(url.pathname)) throw new SocialLinkError(400, 'روابط إعادة التوجيه غير مسموحة');
  for (const param of url.searchParams.values()) {
    if (/^(https?:|javascript:|data:|\/\/)/i.test(param.trim())) throw new SocialLinkError(400, 'روابط إعادة التوجيه غير مسموحة');
  }
  url.hash = '';
  return url.toString();
}
