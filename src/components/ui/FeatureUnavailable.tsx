import Link from 'next/link';

/** An honest page for a tool that is not available yet: no sample data presented as real. */
export default function FeatureUnavailable({ title, description, alternatives = [] }: {
  title: string; description: string; alternatives?: { href: string; label: string }[];
}) {
  return (
    <main dir="rtl" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '2rem 1rem' }}>
      <section style={{ maxWidth: 620, width: '100%', textAlign: 'center', background: 'var(--ink-3)', border: '1px solid rgba(201,164,92,0.25)', borderRadius: 24, padding: 'clamp(1.5rem, 5vw, 3rem)', color: '#fff' }}>
        <span style={{ display: 'inline-block', padding: '0.3rem 0.9rem', borderRadius: 999, background: 'var(--gold-soft)', color: 'var(--gold-300)', fontSize: '0.85rem', marginBottom: '1rem' }}>غير متاح حالياً</span>
        <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.75rem' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.9, marginBottom: '1.5rem' }}>{description}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {alternatives.map(a => <Link key={a.href} href={a.href} className="btn">{a.label}</Link>)}
          <Link href="/dashboard" className="btn btn-solid">العودة إلى لوحتي</Link>
        </div>
      </section>
    </main>
  );
}
