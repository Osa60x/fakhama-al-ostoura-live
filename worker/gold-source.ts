export type GoldMarketQuote = {
  xauUsd: number;
  sourceUpdatedAt: string;
  sourceName: "Gold API";
};

type GoldApiPayload = {
  currency?: unknown;
  price?: unknown;
  symbol?: unknown;
  updatedAt?: unknown;
};

export class GoldSourceError extends Error {
  constructor(public readonly code: "source_unavailable" | "invalid_payload", message: string) {
    super(message);
    this.name = "GoldSourceError";
  }
}

const DEFAULT_GOLD_URL = "https://api.gold-api.com/price/XAU/USD";

export async function fetchGoldMarketQuote(input: { url?: string; fetcher?: typeof fetch; timeoutMs?: number } = {}): Promise<GoldMarketQuote> {
  const fetcher = input.fetcher ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 12_000);
  try {
    const response = await fetcher(input.url ?? DEFAULT_GOLD_URL, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new GoldSourceError("source_unavailable", `مصدر الذهب أعاد الحالة ${response.status}.`);
    }
    const payload = await response.json() as GoldApiPayload;
    const price = typeof payload.price === "number" ? payload.price : Number(payload.price);
    const timestamp = typeof payload.updatedAt === "string" ? new Date(payload.updatedAt) : new Date(Number.NaN);
    if (payload.symbol !== "XAU" || payload.currency !== "USD" || !Number.isFinite(price) || price <= 0 || Number.isNaN(timestamp.getTime())) {
      throw new GoldSourceError("invalid_payload", "استجابة مصدر الذهب لا تطابق العقد المتوقع.");
    }
    return { xauUsd: price, sourceUpdatedAt: timestamp.toISOString(), sourceName: "Gold API" };
  } catch (error) {
    if (error instanceof GoldSourceError) throw error;
    throw new GoldSourceError("source_unavailable", "تعذر الاتصال بمصدر الذهب ضمن المهلة المحددة.");
  } finally {
    clearTimeout(timeout);
  }
}
