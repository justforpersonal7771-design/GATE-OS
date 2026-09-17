import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(1500);
await page.click('button:has-text("Submit")');
await page.waitForTimeout(500);
await page.click('button:has-text("Confirm Submit")');
await page.waitForTimeout(1000);
await page.click('button:has-text("Compute Results")');
await page.waitForURL("**/exam/results?id=**", { timeout: 10000 });
await page.waitForTimeout(1500);
console.log("On results page:", page.url());

const btn = page.locator('button:has-text("Launch Review Mode")');
console.log("Button count:", await btn.count());
console.log("Button visible:", await btn.first().isVisible().catch(() => false));

await btn.first().click();
console.log("Clicked. Waiting for navigation...");
try {
  await page.waitForURL("**/exam/results/review**", { timeout: 8000 });
  console.log("Navigated successfully to:", page.url());
} catch (e) {
  console.log("Navigation did not happen. Current URL:", page.url());
}
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/screens/smoke/review-mode2.png", fullPage: true });
console.log("Console errors/warnings:", errors.length ? errors.join(" | ") : "none");

await browser.close();
