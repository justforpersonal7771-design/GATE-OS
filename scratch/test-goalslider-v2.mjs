import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.click('button[aria-label="AI Goal Slider"]');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "scratch/gs2-initial.png" });

  // Drag on the chart itself: mousedown near the left, move to middle, release
  const chartBox = await page.locator(".recharts-surface").first().boundingBox();
  if (chartBox) {
    const startX = chartBox.x + chartBox.width * 0.5;
    const y = chartBox.y + chartBox.height * 0.5;
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(chartBox.x + chartBox.width * 0.25, y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: "scratch/gs2-after-drag.png" });

  // Uncheck a topic in the list
  const firstRow = page.locator("button:has(span.w-4.h-4)").first();
  await firstRow.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "scratch/gs2-after-uncheck.png" });

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
