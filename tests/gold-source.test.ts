import { describe, expect, it } from "vitest";
import { fetchGoldMarketQuote, GoldSourceError } from "../worker/gold-source";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Gold source adapter", () => {
  it("يتحقق من عقد XAU/USD قبل إرجاع السعر", async () => {
    const quote = await fetchGoldMarketQuote({
      fetcher: async () => response({ symbol: "XAU", currency: "USD", price: 4532.7, updatedAt: "2026-08-20T23:20:11Z" })
    });
    expect(quote).toEqual({ xauUsd: 4532.7, sourceUpdatedAt: "2026-08-20T23:20:11.000Z", sourceName: "Gold API" });
  });

  it("يرفض حالة HTTP غير الناجحة", async () => {
    await expect(fetchGoldMarketQuote({ fetcher: async () => response({ error: "bad" }, 400) })).rejects.toMatchObject({ code: "source_unavailable" } satisfies Partial<GoldSourceError>);
  });

  it("يرفض payload ناقصاً أو برمز/عملة غير صحيحين", async () => {
    await expect(fetchGoldMarketQuote({ fetcher: async () => response({ symbol: "XAU", currency: "SAR", price: 1, updatedAt: "2026-08-20T23:20:11Z" }) })).rejects.toMatchObject({ code: "invalid_payload" } satisfies Partial<GoldSourceError>);
  });
});
