import type { ReactNode } from 'react';
import styles from './Home.module.css';

/*
 * Logo marquee. Every logo lives in a slot of fixed width and height, so the
 * track's width never depends on when an image finishes loading: that was the
 * cause of the overlapping logos and of the jumps mid-animation. Two identical
 * groups scroll by exactly one group's width, which makes the loop seamless.
 * The strip is always laid out left-to-right (dir="ltr") so the page's RTL
 * direction cannot reverse or offset it.
 *
 * Logo files are served by the platform itself (public/logos), so the strip does
 * not depend on, or report visitors to, third-party image hosts. The heading
 * describes the skills, not a relationship: no partnership or endorsement is
 * implied. The logos are trademarks of their owners.
 */
type ImageLogo = { name: string; src: string; height: number };
type DrawnLogo = { name: string; node: ReactNode };

const image = (name: string, src: string, height: number): ImageLogo => ({ name, src, height });

const ink = 'currentColor';

const logos: (ImageLogo | DrawnLogo)[] = [
  image('Google', '/logos/google.svg', 30),
  image('Amazon', '/logos/amazon.svg', 28),
  {
    name: 'Microsoft',
    node: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'grid', gridTemplateColumns: '10px 10px', gridAutoRows: '10px', gap: 2 }}>
          <i style={{ background: ink }} /><i style={{ background: ink }} /><i style={{ background: ink }} /><i style={{ background: ink }} />
        </span>
        <span style={{ fontSize: 21, fontWeight: 600, fontFamily: '"Segoe UI", Arial, sans-serif', letterSpacing: '-0.5px', lineHeight: 1 }}>Microsoft</span>
      </span>
    ),
  },
  image('Netflix', '/logos/netflix.svg', 26),
  image('Spotify', '/logos/spotify.svg', 32),
  image('Stripe', '/logos/stripe.svg', 30),
  image('Cisco', '/logos/cisco.svg', 36),
  image('Ericsson', '/logos/ericsson.svg', 30),
  {
    name: 'Citi',
    // One self-contained SVG: the arc can no longer spill onto the next logo.
    node: (
      <svg width="62" height="38" viewBox="0 0 62 38" aria-hidden="true">
        <path d="M 14 13 Q 31 -4 48 13" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <text x="31" y="35" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="27" letterSpacing="-1" fill={ink}>citi</text>
      </svg>
    ),
  },
  {
    name: 'Hewlett Packard Enterprise',
    node: (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <i style={{ width: 36, height: 11, background: ink }} />
        <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.05, fontFamily: 'Arial, sans-serif', whiteSpace: 'nowrap' }}>Hewlett Packard<br />Enterprise</span>
      </span>
    ),
  },
  {
    name: 'P&G',
    node: (
      <span style={{ width: 38, height: 38, borderRadius: '50%', border: `3px solid ${ink}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, fontFamily: '"Times New Roman", Times, serif', boxSizing: 'border-box' }}>
        P&amp;G
      </span>
    ),
  },
  image('Vimeo', '/logos/vimeo.svg', 30),
  image('Samsung', '/logos/samsung.svg', 40),
  image('Volkswagen', '/logos/volkswagen.svg', 36),
];

function LogoGroup({ duplicate }: { duplicate?: boolean }) {
  return (
    <ul className={styles.marqueeGroup} aria-hidden={duplicate || undefined} data-duplicate={duplicate ? '' : undefined}>
      {logos.map(logo => (
        <li key={logo.name} className={styles.logoSlot}>
          {'src' in logo ? (
            // Fixed slot + explicit height: the layout is final before the file arrives.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo.src}
              alt={duplicate ? '' : logo.name}
              height={logo.height}
              style={{ height: logo.height }}
              loading="eager"
              decoding="async"
              draggable={false}
              className={styles.logo}
            />
          ) : (
            <span className={styles.logo} role={duplicate ? undefined : 'img'} aria-label={duplicate ? undefined : logo.name}>{logo.node}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function TrustedBy() {
  return (
    <section className={`${styles.trusted} kq-section-light`} aria-labelledby="trusted-title">
      <h2 id="trusted-title" className={styles.trustedTitle} data-reveal="fade">
        مهارات تطلبها <span className="text-gold" style={{ fontWeight: 800 }}>كبرى الشركات</span> حول العالم
      </h2>
      <div className={styles.marquee} dir="ltr">
        <div className={styles.marqueeTrack}>
          <LogoGroup />
          <LogoGroup duplicate />
        </div>
      </div>
      <p className={styles.trustedNote}>
        الشعارات علامات تجارية لأصحابها، تُعرض للتوضيح فقط ولا تعني شراكة أو رعاية أو اعتماداً رسمياً.
      </p>
    </section>
  );
}
