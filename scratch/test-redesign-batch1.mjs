import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "scratch/screens/smoke/redesign-topbar-dashboard.png", fullPage: false });

await page.goto("http://localhost:3000/mistakes", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: "scratch/screens/smoke/redesign-mistakes.png", fullPage: false });

console.log("Console errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
