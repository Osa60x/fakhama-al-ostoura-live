import type { Env } from "./types";

export type ChartRange = "day" | "week" | "month";
export type HistoryPoint = { bucket: string; price_sar: number | string };

export async function readPublicHistory(env: Env, range: ChartRange): Promise<HistoryPoint[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/public_price_history`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ p_range: range })
  });
  if (!response.ok) return [];
  return await response.json() as HistoryPoint[];
}
