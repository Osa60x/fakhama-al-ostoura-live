import { buildCaratPrices } from "../src/lib/price";
import { fetchGoldMarketQuote, GoldSourceError } from "./gold-source";
import { callRpc, readAdjustments } from "./supabase";
import type { Env } from "./types";

export async function refreshPriceSnapshot(env: Env): Promise<{ status: "ok" | "error" | "unconfigured" }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { status: "unconfigured" };
  try {
    const [quote, adjustments] = await Promise.all([
      fetchGoldMarketQuote({ url: env.GOLD_API_URL }),
      readAdjustments(env)
    ]);
    const prices = buildCaratPrices({ xauUsd: quote.xauUsd, adjustments });
    const byCarat = Object.fromEntries(prices.map(price => [price.carat, price])) as Record<"24" | "21" | "18", (typeof prices)[number]>;
    await callRpc(env, "record_price_snapshot", {
      p_xau_usd: quote.xauUsd,
      p_source_name: quote.sourceName,
      p_source_updated_at: quote.sourceUpdatedAt,
      p_market_24_sar: byCarat["24"].marketSar,
      p_market_21_sar: byCarat["21"].marketSar,
      p_market_18_sar: byCarat["18"].marketSar,
      p_final_24_sar: byCarat["24"].finalSar,
      p_final_21_sar: byCarat["21"].finalSar,
      p_final_18_sar: byCarat["18"].finalSar
    });
    return { status: "ok" };
  } catch (error) {
    const code = error instanceof GoldSourceError ? error.code : "storage_failed";
    await callRpc(env, "record_price_failure", { p_error_code: code }).catch(() => undefined);
    return { status: "error" };
  }
}
