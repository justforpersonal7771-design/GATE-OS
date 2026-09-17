import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

// Dashboard
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/screens/smoke/dashboard-v2.png", fullPage: true });

// Analytics
await page.goto("http://localhost:3000/analytics", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/screens/smoke/analytics-v2.png", fullPage: true });

// Full exam flow -> review page to check navigator overflow fix
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
await page.waitForTimeout(1200);
await page.click('button:has-text("Launch Review Mode")');
await page.waitForURL("**/exam/results/review**", { timeout: 10000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/screens/smoke/review-navigator-fixed.png" });

// Zoom into the navigator panel specifically
const nav = page.locator('div:has-text("Review Navigator")').last();
await page.screenshot({ path: "scratch/screens/smoke/review-navigator-fixed-full.png", fullPage: true });

console.log("Console errors/warnings:", errors.length ? errors.join(" | ") : "none");
await browser.close();
