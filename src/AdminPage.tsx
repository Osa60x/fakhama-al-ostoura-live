import { useEffect, useState } from "react";
import { formatTime } from "./lib/format";
import { supabase } from "./lib/supabase";

type Identity = { id: string; displayName: string | null; role: "owner" | "manager" | "user"; isActive: boolean };
type Adjustment = { carat: "24" | "21" | "18"; adjustment_sar: number | string; updated_at: string };
type Health = { last_status?: string; last_attempt_at?: string | null; last_successful_at?: string | null; last_error_code?: string | null } | null;

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("يلزم تسجيل الدخول.");
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "تعذر تنفيذ العملية.");
  return body;
}

export function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [health, setHealth] = useState<Health>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = Boolean(supabase);
  const owner = identity?.role === "owner";

  const load = async () => {
    const me = await adminFetch<{ identity: Identity }>("/api/admin/me");
    setIdentity(me.identity);
    if (me.identity.role === "owner" || me.identity.role === "manager") {
      const prices = await adminFetch<{ adjustments: Adjustment[] }>("/api/admin/price-adjustments");
      setAdjustments(prices.adjustments);
    }
    if (me.identity.role === "owner") {
      const status = await adminFetch<{ status: Health }>("/api/admin/system-health");
      setHealth(status.status);
    }
  };

  useEffect(() => { if (!supabase) return; load().catch(() => undefined); }, []);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(result.error.message); else { await load().catch(error => setMessage(error.message)); setPassword(""); }
    setBusy(false);
  };
  const reset = async () => {
    if (!supabase || !email) return setMessage("اكتب البريد الإلكتروني أولاً.");
    const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin` });
    setMessage(result.error ? result.error.message : "إذا كان البريد مسجلاً، أرسل رابط إعادة التعيين إليه.");
  };
  const savePrices = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await adminFetch<{ adjustments: Adjustment[] }>("/api/admin/price-adjustments", { method: "PUT", body: JSON.stringify(adjustments.map(item => ({ carat: item.carat, adjustment_sar: Number(item.adjustment_sar) }))) });
      setAdjustments(result.adjustments); setMessage("تم حفظ ضبط الأسعار وسجل التدقيق.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الحفظ."); }
    setBusy(false);
  };
  const logout = async () => { await supabase?.auth.signOut(); setIdentity(null); setAdjustments([]); setHealth(null); };

  if (!configured) return <main className="admin-shell"><section className="admin-card"><h1>لوحة الإدارة غير مهيأة</h1><p>لا يمكن تسجيل الدخول قبل ضبط عنوان Supabase ومفتاح publishable في بيئة البناء. لا تعرض هذه الصفحة أي بديل أو حساب تجريبي.</p></section></main>;
  if (!identity) return <main className="admin-shell"><form className="admin-card" onSubmit={login}><p className="admin-kicker">فخامة الأسطورة V2</p><h1>تسجيل الدخول للإدارة</h1><label>البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{message ? <p className="admin-message">{message}</p> : null}<button className="admin-primary" disabled={busy}>{busy ? "جارٍ التحقق…" : "تسجيل الدخول"}</button><button type="button" className="admin-link" onClick={reset}>نسيت كلمة المرور</button></form></main>;

  return <main className="admin-shell"><header className="admin-header"><div><p className="admin-kicker">{owner ? "OWNER" : "MANAGER"}</p><h1>إدارة فخامة الأسطورة</h1><span>{identity.displayName ?? "حساب الإدارة"}</span></div><div><a href="/">عرض الموقع</a><button onClick={logout}>تسجيل الخروج</button></div></header><p className="admin-message" aria-live="polite">{message}</p><section className="admin-grid"><article className="admin-card admin-prices"><p className="admin-kicker">الأسعار</p><h2>ضبط المتجر</h2><p>يمكنك إضافة أو خصم قيمة بالريال للجرام. لا يملك المدير أي إعدادات أخرى.</p>{adjustments.map(item => <label key={item.carat}>{item.carat}K<input inputMode="decimal" value={item.adjustment_sar} onChange={event => setAdjustments(current => current.map(value => value.carat === item.carat ? { ...value, adjustment_sar: event.target.value } : value))} /></label>)}<button className="admin-primary" disabled={busy} onClick={savePrices}>{busy ? "جارٍ الحفظ…" : "حفظ الضبط"}</button></article>{owner ? <><article className="admin-card"><p className="admin-kicker">SYSTEM HEALTH</p><h2>صحة النظام</h2><dl><dt>المصدر</dt><dd>{health?.last_status ?? "غير متاح"}</dd><dt>آخر محاولة</dt><dd>{formatTime(health?.last_attempt_at)}</dd><dt>آخر نجاح</dt><dd>{formatTime(health?.last_successful_at)}</dd><dt>رمز الخطأ</dt><dd>{health?.last_error_code ?? "—"}</dd></dl></article><article className="admin-card"><p className="admin-kicker">الصلاحيات</p><h2>نطاق المالك</h2><p>تظهر إعدادات الهوية والمحتوى والتواصل والمخطط والمستخدمين والسجل بعد تهيئة قاعدة Supabase وتشغيل migration. لا تُعرض كأزرار تشغيل وهمية قبل تفعيل المسارات الخادمية المقابلة.</p></article></> : <article className="admin-card"><p className="admin-kicker">حدود المدير</p><h2>صلاحيات مقيدة</h2><p>يستطيع المدير ضبط 24K و21K و18K فقط. لا يستطيع تعديل الهوية أو التواصل أو المستخدمين أو سجل التدقيق أو التحديث المجدول.</p></article>}</section></main>;
}
