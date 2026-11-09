# إصلاح عوائق البناء وتجهيز Staging

انطلق الفرع `fix/coolify-build-readiness-20261109` من Commit تنظيف الاستضافة
`6ee3206a3ed254c9317ed85c70e941b6159f0ebb` دون تعديل تاريخه. لم يتغير مخطط Prisma
أو بيانات المنصة أو إعداد الإنتاج، ولا توجد Migration مطلوبة.

## إصلاح أخطاء TypeScript

إصدار Next.js المثبت هو **16.2.9**. يجب أن تكون `params` في Route Handlers
غير متزامنة؛ عُدّلت التوقيعات في مسارات comments/like لكل من community وshorts
إلى `Promise<{ id: string }>`، مع انتظارها قبل استخدام المعرّف. كانت هذه
الأربعة ملفات أصل عشرة تشخيصات مكررة في ملفات تحقق Next المولدة.

التشخيص الحادي عشر في `/courses` سببه أن `filter(Boolean)` لا يثبت للـcompiler
إزالة القيم غير المعرفة. أصبح فلتر أسماء المدربين يستخدم type predicate فعلياً،
وتبقى القيمة `string[]` دون تحويل قسري. حُذف إعداد تجاوز أخطاء الأنواع من
`next.config.ts`؛ لم يُضف `any` أو تعليق يتجاهل فحص TypeScript.

## الاستعلامات وقت الطلب والأداء

في الإعداد الحالي، Cache Components غير مفعلة. `connection()` متاحة ومستقرة
في Next المثبت، وتوقف prerender قبل الاستعلام. يستمر استعمال `unstable_cache`
المدعوم في هذه البنية دون تفعيل نمط Cache Components الذي يتطلب مراجعة أوسع.

في `/curriculum` و`/features/shorts` و`sitemap.xml` يقع `await connection()`
قبل استدعاء الدالة المخزنة وخارج `try`. تتأجل أول قراءة PostgreSQL إلى الطلب،
وتُخزّن النتائج العامة الناجحة مدة 300 ثانية بمفاتيح مستقلة. لا توجد جلسة أو
كوكيز أو صلاحيات داخل هذا الكاش. لا يتغير استعلام المحتوى أو بيانات اللاعب.

تظل الصفحات تُصيّر على السيرفر وتعرض محتواها الأولي لمحركات البحث؛ لا تتحول
إلى صفحات تعتمد جلب المتصفح وحده. يُعاد تصيير HTML عند الطلب مع إعادة استعمال
بيانات الكاش بدلاً من استعلام جديد لكل زيارة. قد يحتاج أول طلب بعد تفريغ الكاش
إلى وقت استعلام قاعدة البيانات. تبقى قواعد Next لإعادة التحقق في الخلفية سارية.

يعالج sitemap فشل قاعدة البيانات خارج الدالة المخزنة، فلا يُحفظ fallback
فارغ كنتيجة ناجحة لمدة خمس دقائق، ويمكن للطلب التالي استعادة روابط الكورسات.
لم تتغير قواعد النشر أو صلاحيات الدروس أو تقدم الطالب أو المرفقات.

## جرد الصفحات التي تقرأ PostgreSQL

يوجد 29 ملف صفحة يقرأ Prisma، إضافةً إلى sitemap. لا يوجد `generateStaticParams`
أو `generateSitemaps` أو إعداد `force-static` في المصدر الحالي.

| المسارات | طريقة التنفيذ ومتطلب الاتصال |
| --- | --- |
| `/curriculum`, `/features/shorts`, `/sitemap.xml` | مؤجلة صراحةً بالطلب، بيانات عامة مخزنة 300 ثانية، PostgreSQL وقت التشغيل |
| `/courses` | ينتظر `searchParams` قبل الاستعلام؛ وقت الطلب. بقي سلوك استعلاماته كما هو |
| `/courses/[courseId]` وmetadata الخاصة به | ينتظر params دون توليد مسارات مسبقاً؛ PostgreSQL وقت الطلب |
| `/courses/[courseId]/learn` | يبدأ التحقق من المستخدم والصلاحيات؛ قراءة عند الطلب |
| `/features/certificates` | جلسة المستخدم قبل الاستعلام؛ لا كاش مشترك للشهادات |
| `/instructor/quizzes`, `/instructor/quizzes/create`, `/instructor/quizzes/submissions` | جلسة وصلاحيات قبل Prisma، قراءة عند الطلب |
| `/instructor/live/schedule`, `/instructor/courses/[courseId]/live/[lessonId]` | جلسة وصلاحيات قبل Prisma، قراءة عند الطلب |
| `/`, `/profile`, `/dashboard`, `/dashboard/wallet`, `/verify/[certId]` | ديناميكية صراحةً، PostgreSQL وقت التشغيل |
| `/admin`, `/admin/courses`, `/admin/users`, `/admin/payments`, `/admin/wallet`, `/admin/live`, `/admin/certificates` | ديناميكية صراحةً، مع إبقاء صلاحيات الإدارة الحالية |
| `/instructor`, `/instructor/courses`, `/instructor/wallet`, `/instructor/shorts`, `/instructor/certificates`, `/instructor/courses/[courseId]/chapters` | ديناميكية صراحةً، PostgreSQL وقت التشغيل |

