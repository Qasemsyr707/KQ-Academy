import type { SocialPlatform } from '@/lib/social-links';

/** Simple, recognisable platform marks drawn inline (no external icon requests). */
export default function SocialIcon({ platform, size = 20 }: { platform: SocialPlatform | string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const;
  switch (platform) {
    case 'FACEBOOK':
      return <svg {...common} fill="currentColor"><path d="M14 8h2.5V4.5H14c-2.5 0-4 1.7-4 4.2V11H7.5v3.5H10V21h3.6v-6.5h2.6l.5-3.5h-3.1V9c0-.6.3-1 .9-1z" /></svg>;
    case 'INSTAGRAM':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
    case 'YOUTUBE':
      return <svg {...common} fill="currentColor"><path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8zM10 15.2V8.8l5.2 3.2z" /></svg>;
    case 'TIKTOK':
      return <svg {...common} fill="currentColor"><path d="M16.5 3c.3 2.2 1.6 3.6 3.8 3.8v3.1a7 7 0 0 1-3.7-1.2v6.2a5.9 5.9 0 1 1-5.9-5.9h.6v3.2a2.7 2.7 0 1 0 2 2.6V3z" /></svg>;
    case 'TELEGRAM':
      return <svg {...common} fill="currentColor"><path d="M21.5 4.3 2.9 11.5c-1.3.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8L22.8 5.6c.3-1.3-.5-1.8-1.3-1.3zM9.6 14.2l8.6-5.4c.4-.3.8-.1.5.2l-7.2 6.5-.3 3z" /></svg>;
    case 'WHATSAPP':
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1 1 8 19.4z" /><path d="M9 8.8c.2 2.6 2.8 5.3 5.6 5.8l1-1.2-1.7-.9-.8.7c-.9-.4-1.9-1.4-2.3-2.3l.7-.8-.9-1.7z" fill="currentColor" stroke="none" /></svg>;
    case 'LINKEDIN':
      return <svg {...common} fill="currentColor"><path d="M4.5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 8.5h3V21H3zM9 8.5h2.9v1.7h.1c.4-.8 1.4-1.9 3.1-1.9 3.3 0 3.9 2.2 3.9 5V21h-3v-6.8c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V21H9z" /></svg>;
    case 'X':
      return <svg {...common} fill="currentColor"><path d="M17.8 3H21l-7 8 8.2 10h-6.4l-5-6.3L5 21H1.8l7.5-8.6L1.5 3h6.6l4.5 5.8zM16.7 19.2h1.8L7.4 4.7H5.5z" /></svg>;
    default:
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>;
  }
}
