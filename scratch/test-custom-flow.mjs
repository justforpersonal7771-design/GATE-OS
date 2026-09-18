import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
const trigger = page.getByRole("button", { name: /Official Year Paper/ }).first();
await trigger.click();
await page.waitForTimeout(300);
await page.getByText("Custom Advanced Generator", { exact: true }).click();
await page.waitForTimeout(600);

await page.click('text=Add Selection Block');
await page.waitForTimeout(600);
await page.screenshot({ path: "scratch/screens/smoke/custom-block-added.png", fullPage: true });

// Try to select a Section within the new block to trigger includeAll auto-count
const blockSectionDropdown = page.locator('button').filter({ hasText: /Select Section|All Sections/ }).first();
console.log("Block section dropdown count:", await blockSectionDropdown.count());
if (await blockSectionDropdown.count() > 0) {
  await blockSectionDropdown.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "scratch/screens/smoke/custom-section-dropdown-open.png", fullPage: true });
}

console.log("errors:", errors.join(" | ") || "none");
await browser.close();
