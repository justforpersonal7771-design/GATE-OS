import { chromium, devices } from "playwright";

const BASE = "http://localhost:3000";
const iPhone = devices["iPhone 13"];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const routes = [
    { path: "/", name: "dashboard" },
    { path: "/setup", name: "setup" },
    { path: "/ai-mentor", name: "ai-mentor" },
    { path: "/mistakes", name: "mistakes" },
    { path: "/bookmarks", name: "bookmarks" },
    { path: "/revision", name: "revision" },
    { path: "/analytics", name: "analytics" },
  ];

  const overflowReport = {};

  for (const r of routes) {
    await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => ({
      docScrollWidth: document.documentElement.scrollWidth,
      windowInnerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    overflowReport[r.name] = overflow;
    await page.screenshot({ path: `scratch/mobile-${r.name}.png`, fullPage: true });
  }

  console.log("OVERFLOW_REPORT:", JSON.stringify(overflowReport, null, 2));
  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
