import { describe, expect, it } from "vitest";
import { isRecoveryHash, validateNewPassword } from "../src/lib/password-recovery";

describe("استعادة كلمة المرور", () => {
  it("يكتشف رابط Supabase من نوع recovery", () => expect(isRecoveryHash("#access_token=test&type=recovery")).toBe(true));
  it("لا يحول رابط الإدارة العادي إلى وضع الاستعادة", () => expect(isRecoveryHash("")).toBe(false));
  it("يرفض كلمة المرور القصيرة وغير المتطابقة", () => {
    expect(validateNewPassword("short", "short")).toContain("8");
    expect(validateNewPassword("valid-pass", "different")).toContain("متطابقتين");
  });
  it("يقبل كلمة مرور مطابقة بالطول الأدنى", () => expect(validateNewPassword("valid-pass", "valid-pass")).toBeNull());
});
