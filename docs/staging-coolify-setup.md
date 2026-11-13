# إنشاء بيئة Staging مستقلة على Coolify

الهدف: نسخة تجريبية من KQ Academy على الخادم نفسه (Hostinger VPS + Coolify) لا تشارك
الإنتاج أي قاعدة بيانات أو ملفات أو أسرار، ولا ترسل أي بريد أو إشعار لطلاب حقيقيين.
لا يُنفَّذ أي من هذه الخطوات على تطبيق الإنتاج أو قاعدة بياناته.

## 1. مصدر الكود: مستودع خاص منفصل

المستودع الرئيسي عام، لذلك لا يُرفع فرع المراجعة إليه قبل الموافقة.

1. في GitHub أنشئ مستودعاً جديداً **Private** باسم مثل `kq-academy-staging`، دون README أو
   .gitignore أو License (فارغ تماماً).
2. يُضاف كـremote ثانٍ باسم `staging` في نسخة العمل المحلية، دون تغيير `origin`، ثم يُرفع إليه
   فرع المراجعة وحده:
   ```bash
   git remote add staging https://github.com/<الحساب>/kq-academy-staging.git
   git push staging audit/phase1-notifications-certificates-20261113:main
   ```
3. امنح Coolify صلاحية قراءة المستودع الخاص بإحدى طريقتين:
   - **GitHub App:** Coolify → Sources → تطبيق GitHub المستخدم → Configure → أضف المستودع
     الجديد إلى قائمة المستودعات المسموح بها.
   - **Deploy Key:** Coolify → Keys & Tokens → Private Keys → أنشئ مفتاحاً، ثم أضف المفتاح العام
     في GitHub → المستودع → Settings → Deploy keys (قراءة فقط).

## 2. الموارد في Coolify

| المورد | الاسم المقترح | ملاحظات |
| --- | --- | --- |
| قاعدة PostgreSQL | `kq-staging-db` | قاعدة جديدة فارغة، الإصدار 17 مثل الإنتاج. دون Public Port |
| التطبيق | `kq-academy-staging` | من المستودع الخاص، الفرع `main`، Build Pack: **Dockerfile**، المنفذ `3000` |
| النطاق | `https://staging.kqacademy.com` | سجل DNS من نوع A إلى عنوان الخادم نفسه، وHTTPS من Coolify |
| تخزين دائم | Volume جديد لـ`/data/kq-documents` وآخر لـ`/data/bunny-uploads` | Volumes خاصة بـStaging، وليست Volumes الإنتاج |

إعدادات التطبيق: **Auto Deploy = Off**، **Preview Deployments = Off**، وفعّل **Basic Auth**
(أو حصر الوصول) حتى لا تُفهرس النسخة ولا يصل إليها العموم.

## 3. متغيرات البيئة (قيم خاصة بـStaging فقط)

| المتغير | القيمة | النطاق |
| --- | --- | --- |
| `DATABASE_URL` | Internal URL لقاعدة `kq-staging-db` | Runtime |
| `NEXTAUTH_URL` | `https://staging.kqacademy.com` | Runtime |
| `NEXT_PUBLIC_APP_URL` | `https://staging.kqacademy.com` | Build + Runtime |
| `NEXTAUTH_SECRET` | سر جديد (`openssl rand -base64 48`). **لا تنسخ سر الإنتاج** | Runtime |
| `JWT_SECRET` | سر جديد | Runtime |
| `DOCUMENT_STORAGE_DIR` | `/data/kq-documents` | Runtime |
| `BUNNY_UPLOAD_STATE_DIR` | `/data/bunny-uploads` | Runtime |
| `KQ_STAGING` | `true` (يسمح بتشغيل سكربت البيانات التجريبية فقط) | Runtime |
| `KQ_STAGING_SEED_PASSWORD` | كلمة مرور لحسابات الاختبار (12 حرفاً على الأقل) | Runtime |

**لا تُضف في Staging:** `RESEND_API_KEY` و`RESEND_FROM_EMAIL` (فلا يُرسل أي بريد)،
`CRON_SECRET` (فلا تعمل مهمة التذكيرات)، ومفاتيح الدفع الحقيقية (Stripe وغيرها). يبقى التحويل
اليدوي والمحفظة للاختبار. مفاتيح Bunny: مكتبة تجريبية منفصلة إن وُجدت، وإلا اتركها فارغة (يعمل
كل شيء عدا تشغيل الفيديو ورفعه).

تحذير: إذا لم يطابق `NEXTAUTH_URL` النطاق الذي يفتحه المتصفح تُرفض كل عمليات الشراء
(403 «مصدر الطلب غير مصرح به»). هذا كان سبب عطل الدفع السابق في الإنتاج.

## 4. تهيئة القاعدة والبيانات التجريبية

بعد أول Deploy، من **Terminal تطبيق Staging** (وليس الإنتاج):

```bash
npx prisma db push --skip-generate     # ينشئ الجداول في قاعدة Staging الفارغة
node scripts/staging-seed.cjs          # حسابات وكورسات تجريبية وشهادة بالصيغة القديمة
```

يرفض السكربت العمل ما لم يكن `KQ_STAGING=true`، وإذا كان عنوان الموقع هو نطاق الإنتاج، أو إذا
كانت القاعدة تحتوي 25 حساباً أو أكثر. الحسابات على نطاق `kq-staging.invalid` الذي لا يستقبل بريداً.

**لا تسترجع نسخة احتياطية من الإنتاج في Staging.** تحتوي بيانات وبريد طلاب حقيقيين، ولا حاجة
لها في هذه المرحلة.

## 5. ما يُختبر على Staging قبل أي نشر

1. **الشهادات على Linux:** إصدار شهادة باسم عربي وأخرى بإنجليزي، صحة الخط والمحاذاة، تنزيل
   PNG وPDF، رمز QR يقود إلى صفحة التحقق، التحقق بالرمز العشوائي، رفض الوصول لغير المصرح،
   منع الإصدار قبل الإتمام، عدم التكرار، وعرض الشهادة القديمة `KQ2025-0001` ببياناتها الأصلية.
2. التسجيل والدخول، والإشعارات (ترحيب، دفع يدوي، موافقة إدارية).
3. الشراء بالمحفظة والتحويل اليدوي، والوصول إلى الكورس بعده.
4. تقدّم الدروس من جهازين وإصدار الشهادة مرة واحدة.
5. البحث بالعربية والإنجليزية، الاقتراحات، الفلاتر، على الهاتف والحاسوب.
6. `/curriculum` يحوّل إلى `/courses`، والطالب A يدخل كورس المنهاج الذي سُجّل فيه سابقاً.
7. شريط الشعارات والـHero ولوحات الإدارة والمدرّب.
8. حدود الطلبات: البحث والتحقق يعملان طبيعياً ويُرفض الإفراط فقط.

## 6. إزالة Staging

احذف تطبيق `kq-academy-staging` وقاعدته وVolumes الخاصة به والمستودع الخاص فقط.
لا تلمس موارد الإنتاج.
