# إنشاء بيئة Staging مستقلة على Coolify

الهدف: نسخة تجريبية من KQ Academy على نفس الخادم (Hostinger VPS + Coolify) لا تشارك
الإنتاج أي قاعدة بيانات أو ملفات أو أسرار. لا يُنفَّذ أي من هذه الخطوات على تطبيق
الإنتاج `clone-of-k-q-academy` ولا على قاعدته `kqacademy-recovery17`.

## 1. ما يُنشأ

| المورد | الاسم المقترح | ملاحظات |
| --- | --- | --- |
| قاعدة PostgreSQL | `kqacademy-staging-db` | قاعدة جديدة بنفس الإصدار الرئيسي لقاعدة الإنتاج (17). لا تستخدم نسخة الإنتاج نفسها |
| تطبيق | `kq-academy-staging` | من المستودع `Qasemsyr707/KQ-Academy`، Build Pack: Dockerfile |
| الفرع | فرع المراجعة (مثل `audit/phase1-notifications-certificates-20261113`) | يُرفع إلى GitHub بعد موافقة صريحة فقط |
| النطاق | `staging.kqacademy.com` | سجل DNS من نوع A إلى عنوان الخادم نفسه، مع HTTPS من Coolify |
| تخزين دائم | Volume إلى `/data/kq-documents` وVolume إلى `/data/bunny-uploads` | Volumes جديدة خاصة بـStaging، وليست Volumes الإنتاج |

## 2. الخطوات في Coolify

1. **قاعدة البيانات:** Project → New Resource → PostgreSQL 17. الاسم `kqacademy-staging-db`.
   لا تفعّل "Public Port". انسخ **Internal URL**.
2. **التطبيق:** New Resource → Application → GitHub → المستودع نفسه → اختر فرع المراجعة →
   Build Pack = **Dockerfile** → المنفذ `3000`.
3. **Auto Deploy = Off** و**Preview Deployments = Off** (كما في الإنتاج).
4. **النطاق:** `https://staging.kqacademy.com`.
5. **Persistent Storage:** أضف Volume جديداً لكل من `/data/kq-documents` و`/data/bunny-uploads`.
6. **حماية الوصول:** فعّل Basic Auth من إعدادات التطبيق (أو قيّد العناوين) حتى لا تُفهرس النسخة.
7. **متغيرات البيئة** (القسم التالي)، ثم **Deploy**.

## 3. متغيرات البيئة (قيم خاصة بـStaging فقط)

| المتغير | القيمة في Staging |
| --- | --- |
| `DATABASE_URL` | Internal URL لقاعدة `kqacademy-staging-db` (Runtime فقط) |
| `NEXTAUTH_URL` | `https://staging.kqacademy.com` |
| `NEXT_PUBLIC_APP_URL` | `https://staging.kqacademy.com` (Build + Runtime) |
| `NEXTAUTH_SECRET` | سر جديد: `openssl rand -base64 48`. **لا تنسخ سر الإنتاج** |
| `JWT_SECRET`, `CRON_SECRET` | أسرار جديدة |
| `DOCUMENT_STORAGE_DIR` | `/data/kq-documents` |
| `BUNNY_UPLOAD_STATE_DIR` | `/data/bunny-uploads` |
| `BUNNY_LIBRARY_ID`, `BUNNY_API_KEY`, `BUNNY_STREAM_TOKEN_AUTH_KEY` | مكتبة Bunny **تجريبية منفصلة** إن وُجدت. بدونها يعمل كل شيء عدا تشغيل الفيديو ورفعه |
| `KQ_HIDE_CURRICULUM` | اتركه غير معرّف (المنهاج مخفي)، أو `false` لاختبار إعادة الإظهار |
| مفاتيح الدفع (Stripe وغيرها) | مفاتيح Sandbox فقط، أو اتركها فارغة (يبقى التحويل اليدوي والمحفظة) |
| مفاتيح البريد | اتركها فارغة حتى لا تُرسل رسائل حقيقية |

تحذير: إذا كان `NEXTAUTH_URL` لا يطابق النطاق الذي يفتحه المتصفح تُرفض كل عمليات الشراء
(403 «مصدر الطلب غير مصرح به»). هذا سبب عطل الدفع السابق في الإنتاج.

## 4. تهيئة قاعدة Staging

القاعدة الجديدة فارغة. من Terminal تطبيق Staging في Coolify (وليس الإنتاج):

```bash
npx prisma db push          # ينشئ الجداول من المخطط الحالي في قاعدة Staging فقط
```

ثم أنشئ حساباً من صفحة التسجيل، وارفع دوره إلى `ADMIN` من Terminal قاعدة Staging:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'بريد-حساب-الاختبار';
```

**بديل (بيانات شبيهة بالإنتاج):** استرجع نسخة احتياطية من الإنتاج داخل قاعدة Staging عبر
Coolify → Backups → Restore إلى `kqacademy-staging-db`، ثم طبّق ملفَّي SQL في
`prisma/manual-migrations/` بالترتيب. بعدها غيّر بيانات الطلاب الحساسة أو احصر الوصول،
ولا ترسل بريداً من Staging.

## 5. ما يجب اختباره على Staging قبل أي نشر

1. **الشهادة على Linux:** أكمل كورساً تجريبياً وافتح PNG وPDF: الاسم العربي ظاهر وليس مربعات،
   والحقول داخل أماكنها. (هذا لم يُختبر إلا على Windows.)
2. تسجيل حساب → إشعار الترحيب. شراء بالمحفظة وتحويل يدوي → إشعارات الطالب والإدارة.
3. تقدّم الدروس من جهازين، ثم إصدار الشهادة مرة واحدة.
4. `/verify/<رقم الشهادة>` يعرض اسماً مقنّعاً، و`/verify/<الرمز>` يعرض كل شيء.
5. البحث بالعربية والإنجليزية، الاقتراحات، الفلاتر، الهاتف.
6. `/curriculum` يحوّل إلى `/courses`، وطالب مسجّل سابقاً في كورس منهاج يدخل كورسه.
7. شريط الشعارات والـHero على الهاتف والحاسوب.

## 6. إزالة Staging

احذف تطبيق `kq-academy-staging` وقاعدته وVolumes الخاصة به فقط. لا تلمس موارد الإنتاج.
