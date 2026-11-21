'use client';

import { useEffect, useState } from 'react';
import SocialIcon from './SocialIcon';

type Link = { platform: string; label: string; url: string };

/**
 * The Academy's official social links, from /admin/social. Loaded in the browser so that the
 * site build never needs the database. Nothing is rendered until there is at least one real link.
 */
export default function SocialLinks({ className, linkClassName, variant = 'icons' }: { className?: string; linkClassName?: string; variant?: 'icons' | 'list' }) {
  const [links, setLinks] = useState<Link[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/social-links').then(r => r.ok ? r.json() : { links: [] }).then(data => {
      if (!cancelled && Array.isArray(data.links)) setLinks(data.links);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!links.length) return null;
  return (
    <ul className={className} aria-label="حساباتنا الرسمية على وسائل التواصل" style={variant === 'list' ? { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' } : undefined}>
      {links.map(link => (
        <li key={link.platform}>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={linkClassName} aria-label={link.label}
            style={variant === 'list' ? { display: 'inline-flex', gap: '0.6rem', alignItems: 'center', color: 'inherit', textDecoration: 'none', fontWeight: 600 } : { display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <SocialIcon platform={link.platform} size={variant === 'list' ? 22 : 18} />
            <span>{link.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
