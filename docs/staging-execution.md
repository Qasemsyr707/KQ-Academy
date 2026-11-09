# تجهيز Linux وStaging دون تغيير الإنتاج

أول إجراء عملي داخل Coolify: **Dashboard → New Project → الاسم
`KQ Academy Staging` → Continue**. أنشئ داخله بيئة `staging`، وتوقف قبل ربط
المستودع أو إنشاء مورد قابل للتشغيل أو الضغط على Deploy. لا تنسخ تطبيق الإنتاج.
إنشاء المشروع التنظيمي وحده لا يشغل تطبيقاً أو قاعدة بيانات.

## الحالة المثبتة الآن

| العنصر | الحالة والدليل |
| --- | --- |
| Auto deploy للإنتاج | أكد المستخدم من Coolify القيمة **Manual deployments only**. لم نقرأ API الخدمة ولم نغير الإعداد |
| أثر هذا الخيار | يوقف النشر الناتج عن أحداث Git المعتادة؛ لا يعطّل Deploy Webhook/API الموثق أو مسار Previews وحده |
| Docker محلياً | لا Docker CLI أو Docker Desktop في PATH أو المسارات المعتادة، ولا خدمة Docker ظاهرة؛ لا Podman، وWSL غير مثبت |
| نتيجة Linux | لم ينفذ بناء Linux. لم يثبت أو يبدأ Docker/WSL أو يغير إعداد النظام |
| GitHub/Coolify المتصلان | لا اتصال أدوات متاح لقراءة إعداداتهما الخاصة. اقتراح GitHub لا يعني تثبيته أو توصيله؛ Coolify غير متاح كإضافة في البحث الحالي |
| محفزات النشر الخارجية | غير مكتمل فحصها فعلياً؛ يجب إكمال الجدول أدناه قبل السماح بأي Push |
| Git | لم تتكرر مقارنة التاريخ أو Fetch. الأساس المراجع هو e414ad6؛ تجهيزات هذا الدليل والأداة محلية وغير مرفوعة |

لا نغيّر إعداد إنتاج حتى إن ظهر محفز غير مرغوب: نتوقف عن الرفع ونسجل المورد
والإجراء المطلوب لقرار مستقل. لا تُرسل أسراراً أو عناوين Deploy Webhooks في المحادثة.

## تحقق Linux جاهز للتنفيذ لاحقاً

أضيفت صورة تحقق فقط في `ops/linux-check/Dockerfile` مع ملف
`Dockerfile.dockerignore` خاص بها. لا يوجد Dockerfile في الجذر، ولا يتغير
اختيار Nixpacks لتطبيق Coolify. **هذه الصورة تشغل اختبارات ثم تنتهي، ولا تستخدم
كصورة تشغيل تطبيق Staging أو الإنتاج.**

الصورة تعتمد Node 24.22.2 وDebian Bookworm/glibc، وتجهز OpenSSL وCA داخل
الحاوية لتوافق Prisma. الاتصال مسموح في مرحلة تنزيل الصورة والحزم العامة فقط؛
مصدر التطبيق غير منسوخ بعد أثناء تثبيت التبعيات. بعد نسخ المصدر، تعمل جميع
أوامر التحقق والبناء بـ`RUN --network=none`، فلا تستطيع الاتصال بـPostgreSQL
أو Bunny أو الإنتاج. لا DATABASE_URL أو أسرار أو ملفات env في السياق.

السياق قائمة سماح للمصدر والتكوين والاختبارات والأصول العامة؛ يستبعد .git
وnode_modules و.next و.data وdev.db والرفع الحقيقي وملفات المفاتيح وenv.
ينسخ schema.prisma فقط من Prisma، دون seed أو migration. يولد `next typegen`
تعريفات Next على Linux قبل TypeScript؛ لا تُنسخ ملفات Windows المولدة.

بعد توفر Docker **بقرار منفصل من المستخدم**، افحص أولاً أنه محرك Linux محلي.
لا تستخدم Docker context يشير إلى VPS أو endpoint من نوع ssh/tcp، ولا تغيّر
context الافتراضي للنظام. الأوامر الآتية مثال Docker Desktop؛ اختر اسم context
محلياً موجوداً إذا اختلف، بعد فحص endpoint. لم تُنفذ هذه الأوامر الآن:

