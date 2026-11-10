import Image from 'next/image';
import styles from './Home.module.css';

/*
 * Existing "trusted by" strip, preserved as published. Logos load lazily and
 * the marquee pauses on hover and stops entirely under prefers-reduced-motion.
 */
const imageLogos = [
  { src: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg', alt: 'Google', height: 30 },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', alt: 'Amazon', height: 26 },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', alt: 'Netflix', height: 28 },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Spotify_logo_with_text.svg', alt: 'Spotify', height: 32 },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg', alt: 'Stripe', height: 30 },
  { src: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg', alt: 'Cisco', height: 34 },
  { src: 'https://cdn.simpleicons.org/ericsson', alt: 'Ericsson', height: 26 },
  { src: 'https://cdn.simpleicons.org/vimeo', alt: 'Vimeo', height: 24 },
  { src: 'https://cdn.simpleicons.org/samsung', alt: 'Samsung', height: 22 },
  { src: 'https://cdn.simpleicons.org/volkswagen', alt: 'Volkswagen', height: 34 },
];

type ImageLogo = (typeof imageLogos)[number];

function Logo({ logo, hidden }: { logo: ImageLogo; hidden?: boolean }) {
  return (
    <Image
      src={logo.src}
      alt={hidden ? '' : logo.alt}
      width={logo.height * 4}
      height={logo.height}
      unoptimized
      loading="lazy"
      className={styles.logo}
      style={{ height: logo.height, width: 'auto' }}
    />
  );
}

function LogoGroup({ hidden }: { hidden?: boolean }) {
  return (
    <div className={styles.marqueeGroup} aria-hidden={hidden || undefined}>
      {imageLogos.slice(0, 2).map(logo => (
        <Logo key={logo.alt} logo={logo} hidden={hidden} />
      ))}

      {/* Microsoft */}
      <div className={styles.logo} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} role={hidden ? undefined : 'img'} aria-label={hidden ? undefined : 'Microsoft'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
          <div style={{ width: '10px', height: '10px', background: 'black' }} />
          <div style={{ width: '10px', height: '10px', background: 'black' }} />
          <div style={{ width: '10px', height: '10px', background: 'black' }} />
          <div style={{ width: '10px', height: '10px', background: 'black' }} />
        </div>
        <span style={{ fontSize: '22px', fontWeight: 600, color: 'black', fontFamily: '"Segoe UI", sans-serif', letterSpacing: '-0.5px' }}>Microsoft</span>
      </div>

      {imageLogos.slice(2, 7).map(logo => (
        <Logo key={logo.alt} logo={logo} hidden={hidden} />
      ))}

      {/* Citi */}
      <div className={styles.logo} style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-end', height: '32px', paddingRight: '5px' }} role={hidden ? undefined : 'img'} aria-label={hidden ? undefined : 'Citi'}>
        <svg width="40" height="32" viewBox="0 0 100 80" style={{ position: 'absolute', top: '-10px', left: '10px' }} aria-hidden="true">
          <path d="M 20 60 Q 50 10 80 60" fill="none" stroke="black" strokeWidth="12" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: '30px', fontWeight: 700, color: 'black', fontFamily: 'Arial, sans-serif', letterSpacing: '-1px', zIndex: 1 }}>citi</span>
      </div>

      {/* HPE */}
      <div className={styles.logo} style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'center' }} role={hidden ? undefined : 'img'} aria-label={hidden ? undefined : 'Hewlett Packard Enterprise'}>
        <div style={{ width: '36px', height: '12px', background: 'black', marginBottom: '4px' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'black', lineHeight: 1, fontFamily: 'Arial, sans-serif' }}>Hewlett Packard<br />Enterprise</span>
      </div>

      {/* P&G */}
      <div className={styles.logo} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid black', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: 'black', fontFamily: '"Times New Roman", Times, serif' }} role={hidden ? undefined : 'img'} aria-label={hidden ? undefined : 'P&G'}>
        P&amp;G
      </div>

      {imageLogos.slice(7).map(logo => (
        <Logo key={logo.alt} logo={logo} hidden={hidden} />
      ))}
    </div>
  );
}

export default function TrustedBy() {
  return (
    <section className={`${styles.trusted} kq-section-light`} aria-labelledby="trusted-title">
      <h2 id="trusted-title" className={styles.trustedTitle} data-reveal="fade">
        تحظى <span className="text-gold" style={{ fontWeight: 800 }}>KQ Academy</span> بثقة أكثر من 17,000 شركة ومتعلم حول العالم
      </h2>
      <div className={styles.marquee} dir="ltr">
        <div className={styles.marqueeTrack}>
          <LogoGroup />
          <LogoGroup hidden />
        </div>
      </div>
    </section>
  );
}
