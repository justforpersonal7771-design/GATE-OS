import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/revision`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "scratch/revision-redesign.png" });

  // Also check no page-level vertical scroll exists (only internal queue scroll)
  const scrollInfo = await page.evaluate(() => ({
    bodyScrollHeight: document.body.scrollHeight,
    windowInnerHeight: window.innerHeight,
  }));
  console.log("SCROLL_INFO:", JSON.stringify(scrollInfo));
  console.log("ERRORS:", JSON.stringify(errors));

  await browser.close();
})();
