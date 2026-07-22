import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
import './globals.css';
import Script from 'next/script';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'KQ Academy | أكاديمية KQ للتعليم الإلكتروني',
  description: 'منصة تعليم إلكتروني متكاملة للمناهج السورية والمهارات المهنية. كورسات بكالوريا، تاسع، وتطوير مهني بشهادات معتمدة.',
  keywords: ['تعليم', 'أكاديمية', 'سوريا', 'بكالوريا', 'تاسع', 'كورسات', 'مهارات', 'برمجة', 'لغات', 'KQ Academy', 'KQ', 'شهادات معتمدة'],
  authors: [{ name: 'KQ Academy' }],
  openGraph: {
    title: 'KQ Academy | بوابتك نحو التميز',
    description: 'أفضل منصة تعليمية سورية للمناهج والدورات المهنية',
    url: 'https://kqacademy.com',
    siteName: 'KQ Academy',
    images: [
      {
        url: 'https://kqacademy.com/api/og', // Placeholder for OG Image
        width: 1200,
        height: 630,
        alt: 'KQ Academy Preview',
      },
    ],
    locale: 'ar_SY',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KQ Academy | للتعليم الإلكتروني',
    description: 'أفضل الكورسات في سوريا بشهادات معتمدة',
    images: ['https://kqacademy.com/api/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "KQ Academy",
  "url": "https://kqacademy.com",
  "logo": "https://kqacademy.com/logo.png",
  "description": "منصة تعليم إلكتروني متكاملة للمناهج السورية والمهارات المهنية.",
  "sameAs": [
    "https://facebook.com/kqacademy",
    "https://instagram.com/kqacademy",
    "https://linkedin.com/company/kqacademy"
  ],
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "SY",
    "addressRegion": "Damascus"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          {/* Google Analytics - loads only if NEXT_PUBLIC_GA_ID is set */}
          {process.env.NEXT_PUBLIC_GA_ID && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){window.dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `}
              </Script>
            </>
          )}
          <main style={{ marginTop: '80px', minHeight: 'calc(100vh - 80px)' }}>
            {children}
          </main>
          <footer style={{ 
            borderTop: '1px solid rgba(255,255,255,0.05)', 
            padding: '2rem 0', 
            textAlign: 'center', 
            background: 'rgba(10,10,10,0.8)', 
            backdropFilter: 'blur(10px)' 
          }}>
            <p style={{ color: 'var(--primary)', fontWeight: 600, letterSpacing: '1px' }}>KQ ACADEMY © 2026</p>
            <p style={{ opacity: 0.5, fontSize: '0.9rem', marginTop: '0.5rem' }}>مبني بأحدث التقنيات وأعلى المعايير العالمية</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
