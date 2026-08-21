import { useState } from "react";
import { supabase } from "./lib/supabase";

type RestoredPayload = { settings?: unknown; contacts?: unknown; adjustments?: unknown; message?: string };

async function accessToken() {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) throw new Error("انتهت جلسة الدخول.");
  return token;
}

export function BackupControls({ disabled, onStatus, onRestored }: { disabled: boolean; onStatus: (message: string) => void; onRestored: () => void }) {
  const [busy, setBusy] = useState(false);

  const downloadBackup = async () => {
    setBusy(true); onStatus("");
    try {
      const response = await fetch("/api/admin/export-settings", { headers: { Authorization: `Bearer ${await accessToken()}` } });
      const body = await response.json() as RestoredPayload;
      if (!response.ok) throw new Error(body.message ?? "تعذر إنشاء النسخة الاحتياطية.");
      const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `gold-settings-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      URL.revokeObjectURL(url);
      onStatus("تم تنزيل نسخة إعدادات غير حساسة وتسجيل عملية التصدير.");
    } catch (error) { onStatus(error instanceof Error ? error.message : "تعذر إنشاء النسخة الاحتياطية."); }
    setBusy(false);
  };

  const importBackup = async (file: File) => {
    if (file.size > 150_000) return onStatus("ملف النسخة الاحتياطية أكبر من الحد المسموح.");
    if (!window.confirm("سيستبدل هذا الإعدادات وروابط التواصل وتعديلات الأسعار الحالية. هل تريد الاستمرار؟")) return;
    setBusy(true); onStatus("");
    try {
      const payload = JSON.parse(await file.text());
      const response = await fetch("/api/admin/import-settings", { method: "POST", headers: { Authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as RestoredPayload;
      if (!response.ok) throw new Error(body.message ?? "تعذرت استعادة النسخة الاحتياطية.");
      onRestored();
      onStatus("تمت استعادة الإعدادات غير الحساسة وتسجيل العملية في سجل التدقيق.");
    } catch (error) { onStatus(error instanceof Error ? error.message : "تعذرت استعادة النسخة الاحتياطية."); }
    setBusy(false);
  };

  return <article className="admin-card admin-owner"><p className="admin-kicker">BACKUP</p><h2>نسخ الإعدادات</h2><p>يتضمن الاسم والمظهر والتواصل وتعديلات الأسعار فقط. لا يتضمن كلمات المرور أو المفاتيح أو الحسابات.</p><button className="admin-primary" disabled={disabled || busy} onClick={downloadBackup}>{busy ? "جارٍ التنفيذ…" : "تنزيل نسخة JSON"}</button><label>استعادة ملف JSON<input type="file" accept="application/json,.json" disabled={disabled || busy} onChange={event => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void importBackup(file); }} /></label></article>;
}
