import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);

await page.click('button[title="Study Planner"]');
await page.waitForTimeout(500);
await page.screenshot({ path: "scratch/screens/smoke/calendar-panel-gradient.png" });

await page.click('button[title="Study Planner"]'); // close
await page.waitForTimeout(300);

await page.click('button[title="To-Do List"]');
await page.waitForTimeout(500);
await page.screenshot({ path: "scratch/screens/smoke/todo-panel-gradient.png" });

console.log("Console errors/warnings:", errors.length ? errors.join(" | ") : "none");
await browser.close();
