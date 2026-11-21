'use client';

import { useEffect } from 'react';

const KEY = 'kq_ref';
const PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

/** Remember a ?ref=CODE seen on any page until the visitor registers (the server validates the code). */
export default function ReferralCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('ref');
      if (code && PATTERN.test(code)) localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
    } catch { /* Storage unavailable: the code still works on the register page itself. */ }
  }, []);
  return null;
}

/** The referral code to send at registration: the current URL first, then a code remembered in the last 30 days. */
export function pendingReferralCode(): string | undefined {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('ref');
    if (fromUrl && PATTERN.test(fromUrl)) return fromUrl;
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && PATTERN.test(saved.code) && Date.now() - saved.at < 30 * 24 * 3600 * 1000) return saved.code;
  } catch { /* ignore */ }
  return undefined;
}
