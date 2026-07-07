import { prisma } from '@/lib/db';
import { XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import PrintTrigger from '../PrintTrigger';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export default async function VerifyCertificatePage({
  params,
  searchParams
}: {
  params: Promise<{ certId: string }>,
  searchParams: Promise<{ print?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const certificate = await prisma.certificate.findUnique({
    where: { id: resolvedParams.certId },
    include: {
      user: { select: { name: true } },
      course: {
        select: {
          title: true,
          instructor: { select: { name: true } }
        }
      }
    }
  });

  if (!certificate) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
        <div style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', background: 'rgba(239,68,68,0.05)' }}>
          <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem auto' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>Invalid Certificate</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
            The certificate ID you entered was not found in our records. Please verify the ID and try again.
          </p>
          <Link href="/verify" style={{ padding: '0.8rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', textDecoration: 'none' }}>
            <ArrowRight size={18} /> Back to Search
          </Link>
        </div>
      </div>
    );
  }

  // Generate QR Code as data URL
  const verifyUrl = `https://kqacademy.com/verify/${certificate.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 120,
    margin: 1,
    color: { dark: '#cba153', light: '#0a0f1e' }
  });

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const shortId = `KQA-${certificate.id.substring(0, 8).toUpperCase()}`;

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {resolvedSearchParams.print === 'true' && <PrintTrigger />}

      {/* Back button - hidden on print */}
      <div className="no-print" style={{ width: '100%', maxWidth: '1050px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/verify" style={{ color: 'rgba(203,161,83,0.8)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <ArrowRight size={16} /> Back to Verification
        </Link>
        <button
          onClick={() => window.print()}
          style={{ padding: '0.6rem 1.4rem', background: 'rgba(203,161,83,0.15)', border: '1px solid rgba(203,161,83,0.4)', color: '#cba153', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Download / Print PDF
        </button>
      </div>

      {/* ====== CERTIFICATE ====== */}
      <div id="certificate-container" style={{
        width: '100%',
        maxWidth: '1050px',
        aspectRatio: '1.414 / 1',
        background: 'linear-gradient(160deg, #0d1320 0%, #060912 50%, #0d1320 100%)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(203,161,83,0.2)',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        direction: 'ltr',
      }}>

        {/* Subtle grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(203,161,83,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(203,161,83,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Center radial glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60%', height: '60%',
          background: 'radial-gradient(ellipse, rgba(203,161,83,0.06) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* OUTER GOLD BORDER */}
        <div style={{
          position: 'absolute', inset: '14px',
          border: '2.5px solid rgba(203,161,83,0.7)',
          pointerEvents: 'none'
        }} />
        {/* INNER THIN GOLD BORDER */}
        <div style={{
          position: 'absolute', inset: '20px',
          border: '1px solid rgba(203,161,83,0.3)',
          pointerEvents: 'none'
        }} />

        {/* Corner ornaments */}
        {[
          { top: '10px', left: '10px' },
          { top: '10px', right: '10px' },
          { bottom: '10px', left: '10px' },
          { bottom: '10px', right: '10px' },
        ].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos,
            width: '28px', height: '28px',
            borderTop: i < 2 ? '3px solid #cba153' : 'none',
            borderBottom: i >= 2 ? '3px solid #cba153' : 'none',
            borderLeft: (i === 0 || i === 2) ? '3px solid #cba153' : 'none',
            borderRight: (i === 1 || i === 3) ? '3px solid #cba153' : 'none',
          }} />
        ))}

        {/* TOP GOLD BAR */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '5px',
          background: 'linear-gradient(90deg, transparent, #cba153, #f0d080, #cba153, transparent)'
        }} />

        {/* CONTENT */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '2.5rem 3.5rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>

          {/* === HEADER === */}
          <div style={{ textAlign: 'center' }}>
            {/* Logo area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {/* Shield Icon */}
              <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
                <path d="M16 2L2 8V18C2 26 9 32.5 16 35C23 32.5 30 26 30 18V8L16 2Z" fill="rgba(203,161,83,0.15)" stroke="#cba153" strokeWidth="1.5"/>
                <text x="16" y="23" textAnchor="middle" fill="#cba153" fontSize="11" fontWeight="bold" fontFamily="Georgia">KQ</text>
              </svg>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', letterSpacing: '0.25em', color: '#cba153', lineHeight: 1 }}>
                  KQ ACADEMY
                </div>
                <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: 'rgba(203,161,83,0.6)', textTransform: 'uppercase', marginTop: '2px' }}>
                  Advanced Digital Learning Platform
                </div>
              </div>
            </div>

            {/* Gold divider with diamond */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0.8rem 0' }}>
              <div style={{ height: '1px', width: '120px', background: 'linear-gradient(to right, transparent, rgba(203,161,83,0.6))' }} />
              <div style={{ width: '6px', height: '6px', background: '#cba153', transform: 'rotate(45deg)' }} />
              <div style={{ height: '1px', width: '120px', background: 'linear-gradient(to left, transparent, rgba(203,161,83,0.6))' }} />
            </div>

            {/* Certificate Title */}
            <div style={{ fontSize: '2.4rem', fontStyle: 'italic', color: '#cba153', letterSpacing: '0.05em', fontWeight: 'normal', textShadow: '0 0 30px rgba(203,161,83,0.3)', lineHeight: 1.2 }}>
              Certificate of Completion
            </div>
          </div>

          {/* === BODY === */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>
              THIS IS TO CERTIFY THAT
            </p>
            <h2 style={{
              fontSize: '2.6rem',
              fontWeight: 'bold',
              color: '#ffffff',
              textShadow: '0 0 40px rgba(203,161,83,0.25)',
              letterSpacing: '0.05em',
              margin: '0 0 0.7rem 0',
              lineHeight: 1
            }}>
              {certificate.user.name?.toUpperCase()}
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
              has successfully completed all requirements of the course
            </p>
            <h3 style={{
              fontSize: '1.6rem',
              color: '#5eead4',
              fontWeight: 'bold',
              fontStyle: 'italic',
              margin: '0 0 0.8rem 0',
              textShadow: '0 0 20px rgba(94,234,212,0.2)'
            }}>
              "{certificate.course.title}"
            </h3>

            {/* Stars separator */}
            <div style={{ color: 'rgba(203,161,83,0.5)', letterSpacing: '1rem', fontSize: '0.8rem' }}>
              ✦ ✦ ✦
            </div>
          </div>

          {/* === FOOTER: 3 columns === */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            alignItems: 'flex-end',
            borderTop: '1px solid rgba(203,161,83,0.2)',
            paddingTop: '1.2rem',
            gap: '1rem'
          }}>

            {/* LEFT: QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem' }}>
              <img src={qrDataUrl} alt="Verification QR" style={{ width: '90px', height: '90px', borderRadius: '8px' }} />
              <div style={{ fontSize: '0.62rem', color: 'rgba(203,161,83,0.6)', letterSpacing: '0.05em' }}>SCAN TO VERIFY</div>
              <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'rgba(203,161,83,0.8)', letterSpacing: '0.05em' }}>{shortId}</div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}>Issued: {issuedDate}</div>
            </div>

            {/* CENTER: Gold Seal */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                {/* Outer ring */}
                <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#cba153" strokeWidth="1.5" strokeDasharray="3,2" />
                  <circle cx="50" cy="50" r="38" fill="rgba(203,161,83,0.08)" stroke="#cba153" strokeWidth="1" />
                  {/* Circular text */}
                  <path id="textCircle" d="M 50,50 m -33,0 a 33,33 0 1,1 66,0 a 33,33 0 1,1 -66,0" fill="none" />
                  <text fontSize="6.5" fill="rgba(203,161,83,0.8)" letterSpacing="3">
                    <textPath href="#textCircle">CERTIFIED &amp; ACCREDITED • KQ ACADEMY •</textPath>
                  </text>
                  {/* KQ in center */}
                  <text x="50" y="46" textAnchor="middle" fill="#cba153" fontSize="18" fontWeight="bold" fontFamily="Georgia">KQ</text>
                  <text x="50" y="57" textAnchor="middle" fill="rgba(203,161,83,0.7)" fontSize="5.5" letterSpacing="1">ACADEMY</text>
                  {/* Stars around */}
                  {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const x = 50 + 29 * Math.cos(rad);
                    const y = 50 + 29 * Math.sin(rad);
                    return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="rgba(203,161,83,0.5)" fontSize="4">★</text>;
                  })}
                </svg>
              </div>
            </div>

            {/* RIGHT: Signature */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
              {/* Decorative signature SVG */}
              <svg width="120" height="40" viewBox="0 0 120 40" fill="none" style={{ marginBottom: '0' }}>
                <path d="M10,30 C20,10 35,5 50,20 C60,30 70,8 85,15 C95,20 105,25 115,15" stroke="rgba(203,161,83,0.8)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                <path d="M70,15 C75,25 80,28 90,22" stroke="rgba(203,161,83,0.5)" strokeWidth="1" strokeLinecap="round" fill="none"/>
              </svg>
              <div style={{ width: '100%', height: '1px', background: 'rgba(203,161,83,0.4)' }} />
              <div style={{ fontSize: '0.8rem', color: '#fff', fontStyle: 'italic', textAlign: 'right' }}>
                {certificate.course.instructor.name}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(203,161,83,0.7)', textAlign: 'right', letterSpacing: '0.05em' }}>
                COURSE INSTRUCTOR
              </div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
                kqacademy.com
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM GOLD BAR */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, transparent, #cba153, #f0d080, #cba153, transparent)'
        }} />

        {/* Holographic strip on left edge */}
        <div style={{
          position: 'absolute', top: '14px', bottom: '14px', left: '14px',
          width: '5px',
          background: 'linear-gradient(180deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b)',
          opacity: 0.4,
          borderRadius: '2px'
        }} />
      </div>

      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          #certificate-container {
            width: 297mm !important;
            max-width: 100% !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
