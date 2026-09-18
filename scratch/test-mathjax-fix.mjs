import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.click('button:has-text("AI Generated")');
await page.waitForTimeout(800);

// Expand the Theory of Computation group and its regex series question if present
const groupHeaders = page.locator('span.text-\\[11px\\].font-bold');
const count = await groupHeaders.count();
console.log("Topic group rows found:", count);

// Try expanding first question row (chevron button)
const questionRows = page.locator('button:has-text("Q")').filter({ hasText: /^Q\d/ });
console.log("Question rows found:", await questionRows.count());

await page.screenshot({ path: "scratch/screens/smoke/setup-ai-before-expand.png", fullPage: true });

// click the third question toggle if present (from screenshot Q3 had the series)
const q3 = page.locator('text=/sum of the series/i').first();
if (await q3.count() > 0) {
  await q3.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scratch/screens/smoke/setup-ai-mathjax-fixed.png", fullPage: true });
  console.log("Clicked series question");
} else {
  console.log("Series question not found on this data load");
}

console.log("Console errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
