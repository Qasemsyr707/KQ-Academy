# إصلاح مسارات الأمان قبل Staging

الفرع `fix/security-payment-access-20261109` انطلق من `f72a7ed` دون تعديل
تاريخ الفروع السابقة. اقتصر التنفيذ على نسخة `kqacademy-pdf-attachments`.
لم يحصل Push أو Merge أو Deploy أو اتصال بقاعدة بيانات أو Migration.
لم تُعدّل أسرار البيئة أو إعدادات الإنتاج أو مخطط Prisma أو package-lock.

## التغييرات المنفذة

| المجال | السلوك الجديد |
| --- | --- |
| checkout للموبايل والويب | جلسة موثقة أو Bearer HS256، مع تحديث هوية الحساب والحظر والدور من PostgreSQL. تجاهل userId والمبلغ والحالة ومعرّف العملية المرسلة من العميل كمصدر لإثبات الدفع |
| المبلغ والعملة | السعر والكوبون من السيرفر، وسياق موثق يربط الدفعة بالمشتري والكورس والعملة والمبلغ بوحدات صحيحة صغيرة |
| منع تكرار الطلب | حجز Payment PENDING بمعرّف مشتق من المستخدم ومفتاح الطلب قبل الاتصال بالمزود. إعادة الطلب نفسه تعيد الرابط المحفوظ، ولا تنشئ عملية جديدة لدى المزود |
| إثبات الدفع | توثيق مصدر webhook أولاً ثم جلب العملية من API المزود ومطابقة المبلغ والعملة والمرجع والهوية والحالة المحصّلة، بدلاً من الاعتماد على redirect أو status في الطلب |
| تنفيذ التسجيل | انتقال مشروط PENDING إلى APPROVED مع Enrollment في معاملة Serializable واحدة؛ إعادة الإشعار لا تكرر العملية، وupsert لا يغيّر تقدم الطالب |
| التحويل اليدوي | إيصال وطلب قيد المراجعة فقط. لا ينشئ إيداع محفظة موازياً يمنح فائدة مالية ثانية. الموافقة الإدارية تقرأ هوية المشتري والكورس والعملة من الدفعة نفسها |
| المحفظة والاشتراكات | خصم مشروط بوجود رصيد كافٍ داخل المعاملة، منع تكرار شراء الكورس والحزمة والاشتراك النشط، حماية تحويل النقاط والموافقة والإرجاع من التكرار |
| LiveKit | توحيد مسارات إصدار التوكن الثلاثة، غرفة موجودة في قاعدة البيانات وصلاحية فعلية، هوية الحساب من السيرفر وتوكن 15 دقيقة. الطالب يشاهد ولا ينشر في بث الكورس؛ غرف الدراسة القائمة تعاونية بالصوت للمستخدمين الموثقين |
| إنشاء كورس من الموبايل | INSTRUCTOR أو ADMIN أو OWNER فقط، وملكية الكورس للحساب الموثق؛ التحقق من العنوان والنوع والسعر والصورة |
| إعدادات الإدارة | GET وPOST محميان بالدور الحالي؛ GET لا يكتب قيماً افتراضية في القاعدة. checkout/info يعرض ستة مفاتيح تشغيل معلنة فقط، مع فرض التعطيل في السيرفر |
| JSON-LD | تسلسل آمن يستبدل `<` وU+2028/U+2029، مع اختبار حقن إغلاق script من حقول الكورس وصفحة SSR الفعلية |
| المصادقة | إزالة fallback الثابت من NextAuth ومسارات حسابات الموبايل المعنية؛ غياب NEXTAUTH_SECRET يمنع إصدار الاعتماد. إزالة ترقية المستخدم تلقائياً بحسب عنوان البريد؛ كذلك يقرأ RBAC المستخدم والدور والحظر من القاعدة ولا يمنح صلاحيات المالك بالبريد، مع إبقاء أدوار قاعدة البيانات الحالية |
| طلبات Cookie المعدّلة | JSON فقط والتحقق من Origin عند وجوده؛ لا يغيّر ذلك طلبات Bearer الموثقة أو طلبات القراءة |

