# KQ Academy

منصة تعليم إلكتروني عربية مبنية على Next.js وReact وTypeScript، مع PostgreSQL
وPrisma وNextAuth. يدعم نظام الدروس رفع الفيديو مباشرة إلى Bunny Stream أو ربط
فيديو موجود في المكتبة المعتمدة، مع مرفقات تعليمية خاصة وتحقق من صلاحيات الطالب.

## البنية المعتمدة

- **GitHub:** إدارة الكود ومراجعة التغييرات.
- **Hostinger VPS:** الخادم الذي يستضيف التطبيق وقاعدة PostgreSQL.
- **Coolify:** بناء التطبيق وتشغيله وإدارة البيئة والتخزين الدائم.
- **Bunny Stream:** تخزين الفيديوهات ومعالجتها وتشغيلها.

يعمل التطبيق كخادم Next.js كامل باستخدام `next start`؛ يحتاج إلى واجهات API
والمصادقة والوصول إلى قاعدة البيانات، ولذلك لا يُنشر كتصدير HTML ثابت.

## التشغيل المحلي

استخدم نسخة Node.js متوافقة مع متطلبات Next.js والحزم المثبتة، ثم:

```bash
npm ci
npx prisma generate
npm run dev
```

أعدّ متغيرات البيئة محلياً من القيم المعتمدة للبيئة المقصودة. لا تُدرج ملفات
`.env` أو المفاتيح في Git. يحتاج التطبيق إلى `DATABASE_URL` لقاعدة PostgreSQL،
ومتغيرات المصادقة والتكاملات المستخدمة كما هو موضح في دليل النشر أدناه.
افتح `http://localhost:3000` بعد التشغيل.

## الفحص والبناء

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

يشغّل أمر البناء `prisma generate` ثم `next build --webpack`، دون Migration.
صفحة `/curriculum` تقرأ قاعدة البيانات أثناء توليد الصفحات؛ لذلك يتطلب البناء
الكامل قاعدة مخصصة لبيئة التحقق ويمكن الوصول إليها. لا يُعد نجاح التجميع بديلاً
عن نجاح TypeScript؛ إعداد `ignoreBuildErrors` الحالي لا يلغي أخطاء فحص الأنواع.

## النشر والتكاملات

- [دليل GitHub + Hostinger VPS + Coolify](docs/coolify-deployment.md)
- [رفع الفيديو والاستكمال الآمن](docs/bunny-upload-repair.md)
- [مصادر فيديو الدروس وتشغيلها وصلاحياتها](docs/lesson-video-sources.md)
- [مرفقات PDF والتخزين الخاص الدائم](docs/pdf-attachments-repair.md)

لا يتطلب تنظيف إعدادات الاستضافة تغيير مخطط Prisma أو تعديل بيانات الدروس.
لا تشغّل `db:push` أو أي Migration ضمن أوامر البناء أو بدء التطبيق.
