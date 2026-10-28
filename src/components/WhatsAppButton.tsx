import styles from './WhatsAppButton.module.css';

const whatsappUrl = `https://wa.me/963930108455?text=${encodeURIComponent(
  'مرحباً، أود الاستفسار عن دورات KQ Academy.'
)}`;

export default function WhatsAppButton() {
  return (
    <a
      className={styles.button}
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل مع KQ Academy عبر واتساب على الرقم +963 930 108 455 (يفتح في نافذة جديدة)"
      dir="rtl"
    >
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" focusable="false">
          <path d="M20.52 3.48A11.91 11.91 0 0 0 12.05 0C5.44 0 .06 5.38.06 12c0 2.11.55 4.17 1.6 5.99L0 24l6.16-1.62a12.02 12.02 0 0 0 5.88 1.5h.01c6.61 0 11.99-5.38 12-11.99a11.9 11.9 0 0 0-3.53-8.41Zm-8.47 18.38a9.93 9.93 0 0 1-5.06-1.38l-.36-.21-3.66.96.98-3.57-.23-.37a9.94 9.94 0 0 1-1.52-5.29c0-5.5 4.47-9.97 9.98-9.97a9.91 9.91 0 0 1 7.05 2.92 9.9 9.9 0 0 1 2.91 7.05c0 5.5-4.48 9.97-9.99 9.97Zm5.47-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.11 4.52.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
        </svg>
      </span>
      <span className={styles.copy} aria-hidden="true">
        <span className={styles.title}>تواصل معنا</span>
        <span className={styles.subtitle}>عبر واتساب</span>
      </span>
      <span className={styles.tooltip} aria-hidden="true">تواصل معنا عبر واتساب</span>
    </a>
  );
}
