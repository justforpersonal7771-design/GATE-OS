import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(String(e)));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);

// Switch Deployment Type to Custom Advanced Generator
await page.locator('button[aria-haspopup="listbox"]').first().click();
await page.waitForTimeout(300);
await page.locator('li[role="option"]', { hasText: "Custom Advanced Generator" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "scratch/screens/smoke/custom-builder-empty.png", fullPage: true });

await page.click('button:has-text("Add Selection Block")');
await page.waitForTimeout(500);
await page.screenshot({ path: "scratch/screens/smoke/custom-builder-block1.png", fullPage: true });

// Pick a subject filter on the block to confirm count auto-syncs
await page.locator('button[aria-haspopup="listbox"]').nth(2).click(); // Subject dropdown of block 1
await page.waitForTimeout(300);
const subjectOption = page.locator('li[role="option"]').nth(1);
await subjectOption.click();
await page.waitForTimeout(500);
await page.screenshot({ path: "scratch/screens/smoke/custom-builder-filtered.png", fullPage: true });

console.log("ERRORS:", errors.length === 0 ? "none" : errors.join("; "));
await browser.close();
