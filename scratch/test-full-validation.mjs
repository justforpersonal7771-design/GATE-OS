import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

const report = {};

function checkOverflow(name) {
  return page.evaluate(() => ({
    docScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    overflowing: document.body.scrollHeight > window.innerHeight + 5,
  })).then(r => { report[name] = r; });
}

// 1. Full exam flow
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1200);
await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(1500);
await checkOverflow("exam-session");

await page.click('button:has-text("Submit")');
await page.waitForTimeout(500);
await page.click('button:has-text("Confirm Submit")');
await page.waitForTimeout(1000);
await page.click('button:has-text("Compute Results")');
await page.waitForURL("**/exam/results?id=**", { timeout: 10000 });
await page.waitForTimeout(1500);
await checkOverflow("exam-results");
await page.screenshot({ path: "scratch/screens/smoke/validation-results.png", fullPage: true });

await page.click('button:has-text("Launch Review Mode")');
await page.waitForURL("**/exam/results/review**", { timeout: 10000 });
await page.waitForTimeout(1500);
await checkOverflow("exam-review");

// 2. Other pages
for (const [path, name] of [
  ["/", "dashboard"], ["/analytics", "analytics"], ["/ai-mentor", "ai-mentor"],
  ["/mistakes", "mistakes"], ["/bookmarks", "bookmarks"], ["/revision", "revision"],
  ["/setup", "setup"], ["/ai-tutor", "ai-tutor"],
]) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1200);
  await checkOverflow(name);
}

console.log("=== OVERFLOW REPORT ===");
console.log(JSON.stringify(report, null, 2));
console.log("=== CONSOLE ERRORS ===");
console.log(errors.length ? errors.join(" | ") : "none");

await browser.close();
