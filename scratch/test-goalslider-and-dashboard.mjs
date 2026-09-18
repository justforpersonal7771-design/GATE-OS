import { chromium } from "playwright";

const BASE = "http://localhost:3001";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scratch/dashboard-redesign.png", fullPage: true });

  // Open Goal Slider panel from Topbar
  await page.click('button[aria-label="AI Goal Slider"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scratch/goal-slider-panel.png", fullPage: true });

  // Move slider
  const slider = await page.$('input[type="range"]');
  if (slider) {
    await slider.fill("50");
    await page.waitForTimeout(800);
    await page.screenshot({ path: "scratch/goal-slider-50pct.png", fullPage: true });
  }

  console.log("ERRORS:", JSON.stringify(errors, null, 2));
  await browser.close();
})();
