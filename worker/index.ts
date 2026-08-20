import type { Env } from "./types";

const noStore = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { ...init, headers: { ...noStore, ...(init.headers ?? {}) } });
}

async function publicStatus(env: Env) {
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
  return json({ data: await response.json(), status: "ok" });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/public/dashboard" && request.method === "GET") return publicStatus(env);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ status: env.SUPABASE_URL ? "configured" : "unconfigured" });
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(): Promise<void> {
    // Phase 8 adds the only source-refresh path. Public visitors never invoke it.
  }
} satisfies ExportedHandler<Env>;