تبقى مسارات API عند الطلب؛ لا تحتوي GETs على إعداد توليد ثابت صريح. يحتاج
التطبيق عند الاستخدام الحقيقي إلى PostgreSQL ومخطط البيانات الموجود. نجاح
البناء دون قاعدة بيانات لا يختبر صحة بيانات Staging أو صلاحيات اتصالها.

## إعادة التحقق على Linux

استخدم checkout نظيفاً على Linux مع إصدار Node.js مدعوم ومتوافق مع الحزم،
وبدون ملفات `.env` أو أسرار إنتاج. لا تنقل `node_modules` أو `.next` من Windows.
تأكد أن جلسة التحقق نفسها لا تحتوي بيانات اعتماد إنتاج.

```bash
npm ci --include=dev
npm test
npm run typecheck
npm run lint
env -u DATABASE_URL NEXT_TELEMETRY_DISABLED=1 npm run build
npm run typecheck
```

نفّذ الأوامر وسجّل نتائجها مستقلة؛ فشل Lint لا يُسقط وجوب إجراء فحص البناء،
ولا يعني نجاح البناء نجاح Lint. يحتوي `npm run build` على توليد Prisma Client
المتوافق مع Linux والتحقق الصارم من الأنواع وتجميع وتوليد صفحات Next بالكامل.
لا يحتاج البناء الحالي إلى قاعدة اختبار أو إلى `DATABASE_URL` وهمي.

في Coolify، أبقِ أوامر [دليل النشر](coolify-deployment.md): تثبيت مع أدوات البناء،
ثم `npm run build`، وتشغيل `next start` على `0.0.0.0:3000`. لا تضف db:push
أو Migration أو seed إلى مراحل البناء والتشغيل. تتولى Prisma اتصالات PostgreSQL
عند الطلب من حاوية التشغيل، لا من عامل بناء Docker.

قبل تشغيل Staging، راجع في Coolify:

- قاعدة PostgreSQL مستقلة وقيم مصادقة ونطاق خاصة بـStaging؛ لا تستخدم قاعدة الإنتاج.
- `DATABASE_URL` وأسرار الخدمات في نطاق التشغيل فقط، و`NEXT_PUBLIC_*` اللازمة وقت البناء.
- صلاحية الكتابة في Next Data Cache، مع فصل الكاش عن الإنتاج.
- Volumes خاصة ودائمة ومنفصلة للمستندات وسجلات Bunny؛ احتفظ بمرفقات الصور القديمة.
- إعدادات Bunny الحالية دون تغيير مفاتيح مكتبة الإنتاج أو تفعيل حماية جديدة عليها؛
  أي اختبار رفع حي يكون في مكتبة اختبار مخصصة.

اختبر على Staging تسجيل الدخول، محتوى الكورسات والمنهاج وShorts وsitemap، ثم
مشاهدة درس بحساب مصرح ورفض حساب غير مصرح، ورفع فيديو واستكماله وربط فيديو قائم
وفتح PDF وتنزيله وبقاء الملفات بعد استبدال الحاوية. لا يكفي رد HTTP ناجح لصفحة
تعرض fallback لإثبات اتصال قاعدة البيانات.

## نتائج التحقق

أُجري التحقق المحلي بتاريخ **2026-11-09** على Windows مع Node.js **20.19.4**
وNext.js **16.2.9**، دون ملفات بيئة محملة تلقائياً أو `DATABASE_URL` في عملية
البناء. لم تُستخدم قاعدة بيانات حقيقية أو بيانات اعتماد إنتاج.