لا يوجد تعديل على نظام التقدم أو ترتيب الدروس أو مخطط قاعدة البيانات أو
رفع Bunny أو روابط الفيديو أو توقيع المشغل أو مخزن PDF. التغيير في صفحة الكورس
وlayout يخص JSON-LD فقط. لم تُحذف ملفات أو فيديوهات أو تسجيلات قديمة.

## عقد طلب الشراء

يرسل العميل `operationId` أو ترويسة `Idempotency-Key` بطول 16–128 من حروف
وأرقام وشرطة أو شرطة سفلية، ويحتفظ **بنفس القيمة والبيانات عند إعادة المحاولة**.
الواجهة المحدثة تستخدم UUID وتمنع الإرسال المتزامن. يلزم تحديث تطبيق الموبايل
ليلتزم بهذا العقد؛ الطلب القديم بلا مفتاح يرجع 400 بدلاً من إنشاء دفعة جديدة.

- `/api/checkout/gateway` و`/api/checkout`: `courseId`, `provider`,
  `operationId`, واختيارياً `couponCode`؛ `receiptImage` مطلوب عند MANUAL.
  تُقبل صورة FileReader الحالية بصيغ PNG/JPEG/WebP/GIF وبحد 2 MiB، أو مرجع
  ملف المنصة المعتمد. لا تُقبل HTML أو SVG ولا تُعتبر الصورة إثبات دفع تلقائياً.
- `/api/mobile/checkout`: الحقول نفسها مع `paymentType: online | local`؛
  الدفع المحلي MANUAL بعملة SYP، والإلكتروني يستخدم USD.
- لا تُقبل مبالغ أو حالة دفع أو هوية مشتري أو معرّف مزود من العميل لإثبات الشراء.
- الرد الإلكتروني PENDING يتضمن `redirectUrl` و`url` بالتسمية القديمة للتوافق.
  التحويل اليدوي يعرض انتظار المراجعة، ولا يسجل Purchase في التحليلات قبل التأكيد.
- شراء المحفظة يرسل `paymentCurrency: USD | SYP`؛ الواجهة الحالية ترسل USD.

حالة CREATING تعني أن النتيجة قد تكون غير محسومة عند المزود. لا تنشئ طلباً
بمفتاح جديد بعد مهلة شبكة قبل المطابقة الإدارية مع المزود؛ هذا متعمد لتجنب
تحصيل مكرر. لا توجد إعادة إنشاء تلقائية أو حذف للدفعة غير المحسومة.

يُخزن السياق في `Payment.providerResponse` الموجود، دون Migration. الدفعات
القديمة APPROVED وتسجيلاتها لا تتغير. الدفعات القديمة المعلقة التي تفتقر إلى
عملة ومرجع موثوقين ترجع 409 وتتطلب تسوية إدارية موثقة؛ لا تُخمّن عملتها من قيمة
المبلغ ولا يُعاد رفع إيصالاتها تلقائياً. الكوبون 100% والسعر المجاني لا يمران
عبر مسار دفع بمبلغ موجب؛ يتطلبان مسار التسجيل المجاني المعتمد ومراجعته منفصلاً.

## إعدادات الدفع وحدود التفعيل

جميع الأسرار التالية خاصة بالسيرفر في بيئة التشغيل، دون NEXT_PUBLIC.
استخدم حسابات Sandbox منفصلة في Staging، ولا تنسخ مفاتيح الإنتاج.

