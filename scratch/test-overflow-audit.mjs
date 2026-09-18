import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

// Seed a mistake + bookmark with a real image/table-bearing question via exam flow
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(1500);
await page.click('button[title="Bookmark Question"]');
await page.waitForTimeout(800);
// leave unanswered, submit to create attempt history
await page.click('button:has-text("Submit")');
await page.waitForTimeout(500);
await page.click('button:has-text("Confirm Submit")');
await page.waitForTimeout(1000);

// Check mistakes page for overflow
await page.goto("http://localhost:3000/mistakes", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
const mistakesScroll = await page.evaluate(() => {
  const html = document.documentElement;
  const body = document.body;
  return {
    docScrollHeight: html.scrollHeight,
    viewportHeight: window.innerHeight,
    bodyOverflowing: body.scrollHeight > window.innerHeight + 5,
  };
});
console.log("Mistakes page scroll info:", JSON.stringify(mistakesScroll));
await page.screenshot({ path: "scratch/screens/smoke/mistakes-overflow-check.png", fullPage: true });

// Check bookmarks page for overflow
await page.goto("http://localhost:3000/bookmarks", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
const bookmarksScroll = await page.evaluate(() => {
  return {
    docScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    bodyOverflowing: document.body.scrollHeight > window.innerHeight + 5,
  };
});
console.log("Bookmarks page scroll info:", JSON.stringify(bookmarksScroll));
await page.screenshot({ path: "scratch/screens/smoke/bookmarks-overflow-check.png", fullPage: true });

console.log("Console errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
