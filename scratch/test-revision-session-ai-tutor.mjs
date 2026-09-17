import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/revision/session?mode=mistakes", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scratch/screens/smoke/revision-session-ai-tutor.png", fullPage: true });

const btn = page.locator('button[title="Explain with AI Tutor"]');
console.log("AI Tutor button count:", await btn.count());

console.log("Console errors/warnings:", errors.length ? errors.join(" | ") : "none");
await browser.close();