| المزود | متطلبات التحقق | حالة الطلبات الجديدة في هذا الفرع |
| --- | --- | --- |
| Stripe | STRIPE_SECRET_KEY وSTRIPE_WEBHOOK_SECRET؛ توقيع SDK للـraw body ثم session وPaymentIntent وcharge محصّلة ومطابقة، مع مطابقة test/live | متاح إذا كانت المفاتيح وNEXT_PUBLIC_APP_URL صالحين ولم يكن ENABLE_STRIPE=false |
| PayPal | PAYPAL_CLIENT_ID وPAYPAL_CLIENT_SECRET وPAYPAL_WEBHOOK_ID، وPAYPAL_ENVIRONMENT=sandbox في Staging؛ تحقق التوقيع عبر API ثم order/captures COMPLETED | معطّل: لا يوجد مسار capture موثوق مكتمل في المشروع. APPROVED ليست إثبات تحصيل. أُصلحت حدود طول custom_id وrequest-id والمطابقة ولم يُضف تحصيل تلقائي |
| Tabby | TABBY_SECRET_KEY وTABBY_MERCHANT_CODE وTABBY_WEBHOOK_SECRET؛ ترويسة مسجلة لدى المزود، TABBY_WEBHOOK_HEADER افتراضياً X-Auth-Key؛ الحالة CLOSED ومجموع captures مطابق ولا refunds | معطّل لشراء الكورس: التسعير الحالي USD/SYP، والمحول يقبل SAR/AED. لا تحويل صوري لاسم العملة |
| Tamara | TAMARA_MERCHANT_TOKEN وTAMARA_NOTIFICATION_TOKEN؛ JWT HS256 صالح وغير منتهٍ، ثم قراءة order من API؛ fully_captured مع مرجع ومبلغ وعملة مطابقين | معطّل لشراء الكورس لعدم وجود تسعير بالعملة المدعومة ومسار تحصيل مكتمل |
| Manual/Wallet | حساب موثق، سعر من السيرفر، إيصال ومراجعة إدارية لليدوي، أو رصيد حقيقي كافٍ للمحفظة | متاحان ما لم يعطلهما إعداد الإدارة |

احتُفظ بالمحولات للتحقق الآمن؛ تغيير ENABLE_* وحده لا يعيد تفعيل PayPal أو
Tabby أو Tamara قبل إصلاح دورة التحصيل أو التسعير واختبارها. مسار webhook
لا يقبل MANUAL أو مزوداً مجهولاً، ولا يطابق transactionId بين مزودين مختلفين.
الحد الأعلى لجسم الإشعار 256 KiB، والطلبات إلى المزودين لها مهلة ولا تتبع redirects.

اضبط NEXTAUTH_URL وNEXT_PUBLIC_APP_URL على عنوان HTTPS الصحيح لـStaging،
واستخدم NEXTAUTH_SECRET مستقلاً فيه. أبقِ سر الإنتاج الحالي كما هو عند إعداد
التحديث لاحقاً؛ هذا الفرع لا يغيّره. احتفظ بمتغيرات Bunny وLiveKit والتخزين
كما في [دليل Coolify](coolify-deployment.md)، دون أسرار في المتصفح.

## التحقق قبل السماح بالنشر

الاختبارات الآلية تشمل انتحال الهوية، تزييف المبلغ والعملة والمراجع، التواقيع
والـJWT الحقيقية محلياً، غياب المفاتيح، الدفع غير المحصّل، التكرار والتزامن
والتراجع عن المعاملة عند الفشل، الأدوار والحظر، الوصول للبث، ومنع حقن JSON-LD.
استُبدلت API المزودين وPrisma بمحاكاة في اختبارات الدفع؛ نجاحها لا يثبت سلوك
عزل PostgreSQL الفعلي أو تكامل بوابة دفع حقيقية.

لم يُجرَ اختبار دفع حقيقي أو وصول حساب طالب فعلي أو رفع إلى Bunny أو تنزيل
PDF من الخادم. لا يتوفر Linux/Docker محلياً؛ البناء الموثق هنا Windows فقط.
تبقى هذه اختبارات Staging مطلوبة، بقاعدة ومكتبة وملفات وحسابات مستقلة.

1. راجع أي نشر تلقائي في GitHub Apps وCoolify والتكامل القديم قبل أي Push
   لاحق؛ هذا التنفيذ لا يثبت تعطيل تلك الارتباطات ولا يغيرها.
2. عالج تنبيه حزمة الصور المذكور أدناه قبل تعريض Staging للإنترنت، وثبت
   Node 22 LTS محدثاً أو إصداراً مدعوماً أحدث بعد اختبار التوافق.
3. نفذ على Linux نظيف: `npm ci --include=dev` ثم `npm test` و
   `npm run typecheck` و`npm run lint` و
   `env -u DATABASE_URL NEXT_TELEMETRY_DISABLED=1 npm run build`.
   لا تنقل node_modules أو .next من Windows.
