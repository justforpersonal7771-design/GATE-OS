import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(1500);
const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ });
if (await optionButtons.count() > 0) await optionButtons.first().click();
await page.waitForTimeout(200);
await page.click('button:has-text("Submit")');
await page.waitForTimeout(500);
await page.click('button:has-text("Confirm Submit")');
await page.waitForTimeout(1000);
await page.click('button:has-text("Compute Results")');
await page.waitForTimeout(2000);
console.log("Results URL:", page.url());

await page.click('button:has-text("Launch Review Mode")');
await page.waitForTimeout(2000);
console.log("Review URL:", page.url());
await page.screenshot({ path: "scratch/screens/smoke/review-mode.png", fullPage: true });

const bodyText = await page.textContent("body").catch(() => "");
console.log("Has 'No Active Session' text:", /No Active Session/i.test(bodyText || ""));
console.log("Errors:", errors.length, errors.join(" | "));

await browser.close();
