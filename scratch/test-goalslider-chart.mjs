import { chromium } from "playwright";

const BASE = "http://localhost:3001";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.click('button[aria-label="AI Goal Slider"]');
  await page.waitForTimeout(1500);
  // Viewport-only screenshot (no fullPage) so the fixed modal captures correctly
  await page.screenshot({ path: "scratch/goal-slider-viewport.png" });
  await browser.close();
})();
