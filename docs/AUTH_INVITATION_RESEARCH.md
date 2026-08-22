# تدقيق دعوة المدير في Supabase V2

## النتيجة الموثقة

توضح وثائق Supabase أن دعوة المستخدم تُرسل عبر `auth.admin.inviteUserByEmail` مع خيار `redirectTo`، وأن وجهة إعادة التوجيه يجب أن تكون ضمن قائمة Redirect URLs المسموح بها في إعدادات المشروع. رابط الدعوة ليس تسجيل دخول بكلمة مرور جاهزة؛ عند فتحه يُنشئ جلسة مؤقتة للمستخدم المدعو، ويجب أن تعرض الواجهة نموذجاً لتعيين كلمة مرور أولى عبر `supabase.auth.updateUser({ password })`.

## المشكلة الحالية المحتملة

مسار V2 يميز حالياً `type=recovery` فقط في fragment. رابط دعوة المدير يصل عادةً بوسم `type=invite`، ولذلك تعرض الصفحة نموذج تسجيل الدخول بدلاً من نموذج إنشاء كلمة المرور. كما أن استدعاء REST الإداري يجب أن يمرر إعادة التوجيه بالصيغة التي يعتمدها Supabase، مع التأكد من إضافة الوجهة إلى Allow list.

## المصادر

- [Supabase JavaScript Reference: inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
- [Supabase Passwordless Email Logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)
