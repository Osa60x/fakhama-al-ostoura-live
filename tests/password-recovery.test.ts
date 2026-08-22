import { describe, expect, it } from "vitest";
import { isPasswordSetupHash, isRecoveryHash, validateNewPassword } from "../src/lib/password-recovery";

describe("استعادة كلمة المرور ودعوة المدير", () => {
  it("يكتشف رابط دعوة المدير كرابط إنشاء كلمة مرور أولى", () => {
    expect(isPasswordSetupHash("#access_token=test&type=invite")).toBe(true);
    expect(isPasswordSetupHash("#access_token=test&type=recovery")).toBe(true);
    expect(isPasswordSetupHash("#access_token=test&type=email")).toBe(false);
  });
  it("يكتشف رابط Supabase من نوع recovery", () => expect(isRecoveryHash("#access_token=test&type=recovery")).toBe(true));
  it("لا يحول رابط الإدارة العادي إلى وضع الاستعادة", () => expect(isRecoveryHash("")).toBe(false));
  it("يرفض كلمة المرور القصيرة وغير المتطابقة", () => {
    expect(validateNewPassword("short", "short")).toContain("8");
    expect(validateNewPassword("valid-pass", "different")).toContain("متطابقتين");
  });
  it("يقبل كلمة مرور مطابقة بالطول الأدنى", () => expect(validateNewPassword("valid-pass", "valid-pass")).toBeNull());
});
