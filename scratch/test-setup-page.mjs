import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "scratch/screens/smoke/setup-standard.png", fullPage: true });

// Custom test builder tab
await page.selectOption ? null : null;
await page.click('text=Custom Advanced Generator').catch(() => {});
await page.waitForTimeout(400);

// Generate blueprint on default Year Paper
await page.click('button:has-text("Generate Blueprint")').catch(async () => {
  // if custom dropdown selected instead, revert to year paper flow by clicking Standard again
});
await page.waitForTimeout(600);
await page.screenshot({ path: "scratch/screens/smoke/setup-blueprint.png", fullPage: true });

// AI Generated tab
await page.click('button:has-text("AI Generated")');
await page.waitForTimeout(800);
await page.screenshot({ path: "scratch/screens/smoke/setup-ai-generated.png", fullPage: true });

console.log("Console errors/warnings:", errors.length ? errors.join(" | ") : "none");
await browser.close();
