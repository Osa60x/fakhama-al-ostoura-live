# فخامة الأسطورة V2

هذا المستودع هو تطبيق V2 مستقل عن Manus. يستخدم React/Vite للواجهة، Cloudflare Worker للـAPI والـCron، وSupabase للمصادقة وPostgres وStorage. لا يحتوي المستودع على أي secret أو بيانات قاعدة V1 أو ملفات بيئة.

## المسارات

| المسار | المسؤولية |
|---|---|
| `src/` | واجهة React RTL والعقود المشتركة للعرض. |
| `worker/` | API خادمي وCron؛ لا يسمح للموقع العام بتحديث مصدر السعر. |
| `supabase/migrations/` | مخطط Postgres وRLS والإجراءات الذرية. |
| `tests/` | اختبارات الوحدة للعقود والمعادلات. |
| `docs/` | القرار المعماري وتشغيل النشر وتوثيق التحقق. |

## هوية الموارد والرابط المختصر

المورد المنشور في Cloudflare Workers اسمه `gold`، والرابط العام المجاني الأقصر المتاح حالياً هو `https://gold.osa60x.workers.dev`. لا توجد منطقة نطاق مملوكة في حساب Cloudflare وقت التحقق؛ لذلك لا يمكن تقصير الرابط أكثر من ذلك من دون شراء أو إضافة نطاق مخصص. اسم العرض لمشروع Supabase هو `gold` أيضاً.

| العنصر | الحالة | السبب |
|---|---|---|
| Cloudflare Worker | `gold` | اسم تشغيل قابل للتغيير وقد تم اختصاره. |
| رابط الموقع | `gold.osa60x.workers.dev` | أقصر رابط مجاني متاح للحساب الحالي. |
| مشروع Supabase (اسم العرض) | `gold` | اسم قابل للتغيير وقد تم اختصاره. |
| Supabase project ref | `rsrtwubjdfdnflkttwwy` | معرف تقني ثابت؛ تغييره يتطلب إنشاء مشروع جديد وترحيل البيانات. |
| مستودع GitHub | `Osa60x/fakhama-al-ostoura-v2` | بقي الاسم كما هو لحفظ سجل التنفيذ القائم؛ إعادة تسميته لا تقصر رابط دخول الموقع. |

## إعداد الأسرار

تُضبط القيم التالية في لوحة Supabase وCloudflare Workers، ولا تكتب في Git أو `VITE_*` إلا القيم العامة:

| الاسم | المكان | الغرض |
|---|---|---|
| `VITE_SUPABASE_URL` | بيئة بناء الواجهة | عنوان مشروع Supabase العام. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | بيئة بناء الواجهة | مفتاح publishable فقط للمصادقة والقراءات المحكومة بـRLS. |
| `SUPABASE_URL` | متغير Cloudflare Worker | عنوان مشروع Supabase العام للـWorker. |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare Worker Secret | تشغيل cron والمعاملات الخادمية فقط؛ لا يرسل للمتصفح. |
| `GOLD_API_URL` | Cloudflare Worker Secret/Variable | مصدر XAU/USD المختار بعد التحقق التشغيلي. |

لا ينشر التطبيق قبل إنشاء مشروع Supabase مستقل وتطبيق migrations وضبط Redirect URLs للمجال النهائي وإنشاء أول owner بصورة آمنة. تفاصيل القرار في المستندات المنقولة/المرجعية من تدقيق V1.

## الجودة المحلية

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

النشر ينفذ من CI أو `pnpm deploy` بعد مصادقة Wrangler الصحيحة وضبط Secrets في حساب Cloudflare الذي يحدده المالك.
