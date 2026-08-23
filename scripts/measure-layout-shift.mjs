import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.route("**/api/public/dashboard**", async route => {
  await new Promise(resolve => setTimeout(resolve, 1800));
  await route.continue();
});
const page = await context.newPage();
await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput && entry.value) window.__shifts.push({ value: entry.value, startTime: entry.startTime, sources: entry.sources?.map(source => ({ tag: source.node?.tagName, previousRect: source.previousRect, currentRect: source.currentRect })) });
    }
  }).observe({ type: "layout-shift", buffered: true });
});
const samples = [];
await page.goto("https://gold.osa60x.workers.dev/", { waitUntil: "domcontentloaded" });
const read = async label => samples.push({ label, time: Date.now(), boxes: await page.evaluate(() => Object.fromEntries([".topbar", ".market-summary", ".prices-section", ".insights-grid"].map(selector => { const rect = document.querySelector(selector)?.getBoundingClientRect(); return [selector, rect ? { top: rect.top, height: rect.height } : null]; }))) });
await read("before-data");
await page.waitForTimeout(2400);
await read("after-data");
console.log(JSON.stringify({ samples, shifts: await page.evaluate(() => window.__shifts) }, null, 2));
await context.close();
await browser.close();
