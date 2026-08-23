import { chromium, firefox, webkit } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.AUDIT_URL ?? "https://gold.osa60x.workers.dev/";
const viewports = [
  [390, 844], [393, 852], [430, 932], [768, 1024], [1024, 768],
  [1280, 900], [1440, 900], [1920, 1080]
];
const browsers = [
  ["chromium", chromium],
  ["firefox", firefox],
  ["webkit", webkit],
];
const results = [];

for (const [browserName, engine] of browsers) {
  let browser;
  try {
    browser = await engine.launch({ headless: true });
  } catch (error) {
    results.push({ browser: browserName, status: "NOT_TESTABLE", reason: String(error) });
    continue;
  }
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const started = Date.now();
    try {
      const response = await page.goto(base, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(600);
      const audit = await page.evaluate(() => ({
        title: document.title,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        viewportWidth: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        h1Count: document.querySelectorAll("h1").length,
        imagesWithoutAlt: [...document.images].filter(image => image.getAttribute("alt") === null).length,
      }));
      let axe = { status: "NOT_RUN" };
      try {
        const axeResults = await new AxeBuilder({ page }).analyze();
        axe = { status: axeResults.violations.length ? "FAIL" : "PASS", violations: axeResults.violations.length, rules: axeResults.violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length })) };
      } catch (error) {
        axe = { status: "FAIL", error: String(error) };
      }
      results.push({ browser: browserName, viewport: `${width}x${height}`, status: response?.status() === 200 && !audit.horizontalOverflow ? "PASS" : "FAIL", httpStatus: response?.status() ?? null, elapsedMs: Date.now() - started, audit, axe });
    } catch (error) {
      results.push({ browser: browserName, viewport: `${width}x${height}`, status: "FAIL", error: String(error), elapsedMs: Date.now() - started });
    } finally {
      await context.close();
    }
  }
  await browser.close();
}

console.log(JSON.stringify({ base, results }, null, 2));
