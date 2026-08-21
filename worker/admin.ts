import { ApiError, authenticateAdmin, requireRole, type AdminIdentity } from "./auth";
import { validateContacts, validateManagerEmail, validateSettings } from "./admin-content";
import { callRpc } from "./supabase";
import type { Env } from "./types";

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...(init.headers ?? {}) } });

function systemHeaders(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError(503, "unconfigured", "الخدمة الإدارية غير مهيأة بعد.");
  return { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" };
}

async function readAdjustments(env: Env) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/price_adjustments?select=carat,adjustment_sar,updated_at&order=carat.desc`, { headers: systemHeaders(env) });
  if (!response.ok) throw new Error("ADJUSTMENTS_READ_FAILED");
  return response.json();
}

export function validateAdjustments(value: unknown): Array<{ carat: "24" | "21" | "18"; adjustment_sar: number }> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) throw new ApiError(400, "invalid_input", "صيغة التعديلات غير صالحة.");
  const unique = new Set<string>();
  return value.map(item => {
    if (typeof item !== "object" || item === null) throw new ApiError(400, "invalid_input", "صيغة التعديل غير صالحة.");
    const record = item as Record<string, unknown>;
    const carat = record.carat;
    const adjustment = Number(record.adjustment_sar);
    if ((carat !== "24" && carat !== "21" && carat !== "18") || unique.has(carat) || !Number.isFinite(adjustment) || adjustment < -5000 || adjustment > 5000) {
      throw new ApiError(400, "invalid_input", "يقبل النظام عيارات 24 و21 و18 وتعديلات رقمية ضمن الحد المسموح.");
    }
    unique.add(carat);
    return { carat, adjustment_sar: Math.round(adjustment * 100) / 100 };
  });
}

async function audit(env: Env) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/audit_logs?select=id,action,entity_type,entity_id,actor_role,created_at,before_value,after_value&order=created_at.desc&limit=100`, { headers: systemHeaders(env) });
  if (!response.ok) throw new Error("AUDIT_READ_FAILED");
  return response.json();
}

async function readSiteSettings(env: Env) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/site_settings?select=*&id=eq.true`, { headers: systemHeaders(env) });
  if (!response.ok) throw new Error("SETTINGS_READ_FAILED");
  return (await response.json() as Array<Record<string, unknown>>)[0] ?? null;
}

async function readContacts(env: Env) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/contact_links?select=id,kind,label,value,sort_order,is_active&order=sort_order.asc`, { headers: systemHeaders(env) });
  if (!response.ok) throw new Error("CONTACTS_READ_FAILED");
  return response.json();
}

async function inviteManager(env: Env, actor: AdminIdentity, email: string) {
  const headers = systemHeaders(env);
  const inviteResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/invite`, { method: "POST", headers, body: JSON.stringify({ email, data: { role: "manager" } }) });
  if (!inviteResponse.ok) throw new ApiError(400, "invalid_input", "تعذر إرسال دعوة المدير. تحقق من البريد أو إعدادات البريد.");
  const invited = await inviteResponse.json() as { id?: string };
  if (!invited.id) throw new Error("MANAGER_INVITE_NO_USER");
  const promoteResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(invited.id)}`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ role: "manager", is_active: true }) });
  if (!promoteResponse.ok) throw new Error("MANAGER_PROMOTION_FAILED");
  const inviteRecord = await fetch(`${env.SUPABASE_URL}/rest/v1/manager_invites`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ email, invited_by: actor.id, claimed_by: invited.id, is_active: true }) });
  if (!inviteRecord.ok) throw new Error("MANAGER_INVITE_RECORD_FAILED");
  await fetch(`${env.SUPABASE_URL}/rest/v1/audit_logs`, { method: "POST", headers, body: JSON.stringify({ actor_id: actor.id, actor_role: actor.role, action: "manager_invited", entity_type: "manager_invites", entity_id: invited.id, after_value: { email } }) });
}

export async function adminResponse(request: Request, env: Env, path: string): Promise<Response> {
  try {
    const identity = await authenticateAdmin(request, env);
    if (path === "/api/admin/me" && request.method === "GET") return json({ identity });
    if (path === "/api/admin/price-adjustments" && request.method === "GET") {
      requireRole(identity, ["owner", "manager"]);
      return json({ adjustments: await readAdjustments(env) });
    }
    if (path === "/api/admin/price-adjustments" && request.method === "PUT") {
      requireRole(identity, ["owner", "manager"]);
      const body = await request.json().catch(() => null);
      const adjustments = validateAdjustments(body);
      await callRpc(env, "apply_price_adjustments", { p_actor: identity.id, p_actor_role: identity.role, p_adjustments: adjustments });
      return json({ ok: true, adjustments: await readAdjustments(env) });
    }
    if (path === "/api/admin/audit" && request.method === "GET") {
      requireRole(identity, ["owner"]);
      return json({ logs: await audit(env) });
    }
    if (path === "/api/admin/system-health" && request.method === "GET") {
      requireRole(identity, ["owner"]);
      const response = await fetch(`${env.SUPABASE_URL}/rest/v1/price_runtime_status?select=last_status,last_attempt_at,last_successful_at,last_error_code,updated_at&id=eq.true`, { headers: systemHeaders(env) });
      if (!response.ok) throw new Error("HEALTH_READ_FAILED");
      const rows = await response.json() as Array<Record<string, unknown>>;
      return json({ status: rows[0] ?? null });
    }
    if (path === "/api/admin/site-settings" && request.method === "GET") {
      requireRole(identity, ["owner"]);
      return json({ settings: await readSiteSettings(env) });
    }
    if (path === "/api/admin/site-settings" && request.method === "PUT") {
      requireRole(identity, ["owner"]);
      const settings = validateSettings(await request.json().catch(() => null));
      await callRpc(env, "update_site_settings", { p_actor: identity.id, p_settings: settings });
      return json({ settings: await readSiteSettings(env) });
    }
    if (path === "/api/admin/contact-links" && request.method === "GET") {
      requireRole(identity, ["owner"]);
      return json({ contacts: await readContacts(env) });
    }
    if (path === "/api/admin/contact-links" && request.method === "PUT") {
      requireRole(identity, ["owner"]);
      const contacts = validateContacts(await request.json().catch(() => null));
      await callRpc(env, "replace_contact_links", { p_actor: identity.id, p_contacts: contacts });
      return json({ contacts: await readContacts(env) });
    }
    if (path === "/api/admin/managers" && request.method === "POST") {
      requireRole(identity, ["owner"]);
      const body = await request.json().catch(() => null) as Record<string, unknown> | null;
      const email = validateManagerEmail(body?.email);
      await inviteManager(env, identity, email);
      return json({ ok: true });
    }
    return json({ code: "not_found" }, { status: 404 });
  } catch (error) {
    if (error instanceof ApiError) return json({ code: error.code, message: error.message }, { status: error.status });
    return json({ code: "internal_error", message: "تعذر تنفيذ العملية حالياً." }, { status: 500 });
  }
}
