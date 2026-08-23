import { chromium } from "@playwright/test";

const base = process.env.AUDIT_URL ?? "https://gold.osa60x.workers.dev/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  window.__audit = { fcp: null, lcp: null };
  new PerformanceObserver(list => {
    const entry = list.getEntries().at(-1);
    if (entry) window.__audit.fcp = entry.startTime;
  }).observe({ type: "paint", buffered: true });
  new PerformanceObserver(list => {
    const entry = list.getEntries().at(-1);
    if (entry) window.__audit.lcp = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
});

const started = Date.now();
const response = await page.goto(base, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
const navigation = await page.evaluate(() => performance.getEntriesByType("navigation")[0]);
const resources = await page.evaluate(() => performance.getEntriesByType("resource").map(entry => ({
  name: entry.name,
  duration: Math.round(entry.duration),
  transferSize: entry.transferSize ?? 0,
  encodedBodySize: entry.encodedBodySize ?? 0,
})));
const metrics = await page.evaluate(() => ({
  audit: window.__audit,
  title: document.title,
  lang: document.documentElement.getAttribute("lang"),
  dir: document.documentElement.getAttribute("dir"),
  headings: [...document.querySelectorAll("h1,h2,h3")].map(node => ({ tag: node.tagName, text: node.textContent?.trim() })),
  images: [...document.images].map(image => ({ src: image.currentSrc || image.src, alt: image.getAttribute("alt") })),
  controls: [...document.querySelectorAll("button,a,input,select,textarea")].map(node => ({
    tag: node.tagName,
    text: node.textContent?.trim(),
    aria: node.getAttribute("aria-label"),
    title: node.getAttribute("title"),
    labelText: node.closest("label")?.textContent?.trim(),
    type: node.getAttribute("type"),
    href: node.getAttribute("href"),
    labelledBy: node.getAttribute("aria-labelledby"),
  })),
  viewport: { width: innerWidth, height: innerHeight },
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
}));

const unnamedControls = metrics.controls.filter(control => {
  if (control.tag === "A" && !control.href) return false;
  return ![control.text, control.aria, control.title, control.labelledBy, control.labelText].some(Boolean);
});
const badImages = metrics.images.filter(image => image.alt === null);
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(700);
const mobileLayout = await page.evaluate(() => ({ viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 }));

const result = {
  url: base,
  status: response?.status() ?? null,
  wallClockMs: Date.now() - started,
  navigation: {
    domContentLoadedMs: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
    loadEventMs: Math.round(navigation?.loadEventEnd ?? 0),
    responseEndMs: Math.round(navigation?.responseEnd ?? 0),
  },
  paint: metrics.audit,
  transferredBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
  resourceCount: resources.length,
  slowestResources: [...resources].sort((a, b) => b.duration - a.duration).slice(0, 5),
  accessibility: {
    documentTitlePresent: Boolean(metrics.title),
    lang: metrics.lang,
    dir: metrics.dir,
    headingCount: metrics.headings.length,
    h1Count: metrics.headings.filter(item => item.tag === "H1").length,
    imagesWithoutAlt: badImages,
    unnamedControls,
  },
  layout: {
    horizontalOverflow: metrics.scrollWidth > metrics.viewport.width + 1,
    viewport: metrics.viewport,
    scrollWidth: metrics.scrollWidth,
    mobile: mobileLayout,
  },
  headings: metrics.headings,
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
