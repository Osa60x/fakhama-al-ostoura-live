import { useEffect, useState } from "react";
import { BackupControls } from "./BackupControls";
import { formatTime } from "./lib/format";
import { isPasswordSetupHash, validateNewPassword } from "./lib/password-recovery";
import { isAdjustmentInput, normalizeAdjustment, stepAdjustment } from "./lib/adjustments";
import { supabase } from "./lib/supabase";

type Identity = { id: string; displayName: string | null; role: "owner" | "manager" | "user"; isActive: boolean };
type Adjustment = { carat: "24" | "21" | "18"; adjustment_sar: number | string; updated_at: string };
type Health = { last_status?: string; last_attempt_at?: string | null; last_successful_at?: string | null; last_error_code?: string | null } | null;
type SiteSettings = { site_name: string; address: string; show_address: boolean; palette: string; theme_mode: string; title_font: string; title_size: number; title_weight: number; title_color: string; subtitle_size: number; subtitle_weight: number; subtitle_color: string; chart_visible: boolean; chart_default_range: string; chart_mode: string; logo_path?: string | null };
type Contact = { id?: string; kind: "whatsapp" | "phone" | "instagram" | "snapchat" | "telegram" | "email"; label: string; value: string; sort_order: number; is_active: boolean };
type AuditLog = { id: number; action: string; entity_type: string; actor_role: string | null; created_at: string };

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
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [managerEmail, setManagerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(() => typeof window !== "undefined" && isPasswordSetupHash(window.location.hash));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const configured = Boolean(supabase);
  const owner = identity?.role === "owner";
  const logoUrl = settings?.logo_path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/branding/${settings.logo_path}` : null;

  const load = async () => {
    const me = await adminFetch<{ identity: Identity }>("/api/admin/me");
    setIdentity(me.identity);
    if (me.identity.role === "owner" || me.identity.role === "manager") {
      const prices = await adminFetch<{ adjustments: Adjustment[] }>("/api/admin/price-adjustments");
      setAdjustments(prices.adjustments);
    }
    if (me.identity.role === "owner") {
      const [status, currentSettings, currentContacts, audit] = await Promise.all([
        adminFetch<{ status: Health }>("/api/admin/system-health"),
        adminFetch<{ settings: SiteSettings }>("/api/admin/site-settings"),
        adminFetch<{ contacts: Contact[] }>("/api/admin/contact-links"),
        adminFetch<{ logs: AuditLog[] }>("/api/admin/audit")
      ]);
      setHealth(status.status); setSettings(currentSettings.settings); setContacts(currentContacts.contacts); setAuditLogs(audit.logs);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const subscription = supabase.auth.onAuthStateChange(event => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && isPasswordSetupHash(window.location.hash) && active) setRecoveryMode(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const passwordSetupLink = isPasswordSetupHash(window.location.hash);
      if (passwordSetupLink) setRecoveryMode(true);
      else if (!data.session) void load().catch(() => undefined);
      else void load().catch(() => undefined);
    });
    return () => { active = false; subscription.data.subscription.unsubscribe(); };
  }, []);

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
    const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?admin=1` });
    setMessage(result.error ? result.error.message : "إذا كان البريد مسجلاً، أرسل رابط إعادة التعيين إليه.");
  };
  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const validationMessage = validateNewPassword(newPassword, confirmPassword);
    if (validationMessage) return setMessage(validationMessage);
    setBusy(true); setMessage("");
    const result = await supabase.auth.updateUser({ password: newPassword });
    if (result.error) setMessage("انتهت صلاحية الرابط أو تم استخدامه سابقاً. اطلب رابطاً جديداً ثم افتحه من نفس الجهاز.");
    else {
      setNewPassword(""); setConfirmPassword(""); setRecoveryMode(false);
      setMessage("تم تعيين كلمة المرور. يمكنك الآن تسجيل الدخول.");
      await supabase.auth.signOut();
      setIdentity(null);
    }
    setBusy(false);
  };

  const savePrices = async () => {
    const normalized = adjustments.map(item => ({ carat: item.carat, adjustment_sar: normalizeAdjustment(item.adjustment_sar) }));
    if (normalized.some(item => item.adjustment_sar === null)) {
      setMessage("أكمل قيمة كل عيار. استخدم 0 للإلغاء، أو اكتب السالب متبوعاً برقم مثل -12.5.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const result = await adminFetch<{ adjustments: Adjustment[]; refresh_status?: "ok" | "error" | "unconfigured" }>("/api/admin/price-adjustments", { method: "PUT", body: JSON.stringify(normalized) });
      setAdjustments(result.adjustments);
      setMessage(result.refresh_status === "ok" ? "تم حفظ الضبط وتحديث الأسعار العامة فوراً." : "تم حفظ الضبط، لكن تعذر تحديث اللقطة العامة الآن؛ سيعيدها التحديث المجدول لاحقاً.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الحفظ."); }
    setBusy(false);
  };
  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true); setMessage("");
    try { const result = await adminFetch<{ settings: SiteSettings }>("/api/admin/site-settings", { method: "PUT", body: JSON.stringify(settings) }); setSettings(result.settings); setMessage("تم حفظ إعدادات الهوية والمظهر وسجل التدقيق."); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الحفظ."); }
    setBusy(false);
  };
  const uploadLogo = async (file: File) => {
    if (file.type !== "image/png" || file.size > 2 * 1024 * 1024) return setMessage("اختر شعار PNG لا يتجاوز 2MB.");
    const session = await supabase?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) return setMessage("انتهت جلسة الدخول.");
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/logo", { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "image/png" }, body: file });
      const body = await response.json() as { logo?: { path: string }; message?: string };
      if (!response.ok || !body.logo) throw new Error(body.message ?? "تعذر رفع الشعار.");
      setSettings(current => current ? { ...current, logo_path: body.logo?.path ?? current.logo_path } : current);
      setMessage("تم رفع الشعار والتحقق منه وحفظه في سجل التدقيق.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر رفع الشعار."); }
    setBusy(false);
  };
  const saveContacts = async () => {
    setBusy(true); setMessage("");
    try { const result = await adminFetch<{ contacts: Contact[] }>("/api/admin/contact-links", { method: "PUT", body: JSON.stringify(contacts.map(({ id: _id, ...contact }) => contact)) }); setContacts(result.contacts); setMessage("تم حفظ روابط التواصل وسجل التدقيق."); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر الحفظ."); }
    setBusy(false);
  };
  const inviteManager = async () => {
    setBusy(true); setMessage("");
    try { await adminFetch<{ ok: boolean }>("/api/admin/managers", { method: "POST", body: JSON.stringify({ email: managerEmail }) }); setManagerEmail(""); setMessage("تم إرسال دعوة المدير وتسجيل العملية."); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر إرسال الدعوة."); }
    setBusy(false);
  };
  const logout = async () => { await supabase?.auth.signOut(); setIdentity(null); setRecoveryMode(false); setAdjustments([]); setHealth(null); setSettings(null); setContacts([]); setAuditLogs([]); };

  if (!configured) return <main className="admin-shell"><section className="admin-card"><h1>لوحة الإدارة غير مهيأة</h1><p>لا يمكن تسجيل الدخول قبل ضبط عنوان Supabase ومفتاح publishable في بيئة البناء. لا تعرض هذه الصفحة أي بديل أو حساب تجريبي.</p></section></main>;
  if (recoveryMode) return <main className="admin-shell"><form className="admin-card" onSubmit={updatePassword}><p className="admin-kicker">استعادة آمنة</p><h1>تعيين كلمة مرور جديدة</h1><p>أنشئ كلمة مرور جديدة لحساب الإدارة. يجب ألا تقل عن 8 أحرف أو أرقام.</p><label>كلمة المرور الجديدة<input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} required minLength={8} /></label><label>تأكيد كلمة المرور<input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8} /></label>{message ? <p className="admin-message" aria-live="polite">{message}</p> : null}<button className="admin-primary" disabled={busy}>{busy ? "جارٍ حفظ كلمة المرور…" : "حفظ كلمة المرور"}</button><a className="admin-link" href="/admin">العودة إلى تسجيل الدخول</a></form></main>;
  if (!identity) return <main className="admin-shell"><form className="admin-card" onSubmit={login}><p className="admin-kicker">فخامة الأسطورة V2</p><h1>تسجيل الدخول للإدارة</h1><label>البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{message ? <p className="admin-message">{message}</p> : null}<button className="admin-primary" disabled={busy}>{busy ? "جارٍ التحقق…" : "تسجيل الدخول"}</button><button type="button" className="admin-link" onClick={reset}>نسيت كلمة المرور</button></form></main>;

  return <main className="admin-shell"><header className="admin-header"><div><p className="admin-kicker">{owner ? "OWNER" : "MANAGER"}</p><h1>إدارة فخامة الأسطورة</h1><span>{identity.displayName ?? "حساب الإدارة"}</span></div><div><a href="/">عرض الموقع</a><button onClick={logout}>تسجيل الخروج</button></div></header><p className="admin-message" aria-live="polite">{message}</p><section className="admin-grid"><article className="admin-card admin-prices"><p className="admin-kicker">الأسعار</p><h2>ضبط المتجر</h2><p>يمكنك إضافة أو خصم قيمة بالريال للجرام. لا يملك المدير أي إعدادات أخرى.</p>{adjustments.map(item => (
  <label key={item.carat}>
    {item.carat}K
    <div className="adjustment-input-group">
      <button type="button" className="adjustment-btn" onClick={() => {
        const next = stepAdjustment(item.adjustment_sar, -1);
        setAdjustments(current => current.map(value => value.carat === item.carat ? { ...value, adjustment_sar: next } : value));
      }} aria-label={`إنقاص تعديل عيار ${item.carat}K`} title="إنقاص 1 ⃁">−</button>
      <input 
        inputMode="decimal" 
        value={item.adjustment_sar} 
        onChange={event => { 
          const next = event.target.value; 
          if (isAdjustmentInput(next)) setAdjustments(current => current.map(value => value.carat === item.carat ? { ...value, adjustment_sar: next } : value)); 
        }} 
      />
      <button type="button" className="adjustment-btn" onClick={() => {
        const next = stepAdjustment(item.adjustment_sar, 1);
        setAdjustments(current => current.map(value => value.carat === item.carat ? { ...value, adjustment_sar: next } : value));
      }} aria-label={`زيادة تعديل عيار ${item.carat}K`} title="زيادة 1 ⃁">+</button>
    </div>
  </label>
))}<button className="admin-primary" disabled={busy} onClick={savePrices}>{busy ? "جارٍ الحفظ…" : "حفظ الضبط"}</button></article>{owner ? <><article className="admin-card"><p className="admin-kicker">SYSTEM HEALTH</p><h2>صحة النظام</h2><dl><dt>المصدر</dt><dd>{health?.last_status ?? "غير متاح"}</dd><dt>آخر محاولة</dt><dd>{formatTime(health?.last_attempt_at)}</dd><dt>آخر نجاح</dt><dd>{formatTime(health?.last_successful_at)}</dd><dt>رمز الخطأ</dt><dd>{health?.last_error_code ?? "—"}</dd></dl></article>{settings ? <article className="admin-card admin-owner"><p className="admin-kicker">الهوية والمظهر</p><h2>إعدادات المتجر</h2><label>اسم المتجر<input value={settings.site_name} onChange={event => setSettings({ ...settings, site_name: event.target.value })}/></label><label>العنوان<input value={settings.address} onChange={event => setSettings({ ...settings, address: event.target.value })}/></label><label>لون العنوان<input value={settings.title_color} onChange={event => setSettings({ ...settings, title_color: event.target.value })}/></label><label>المظهر<select value={settings.theme_mode} onChange={event => setSettings({ ...settings, theme_mode: event.target.value })}><option value="system">حسب الجهاز</option><option value="light">فاتح</option><option value="dark">داكن</option></select></label><label className="admin-toggle"><input type="checkbox" checked={settings.show_address} onChange={event => setSettings({ ...settings, show_address: event.target.checked })}/>إظهار العنوان</label><label className="admin-toggle"><input type="checkbox" checked={settings.chart_visible} onChange={event => setSettings({ ...settings, chart_visible: event.target.checked })}/>إظهار المخطط</label><label>شعار المتجر (PNG فقط، حتى 2MB)<input type="file" accept="image/png" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void uploadLogo(file); }}/></label>{logoUrl ? <img className="admin-logo-preview" src={logoUrl} alt="معاينة شعار المتجر" /> : null}<button className="admin-primary" disabled={busy} onClick={saveSettings}>حفظ الإعدادات</button></article> : null}<article className="admin-card admin-owner"><p className="admin-kicker">التواصل</p><h2>روابط مختصرة</h2>{contacts.map((contact, index) => <div className="contact-row" key={contact.id ?? index}><select value={contact.kind} onChange={event => setContacts(current => current.map((value, position) => position === index ? { ...value, kind: event.target.value as Contact["kind"] } : value))}><option value="whatsapp">واتساب</option><option value="phone">اتصال</option><option value="instagram">إنستغرام</option><option value="snapchat">سناب</option><option value="telegram">تيليجرام</option><option value="email">بريد</option></select><input value={contact.label} aria-label="العنوان" onChange={event => setContacts(current => current.map((value, position) => position === index ? { ...value, label: event.target.value } : value))}/><input value={contact.value} aria-label="الرابط أو الرقم" onChange={event => setContacts(current => current.map((value, position) => position === index ? { ...value, value: event.target.value } : value))}/><button onClick={() => setContacts(current => current.filter((_, position) => position !== index))}>حذف</button></div>)}<button className="admin-link" onClick={() => setContacts(current => [...current, { kind: "whatsapp", label: "واتساب", value: "https://wa.me/", sort_order: current.length, is_active: true }])}>إضافة رابط</button><button className="admin-primary" disabled={busy} onClick={saveContacts}>حفظ التواصل</button></article><article className="admin-card admin-owner"><p className="admin-kicker">المستخدمون</p><h2>دعوة مدير</h2><p>سيصل المدير رابط إعداد الحساب بالبريد، وتبقى صلاحياته محصورة في ضبط الأسعار.</p><label>بريد المدير<input type="email" value={managerEmail} onChange={event => setManagerEmail(event.target.value)} placeholder="manager@example.com" /></label><button className="admin-primary" disabled={busy || !managerEmail} onClick={inviteManager}>إرسال الدعوة</button></article><BackupControls disabled={busy} onStatus={setMessage} onRestored={() => { void load().catch(error => setMessage(error instanceof Error ? error.message : "تعذر تحديث البيانات.")); }}/><article className="admin-card admin-owner"><p className="admin-kicker">AUDIT LOG</p><h2>آخر التغييرات</h2><ul className="audit-list">{auditLogs.length ? auditLogs.slice(0, 12).map(log => <li key={log.id}><b>{log.action}</b><span>{log.actor_role ?? "system"} · {formatTime(log.created_at)}</span></li>) : <li>لا توجد عمليات مسجلة بعد.</li>}</ul></article></> : <article className="admin-card"><p className="admin-kicker">حدود المدير</p><h2>صلاحيات مقيدة</h2><p>يستطيع المدير ضبط 24K و21K و18K فقط. لا يستطيع تعديل الهوية أو التواصل أو المستخدمين أو سجل التدقيق أو التحديث المجدول.</p></article>}</section></main>;
}
