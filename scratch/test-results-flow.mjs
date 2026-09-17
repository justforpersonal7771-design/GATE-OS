import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));
page.on("response", res => { if (res.status() >= 500) errors.push(`[http ${res.status()}] ${res.url()}`); });

const shot = (name) => page.screenshot({ path: `scratch/screens/smoke/results-${name}.png`, fullPage: true });

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(2000);

// Answer a couple questions
for (let i = 0; i < 2; i++) {
  const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ });
  if (await optionButtons.count() > 0) await optionButtons.first().click();
  await page.waitForTimeout(200);
  const saveNext = page.locator('button:has-text("Save & Next")');
  if (await saveNext.isVisible().catch(() => false)) {
    await saveNext.click();
    await page.waitForTimeout(400);
  }
}

await page.click('button:has-text("Submit")');
await page.waitForTimeout(500);
await page.click('button:has-text("Confirm Submit")');
await page.waitForTimeout(1500);
await shot("01-submitted");
console.log("Errors after submit:", errors.length, errors.join(" | "));

console.log("Clicking Compute Results...");
await page.click('button:has-text("Compute Results")');
await page.waitForTimeout(2500);
await shot("02-results");
console.log("URL:", page.url());
console.log("Errors after Compute Results:", errors.length, errors.join(" | "));

// Check page content for error boundary text
const bodyText = await page.textContent("body").catch(() => "");
const hasErrorUI = /something went wrong|application error|unhandled|error occurred/i.test(bodyText || "");
console.log("Error boundary UI detected on page:", hasErrorUI);

await browser.close();
