export const TROY_OUNCE_GRAMS = 31.1034768;
export const USD_SAR_FIXED = 3.75;

export const CARATS = ["24", "21", "18"] as const;
export type Carat = (typeof CARATS)[number];

const purity: Record<Carat, number> = {
  "24": 1,
  "21": 21 / 24,
  "18": 18 / 24
};

export type CaratPrice = {
  carat: Carat;
  marketSar: number;
  adjustmentSar: number;
  finalSar: number;
};

export function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateMarketSarPerGram(xauUsd: number, carat: Carat, usdSar = USD_SAR_FIXED): number {
  if (!isFinitePositive(xauUsd) || !isFinitePositive(usdSar)) {
    throw new Error("لا يمكن حساب السعر من قيمة سوق أو تحويل غير صالحة.");
  }
  return (xauUsd * usdSar * purity[carat]) / TROY_OUNCE_GRAMS;
}

export function calculateCaratPrice(input: { xauUsd: number; carat: Carat; adjustmentSar?: number; usdSar?: number }): CaratPrice {
  const adjustmentSar = input.adjustmentSar ?? 0;
  if (!Number.isFinite(adjustmentSar)) throw new Error("ضبط المتجر يجب أن يكون قيمة رقمية صالحة.");
  const marketSar = calculateMarketSarPerGram(input.xauUsd, input.carat, input.usdSar);
  const finalSar = marketSar + adjustmentSar;
  if (!isFinitePositive(finalSar)) throw new Error("لا يمكن أن يكون السعر النهائي صفراً أو سالباً.");
  return { carat: input.carat, marketSar, adjustmentSar, finalSar };
}

export function buildCaratPrices(input: { xauUsd: number; adjustments?: Partial<Record<Carat, number>>; usdSar?: number }): CaratPrice[] {
  return CARATS.map(carat => calculateCaratPrice({
    xauUsd: input.xauUsd,
    carat,
    adjustmentSar: input.adjustments?.[carat] ?? 0,
    usdSar: input.usdSar
  }));
}
