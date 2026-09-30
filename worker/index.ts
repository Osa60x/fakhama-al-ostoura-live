import type { Env } from "./types";
import { refreshPriceSnapshot } from "./price-refresh";
import { formatPublicDashboard, type DashboardRow } from "./public-dashboard";
import { readPublicHistory, type ChartRange } from "./price-history";
import { adminResponse } from "./admin";

const noStore = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };
const LIVE_QUOTE_URL = "https://sabaaek-gold-api.osa60x.workers.dev/quote";
const LIVE_HISTORY_URL = "https://sabaaek-gold-api.osa60x.workers.dev/history";

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { ...init, headers: { ...noStore, ...(init.headers ?? {}) } });
}

async function publicStatus(env: Env, range: ChartRange) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ data: null, status: "unconfigured" }, { status: 503 });
  }

  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/public_dashboard?select=*`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!response.ok) return json({ data: null, status: "unavailable" }, { status: 503 });
  const [rows, history] = await Promise.all([response.json() as Promise<DashboardRow[]>, readPublicHistory(env, range)]);
  return json({ ...formatPublicDashboard(rows), history, status: "ok" });
}

async function liveQuote() {
  const response = await fetch(LIVE_QUOTE_URL, { headers: { accept: "application/json" } });
  if (!response.ok) return json({ error: "live_quote_unavailable" }, { status: 503 });
  return new Response(await response.text(), { headers: { ...noStore, "cache-control": "public, max-age=12, stale-while-revalidate=12" } });
}

async function liveHistory(range: string) {
  const sourceRange = range === "week" ? "7d" : range === "month" ? "30d" : "24h";
  const response = await fetch(`${LIVE_HISTORY_URL}?range=${sourceRange}`, { headers: { accept: "application/json" } });
  if (!response.ok) return json({ points: [] }, { status: 503 });
  return new Response(await response.text(), { headers: { ...noStore, "cache-control": "public, max-age=30, stale-while-revalidate=60" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/public/dashboard" && request.method === "GET") {
      const requestedRange = url.searchParams.get("range");
      const range: ChartRange = requestedRange === "week" || requestedRange === "month" ? requestedRange : "day";
      return publicStatus(env, range);
    }
    if (url.pathname === "/api/live-quote" && request.method === "GET") return liveQuote();
    if (url.pathname === "/api/live-history" && request.method === "GET") return liveHistory(url.searchParams.get("range") ?? "day");
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ status: env.SUPABASE_URL ? "configured" : "unconfigured" });
    }
    if (url.pathname.startsWith("/api/admin/")) return adminResponse(request, env, url.pathname);
    if (request.method === "GET" && url.pathname === "/admin") return Response.redirect(new URL("/?admin=1", request.url), 302);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env, ctx): Promise<void> {
    // هذا هو المسار الوحيد الذي يتصل بمصدر الذهب؛ لا تستدعيه الواجهة العامة.
    ctx.waitUntil(refreshPriceSnapshot(env));
  }
} satisfies ExportedHandler<Env>;