```powershell
docker context ls
docker context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
docker --context desktop-linux info --format '{{.OSType}}'
docker --context desktop-linux build --pull --progress=plain -f ops/linux-check/Dockerfile -t kq-academy-linux-check:node24 .
docker --context desktop-linux run --rm --network none kq-academy-linux-check:node24
docker --context desktop-linux run --rm --network none --entrypoint npm kq-academy-linux-check:node24 run lint
```

ابدأ من جذر المشروع؛ يجب أن تكون OSType هي linux، والـendpoint محلياً مثل
npipe في Windows أو unix في Linux. لا تمرر env-file أو DATABASE_URL أو أسرار
أو منافذ منشورة أو host volumes أو Docker socket. لا تستخدم privileged أو
host networking. يمكن تنفيذ الأوامر نفسها على جهاز Linux اختبار مستقل، مع
تبديل context إلى محركه المحلي، دون استخدام خادم الإنتاج.

نجاح docker build هنا يعني اجتياز verify:runtime وtypegen والاختبارات الكاملة
وTypeScript والبناء على Linux دون شبكة. ثم docker run يختبر HTTP على loopback
داخل الحاوية فقط، بما فيه رفض SVG المتنكر وPNG ورفض الطلبات غير الموثقة
وتحويل الدرس وCSP الخاص بـBunny. لا يوجد اتصال قاعدة أو دفع أو رفع حي.

Lint منفصل ومتوقع أن يكشف المخالفات المعروفة؛ سجّل exit code ولا تعتبر نتيجة
البناء موافقة جودة كاملة. بعض أدوات الصيانة الجذرية لا تدخل سياق الصورة عمداً؛
لذلك لا تقارن إجمالي Lint فيها حرفياً بإجمالي checkout الكامل. تبقى نتائج Audit
والاختبارات السابقة في [تقرير الحزم](package-security-linux.md)، ولا تُدّعى إعادة
تشغيل Audit من حاوية بلا شبكة. عند تنفيذ الاختبار فعلياً، سجّل SHA المصدر ونسخة
Node ومعمارية Linux وimage ID والسجلات. وسم Node يثبت الإصدار لا digest الصورة؛
سجّل digest الناتج كذلك. لا يوجد معالج readlink الخاص بـWindows في الصورة.

## مراجعة محفزات النشر قبل Push

حالة حقل Auto deploy وحدها لا تثبت أن جميع سبل النشر يدوية. يُراجع الآتي
قراءة فقط من اللوحات أو اتصال GitHub مصرح به؛ لا Ping أو Redeliver أو Test Hook
أو تشغيل workflow لاختبار الحالة:

| الموقع | ما يلزم قراءته | الحالة الحالية |
| --- | --- | --- |
| Coolify Production → Advanced → Deployment | Auto deploy = Manual deployments only | مؤكد بقراءة المستخدم |
| Coolify Production → Preview Deployments | هل Previews مفعلة؟ وما حدود الفروع/الأعضاء؟ | غير مؤكد |
| Coolify والتشغيل الخارجي | مستهلكو Deploy Webhook/API، والجداول والوظائف المجدولة أو أتمتة خارجية | غير مؤكد |
| GitHub repository → Settings → Webhooks | الجهات المستقبلة والأحداث والفروع وسجل التنفيذ، دون نسخ secret أو URL خاص | غير مؤكد |
| GitHub repository → Settings → GitHub Apps | التطبيقات المثبتة التي تصل للمستودع، ومنها ربط Coolify أو Vercel القديم | غير مؤكد |
| GitHub → Actions | workflows وأحداث push/PR/workflow_run/schedule/dispatch، ونشر صورة يتبعه Coolify webhook | غير مؤكد |
| Vercel الموجود حالياً | Git repository والفروع وPreview/Deploy Hooks، دون فصل أو حذف المشروع | غير مؤكد |
| أدوات الأتمتة الأخرى | n8n/خدمات CI/registry webhooks أو مستهلكو Deploy API إن وجدت | غير مؤكد |

