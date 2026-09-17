import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.locator('button[aria-haspopup="listbox"]').nth(1).click();
await page.waitForTimeout(300);
await page.locator('li[role="option"]', { hasText: "2026-FN" }).click();
await page.waitForTimeout(300);
await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(2000);

const paletteButtons = page.locator('button.aspect-square');
await paletteButtons.nth(7).click();
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const options = document.querySelectorAll('[class*="grid"] > div, .ast-content');
  const results = [];
  document.querySelectorAll('.ast-content').forEach((el, i) => {
    const mjxContainers = el.querySelectorAll('mjx-container').length;
    const rawText = el.textContent;
    results.push({ index: i, mjxContainers, rawTextSnippet: rawText.slice(0, 60) });
  });
  return results;
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
