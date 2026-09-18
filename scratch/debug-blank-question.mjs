import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => errors.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);

const yearDropdown = page.locator('button').filter({ hasText: /^\d{4}-(FN|AN)$/ }).first();
await yearDropdown.click();
await page.waitForTimeout(300);
await page.getByText("2026-FN", { exact: true }).click();
await page.waitForTimeout(400);

await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(1500);

// Navigate to Q3 directly via palette
await page.click('button:has-text("3")');
await page.waitForTimeout(3000); // generous wait to rule out timing

await page.screenshot({ path: "scratch/screens/smoke/debug-q3-after-wait.png", fullPage: true });

const domInfo = await page.evaluate(() => {
  const main = document.querySelector('main') || document.body;
  return {
    bodyTextSnippet: document.body.innerText.slice(0, 300),
    imgTags: Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: img.getBoundingClientRect().width,
      displayHeight: img.getBoundingClientRect().height,
      visible: img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0,
    })),
  };
});
console.log(JSON.stringify(domInfo, null, 2));
console.log("=== CONSOLE/ERRORS ===");
console.log(errors.join("\n"));

await browser.close();
