import { ApiError, authenticateAdmin, requireRole, type AdminIdentity } from "./auth";
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
    return json({ code: "not_found" }, { status: 404 });
  } catch (error) {
    if (error instanceof ApiError) return json({ code: error.code, message: error.message }, { status: error.status });
    return json({ code: "internal_error", message: "تعذر تنفيذ العملية حالياً." }, { status: 500 });
  }
}
