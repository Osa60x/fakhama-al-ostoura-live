import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

import { AdminPage } from "../src/AdminPage";

function renderForHash(hash: string, search = "") {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { hash, search } },
  });
  return renderToStaticMarkup(<AdminPage />);
}

describe("AdminPage authentication UI", () => {
  it.each(["#access_token=probe&type=invite", "#access_token=probe&type=recovery"])(
    "يعرض إنشاء كلمة المرور عند وجود %s",
    hash => {
      const html = renderForHash(hash);
      expect(html).toContain("تعيين كلمة مرور جديدة");
      expect(html.match(/type=\"password\"/g)).toHaveLength(2);
      expect(html).toContain("حفظ كلمة المرور");
    },
  );

  it("يعرض نموذج تعيين كلمة المرور عند فقدان hash ووجود invite query", () => {
    const html = renderForHash("", "?admin=1&invite=1");
    expect(html).toContain("دعوة مدير");
    expect(html).toContain("تعيين كلمة مرور جديدة");
  });

  it("يعرض نموذج الدخول للرابط العادي", () => {
    const html = renderForHash("");
    expect(html).toContain("تسجيل الدخول للإدارة");
    expect(html).toContain("نسيت كلمة المرور");
    expect(html).not.toContain("تعيين كلمة مرور جديدة");
  });
});
