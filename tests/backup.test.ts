import { describe, expect, it } from "vitest";
import { validateSettingsBackup } from "../worker/admin";

const validBackup = {
  schema_version: "v1",
  settings: { site_name: "فخامة الذهب", address: "الرياض" },
  contacts: [{ kind: "whatsapp", label: "واتساب", value: "https://wa.me/966500000000", sort_order: 0, is_active: true }],
  adjustments: [{ carat: "24", adjustment_sar: 1 }, { carat: "21", adjustment_sar: 0 }, { carat: "18", adjustment_sar: -1 }]
};

describe("نسخة الإعدادات", () => {
  it("تقبل إعدادات غير حساسة بإصدار معروف", () => expect(validateSettingsBackup(validBackup).schema_version).toBe("v1"));
  it("ترفض إصداراً غير مدعوم", () => expect(() => validateSettingsBackup({ ...validBackup, schema_version: "v2" })).toThrow("إصدار النسخة"));
  it("ترفض نسخة تفتقد أحد العيارات الثلاثة", () => expect(() => validateSettingsBackup({ ...validBackup, adjustments: validBackup.adjustments.slice(0, 2) })).toThrow("24K"));
});