| الأمر أو الفحص | النتيجة |
| --- | --- |
| `npm test` | Exit 0؛ **217 ناجحة**، دون فشل أو تخطي، منها 15 حالة جديدة |
| `npm run typecheck` | Exit 0؛ قبل البناء وبعد إعادة توليد أنواع Next، **صفر أخطاء** |
| `npm run lint -- --format json --output-file ...` | Exit 1؛ **368 خطأ و277 تحذيراً** من المخالفات القائمة |
| مقارنة Lint للملفات المعدلة مع 6ee3206 | لا تشخيصات جديدة؛ الاختباران الجديدان بلا أخطاء أو تحذيرات |
| `npm run build` | Exit 0؛ توليد Prisma وتجميع Webpack وفحص TypeScript وتوليد الصفحات **134/134** وجمع ملفات التشغيل |
| `npm start -- --hostname 127.0.0.1 --port 3109` | بدأ الخادم محلياً؛ أُوقف بعد فحص الاستجابات |
| فحص HTTP محلي للنسخة المبنية | `/login` و`/robots.txt`: 200؛ POST غير مصرح إلى `/api/bunny/create-video`: 401 مع `private, no-store` |
| فحص manifest الناتج | المسارات الثلاثة المؤجلة ليست صفحات مولدة مسبقاً، ويعرضها ملخص البناء كمسارات ديناميكية |
| فحص حالة أحرف مسارات الاستيراد | **363** استيراداً محلياً مطابقاً لأسماء ملفات Git، دون اختلافات قد تعطل Linux |
| `git diff --check` | ناجح |

يبقى ضمن Lint خطأ التحليل السابق في `update_schema.js` وبقية مخالفات الملفات
القائمة. لم تُعطّل قواعده أو تُخفَ نتيجته، ولا يشغّله أمر `next build` تلقائياً.
إذا فُرضت بوابة Lint مستقلة، تبقى هذه المخالفات عائقاً لها رغم نجاح البناء.

بيئة Windows هذه تعيد errno غير صحيح من `readlink` على الملفات العادية.
أُجري البناء باستخدام المعالجة المؤقتة السابقة التي تطبّع هذا errno فقط،
داخل `node_modules/.cache/` المتجاهل في Git؛ ليست جزءاً من كود التطبيق أو أوامر
Coolify ولا تتجاوز فحص الأنواع أو استعلامات Prisma. ظهر أثناء prerender تحذير
`Local storage is not available.` ولم يمنع إكمال البناء بخروج 0. أظهر فحص
التشغيل تحذير NextAuth المتوقع لغياب عنوان البيئة المحلية؛ لم يتضمن الفحص
تسجيل دخول بحساب حقيقي.

**لم يُنفذ بناء Linux فعلي أو تشغيل Staging.** لا يوجد في جهاز التحقق Docker
أو Podman، ويرجع `wsl --list --quiet` و`wsl --status` بخروج 1 لأن WSL غير مثبت.
وجود `wsl.exe` وحده لا يوفر Linux. لم تُثبت أدوات نظام أو تُغيّر إعداداته.
لا يجوز اعتبار نجاح بناء Windows أو فحص أحرف الاستيراد إثباتاً لتوافق صورة Linux.

الاختبارات الجديدة تستخدم محاكاة طلبات Prisma والجلسات وconnection ونتائج
الكاش؛ لا تثبت انتهاء TTL في كاش Next الحقيقي أو تشغيل فيديو حي. يبقى بناء
Linux كامل واختبارات PostgreSQL والخدمات والتخزين على Staging شروط اعتماد
الإصدار قبل الإنتاج. لا تحتاج هذه الإصلاحات Migration ولا تغيير مفاتيح البيئة.

سجلات الفحوصات المحلية في `node_modules/.cache/kq-build-readiness/`، والمعالجة
المؤقتة السابقة في `node_modules/.cache/kq-hosting-cleanup/fs-readlink.cjs`؛
لا تُدرج هذه الملفات ضمن Commit الإصلاحات.

## الملفات المعدلة

- `next.config.ts`: إعادة التحقق الصارم من الأنواع أثناء البناء.
- `src/app/api/community/[id]/comments/route.ts`
- `src/app/api/community/[id]/like/route.ts`
- `src/app/api/shorts/[id]/comments/route.ts`
- `src/app/api/shorts/[id]/like/route.ts`: تصحيح params غير المتزامنة في المسارات الأربعة.
- `src/app/courses/page.tsx`: تضييق أسماء المدربين دون تحويل قسري.
- `src/app/curriculum/page.tsx`
- `src/app/features/shorts/page.tsx`
- `src/app/sitemap.ts`: تأجيل الاستعلامات الثلاثة مع كاش النتائج العامة.
- `tests/load-ts.cjs`: دعم JSX لاختبار صفحات السيرفر.
- `tests/social-route-params.test.cjs`: سلوك معرّفات المسارات والجلسات والمدخلات.
- `tests/request-time-catalogue.test.cjs`: تأجيل الاستعلامات والكاش وتعافي sitemap.
- `README.md`, `docs/coolify-deployment.md`, `docs/staging-build-readiness.md`: تحديث التعليمات والنتائج.
