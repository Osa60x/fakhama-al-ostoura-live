import { expect, test } from "@playwright/test";

test("يعرض لوحة أسعار عامة قابلة للتفاعل", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "networkidle" });

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/فخامة الأسطورة/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "مظهر داكن" }).click();
  await expect(page.locator("main.app-shell")).toHaveAttribute("data-theme", "dark");
});