لا تختبر سلامة الرفع بفتح PR؛ قد يكون PR نفسه محفز Preview. إذا بقي أي ربط
مجهول أو قادر على نشر غير مقصود، تبقى خطوة Push معلقة. لا تنشر أو تعدل إعداد
الإنتاج لمعالجة ذلك ضمن هذه المرحلة. التطبيق الجديد المتصل عبر GitHub App
يكون Auto deploy مفعلاً افتراضياً؛ اضبط **Staging فقط** إلى Manual deployments
only قبل أي رفع لاحق، واترك Previews معطلة فيه.

## موارد Coolify المقترحة بعد مراجعة العزل

اسم Project وEnvironment وحدهما لا يعزلان الشبكات أو البيانات. اختر Destination
وشبكة خاصة لـStaging، والتطبيق وقاعدة اختباره فقط فيها؛ لا تضمهما إلى شبكة
موارد الإنتاج. اتصال proxy اللازم لتوجيه HTTP لا يبرر إتاحة PostgreSQL للعامة.
إذا لم يتوفر هذا العزل في الإعداد الحالي، حضّر Destination/خادم اختبار منفصلاً
بعد موافقة مستقلة، دون إعادة توصيل أو تغيير شبكة إنتاج.

| المورد | الإعداد المقترح |
| --- | --- |
| التطبيق | kqacademy-staging، مورد جديد بالكامل، الفرع fix/security-packages-linux-20261109 بعد رفعه المصرح لاحقاً، دون نسخ إعدادات الإنتاج |
| PostgreSQL | kqacademy-staging-db، قاعدة kqacademy_staging ومستخدم مستقل وسر مولد داخل Coolify، Private ودون port mapping لـ5432 |
| إصدار PostgreSQL | نفس major الإنتاج بعد قراءته من اللوحة، دون ترقية قاعدة الإنتاج أو افتراض إصدار غير معلوم |
| اتصال DB | Internal URL لمورد Staging في حاوية التشغيل فقط؛ ليس localhost ولا URL الإنتاج، ولا يظهر في Git أو السجلات |
| مستندات PDF | Volume جديد لمورد Staging إلى /data/kq-documents، مع DOCUMENT_STORAGE_DIR مطابق |
| سجلات Bunny | Volume جديد آخر إلى /data/bunny-uploads، مع BUNNY_UPLOAD_STATE_DIR مطابق |
| الصور المحلية القديمة | Volume مستقل لمجلد public/uploads الفعلي إن احتاجته الاختبارات؛ راجع Workdir قبل تحديد مسار الحاوية |
| Legacy وNext cache | لا ربط لمصادر إنتاج أو external volumes أو shared host paths؛ أي بيانات Legacy اختبارية أو cache تكون مستقلة |
| Bunny Stream | مكتبة جديدة وفيديوهات اختبار ومفاتيحها وتوقيعها وقيود نطاقها الخاصة فقط |
| النطاق | hostname مؤقت مستقل عبر HTTPS، خارج إعدادات kqacademy.com، مع تقييد الوصول ومنع الفهرسة على مورد Staging فقط |
| المصادقة | NEXTAUTH_URL وNEXT_PUBLIC_APP_URL للعنوان الاختباري، وNEXTAUTH_SECRET مستقل؛ لا Cookie Domain للأب |
| خدمات أخرى | لا مفاتيح دفع حي أو بريد إنتاج أو LiveKit إنتاج أو schedules منسوخة. إن لزم اختبارها فحسابات Sandbox مستقلة. CRON_SECRET اختبار جديد حتى مع عدم جدولة التذكيرات |

لا تنسخ بيانات طلاب أو ملفات خاصة أو روابط فيديوهات الإنتاج إلى قاعدة الاختبار.
التشغيل يتحقق من تطابق BUNNY_LIBRARY_ID، لذا روابط مكتبة الإنتاج لن تكون بيانات
اختبار صحيحة لمكتبة Staging الجديدة. لا تغير Allowed Domains أو مفتاح Token
Authentication في مكتبة الإنتاج كي يعمل الاختبار. استخدم بيانات صناعية وحسابات
Student/Instructor/Admin اختبارية. تهيئة قاعدة الاختبار خطوة مراجعة لاحقة؛ لم
ينفذ هذا التجهيز seed أو db push أو migrate.

