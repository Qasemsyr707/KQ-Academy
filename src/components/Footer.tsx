import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Globe } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import styles from './Footer.module.css';

const footerLinks = [
  {
    title: 'تطوير الويب والبرمجيات',
    links: [
      { label: 'تطوير الويب (Front-end)', href: '/courses?q=web' },
      { label: 'تطبيقات الموبايل (React Native)', href: '/courses?q=mobile' },
      { label: 'برمجة بايثون (Python)', href: '/courses?q=python' },
      { label: 'تطوير الواجهات الخلفية', href: '/courses?q=backend' },
      { label: 'أساسيات البرمجة للمبتدئين', href: '/courses?q=programming' },
    ],
  },
  {
    title: 'شهادات وتكنولوجيا',
    links: [
      { label: 'الذكاء الاصطناعي و ChatGPT', href: '/courses?q=ai' },
      { label: 'علم البيانات (Data Science)', href: '/courses?q=data' },
      { label: 'الأمن السيبراني', href: '/courses?q=cyber' },
      { label: 'الحوسبة السحابية (AWS)', href: '/courses?q=cloud' },
    ],
  },
  {
    title: 'لغات وتطوير الذات',
    links: [
      { label: 'اللغة الإنجليزية الشاملة', href: '/courses?q=english' },
      { label: 'التسويق الرقمي (Digital Marketing)', href: '/courses?q=marketing' },
      { label: 'ريادة الأعمال والمشاريع', href: '/courses?q=business' },
      { label: 'مهارات التواصل والإلقاء', href: '/courses?q=communication' },
    ],
  },
  {
    title: 'المناهج الدراسية السورية',
    links: [
      { label: 'البكالوريا - الفرع العلمي', href: '/curriculum?grade=12-science' },
      { label: 'البكالوريا - الفرع الأدبي', href: '/curriculum?grade=12-literary' },
      { label: 'شهادة التعليم الأساسي (التاسع)', href: '/curriculum?grade=9' },
      { label: 'نماذج امتحانية ومكثفات', href: '/curriculum?type=exams' },
    ],
  },
  {
    title: 'KQ Academy',
    links: [
      { label: 'من نحن', href: '/about' },
      { label: 'تواصل معنا', href: '/contact' },
      { label: 'الأسئلة الشائعة', href: '/faq' },
      { label: 'انضم كمدرب', href: '/teach' },
    ],
  },
  {
    title: 'الشروط والسياسات',
    links: [
      { label: 'شروط الاستخدام', href: '/terms' },
      { label: 'سياسة الخصوصية', href: '/privacy' },
      { label: 'سياسة الاسترجاع', href: '/refund' },
      { label: 'خريطة الموقع', href: '/sitemap' },
    ],
  },
];

const socialLinks = [
  { label: 'فيسبوك', href: 'https://www.facebook.com/profile.php?id=61594346671502', external: true },
  { label: 'تويتر', href: '#', external: false },
  { label: 'انستغرام', href: '#', external: false },
  { label: 'يوتيوب', href: '#', external: false },
];

/** Server component — no client JavaScript is shipped for the footer. */
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandBlock} data-reveal="">
            <Link href="/" className={styles.brandLink} aria-label="KQ Academy — الصفحة الرئيسية">
              <BrandLogo size={52} className={styles.logo} />
              <span className={styles.brandName}>KQ Academy</span>
            </Link>
            <p className={styles.tagline}>
              منصة تعليم إلكتروني متكاملة للمناهج السورية والمهارات المهنية.
            </p>
            <ul className={styles.socials} aria-label="حساباتنا على وسائل التواصل">
              {socialLinks.map(social => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    className={styles.social}
                    {...(social.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.columns}>
            {footerLinks.map((section, index) => (
              <nav
                key={section.title}
                className={styles.column}
                aria-label={section.title}
                data-reveal=""
                style={{ '--reveal-i': index } as CSSProperties}
              >
                <h3 className={styles.columnTitle}>{section.title}</h3>
                <ul className={styles.list}>
                  {section.links.map(link => (
                    <li key={link.href}>
                      <Link href={link.href} className={styles.link}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copy}>
            © <span className="num">{new Date().getFullYear()}</span> KQ Academy. جميع الحقوق محفوظة.
          </span>
          <button type="button" className={styles.lang}>
            <Globe size={16} aria-hidden="true" /> العربية
          </button>
        </div>
      </div>
    </footer>
  );
}
