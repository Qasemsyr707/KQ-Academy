import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test_key');

const APP_NAME = 'منصة التعلم السوري';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@elearning.sy';

// ── Welcome Email ──────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string, affiliateCode: string) {
  const referralLink = `${APP_URL}/register?ref=${affiliateCode}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `مرحباً بك في ${APP_NAME} 🎉`,
    html: buildTemplate(`
      <h1 style="color:#CBA153;">أهلاً وسهلاً ${name}! 👋</h1>
      <p>نحن سعداء بانضمامك إلى منصتنا التعليمية. يمكنك الآن الاستفادة من آلاف الكورسات المميزة.</p>
      <a href="${APP_URL}/courses" style="${btnStyle}">ابدأ التعلم الآن →</a>
      <hr style="border-color:rgba(255,255,255,0.1);margin:2rem 0;"/>
      <p style="font-size:0.9rem;opacity:0.7;">🤝 شارك رابطك الخاص مع أصدقائك واكسب عمولة عن كل مشترك!</p>
      <code style="background:#1a1a1a;padding:0.5rem 1rem;border-radius:8px;color:#CBA153;">${referralLink}</code>
    `)
  });
}

// ── Course Completion Reminder ─────────────────────────────────
export async function sendCourseReminderEmail(to: string, name: string, courseTitle: string, courseId: string, progress: number) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${name}، أكمل كورس "${courseTitle}" واحصل على شهادتك! 🏆`,
    html: buildTemplate(`
      <h1 style="color:#CBA153;">أنت على بُعد خطوات من شهادتك! 🎓</h1>
      <p>مرحباً ${name}، لاحظنا أنك أتممت <strong style="color:#CBA153;">${progress}%</strong> من كورس <strong>"${courseTitle}"</strong>.</p>
      <p>لا تتوقف الآن! أكمل الكورس وستحصل على شهادة معتمدة يمكنك إضافتها لسيرتك الذاتية.</p>
      <a href="${APP_URL}/courses/${courseId}/learn" style="${btnStyle}">أكمل الكورس →</a>
    `)
  });
}

// ── Affiliate Commission Earned ────────────────────────────────
export async function sendAffiliateEarningEmail(to: string, name: string, amount: number, walletBalance: number) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🎉 ربحت $${amount.toFixed(2)} عمولة جديدة!`,
    html: buildTemplate(`
      <h1 style="color:#22c55e;">تهانينا! لقد كسبت عمولة! 💰</h1>
      <p>مرحباً ${name}، قام أحد أصدقائك الذين دعوتهم بشراء كورس!</p>
      <div style="background:#0a2a0a;border:1px solid #22c55e;border-radius:12px;padding:1.5rem;text-align:center;margin:1.5rem 0;">
        <p style="margin:0;font-size:0.9rem;opacity:0.7;">العمولة المكسوبة</p>
        <h2 style="color:#22c55e;font-size:2.5rem;margin:0.5rem 0;">$${amount.toFixed(2)}</h2>
        <p style="margin:0;font-size:0.8rem;opacity:0.5;">رصيد المحفظة الحالي: $${walletBalance.toFixed(2)}</p>
      </div>
      <a href="${APP_URL}/affiliate" style="${btnStyle}">عرض إحصائيات الإحالة →</a>
    `)
  });
}

// ── Bundle Promotional Email ───────────────────────────────────
export async function sendPromotionalEmail(to: string, name: string, subject: string, body: string) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: buildTemplate(`
      <h1 style="color:#CBA153;">${name}، لديك عرض خاص! ✨</h1>
      ${body}
      <a href="${APP_URL}/bundles" style="${btnStyle}">عرض جميع العروض →</a>
    `)
  });
}

// ── HTML Template ──────────────────────────────────────────────
const btnStyle = `
  display:inline-block;
  background:linear-gradient(135deg,#CBA153,#d4a857);
  color:#000;
  padding:0.875rem 2rem;
  border-radius:12px;
  text-decoration:none;
  font-weight:bold;
  font-size:1rem;
  margin:1.5rem 0;
`;

function buildTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet"/>
    </head>
    <body style="margin:0;padding:0;background:#050505;font-family:'Tajawal',sans-serif;color:#fff;direction:rtl;">
      <div style="max-width:600px;margin:0 auto;padding:2rem;">
        <!-- Header -->
        <div style="text-align:center;padding:2rem 0;border-bottom:1px solid rgba(255,255,255,0.1);">
          <h2 style="color:#CBA153;margin:0;font-size:1.5rem;letter-spacing:2px;">${APP_NAME}</h2>
        </div>
        <!-- Content -->
        <div style="padding:2.5rem 0;">
          ${content}
        </div>
        <!-- Footer -->
        <div style="text-align:center;padding:2rem 0;border-top:1px solid rgba(255,255,255,0.1);opacity:0.4;font-size:0.8rem;">
          <p>© ${new Date().getFullYear()} ${APP_NAME} - جميع الحقوق محفوظة</p>
          <p>إذا لم ترغب بتلقي هذه الرسائل، <a href="${APP_URL}/profile" style="color:#CBA153;">ألغِ اشتراكك</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export { resend };
