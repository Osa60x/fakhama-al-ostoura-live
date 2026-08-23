# مراجعة اختبارات الأداء وإمكانية الوصول — V2

**تاريخ القياس:** 22 أغسطس 2026، UTC 22:31–00:06 تقريباً  
**الإنتاج:** `https://gold.osa60x.workers.dev/`  
**أداة المتصفح:** Chromium وFirefox وWebKit عبر Playwright  
**أداة a11y:** axe-core عبر `@axe-core/playwright`  
**أمر التشغيل:** `pnpm audit:production`، `pnpm qa:browser-matrix`، `pnpm qa:admin-browser-matrix`

## الخلاصة التنفيذية

أصبح لدى V2 الآن فحص أداء وإمكانية وصول قابل لإعادة التشغيل، وليس مجرد فحص HTTP أو انطباع بصري. شُغّلت الصفحة العامة، ومسار الإدارة العادي `/?admin=1`، ومسار دعوة المدير `/?admin=1&invite=1` عبر Chromium وFirefox وWebKit وعلى ثمانية أحجام من 390px إلى 1920px. النتيجة الآلية هي **72/72 جلسة PASS و0 مخالفات axe-core**، مع عدم وجود تجاوز أفقي.

أُصلح CLS الهاتف بعد أن أثبت Trace Lighthouse أن الشريط العلوي يتحرك عند إعادة تدفق العنوان العربي، وأُصلحت مسارات favicon وrobots وsitemap التي كانت تعيد 500. بعد الإصلاحات، تراوح Lighthouse mobile للصفحة العامة في ثلاثة تشغيلات بين **88 و94**، مع FCP من **1.515 إلى 1.971 ثانية**، وLCP من **1.544 إلى 2.003 ثانية**، وCLS ثابت عند **0.0146**، وTBT بين **265 و270ms**، ومن دون أخطاء Console.

هذا يثبت اجتياز **بوابة QA الآلية**، لكنه لا يثبت مطابقة WCAG 2.2 AA أو P75/INP ميدانياً، ولا يثبت تجربة Safari على iPhone فعلي أو لوحة Owner/Manager بعد تسجيل دخول حقيقي. لذلك الحالة المهنية هي **NOT READY للبوابة التشغيلية الكاملة** إلى أن تُنفذ تلك الاختبارات المقيدة بالحساب والجهاز.

## النتائج الفعلية

| المجال | الصفحة العامة | الإدارة العادية | دعوة المدير | الحكم |
|---|---:|---:|---:|---|
| HTTP | 200 | 200 | 200 | VERIFIED |
| `lang` | `ar` | `ar` | `ar` | VERIFIED |
| `dir` | `rtl` | `rtl` | `rtl` | VERIFIED |
| H1 | 1 | 1 | 1 | VERIFIED |
| صور بلا `alt` | 0 | 0 | 0 | VERIFIED |
| عناصر تحكم بلا اسم في الفحص | 0 | 0 | 0 | VERIFIED، فحص آلي محدود |
| تجاوز أفقي | لا | لا | لا | VERIFIED |
| axe-core | 0 violations | 0 violations | 0 violations | VERIFIED، 72 جلسة إجمالاً |

## Lighthouse

| التشغيل | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Public Desktop | 93 | 100 | 100 | 100 | 509ms | 516ms | 0.0112 | 0ms |
| Public Mobile — أفضل/أسوأ التكرارات | 94 / 88 | 100 | 100 | 100 | 1,515–1,971ms | 1,544–2,003ms | 0.0146 | 265–270ms |
| Invite Mobile | 97 | 100 | 100 | 63 | 1,899ms | 2,073ms | 0 | 2ms |

درجة SEO البالغة 63 في مسار الدعوة متوقعة وليست عطلاً؛ robots.txt يمنع فهرسة مسارات الإدارة عمداً. الصفحة العامة حققت SEO = 100 بعد إضافة robots.txt وsitemap.xml. قياسات Lighthouse مختبرية وليست بيانات مستخدمين حقيقية عند P75.

## الإصلاحات المنفذة

### CLS الهاتف — FIXED

حدد Trace Lighthouse حدثاً واحداً بقيمة CLS قدرها `0.173633`، وكان الشريط العلوي ينتقل تقريباً 37px عند إعادة تدفق عنوان المتجر. حُجز للشريط العلوي ارتفاع هاتف ثابت قدره `5rem`، ثم أُعيد البناء والنشر. انخفض CLS إلى `0.0146` في Lighthouse mobile، ولم يظهر تجاوز أفقي في المصفوفة.

### مسارات الملفات الثابتة — FIXED

كانت طلبات `/favicon.ico` و`/robots.txt` و`/sitemap.xml` تعيد 500/1101 بسبب غياب الملفات من حزمة الأصول. أضيف favicon متسق مع علامة الألماسة الحالية، وrobots يسمح بفهرسة الصفحة العامة ويمنع الإدارة، وsitemap يدرج الصفحة العامة فقط. بعد النشر أعادت المسارات الثلاثة HTTP 200 واختفى خطأ Console في Lighthouse.

### أدوات إعادة التشغيل — VERIFIED

أضيفت `@axe-core/playwright` و`lighthouse` وأوامر `qa:browser-matrix` و`qa:admin-browser-matrix` و`audit:production`. النتائج الخام محفوظة في `artifacts/qa/`، وسكربت المصفوفة هو `scripts/browser-matrix.mjs`.

## ما لم يثبت بعد

لا يثبت هذا التقرير دخول Owner الحقيقي، أو تعديل الأسعار والإعدادات وحفظها ثم التحقق منها بعد refresh/logout/login، أو قبول دعوة Manager وإنشاء كلمة المرور، أو منع Manager من كل عمليات Owner ضد Backend، أو اكتمال Audit Log، أو عمل Tooltip بالحواف واللمس والسحب. كما أن WebKit في sandbox ليس Safari على iPhone فعلياً.

تم قياس FCP وLCP وCLS وTBT مختبرياً. لم يُسجل INP ميدانياً أو من تفاعل مستخدم موثوق، ولا توجد بيانات CrUX/P75. كما لم يُنفذ اختبار قارئ شاشة فعلي، أو مراجعة لوحة مفاتيح يدوية، أو تباين شامل لكل حالات focus/hover/active، أو تكبير 200% على حساب Owner الحقيقي.

## قرار الجاهزية

**QA automated gate: PASSED. Full production gate: NOT READY.** لا توجد مشكلة حجب ظهرت في الفحوص الآلية الحالية، لكن إعلان READY النهائي أو WCAG 2.2 AA يتطلب أدلة جلسة Owner/Manager حقيقية، اختبار صلاحيات مباشر، فحص Tooltip والتفاعلات، واختبار Safari/iPhone فعلي، إضافة إلى الاختبارات اليدوية المتبقية.

## المراجع

[1] [web.dev — Largest Contentful Paint](https://web.dev/articles/lcp)  
[2] [W3C WAI — Web Content Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)  
[3] [Deque — axe-core Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)  
[4] [Google Lighthouse — Documentation](https://developer.chrome.com/docs/lighthouse/)
