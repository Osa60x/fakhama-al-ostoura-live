import { describe, expect, it } from "vitest";
import { TROY_OUNCE_GRAMS, USD_SAR_FIXED, buildCaratPrices, calculateCaratPrice, calculateMarketSarPerGram } from "../src/lib/price";

describe("Price Engine V2", () => {
  it("يستخدم ثوابت الأونصة والتحويل المتفق عليها", () => {
    expect(TROY_OUNCE_GRAMS).toBe(31.1034768);
    expect(USD_SAR_FIXED).toBe(3.75);
  });

  it("يحسب سعر 24K من الأونصة بالدولار", () => {
    expect(calculateMarketSarPerGram(3000, "24")).toBeCloseTo((3000 * 3.75) / 31.1034768, 10);
  });

  it("يحسب عياري 21K و18K من نقاوتهما", () => {
    const base24 = calculateMarketSarPerGram(3000, "24");
    expect(calculateMarketSarPerGram(3000, "21")).toBeCloseTo(base24 * 21 / 24, 10);
    expect(calculateMarketSarPerGram(3000, "18")).toBeCloseTo(base24 * 18 / 24, 10);
  });

  it("يفصل سعر السوق عن ضبط المتجر والسعر النهائي", () => {
    const result = calculateCaratPrice({ xauUsd: 3000, carat: "21", adjustmentSar: 3.25 });
    expect(result.finalSar).toBeCloseTo(result.marketSar + 3.25, 10);
    expect(result.adjustmentSar).toBe(3.25);
  });

  it("ينشئ العيارات العامة الثلاث فقط", () => {
    expect(buildCaratPrices({ xauUsd: 3000 }).map(item => item.carat)).toEqual(["24", "21", "18"]);
  });

  it("يرفض مدخلات السوق وضبط المتجر غير الصالحة", () => {
    expect(() => calculateCaratPrice({ xauUsd: 0, carat: "24" })).toThrow();
    expect(() => calculateCaratPrice({ xauUsd: 3000, carat: "24", adjustmentSar: Number.NaN })).toThrow();
    expect(() => calculateCaratPrice({ xauUsd: 3000, carat: "24", adjustmentSar: -999999 })).toThrow();
  });
});
