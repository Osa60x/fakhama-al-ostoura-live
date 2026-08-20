import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshPriceSnapshot } from "../worker/price-refresh";
import type { Env } from "../worker/types";

const env: Env = {
  ASSETS: {} as Fetcher,
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "server-only-test-key",
  GOLD_API_URL: "https://gold.example.test/XAU/USD"
};

function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("scheduled price refresh", () => {
  it("يحفظ لقطة محسوبة من Worker فقط عند نجاح المصدر", async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL, _options?: RequestInit) => {
      const target = String(url);
      if (target === env.GOLD_API_URL) return json({ symbol: "XAU", currency: "USD", price: 3000, updatedAt: "2026-08-20T23:20:11Z" });
      if (target.includes("price_adjustments")) return json([{ carat: "24", adjustment_sar: 1 }, { carat: "21", adjustment_sar: 2 }, { carat: "18", adjustment_sar: 3 }]);
      if (target.includes("record_price_snapshot")) return json(null, 204);
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);

    await expect(refreshPriceSnapshot(env)).resolves.toEqual({ status: "ok" });
    const request = fetcher.mock.calls.find(([url]) => String(url).includes("record_price_snapshot"));
    expect(request).toBeTruthy();
    const body = JSON.parse(String(request?.[1]?.body));
    expect(body.p_xau_usd).toBe(3000);
    expect(body.p_final_24_sar).toBeGreaterThan(body.p_market_24_sar);
    expect(body.p_final_21_sar).toBeGreaterThan(body.p_market_21_sar);
  });

  it("لا يكتب لقطة جديدة عند فشل المصدر، ويسجل حالة خطأ فقط", async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL, _options?: RequestInit) => {
      const target = String(url);
      if (target === env.GOLD_API_URL) return json({ error: "upstream" }, 503);
      if (target.includes("price_adjustments")) return json([]);
      if (target.includes("record_price_failure")) return json(null, 204);
      throw new Error(`unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);

    await expect(refreshPriceSnapshot(env)).resolves.toEqual({ status: "error" });
    expect(fetcher.mock.calls.some(([url]) => String(url).includes("record_price_snapshot"))).toBe(false);
    const failure = fetcher.mock.calls.find(([url]) => String(url).includes("record_price_failure"));
    expect(JSON.parse(String(failure?.[1]?.body))).toEqual({ p_error_code: "source_unavailable" });
  });
});
