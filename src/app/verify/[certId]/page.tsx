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
    width: 100,
    margin: 1,
    color: { dark: '#cba153', light: '#050505' }
  });

  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const shortId = `KQA-${certificate.id.substring(0, 8).toUpperCase()}`;

  return (
    <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {resolvedSearchParams.print === 'true' && <PrintTrigger />}

      {/* Back button - hidden on print */}
      <div className="no-print" style={{ width: '100%', maxWidth: '800px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/verify" style={{ color: 'rgba(203,161,83,0.8)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontFamily: "'Montserrat', sans-serif" }}>
          <ArrowRight size={16} /> Back to Verification
        </Link>
        <button
          onClick={() => window.print()}
          style={{ padding: '0.6rem 1.4rem', background: 'rgba(203,161,83,0.15)', border: '1px solid rgba(203,161,83,0.4)', color: '#cba153', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'Montserrat', sans-serif" }}
        >
          Download / Print PDF
        </button>
      </div>

      {/* ====== ADVANCED VERTICAL CERTIFICATE ====== */}
      <div id="certificate-container" style={{
        width: '100%',
        maxWidth: '794px', // Standard A4 width pixel ratio
        aspectRatio: '1 / 1.414', // Portrait A4 ratio
        background: '#000000', // Pure black
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(203,161,83,0.15)', // Gold ambient shadow
        fontFamily: "'Montserrat', sans-serif",
        direction: 'ltr',
      }}>

        {/* Extremely subtle abstract geometric glow instead of borders */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%',
          width: '50%', height: '50%',
          background: 'radial-gradient(ellipse, rgba(203,161,83,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
          filter: 'blur(40px)'
        }} />
        
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-10%',
          width: '50%', height: '50%',
          background: 'radial-gradient(ellipse, rgba(203,161,83,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
          filter: 'blur(40px)'
        }} />

        {/* CONTENT */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '6rem 4rem 4rem 4rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>

          {/* === HEADER === */}
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            {/* Logo area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
              <svg width="34" height="38" viewBox="0 0 32 36" fill="none">
                <path d="M16 2L2 8V18C2 26 9 32.5 16 35C23 32.5 30 26 30 18V8L16 2Z" fill="rgba(203,161,83,0.05)" stroke="#cba153" strokeWidth="1"/>
                <text x="16" y="23" textAnchor="middle" fill="#cba153" fontSize="11" fontWeight="bold" fontFamily="Cinzel, serif">KQ</text>
              </svg>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '0.3em', color: '#cba153', lineHeight: 1, fontFamily: "'Montserrat', sans-serif" }}>
                  KQ ACADEMY
                </div>
              </div>
            </div>

            {/* Certificate Title */}
            <div style={{ 
              fontSize: '3.6rem', 
              color: '#cba153', 
              letterSpacing: '0.05em', 
              fontWeight: '400', 
              fontFamily: "'Cinzel', serif",
              lineHeight: 1.2,
              marginBottom: '1.5rem'
            }}>
              Certificate<br/>of Completion
            </div>
            
            {/* Ultra minimal divider */}
            <div style={{ width: '60px', height: '2px', background: '#cba153', margin: '0 auto' }} />
          </div>

          {/* === BODY === */}
          <div style={{ textAlign: 'center', marginBottom: '5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2rem' }}>
              This is to certify that
            </p>
            
            <h2 style={{
              fontSize: '2.8rem',
              fontWeight: '300',
              color: '#ffffff',
              letterSpacing: '0.08em',
              margin: '0 0 2rem 0',
              lineHeight: 1.2,
              fontFamily: "'Cinzel', serif",
            }}>
              {certificate.user.name?.toUpperCase()}
            </h2>
            
            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
              Has successfully achieved the standards required for
            </p>
            
            <h3 style={{
              fontSize: '1.6rem',
              color: '#cba153', 
              fontWeight: '400',
              margin: '0',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.05em',
              lineHeight: 1.4
            }}>
              {certificate.course.title.toUpperCase()}
            </h3>
          </div>

          {/* === FOOTER: Vertical Layout suited for Portrait === */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3rem',
            borderTop: '1px solid rgba(203,161,83,0.2)',
            paddingTop: '3rem'
          }}>

            {/* CENTER: Modern Minimal Seal (Now top in footer) */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#cba153" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(203,161,83,0.3)" strokeWidth="1" strokeDasharray="4,4" />
                  <text x="50" y="45" textAnchor="middle" fill="#cba153" fontSize="22" fontFamily="Cinzel, serif">KQ</text>
                  <text x="50" y="58" textAnchor="middle" fill="rgba(203,161,83,0.7)" fontSize="6" letterSpacing="2" fontFamily="Montserrat, sans-serif">VERIFIED</text>
                  <path d="M30 65 L70 65" stroke="rgba(203,161,83,0.3)" strokeWidth="0.5" />
                  <text x="50" y="72" textAnchor="middle" fill="rgba(203,161,83,0.5)" fontSize="5" letterSpacing="1" fontFamily="Montserrat, sans-serif">{new Date(certificate.issuedAt).getFullYear()}</text>
                </svg>
              </div>
            </div>

            {/* Bottom Row: QR and Signature */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              
              {/* LEFT: QR Code (Minimal) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <img src={qrDataUrl} alt="Verification QR" style={{ width: '80px', height: '80px', opacity: 0.9 }} />
                <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'rgba(203,161,83,0.7)', letterSpacing: '0.1em' }}>
                  ID: {shortId}
                </div>
              </div>

              {/* RIGHT: Signature */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <svg width="140" height="40" viewBox="0 0 140 40" fill="none" style={{ marginBottom: '0.5rem' }}>
                  <path d="M10,25 C30,10 40,35 60,20 C70,10 80,30 100,15 C110,5 120,25 130,20" stroke="rgba(203,161,83,0.9)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
                <div style={{ width: '140px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                <div style={{ fontSize: '0.85rem', color: '#fff', letterSpacing: '0.05em' }}>
                  KHALED REFAI
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(203,161,83,0.6)', textAlign: 'right', letterSpacing: '0.1em' }}>
                  EXECUTIVE DIRECTOR
                </div>
              </div>

            </div>
          </div>
          
          {/* Issue Date - Absolute bottom center */}
          <div style={{ position: 'absolute', bottom: '2rem', left: '0', right: '0', textAlign: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Issued on {issuedDate} • kqacademy.com
            </span>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Montserrat:wght@300;400;600;700&display=swap');
        
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: #000 !important; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
          .no-print { display: none !important; }
          #certificate-container {
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border-radius: 0 !important;
          }
        }
      ` }} />
    </div>
  );
}
