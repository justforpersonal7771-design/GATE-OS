import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);

  const t1 = Date.now();
  await page.click('a[href="/analytics"]');
  await page.waitForSelector('text=Subject Accuracy', { timeout: 15000 }).catch(() => {});
  const analyticsFirstLoad = Date.now() - t1;

  const t2 = Date.now();
  await page.click('a[href="/"]');
  await page.waitForTimeout(500);
  const dashboardRevisit = Date.now() - t2;

  const t3 = Date.now();
  await page.click('a[href="/analytics"]');
  await page.waitForTimeout(500);
  const analyticsRevisit = Date.now() - t3;

  console.log("Analytics first load (with compute):", analyticsFirstLoad, "ms");
  console.log("Dashboard revisit (should be near-instant, cached):", dashboardRevisit, "ms");
  console.log("Analytics revisit (should be near-instant, cached):", analyticsRevisit, "ms");
  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
