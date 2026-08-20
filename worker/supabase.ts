import type { Env } from "./types";

function configured(env: Env): asserts env is Env & Required<Pick<Env, "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY">> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_UNCONFIGURED");
}

function headers(env: Env) {
  configured(env);
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "content-type": "application/json"
  };
}

export async function readAdjustments(env: Env): Promise<Record<"24" | "21" | "18", number>> {
  configured(env);
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/price_adjustments?select=carat,adjustment_sar`, { headers: headers(env) });
  if (!response.ok) throw new Error("SUPABASE_READ_ADJUSTMENTS_FAILED");
  const values = await response.json() as Array<{ carat: "24" | "21" | "18"; adjustment_sar: string | number }>;
  return values.reduce<Record<"24" | "21" | "18", number>>((result, item) => {
    if (item.carat === "24" || item.carat === "21" || item.carat === "18") result[item.carat] = Number(item.adjustment_sar);
    return result;
  }, { "24": 0, "21": 0, "18": 0 });
}

export async function callRpc(env: Env, procedure: string, body: Record<string, unknown>): Promise<void> {
  configured(env);
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${procedure}`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`SUPABASE_RPC_${procedure.toUpperCase()}_FAILED`);
}
