import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

const result = {};
try {
  await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);
  const trigger = page.getByRole("button", { name: /Official Year Paper/ }).first();
  await trigger.click();
  await page.waitForTimeout(300);
  await page.getByText("Custom Advanced Generator", { exact: true }).click();
  await page.waitForTimeout(600);

  await page.click('text=Add Selection Block');
  await page.waitForTimeout(600);

  // Pick a Subject in the block to narrow the pool (tests cascading dropdown)
  const subjectDropdown = page.locator('div').filter({ hasText: /^Subject$/ }).locator('..').locator('button').first();
  await subjectDropdown.click().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: "scratch/screens/smoke/custom-full-subject-open.png", fullPage: true });

  // Default is "All matching" (975) — override with a small manual count to
  // keep the exam session fast, and to exercise the includeAll:false path.
  const countInput = page.locator('input[type="number"]').first();
  await countInput.fill("5");
  await countInput.blur();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "scratch/screens/smoke/custom-full-count-override.png", fullPage: true });

  await page.click('button:has-text("Generate Custom Draft")');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "scratch/screens/smoke/custom-full-blueprint.png", fullPage: true });
  result.blueprintGenerated = await page.locator('text=Generated Blueprint').isVisible().catch(() => false);

  await page.click('button:has-text("Deploy Session")');
  await page.waitForURL("**/exam/session", { timeout: 20000 });
  await page.waitForTimeout(2000);
  result.reachedSession = true;
  await page.screenshot({ path: "scratch/screens/smoke/custom-full-session.png" });

  await page.click('button:has-text("Submit")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Confirm Submit")');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Compute Results")');
  await page.waitForURL("**/exam/results?id=**", { timeout: 15000 });
  await page.waitForTimeout(1500);
  result.reachedResults = true;
  await page.screenshot({ path: "scratch/screens/smoke/custom-full-results.png", fullPage: true });
} catch (e) {
  result.exception = String(e).slice(0, 500);
}

console.log("=== CUSTOM FULL FLOW RESULT ===");
console.log(JSON.stringify(result, null, 2));
console.log("=== ERRORS ===");
console.log(errors.length ? errors.join(" | ") : "none");

await browser.close();
