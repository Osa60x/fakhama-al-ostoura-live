import { describe, expect, it } from "vitest";
import { MANAGER_INVITE_REDIRECT, buildManagerInviteUrl } from "../worker/admin";

describe("دعوة المدير", () => {
  it("يبني endpoint دعوة Supabase مع redirect_to لمسار الإدارة", () => {
    const url = new URL(buildManagerInviteUrl("https://project.supabase.co"));
    expect(url.pathname).toBe("/auth/v1/invite");
    expect(url.searchParams.get("redirect_to")).toBe(MANAGER_INVITE_REDIRECT);
  });
});