robots وsitemap الحاليان يشيران إلى نطاق الإنتاج؛ احم Staging من الخارج ولا
تعدل منطق الإنتاج لهذا الغرض. إذا استُخدم Basic Auth عند proxy، لا تمرر ترويسة
Authorization: Basic إلى التطبيق بعد تحقق proxy، لأنها تتعارض مع التحقق من
Bearer في APIs؛ يمكن استخدام IP/access gate بدلاً منه على مورد الاختبار فقط.

## أوامر إعداد Staging، دون تنفيذ نشر الآن

- Builder: Nixpacks كما في الدليل الحالي؛ Node24 مع patch لا يقل عن24.22.2.
  NIXPACKS_NODE_VERSION=24 لا يضمن patch؛ افحص السجلات وverify:runtime.
- Install: `npm ci --include=dev --include=optional`.
- Build: `npm run build`، دون DATABASE_URL أو مفاتيح Bunny أو المصادقة.
- Start: `npm start -- --hostname 0.0.0.0 --port 3000`، وContainer Port=3000.
- NEXT_PUBLIC_APP_URL متاح للبناء والتشغيل بعنوان الاختبار فقط؛ الأسرار
  وDATABASE_URL تشغيل فقط. لا تضف pre/post-deployment commands أو Migration.
- راجع سعة CPU/RAM/disk قبل أي Build على VPS يشغّل الإنتاج. Project مختلف
  لا يعزل موارد المضيف؛ فضّل جهاز Linux/Build مستقل، ولا تفترض أن حدود حاوية
  التشغيل تحد تلقائياً استهلاك عملية البناء. لا تعدل موارد الإنتاج.

لا تضغط Deploy قبل اكتمال إعداد موارد الاختبار والعزل ومراجعة المحفزات وإذن
منفصل بالنشر اليدوي لـStaging. عند السماح به لاحقاً، اختبر PostgreSQL ومعاملات
الدفع المتزامنة، وصلاحيات الطالب، ورفع Bunny واستكماله وربط فيديو، وتعديل عنوان
الدرس، والمشبك وPDF والتقدم، ثم بقاء ملفات الاختبار بعد استبدال حاويته. تبقى
PayPal وTabby وTamara معطلة للطلبات الجديدة كما في إصلاح الأمان.

## رفع الفرع لاحقاً

هذه أوامر خطة فقط؛ **لم تنفذ**. بعد اكتمال جرد المحفزات ومراجعة تجهيزات الأداة
وحفظها في Commit محلي، سجّل SHA النهائي؛ e414ad6 يبقى أساس إصلاحات التطبيق.
أعد Fetch ومقارنة main مرة واحدة عند التنفيذ لاحقاً لا الآن، لتكتشف أي تغيير
جديد منذ الفحص المعتمد. لا حاجة حالياً إلى Merge أو Cherry-pick.

بعد إذن Push مستقل، يُرفع الفرع المحدد وحده دون main أو tags أو force:

```bash
git -c push.followTags=false push --set-upstream origin refs/heads/fix/security-packages-linux-20261109:refs/heads/fix/security-packages-linux-20261109
```

ثم اقرأ SHA على GitHub وسجل النشر في Coolify للتأكد من عدم بدء نشر تلقائي،
وحدد ذلك الفرع في مورد Staging الجديد فقط. لا تفتح PR ولا تدمج main كجزء من
هذه الخطوة. لا تستخدم Push كوسيلة لاختبار إعدادات Auto deploy.

المراجع: [مشروع Coolify جديد](https://coolify.io/docs/deploy-your-first-app)،
[Manual deployments only وحدوده](https://coolify.io/docs/applications/deployments/automatic-deployments)،
[افتراضي GitHub App](https://coolify.io/docs/applications/sources/github/auto-deploy)،
[Previews](https://coolify.io/docs/applications/deployments/preview-deployments)،
[الشبكات](https://coolify.io/docs/core/networking-in-coolify)،
[سياق Docker وقائمة الاستبعاد](https://docs.docker.com/build/building/context/)،
[RUN network none](https://docs.docker.com/reference/dockerfile/#run---network).
