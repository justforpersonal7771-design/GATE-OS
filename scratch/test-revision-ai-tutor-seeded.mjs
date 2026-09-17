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

// Bookmark the current question
await page.click('button[title="Bookmark Question"]');
await page.waitForTimeout(500);

await page.goto("http://localhost:3000/revision/session?mode=bookmarks", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/screens/smoke/revision-session-ai-tutor-seeded.png" });

const btn = page.locator('button[title="Explain with AI Tutor"]');
console.log("AI Tutor button count:", await btn.count());
if (await btn.count() > 0) {
  await btn.click();
  await page.waitForURL("**/ai-tutor?qid=**", { timeout: 8000 }).catch(() => console.log("Did not navigate to ai-tutor"));
  console.log("Navigated to:", page.url());
}

console.log("Console errors/warnings:", errors.length ? errors.join(" | ") : "none");
await browser.close();
