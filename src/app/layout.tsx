import type { Metadata, Viewport } from 'next';

import './globals.css';
import { cairo } from './fonts';
import Script from 'next/script';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import MotionLayer from '@/components/motion/MotionLayer';
import ReferralCapture from '@/components/referral/ReferralCapture';
import { serializeJsonLd } from '@/lib/safe-json-ld';
import { curriculumHidden } from '@/lib/catalogue-visibility';

export const metadata: Metadata = {
  title: 'KQ Academy | أكاديمية KQ للتعليم الإلكتروني',
  description: 'منصة تعليم إلكتروني تجمع المعرفة والمهارات العملية في مكان واحد: البرمجة، الذكاء الاصطناعي، التصميم، التسويق وصناعة المحتوى، مع شهادات إتمام قابلة للتحقق.',
  keywords: ['تعليم إلكتروني', 'أكاديمية', 'كورسات', 'دورات أونلاين', 'مهارات', 'برمجة', 'ذكاء اصطناعي', 'تصميم', 'تسويق', 'صناعة المحتوى', 'KQ Academy', 'KQ', 'شهادات إتمام'],
  authors: [{ name: 'KQ Academy' }],
  openGraph: {
    title: 'KQ Academy | بوابتك نحو التميز',
    description: 'تعلّم بذكاء. تقدّم بثقة. كورسات عملية في البرمجة والذكاء الاصطناعي والتصميم والتسويق.',
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
    description: 'كورسات عملية بخطوات واضحة وشهادات إتمام قابلة للتحقق.',
    images: ['https://kqacademy.com/api/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#060607',
  colorScheme: 'dark',
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "KQ Academy",
  "url": "https://kqacademy.com",
  "logo": "https://kqacademy.com/logo.png",
  "description": "منصة تعليم إلكتروني تجمع المعرفة والمهارات العملية في مكان واحد.",
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
    <html lang="ar" dir="rtl" className={cairo.variable} data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgSchema) }}
        />
        {/* Meta Pixel Code */}
        <script dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1995445104466661');
            fbq('track', 'PageView');
          `
        }} />
        {/* End Meta Pixel Code */}
      </head>
      <body>
        <noscript>
          <img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=1995445104466661&ev=PageView&noscript=1" alt="" />
        </noscript>
        <a href="#main-content" className="skip-link">تخطَّ إلى المحتوى الرئيسي</a>
        <AuthProvider>
          <Navbar showCurriculum={!curriculumHidden()} />
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
          <main id="main-content" className="main-content" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <MotionLayer />
          <ReferralCapture />
        </AuthProvider>
        <WhatsAppButton />
      </body>
    </html>
  );
}
