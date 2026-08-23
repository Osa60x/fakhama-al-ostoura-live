import { describe, expect, it } from "vitest";
import { isInviteHash, isInviteQuery, isPasswordSetupHash, isPasswordSetupLocation, isRecoveryHash, isRecoveryQuery, validateNewPassword } from "../src/lib/password-recovery";

describe("استعادة كلمة المرور ودعوة المدير", () => {
  it("يكتشف رابط دعوة المدير كرابط إنشاء كلمة مرور أولى", () => {
    expect(isInviteHash("#access_token=test&type=invite")).toBe(true);
    expect(isInviteHash("#access_token=test&type=recovery")).toBe(false);
    expect(isPasswordSetupHash("#access_token=test&type=invite")).toBe(true);
    expect(isPasswordSetupHash("#access_token=test&type=recovery")).toBe(true);
    expect(isInviteQuery("?admin=1&invite=1")).toBe(true);
    expect(isRecoveryQuery("?admin=1&recovery=1")).toBe(true);
    expect(isPasswordSetupLocation("", "?admin=1&invite=1")).toBe(true);
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
