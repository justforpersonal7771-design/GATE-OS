import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.click('button[aria-label="Focus Target"]');
  await page.waitForTimeout(2000);

  // Drag chart to ~35%
  const chartBox = await page.locator(".recharts-surface").first().boundingBox();
  if (chartBox) {
    const y = chartBox.y + chartBox.height * 0.5;
    await page.mouse.move(chartBox.x + chartBox.width * 0.5, y);
    await page.mouse.down();
    await page.mouse.move(chartBox.x + chartBox.width * 0.33, y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: "scratch/ft-panel-state.png" });
  await page.click('button[aria-label="Close"]');
  await page.waitForTimeout(500);

  // Go to Setup, Subject Mastery
  await page.goto(`${BASE}/setup`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.getByText("Official Year Paper", { exact: false }).first().click();
  await page.waitForTimeout(300);
  await page.getByText("Subject Mastery", { exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scratch/ft-setup-subject-select.png" });

  await page.click('button:has-text("Generate Blueprint")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "scratch/ft-setup-blueprint.png" });

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
