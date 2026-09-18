import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });

  // Launch a quick Subject test via Setup
  await page.goto(`${BASE}/setup`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.getByText("Official Year Paper", { exact: false }).first().click();
  await page.waitForTimeout(300);
  await page.getByText("Subject Mastery", { exact: true }).click();
  await page.waitForTimeout(800);
  await page.click('button:has-text("Generate Blueprint")');
  await page.waitForTimeout(1000);
  const startBtn = page.locator('button:has-text("Deploy Session")').first();
  if (await startBtn.count() > 0) {
    await startBtn.click();
    await page.waitForTimeout(2000);
  }

  console.log("URL after start:", page.url());

  // Submit immediately (no answers) to generate a completed session
  const submitBtn = page.locator('button:has-text("Submit")').first();
  if (await submitBtn.count() > 0) {
    await submitBtn.click();
    await page.waitForTimeout(600);
    const confirmBtn = page.locator('button:has-text("Submit Exam"), button:has-text("Confirm")').last();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
      await page.waitForTimeout(2000);
    }
  }
  console.log("URL after submit:", page.url());

  // Go to dashboard and check Recent Exams
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scratch/recent-exams-populated.png" });

  // Expand drilldown
  const firstRow = page.locator('button:has(svg.lucide-chevron-down)').first();
  if (await firstRow.count() > 0) {
    await firstRow.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scratch/recent-exams-expanded.png" });
  }

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
