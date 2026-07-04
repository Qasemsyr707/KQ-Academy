import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'KQ Academy | أكاديمية KQ للتعليم الإلكتروني',
  description: 'منصة تعليم إلكتروني متكاملة للمناهج السورية والمهارات المهنية.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          <Navbar />
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
