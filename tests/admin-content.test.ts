import { describe, expect, it } from "vitest";
import { validateContacts, validateManagerEmail, validateSettings } from "../worker/admin-content";
import { ApiError } from "../worker/auth";

describe("owner content validation", () => {
  it("يقبل حقول إعدادات المالك المعروفة وقيم HEX السليمة", () => {
    expect(validateSettings({ site_name: "ذهب", title_color: "#A1823D", chart_visible: true })).toEqual({ site_name: "ذهب", title_color: "#A1823D", chart_visible: true });
  });

  it("يرفض حقلاً غير مسموح ولوناً غير صحيح", () => {
    expect(() => validateSettings({ role: "owner" })).toThrow(ApiError);
    expect(() => validateSettings({ title_color: "gold" })).toThrow(ApiError);
  });

  it("يقبل أنواع التواصل المحددة ويرفض نوعاً أو طولاً غير صالح", () => {
    expect(validateContacts([{ kind: "whatsapp", label: "واتساب", value: "https://wa.me/966500000000", sort_order: 0, is_active: true }])[0].kind).toBe("whatsapp");
    expect(() => validateContacts([{ kind: "map", label: "خ", value: "x" }])).toThrow(ApiError);
  });

  it("يقنن بريد دعوة المدير ويرفض صيغة غير صالحة", () => {
    expect(validateManagerEmail(" MANAGER@example.com ")).toBe("manager@example.com");
    expect(() => validateManagerEmail("not-an-email")).toThrow(ApiError);
  });
});