4. أنشئ PostgreSQL وبيانات اختبار وvolume مستقلين، وجهز مخطط الاختبار بعد
   مراجعة منفصلة؛ لم ينفذ هذا الفرع أي أمر DB. إعداد Coolify للتشغيل هو
   `npm start -- --hostname 0.0.0.0 --port 3000` والمنفذ 3000.
5. اختبر محاولات دفع متزامنة على PostgreSQL الحقيقي، توقيعاً خاطئاً وصحيحاً
   وتسوية وإعادة إشعارات وطلبات إدارة؛ تحقق من دفع واحد وتسجيل واحد ورصيد سليم.
6. اختبر الطالب المسجل وغير المسجل والمحظور، بث المدرب والطالب، تغيير الدور،
   رفع Bunny واستكماله وربط فيديو وتعديل العنوان وPDF والتقدم على بيانات الاختبار.
7. سوّ الدفعات المعلقة القديمة، وحدّث عميل الموبايل، وسجّل الأدلة قبل طلب
   موافقة نقل التغيير للإنتاج. لا تمنح دفعات قديمة وصولاً اعتماداً على رقم العميل.

## عوائق متبقية خارج إصلاح المسارات

البناء الناجح وحده لا يعني الجاهزية للإنتاج. الإصدار المثبت Next 16.2.9 يقع
ضمن التنبيه الحرج [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
لمعالجة الصور على Linux/glibc. يذكر التنبيه Next 16.4.1 أو sharp مصححاً كما
توضح تعليماته. لا يكفي تحديث sharp بالجذر إن بقيت النسخة التي يحلها Next قديمة.
لم تُغيّر الحزم في هذا الفرع؛ يلزم إصلاح واعتماد ذلك قبل النشر العام، مع
إعادة البناء والاختبارات. Node 20 المحلي انتهى دعمه حسب
[جدول Node](https://github.com/nodejs/Release#release-schedule).

تبقى مخالفات Lint قديمة خارج النطاق. ولا يمثل هذا الإصلاح تدقيقاً شاملاً لكل
API في المنصة؛ توجد مسارات قديمة أخرى تتطلب مراجعتها، ومنها secure-stream
التمثيلي غير المستخدم لتوقيع Bunny، وإصدار الشهادات وسياسات اكتمالها.

مصادر آلية التحقق: [ترويسة Tabby المسجلة](https://docs.tabby.ai/api-reference/webhooks/register-a-webhook)،
[قراءة دفع Tabby](https://docs.tabby.ai/api-reference/payments/retrieve-a-payment)،
[إشعار Tamara وJWT](https://docs.tamara.co/docs/webhook-subscription)،
[إشعارات Stripe](https://docs.stripe.com/events/manage-webhook-endpoints)،
[Idempotency في PayPal](https://developer.paypal.com/api/rest/reference/idempotency/).

## نتائج الأوامر والملفات

| الأمر | النتيجة |
| --- | --- |
| `npm test` | نجح: 318 اختباراً، صفر فشل أو تخطٍ |
| `node --test tests/rbac-security.test.cjs tests/payment-checkout.test.cjs` | نجح: 13 اختباراً بعد آخر تعديل أنواع RBAC |
| `npm run typecheck` | نجح، exit 0، دون تجاوز أخطاء الأنواع |
| `npm run lint -- --format json --output-file node_modules/.cache/security-lint.json` | فشل، exit 1: 333 خطأ و254 تحذيراً قديماً؛ كانت 368 و277 في f72a7ed. المقارنة حسب الملف والقاعدة ونص التشخيص دون مقتطف الأسطر لم تجد تشخيصاً جديداً |
| `eslint src/lib/rbac.ts` | نجح دون تشخيصات |
| `npm run build` | نجح، exit 0: compilation وTypeScript وتوليد 134/134 صفحة. أزيل DATABASE_URL من عملية البناء، ولا يوجد ملف env محلي |
| HTTP على `next start` المبني | نجحت 8 حالات رفض فعلية: mobile/checkout وgateway وLiveKit وmobile/courses وadmin/settings وadmin/payments أعادت 401؛ admin/users أعاد 403؛ webhook غير الموقع أعاد 401. تشغيل loopback مؤقت دون DB أو مفاتيح مزودين |
| `git diff --cached --check` | نجح بعد إدراج الملفات الجديدة |
| مقارنة ملفات التكاملات | لا تغييرات على Prisma أو حزم التطبيق أو ملفات Bunny/الدروس/توقيع الفيديو/رفع الملفات/مخزن PDF |

استُخدم للبناء المحلي Node 20.19.4 على Windows، مع مجلد TEMP/TMP داخل
node_modules/.cache ومعالج fs-readlink مؤقت من التحقق السابق، لتجاوز سلوك
EISDIR الخاص بنظام الملفات المحلي. لم يدخل ذلك المعالج أو سجلات الفحص أو
التوكنات المؤقتة إلى ملفات التطبيق أو Git. لا تُضف NODE_OPTIONS الخاص به إلى
Coolify؛ يبقى أمر Linux القياسي npm run build بحاجة إلى تحقق مستقل.
ظهر تحذير `Local storage is not available` أثناء prerender، لكن انتهى البناء
بالرمز 0. لا يمثل اختبار HTTP المحلي اختبار تكامل PostgreSQL أو Bunny أو دفع حقيقي.

الملفات المعدلة والمضافة في هذا الفرع:

- `docs/coolify-deployment.md`
- `docs/security-hardening.md`
- `src/app/api/admin/payments/[id]/route.ts`
- `src/app/api/admin/payments/approve/route.ts`
- `src/app/api/admin/settings/route.ts`
- `src/app/api/admin/wallet/approve/route.ts`
- `src/app/api/checkout/bundle/route.ts`
- `src/app/api/checkout/gateway/route.ts`
- `src/app/api/checkout/info/route.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/checkout/subscription/route.ts`
- `src/app/api/checkout/wallet/route.ts`
- `src/app/api/live/token/route.ts`
- `src/app/api/livekit/route.ts`
- `src/app/api/livekit/token/route.ts`
- `src/app/api/mobile/auth/login/route.ts`
- `src/app/api/mobile/auth/register/route.ts`
- `src/app/api/mobile/certificates/issue/route.ts`
- `src/app/api/mobile/checkout/route.ts`
- `src/app/api/mobile/courses/route.ts`
- `src/app/api/mobile/dashboard/route.ts`
- `src/app/api/mobile/login/route.ts`
- `src/app/api/wallet/deposit/route.ts`
- `src/app/api/wallet/route.ts`
- `src/app/api/wallet/withdraw/route.ts`
- `src/app/api/webhooks/payments/[provider]/route.ts`
- `src/app/checkout/page.tsx`
- `src/app/courses/[courseId]/page.tsx`
- `src/app/layout.tsx`
- `src/lib/auth.ts`
- `src/lib/livekit-access.ts`
- `src/lib/payments/adapters/ManualAdapter.ts`
- `src/lib/payments/adapters/PayPalAdapter.ts`
- `src/lib/payments/adapters/StripeAdapter.ts`
- `src/lib/payments/adapters/TabbyAdapter.ts`
- `src/lib/payments/adapters/TamaraAdapter.ts`
- `src/lib/payments/admin-review.ts`
- `src/lib/payments/availability.ts`
- `src/lib/payments/checkout.ts`
- `src/lib/payments/checkout-context.ts`
- `src/lib/payments/checkout-result.ts`
- `src/lib/payments/PaymentFactory.ts`
- `src/lib/payments/provider-validation.ts`
- `src/lib/payments/transactions.ts`
- `src/lib/payments/types.ts`
- `src/lib/payments/wallet-operations.ts`
- `src/lib/payments/webhook.ts`
- `src/lib/rbac.ts`
- `src/lib/request-user.ts`
- `src/lib/safe-json-ld.ts`
- `tests/admin-mobile-authorization.test.cjs`
- `tests/admin-payment-review.test.cjs`
- `tests/lesson-playback.test.cjs`
- `tests/livekit-access.test.cjs`
- `tests/mobile-auth-security.test.cjs`
- `tests/payment-checkout.test.cjs`
- `tests/payment-providers.test.cjs`
- `tests/payment-webhook.test.cjs`
- `tests/rbac-security.test.cjs`
- `tests/request-user.test.cjs`
- `tests/safe-json-ld.test.cjs`
- `tests/wallet-security.test.cjs`
