# تقرير V2 Verification + Bug Fix + QA Sprint

**المشروع:** فخامة الأسطورة V2  
**الإنتاج:** [gold.osa60x.workers.dev](https://gold.osa60x.workers.dev/)  
**الإصدار المنشور بعد الإصلاحات:** `e491d82b-1f97-4cee-854c-d69232776d86`  
**تاريخ القياس:** 22 أغسطس 2026، UTC  
**النطاق:** تحقق وإصلاحات QA فقط؛ لم تُضف Features تشغيلية جديدة.

## الحكم التنفيذي

نجحت نسخة الإنتاج في فحوص المتصفحات الآلية، ونجح `axe-core` دون مخالفات على الصفحة العامة ومسار دعوة المدير عبر **Chromium وFirefox وWebKit** وعلى ثمانية أحجام من 390px إلى 1920px، بإجمالي **72 جلسة متصفح**: الصفحة العامة، `/?admin=1`، و`/?admin=1&invite=1`. كما نجح `pnpm check` و`pnpm test -- --run`، ومرّت **44 حالة Vitest**.

أظهر Lighthouse بعد الإصلاحات أن الصفحة العامة حققت Accessibility وBest Practices وSEO بدرجة 100 في تشغيل سطح المكتب، وAccessibility وBest Practices وSEO بدرجة 100 في تشغيل الهاتف. تراوح أداء الهاتف في ثلاثة تشغيلات بين **88 و94**، مع FCP بين **1.515 و1.971 ثانية**، وLCP بين **1.544 و2.003 ثانية**، وCLS ثابت عند **0.0146**، وTBT بين **265 و270ms**، ولم تسجل أخطاء Console. هذه قياسات مختبرية وليست P75 ميدانياً على أجهزة المستخدمين.

**بوابة الإطلاق الكاملة: NOT READY بعد.** السبب ليس فشل الصفحة العامة؛ بل أن اختبار Owner وManager الحقيقيين، واختبار تصعيد الصلاحيات بحساب Manager، واستمرارية البيانات بعد Login/Logout، واختبار Tooltip باللمس/السحب، واختبار Safari على iPhone فعلي، لم تُثبت داخل جلسة مصادق عليها. لا يصح إعلان “يعمل بشكل مثالي على iPhone” أو “WCAG 2.2 AA verified” قبل هذه الأدلة.

## مصفوفة النتائج

| المجال | الدليل | النتيجة | التصنيف |
|---|---|---|---|
| الصفحة العامة HTTP | GET `/` | 200 | VERIFIED |
| تحويل `/admin` | GET `/admin` مع متابعة التحويل | 200 | VERIFIED |
| دعوة المدير | `/?admin=1&invite=1` | 200، المسار يعرض التطبيق | VERIFIED |
| حماية API | `/api/admin/me`, `/price`, `/settings` بدون Authorization | 401 | VERIFIED |
| Chromium | 8 أحجام، الصفحة العامة | 8/8 PASS، axe 0 | VERIFIED |
| Firefox | 8 أحجام، الصفحة العامة | 8/8 PASS، axe 0 | VERIFIED |
| WebKit | 8 أحجام، الصفحة العامة | 8/8 PASS، axe 0 | VERIFIED |
| Chromium/Firefox/WebKit | 8 أحجام، مسار الإدارة العادي `/?admin=1` | 24/24 PASS، axe 0 | VERIFIED |
| Chromium/Firefox/WebKit | 8 أحجام، مسار دعوة المدير | 24/24 PASS، axe 0 | VERIFIED |
| عدم التجاوز الأفقي | 390، 393، 430، 768، 1024، 1280، 1440، 1920 | لا يوجد تجاوز في المصفوفة | VERIFIED |
| favicon/robots/sitemap | الطلبات المباشرة | 200 بعد الإصلاح | FIXED |
| a11y الآلي | axe-core | 0 violations في 72 جلسة | VERIFIED، نطاق آلي فقط |
| Lighthouse Public Desktop | Performance 93، Accessibility 100، Best Practices 100، SEO 100 | نجاح مع تذبذب زمني طبيعي | VERIFIED |
| Lighthouse Public Mobile | Performance 88–94 في 3 تشغيلات، Accessibility/Best Practices/SEO 100 | نجاح مختبري مشروط | VERIFIED |
| Lighthouse Invite Mobile | Performance 97، Accessibility 100، Best Practices 100، SEO 63 | SEO منخفض عمداً لأن robots يمنع الإدارة | VERIFIED، غير حرج |
| Vitest | 12 ملفات | 44/44 PASS | VERIFIED |
| Owner الحقيقي | جلسة مستخدم مصادق عليها | لم تُنفذ في هذه الجولة | UNKNOWN |
| Manager الحقيقي | قبول دعوة وتعديل صلاحيات/أسعار | لم تُنفذ في هذه الجولة | UNKNOWN |
| تصعيد الصلاحيات | طلبات مباشرة بحساب Manager | لم تُنفذ بحساب حقيقي | UNKNOWN |
| Safari/iPhone فعلي | جهاز حقيقي | غير متاح في sandbox | NOT TESTABLE |
| قارئ الشاشة | VoiceOver/TalkBack/NVDA فعلي | غير منفذ | NOT TESTABLE |

## الإصلاحات المنفذة وإعادة الاختبار

### CLS على الهاتف — FIXED

Trace Lighthouse أثبت أن شريط العنوان كان ينتقل بمقدار 37px تقريباً عندما يعاد تدفق اسم المتجر، وكانت النتيجة CLS قدرها `0.173633`. السبب الجذري هو عدم حجز ارتفاع كافٍ للشريط العلوي عند التفاف العنوان العربي. حُجز ارتفاع هاتف ثابت قدره `5rem` للشريط العلوي، ثم أعيد بناء ونشر V2. انخفض CLS في Lighthouse mobile إلى `0.0146`، وبقي ضمن النطاق الجيد المختبري، كما لم يظهر تجاوز أفقي في المصفوفة.

### مسارات static — FIXED

كان `/favicon.ico` و`/robots.txt` و`/sitemap.xml` يعيدون 500/1101 لأن ملفاتهم لم تكن موجودة في حزمة الأصول. أضيف favicon متسق مع علامة الألماسة الحالية، وrobots يسمح بفهرسة الصفحة العامة ويمنع الإدارة، وsitemap يدرج الصفحة العامة فقط. بعد النشر أعادت المسارات الثلاثة HTTP 200، واختفى خطأ Console في Lighthouse.

### أداة الاختبار — FIXED

أضيفت `@axe-core/playwright` و`lighthouse` وأمرَا تشغيل مصفوفة المتصفحات إلى `package.json`. الأوامر القابلة لإعادة التشغيل هي `pnpm qa:browser-matrix` و`pnpm qa:admin-browser-matrix`، إضافة إلى `pnpm audit:production`. ملفات النتائج الخام محفوظة في `artifacts/qa/`، وسكربت الاختبار هو `scripts/browser-matrix.mjs`.

## ملاحظات الأداء

حجم JavaScript المنقول للصفحة العامة نحو 122KB مضغوطاً في قياس Lighthouse، وظهر تقدير unused JavaScript. هذا ليس عطلاً وظيفياً ولا يبرر إعادة تقسيم عشوائية قبل قياس أثرها على المستخدم، خصوصاً أن LCP الهاتف بقي بين 1.54 و2.00 ثانية في التكرارات الحالية. بقيت CSS render-blocking ملاحظة Lighthouse منخفضة الأثر، ولم تظهر أخطاء شبكة بعد إصلاح الملفات الثابتة.

نتائج Lighthouse المختبرية لا تعادل بيانات CrUX أو P75 ميدانياً، ولا تثبت أداء Safari/iPhone حقيقي. تم قياس FCP/LCP/CLS/TBT فقط في هذه الجولة؛ لم يُسجل INP ميدانياً أو كقياس موثوق من تفاعل مستخدم، ولا ينبغي اختلاق رقم INP من تشغيل تحميل واحد.

## القيود التي تمنع READY النهائي

لا تزال هناك مجموعة تحقق تشغيلية لا يمكن إثباتها آلياً من زائر غير مصادق: دخول Owner، تعديل كل إعداد وحفظه ثم إعادة فتحه، دعوة Manager وإنشاء كلمة المرور، منع Manager من كل عمليات Owner ضد Backend، سجل التدقيق قبل/بعد، استمرار البيانات بعد logout/login، وعمل مخطط Tooltip بالحواف واللمس والسحب. كما أن Safari/WebKit في هذه الجولة هو محاكاة WebKit على Linux، وليس Safari على iPhone فعلي.

بناءً على ذلك، التصنيف الصحيح للإصدار الحالي هو **QA automated gate passed / full production gate NOT READY**، وليس “جاهزاً نهائياً بلا تحفظ”.

## المراجع

[1] [web.dev — Largest Contentful Paint](https://web.dev/articles/lcp)  
[2] [W3C WAI — Web Content Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)  
[3] [Deque — axe-core Playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)  
[4] [Google Lighthouse — Documentation](https://developer.chrome.com/docs/lighthouse/)
