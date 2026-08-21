import { describe, expect, it } from "vitest";
import { validateAdjustments } from "../worker/admin";
import { ApiError, requireRole, toAdminIdentity, type AdminIdentity } from "../worker/auth";

const manager: AdminIdentity = { id: "user-1", displayName: "Manager", role: "manager", isActive: true };

describe("admin guardrails", () => {
  it("يسمح فقط بعيارات 24 و21 و18 ويقرب التعديل إلى منزلتين", () => {
    expect(validateAdjustments([{ carat: "24", adjustment_sar: 1.239 }, { carat: "21", adjustment_sar: -2 }, { carat: "18", adjustment_sar: 0 }])).toEqual([
      { carat: "24", adjustment_sar: 1.24 }, { carat: "21", adjustment_sar: -2 }, { carat: "18", adjustment_sar: 0 }
    ]);
  });

  it("يرفض عياراً محذوفاً وقيمة خارج الحدود أو مكررة", () => {
    expect(() => validateAdjustments([{ carat: "22", adjustment_sar: 1 }])).toThrow(ApiError);
    expect(() => validateAdjustments([{ carat: "24", adjustment_sar: 6000 }])).toThrow(ApiError);
    expect(() => validateAdjustments([{ carat: "24", adjustment_sar: 1 }, { carat: "24", adjustment_sar: 2 }])).toThrow(ApiError);
  });

  it("يحوّل صف الملف الشخصي من صيغة Supabase إلى هوية الإدارة الصحيحة", () => {
    expect(toAdminIdentity({ id: "owner-1", display_name: "Owner", role: "owner", is_active: true })).toEqual({ id: "owner-1", displayName: "Owner", role: "owner", isActive: true });
    expect(toAdminIdentity({ id: "owner-1", display_name: "Owner", role: "owner", is_active: false })?.isActive).toBe(false);
  });

  it("يمنع المدير من مسارات المالك", () => {
    expect(() => requireRole(manager, ["owner"])).toThrow(ApiError);
    expect(() => requireRole(manager, ["owner", "manager"])).not.toThrow();
  });
});
