// End-to-end smoke test: setup -> generate -> deploy -> answer -> submit -> results -> review
import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(`[console] ${msg.text()}`); });
page.on("pageerror", (err) => errors.push(`[pageerror] ${err}`));
page.on("response", (res) => { if (res.status() >= 500) errors.push(`[http ${res.status()}] ${res.url()}`); });

const step = (s) => console.log(`\n--- ${s} ---`);
const shot = async (name) => page.screenshot({ path: `scratch/screens/smoke/flow-${name}.png`, fullPage: true });

try {
  step("1. Navigate to /setup");
  await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot("01-setup");

  step("2. Click Generate Blueprint (default: Official Year Paper)");
  await page.click('button:has-text("Generate Blueprint")');
  await page.waitForTimeout(800);
  await shot("02-blueprint");

  const blueprintVisible = await page.locator('text=Deploy Session').isVisible().catch(() => false);
  console.log("Blueprint generated, Deploy Session visible:", blueprintVisible);

  step("3. Click Deploy Session");
  await page.click('button:has-text("Deploy Session")');
  await page.waitForURL("**/exam/session", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await shot("03-exam-session");

  step("4. Answer first question (click first option) and Save & Next x3");
  for (let i = 0; i < 3; i++) {
    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ });
    const count = await optionButtons.count();
    if (count > 0) {
      await optionButtons.first().click();
      await page.waitForTimeout(300);
    }
    const saveNext = page.locator('button:has-text("Save & Next")');
    if (await saveNext.isVisible().catch(() => false)) {
      await saveNext.click();
      await page.waitForTimeout(500);
    }
  }
  await shot("04-answered");

  step("5. Click Submit -> Confirm Submit");
  await page.click('button:has-text("Submit")');
  await page.waitForTimeout(500);
  await shot("05-submit-dialog");
  await page.click('button:has-text("Confirm Submit")');
  await page.waitForTimeout(2000);
  await shot("06-post-submit");

  step("6. Click Compute Results");
  const computeBtn = page.locator('button:has-text("Compute Results")');
  if (await computeBtn.isVisible().catch(() => false)) {
    await computeBtn.click();
    await page.waitForTimeout(2000);
  }
  console.log("URL after compute:", page.url());
  await shot("07-results");

  step("7. Navigate to Review from Results (if link present)");
  const reviewLink = page.locator('button:has-text("Review"), a:has-text("Review")');
  if (await reviewLink.first().isVisible().catch(() => false)) {
    await reviewLink.first().click();
    await page.waitForTimeout(1500);
    await shot("08-review");
  }

  console.log("\n=== FLOW COMPLETE ===");
} catch (e) {
  console.error("FLOW FAILED:", e.message);
  await shot("ERROR");
} finally {
  console.log("\n=== ERRORS/WARNINGS CAPTURED ===");
  if (errors.length === 0) console.log("None.");
  else errors.forEach((e) => console.log(" -", e));
  await browser.close();
}
