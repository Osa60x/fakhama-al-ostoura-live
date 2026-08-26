import { expect, test, type Page } from "@playwright/test";

const themes = [
  ["gold_cream", "ذهب الديوان"],
  ["emerald_gold", "زمرد الصائغ"],
  ["navy_gold", "ليل الياقوت"]
] as const;

async function mockDashboard(page: Page, palette: string) {
  await page.route("**/api/public/dashboard?range=*", async route => {
    const range = new URL(route.request().url()).searchParams.get("range");
    await route.fulfill({ json: {
      data: {
        site_name: "فخامة الأسطورة للذهب والمجوهرات",
        palette,
        xau_usd: 3000,
        final_24_sar: 422.15,
        final_21_sar: 369.38,
        final_18_sar: 316.61,
        fetched_at: "2026-08-26T00:00:00.000Z"
      },
      freshness: "fresh",
      history: range === "day" ? [{ bucket: "2026-08-26T00:00:00Z", price_sar: 420 }, { bucket: "2026-08-26T01:00:00Z", price_sar: 422.15 }] : [],
      status: "ok"
    } });
  });
}

for (const [skin, label] of themes) {
  test(`يعرض ثيمة ${label} من إعدادات المتجر دون وضع ليلي أو نهاري`, async ({ page }) => {
    await mockDashboard(page, skin);
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page).toHaveTitle(/فخامة الأسطورة/);
    await expect(page.locator("main.app-shell")).toHaveAttribute("data-skin", skin);
    await expect(page.getByRole("button", { name: "مظهر فاتح" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "مظهر داكن" })).toHaveCount(0);
  });
}

test("تبقى أدوات الأسعار والحاسبة قابلة للاستخدام بعد تطبيق الثيمة", async ({ page }) => {
  await mockDashboard(page, "emerald_gold");
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "أسبوعي" }).click();
  await expect(page.getByRole("button", { name: "أسبوعي" })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("الوزن بالجرام").fill("12");
  await page.locator('select[name="carat"]').selectOption("24");
  await expect(page.getByText("القيمة التقديرية")).toBeVisible();
  await expect(page.getByRole("button", { name: "مشاركة" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "تحديث العرض" })).toBeEnabled();
});


test("تستخدم كل ثيمة حركة خلفية مميزة وتحترم تفضيل تقليل الحركة", async ({ page }) => {
  const expectedMotion = {
    gold_cream: "gilded-reflection",
    emerald_gold: "emerald-tide",
    navy_gold: "sapphire-orbit"
  } as const;

  for (const [skin] of themes) {
    await mockDashboard(page, skin);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("main.app-shell")).toHaveAttribute("data-skin", skin);
    const animationName = await page.locator("main.app-shell").evaluate(element => getComputedStyle(element, "::before").animationName);
    expect(animationName).toContain(expectedMotion[skin]);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  const reducedAnimationName = await page.locator("main.app-shell").evaluate(element => getComputedStyle(element, "::before").animationName);
  expect(reducedAnimationName).toBe("none");
});
