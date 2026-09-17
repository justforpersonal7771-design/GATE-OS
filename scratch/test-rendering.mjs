// Targeted test: generate the 2026-FN year paper (known to contain an image
// question, a code-block question, and a math-heavy question) and screenshot
// each to check AST rendering quality (images/options/LaTeX/code/tables).
import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(`[console] ${msg.text()}`); });
page.on("pageerror", (err) => errors.push(`[pageerror] ${err}`));

const step = (s) => console.log(`\n--- ${s} ---`);
const shot = async (name) => page.screenshot({ path: `scratch/screens/smoke/render-${name}.png`, fullPage: true });

try {
  step("1. Setup: select 2026-FN year paper");
  await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);

  // Open the Target Year & Shift dropdown and pick 2026-FN
  await page.locator('button[aria-haspopup="listbox"]').nth(1).click();
  await page.waitForTimeout(300);
  await page.locator('li[role="option"]', { hasText: "2026-FN" }).click();
  await page.waitForTimeout(300);

  await page.click('button:has-text("Generate Blueprint")');
  await page.waitForTimeout(800);
  await page.click('button:has-text("Deploy Session")');
  await page.waitForURL("**/exam/session", { timeout: 15000 });
  await page.waitForTimeout(2000);

  step("2. Jump to Q2 (image question)");
  await page.locator('button:has-text("2")').first().click();
  await page.waitForTimeout(1000);
  await shot("q2-image");

  step("3. Jump to Q8 (math-heavy question)");
  const paletteButtons = page.locator('main button.aspect-square, button.aspect-square');
  await paletteButtons.nth(7).click();
  await page.waitForTimeout(1000);
  await shot("q8-math");

  step("4. Jump to Q27 (code block question, likely under Core CS tab)");
  const coreCsTab = page.locator('button, div[role="tab"]').filter({ hasText: /^CORE CS$/ });
  if (await coreCsTab.first().isVisible().catch(() => false)) {
    await coreCsTab.first().click();
    await page.waitForTimeout(500);
  }
  const q27Button = page.locator('button.aspect-square', { hasText: /^27$/ });
  await q27Button.first().click({ timeout: 10000 });
  await page.waitForTimeout(1000);
  await shot("q27-code");

  console.log("\n=== DONE ===");
} catch (e) {
  console.error("FAILED:", e.message);
  await shot("ERROR");
} finally {
  console.log("\n=== ERRORS ===");
  if (errors.length === 0) console.log("None.");
  else errors.forEach((e) => console.log(" -", e));
  await browser.close();
}
