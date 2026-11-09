# تحديث الحزم الأمنية وتجهيز Linux

بدأ الفرع `fix/security-packages-linux-20261109` من Commit الأمان المعتمد
`4eb778c`، مع حالة Git نظيفة، دون إعادة كتابة التاريخ. لم تُعدّل ملفات src
أو Next config أو مخطط Prisma أو إعدادات الإنتاج أو الأسرار. بقيت إصلاحات
الدفع والصلاحيات وروابط Bunny ورفع الفيديوهات وPDF والمشبك كما هي.

## الإصدارات القديمة والجديدة

| الحزمة/الأداة | قبل | بعد |
| --- | --- | --- |
| Next.js وeslint-config-next | 16.2.9 | 16.4.5 |
| React وReactDOM | 19.2.4 | 19.2.9 |
| Sharp بالجذر | 0.35.4 | 0.35.5 |
| Sharp الذي يحله image-optimizer في Next | 0.34.5 متداخل | 0.35.5 من الجذر، دون النسخة القديمة |
| next-auth | 4.24.14 | 4.24.15، دون انتقال إلى Auth.js 5 |
| Node المستخدم للتحقق | 20.19.4 | 24.22.2 LTS، نسخة مؤقتة لا تغيّر تثبيت النظام |
| npm المستخدم للتحقق | 10.8.2 | 11.19.1 المرفق مع Node 24 |
| @types/node | 20.19.43 | 24.19.2 |
| Prisma و@prisma/client | 5.22.0 | 5.22.0 |
| postcss | 8.4.31 | 8.5.23، تبعية Next المصحح |
| nanoid وsource-map-js | 3.3.12 و1.2.1 | 3.3.20 و1.2.2 |
| uuid، تبعية next-auth | 8.3.2 | 11.1.1 |
| baseline-browser-mapping | 2.10.38 | 2.11.35 |
| brace-expansion | 1.1.15 و5.0.6 | 1.1.21 و5.0.12 |
| browserslist | 4.28.2 | 4.29.5 |
| js-yaml | 4.2.0 | 4.3.2 |
| zod | 4.4.3 | 4.6.7 |

حدّث npm أيضاً تبعيات المنصات الأصلية لـSWC وSharp ومكتبات توافق المتصفحات
والـresolver والتعريفات اللازمة لهذه الشجرة. أزيلت النسخة القديمة المتداخلة
من Sharp وتبعياتها. بقيت الحزم المباشرة الأخرى، ومنها Prisma وLiveKit وStripe
وtus، دون ترقية. عُدّل lockfile بواسطة npm، دون تعديل يدوي لشجرة التبعيات
أو override عام أو `npm audit fix --force`.

فُحصت نسخ Next وReact وReactDOM وSharp في الشجرة المثبتة وفي lockfile، مع
حل Sharp من `createRequire(require.resolve('next/dist/server/image-optimizer'))`.
النسخ الأساسية المثبتة واحدة لكل حزمة. يحتفظ Next بنسخ React/RSC المضمنة
التي يديرها؛ React وReactDOM المضمنان يعلنان
`19.3.0-canary-278794d7-20261002`، والتجريبي
`19.3.0-experimental-278794d7-20261002`. هذه أجزاء Next الداخلية، ولا تُستبدل
يدوياً بحزم React المستقلة أو تحذف بسبب اسم جهة تطوير Next.

## نتيجة التنبيه والأثر

