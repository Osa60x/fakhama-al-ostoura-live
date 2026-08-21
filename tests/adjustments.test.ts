import { describe, expect, it } from "vitest";
import { isAdjustmentInput, normalizeAdjustment, stepAdjustment } from "../src/lib/adjustments";

describe("adjustment input", () => {
  it("يسمح بكتابة السالب قبل الرقم", () => {
    expect(isAdjustmentInput("-")).toBe(true);
    expect(isAdjustmentInput("-12.5")).toBe(true);
    expect(isAdjustmentInput("-12,5")).toBe(true);
  });

  it("يطبع القيمة قبل الحفظ ويحوّل الفاصلة العشرية", () => {
    expect(normalizeAdjustment("-12,5")).toBe(-12.5);
    expect(normalizeAdjustment("0")).toBe(0);
    expect(normalizeAdjustment("-")).toBeNull();
    expect(normalizeAdjustment("")).toBeNull();
  });

  it("يسمح بالحالة الفارغة ويرفض الأحرف", () => {
    expect(isAdjustmentInput("")).toBe(true);
    expect(isAdjustmentInput("abc")).toBe(false);
    expect(isAdjustmentInput("12-3")).toBe(false);
  });

  it("يحسب الخطوة التالية بدقة", () => {
    expect(stepAdjustment("10.50", 1)).toBe("11.50");
    expect(stepAdjustment("10.50", -1)).toBe("9.50");
    expect(stepAdjustment("-", 1)).toBe("1.00");
    expect(stepAdjustment("", -1)).toBe("-1.00");
  });
});
