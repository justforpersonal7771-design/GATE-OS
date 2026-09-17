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

const bookmarkBtn = page.locator('button[title="Bookmark Question"]');
console.log("Bookmark button count:", await bookmarkBtn.count());
await bookmarkBtn.click();
await page.waitForTimeout(800);

await page.goto("http://localhost:3000/bookmarks", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
const bodyText = await page.textContent("body").catch(() => "");
console.log("Bookmarks page has 'No' empty text:", /no bookmark/i.test(bodyText || ""));
await page.screenshot({ path: "scratch/screens/smoke/bookmarks-check.png", fullPage: true });

console.log("Console errors/warnings:", errors.length ? errors.join(" | ") : "none");
await browser.close();