يحدد [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
الإصلاح في Next 16.4.1، أو Sharp الذي يستخدمه Next فعلياً ابتداءً من 0.35.5.
تحققت شروط الإصدارات هنا بـNext 16.4.5 وSharp 0.35.5، ولا يوجد Sharp أقدم
في lockfile أو في مسار حل مشغل الصور. اختير 16.4.5 لأنه يتضمن أيضاً إصلاحات
أحدث للاستضافة الذاتية، ومنها تجاوز رفض SVG؛ لم يقتصر التحديث على أول نسخة
تغلق التنبيه السابق. [إصدار Next المصحح](https://github.com/vercel/next.js/releases/tag/v16.4.5).

نجح تشغيل Sharp الأصلي على Node 24 في Windows بقراءة PNG وتغيير الحجم
والتحويل إلى JPEG. لا يثبت ذلك تشغيل مكتبات Linux الأصلية؛ يُعاد الفحص على
صورة Linux نفسها قبل اعتماد Staging. لم تُنفذ محاولة استغلال للثغرة.

أُضيف فحص إنتاج محلي لرفض SVG العادي وSVG سليم محتواه متنكر بامتداد PNG،
مع التأكد من استمرار تحسين PNG. كما يعيد التحقق من رفض الطلبات غير الموثقة
ومن تحويل الزائر غير المسجل إلى الدخول مع استمرار CSP الخاص بـBunny.

## تصنيف npm audit

| المرحلة | حرج | مرتفع | متوسط | الإجمالي/الخروج |
| --- | --- | --- | --- | --- |
| قبل | 2 | 8 | 10 | 20 حزمة متأثرة، exit 1 |
| بعد تحديث Next/React/Sharp/auth/config | 0 | 4 | 9 | 13، exit 1 |
| بعد ترقيات التبعيات المحدودة | 0 | 0 | 8 | 8، exit 1 |
| التشغيل فقط `npm audit --omit=dev` | 0 | 0 | 0 | صفر، exit 0 |

هذه أعداد الحزم المتأثرة، وليست عدداً من الثغرات المستقلة؛ ينتشر التنبيه نفسه
عبر سلسلة التبعيات. تم تشغيل Audit عبر السجل فعلياً بعد تجاوز منع الشبكة في
بيئة الفحص. الفشل الأول في الاتصال لم يُعتبر تقريراً نظيفاً.

- Next/Sharp: خطر مباشر على معالجة الصور في Linux/glibc؛ عولج. بعض تنبيهات
  Next الأخرى تخص Edge أو use cache أو next/og أو Windows؛ لا تظهر هذه
  الميزات في الاستعمال الحالي، لكن الترقية نفسها تعالج التنبيهات المعلنة.
- next-auth: تنبيهات البريد وOAuth أقل انطباقاً على CredentialsProvider
  الحالي، لكن التحقق من Bearer وتبعيات المصادقة يستحقان patch. بقيت آلية
  الجلسة والأدوار كما هي، واجتازت اختبارات الدخول والتوقيع والصلاحيات.
- PostCSS وnanoid وsource-map-js وأدوات المتصفحات والتحليل: أثرها الأساسي
  على البناء وLint، دون API ظاهر يمرر لها مدخلات HTTP. أزيلت تنبيهاتها
  العالية والمتوسطة القابلة للإصلاح ضمن النطاقات الحالية.
- المتبقي: minimatch 10.2.5 وسلسلة typescript-eslint وeslint-config-next،
  **أدوات تطوير فقط**. [التنبيه](https://github.com/advisories/GHSA-g3hv-75wg-m249)
  يخص استعمال optimizationLevel بمستوى 2 أو أعلى؛ الاستدعاء الحالي من
  typescript-estree يمرر dot:true دون هذا الخيار. لا يستعمله التطبيق لمعالجة
  HTTP. لم يُخفَ التحذير أو يُعتبر مصححاً. حتى typescript-eslint 8.72.1
  الرسمي يطلب minimatch 10؛ لم تُضف ترقية غير مفيدة أو override رئيسي غير
  مختبر، ولم يُقبل اقتراح Audit بخفض eslint-config-next إلى 15.

## Node وPrisma والبناء

`.nvmrc` تختار 24.22.2؛ `engines.node` يقبل `^24.22.2 || ^22.23.4`.
الفرع يفضل 24، و22 بديل مدعوم عند ظهور مشكلة مثبتة في Linux. لم يلزم استخدامه
في الفحص الحالي. يبدأ `npm run build` بفحص الإصدارات قبل توليد Prisma والبناء.
لا تُقبل Node 20 أو نسخة patch دون الحدود المحددة، ولا تستعمل نسخة Node 25
أو 26 لمجرد أن الحد الأدنى التقني لـNext يقبلها.

استُخدمت نسخة Node الرسمية المؤقتة بعد مطابقة SHA256 المنشور:
`ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2`.
لم يتغير Node المثبت للنظام أو PATH الدائم.
[المصدر](https://nodejs.org/en/blog/release/v24.22.2).

نجح `prisma --version` و`prisma generate` وتحميل محرك Query Engine الأصلي
على Windows/Node 24 دون DATABASE_URL. لم يحصل اتصال PostgreSQL أو استعلام
أو Migration. متطلبات Prisma 5 تسمح تعريفياً بهذا Node، لكنها لا تعادل ضمان
اختبار رسمي لكل إصدار أحدث؛ يجب اختبار المعاملات والمحرك على Linux وStaging.
[متطلبات Prisma 5](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v5).

## Linux وCoolify وStaging

لا يوجد Docker أو Podman، وWSL غير مثبت محلياً. **لم يُنفذ بناء Linux**.
نتائج Windows لا تحل محله. لا يوجد اعتماد تشغيلي على Vercel؛ تبقى البنية
GitHub وHostinger VPS وCoolify وPostgreSQL وBunny.

1. راجع أي نشر تلقائي أو GitHub App أو hook قبل السماح بأي Push لاحق.
   لم تُغيّر هذه المرحلة شيئاً في تلك الخدمات.
2. استخدم checkout نظيفاً على Linux/glibc مع Node 24.22.2 أو patch أحدث
   من 24، دون ملفات env أو بيانات اعتماد إنتاج. لا تنقل node_modules أو
   .next من Windows. حاوية تحقق مستقلة من عائلة Debian/Bookworm مناسبة
   عند توفر Docker لاحقاً؛ ليست موافقة على تشغيلها في الإنتاج.
3. نفذ الأوامر التالية، دون DATABASE_URL طوال بناء التطبيق:

```bash
node --version
npm --version
env -u DATABASE_URL npm ci --include=dev --include=optional
npm run verify:runtime
npm test
npm run typecheck
npm run lint
npm audit --json
npm audit --omit=dev --json
env -u DATABASE_URL NEXT_TELEMETRY_DISABLED=1 npm run build
npm run test:production
```

يجب تسجيل فشل Lint وAudit الكامل كما هو، وفصل المخالفات المعروفة عن أي
تشخيص جديد. فحص إنتاج الاختبار يشغل next start على loopback مؤقت فقط،
ويزيل DATABASE_URL ومفاتيح الدفع من عملية السيرفر، ويزيل ملف SVG الاختباري
الخاص به عند الانتهاء. لا يختبر دفعاً حقيقياً أو اتصالاً بقاعدة البيانات.

4. في تطبيق Coolify المستقل لـStaging: `NIXPACKS_NODE_VERSION=24` مع فحص
   patch الفعلي؛ الأمر Install هو `npm ci --include=dev --include=optional`،
   وBuild هو `npm run build`، وStart هو
   `npm start -- --hostname 0.0.0.0 --port 3000` والمنفذ 3000. اختيار major
   في Nixpacks لا يضمن patch؛ إذا كان archive ينتج نسخة أقدم، راجع صورة
   البناء أو اختيار builder قبل المتابعة، ولا تتجاوز verify:runtime.
5. استخدم قاعدة PostgreSQL وحسابات Sandbox ومكتبة Bunny وvolumes ودومين
   مستقلة. اضبط أسرار التشغيل هناك فقط بعد مراجعتها، ولا تمنح DATABASE_URL
   نطاق البناء. احتفظ بمسارات PDF وسجلات الرفع الدائمة حسب دليل Coolify.
6. اختبر معاملات الدفع المتزامنة وSSI والموافقة وإعادة webhook مع قاعدة
   الاختبار الحقيقية، ثم الطالب المسجل وغير المسجل والمحظور، البث، الرفع
   والاستكمال وربط الفيديو وتعديل عنوان الدرس وPDF والمشبك وتقدم الطالب.
7. تبقى PayPal وTabby وTamara معطلة للطلبات الجديدة للأسباب الموثقة في
   [تقرير الأمان](security-hardening.md). لا يعيد تحديث الحزم أو وجود المفاتيح
   تفعيلها. لا تستأنفها قبل اكتمال التحصيل أو تسعير العملة واختبارهما.

## النتائج والملفات

| الفحص | النتيجة |
| --- | --- |
| `npm run verify:runtime` على Node 24.22.2 | نجح؛ Next16.4.5 وSharp0.35.5 من مسار image-optimizer الفعلي |
| الاختبارات المخصصة للأمان والدفع وBunny والمرفقات | 298/298 ناجحة |
| `npm test` | 321/321 ناجحة، صفر فشل أو تخطٍ |
| `npm run typecheck` | نجح، exit 0، دون تجاهل أخطاء الأنواع |
| `npm run lint` بصيغة JSON | exit 1؛ 333 خطأ قديماً و257 تحذيراً، منها 3 تحذيرات جديدة لقاعدة التنقل الداخلي من Next المحدث. ملفات الفحص والاختبار الجديدة دون تشخيصات |
| `prisma --version`, `prisma generate`, تحميل محرك Node-API | نجحت على Windows/Node24 دون DATABASE_URL، دون اتصال أو Migration |
| `npm ci --ignore-scripts --include=dev --no-audit --no-fund` في مجلد معزول | نجح، 621 حزمة؛ lockfile مطابق بالـSHA256، وفحص الإصدارات وتحويل صورة Sharp من التثبيت الجديد نجحا. توليد Prisma اختُبر صراحة في المشروع بدلاً من سكربتات هذا التثبيت المعزول |
| البناء القياسي على Windows دون معالج | فشل، exit 1، EISDIR/readlink على src/app/icon.png؛ فحص lstat يؤكد أنه ملف عادي وليس symlink |
| البناء بمعالج Windows المؤقت | نجح، exit 0، compilation وTypeScript وتوليد 134/134 صفحة دون DATABASE_URL أو ملف env |
| `npm run test:production` بعد البناء | نجحت 12 حالة HTTP دون معالج readlink: 8 رفض طلبات غير موثقة، رفض SVG العادي والمتنكر بـ400، تحسين PNG بـ200، وتحويل الدرس للزائر بـ307 مع CSP المقيد لـBunny |
| manifest البناء | curriculum وfeatures/shorts وsitemap ليست صفحات مولدة مسبقاً؛ ما زالت قراءة PostgreSQL عند الطلب |
| `npm audit` | exit 1؛ 8 متوسطة من سلسلة أدوات التطوير المذكورة، صفر حرج أو مرتفع |
| `npm audit --omit=dev` | نجح، exit 0، صفر تنبيهات |
| مقارنة src وprisma وnext.config.ts مع4eb778c | لا فرق |

المعالج المؤقت موجود في الكاش المتجاهل فقط؛ يصحح رمز readlink غير الصحيح
لملف غير رمزي في بيئة Windows المحلية، ولا يعطل فحوص TypeScript أو أخطاء
البناء. استُخدم أيضاً TEMP/TMP داخل الكاش. لم يدخل المعالج أو runtime المحمول
أو ملفات الفحص المؤقتة أو NODE_OPTIONS في Git أو إعداد Coolify. لا يُستخدم
ذلك المعالج في Linux. ظهر تحذير Local storage is not available أثناء prerender،
دون فشل البناء المكتمل.

النتيجة: تحقق شرط إصدارات إصلاح GHSA المطلوب، وحزم التشغيل نظيفة من تنبيهات
Audit وقت الفحص. الفرع مهيأ للتحقق على Linux وStaging، مع بقاء ذلك التحقق
واختبارات الخدمات الحقيقية وقرار التعامل مع تنبيه أدوات التطوير وLint مطلوباً
قبل اعتماد الإنتاج. لم تُختبر بوابات دفع حقيقية أو مكتبة Bunny أو PostgreSQL
حقيقية في هذه المرحلة، ولا يُدعى نجاحها من اختبارات المحاكاة.

الملفات: package.json وpackage-lock.json و.nvmrc، وscripts/verify-runtime.cjs
وscripts/check-production.cjs، وtests/dependency-security.test.cjs، وهذا التقرير
وتحديث دليل Coolify وتوضيح التقرير الأمني السابق.

لا توجد Migration أو تغييرات وظيفية مقصودة في المنصة. الرفض الآمن لصيغ SVG
في مشغل الصور قد يمنع حالات كانت تتجاوز الحماية سابقاً. أضاف eslint-config-next
ثلاثة تحذيرات لأساليب تنقل داخلي موجودة مسبقاً في checkout وصفحة المشاهدة؛
لم تُعدل تلك الصفحات أو تُخفَ التحذيرات. بقيت أخطاء Lint الـ333 القديمة.
