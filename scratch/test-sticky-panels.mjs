import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(String(e)));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);

// Calendar quick panel
await page.click('button[aria-label="Study Planner Quick Access"]');
await page.waitForTimeout(500);
await page.screenshot({ path: "scratch/screens/smoke/sticky-calendar-compact.png" });

// Expand to full planner (sticky, in place)
await page.click('button:has-text("Full Planner")');
await page.waitForTimeout(800);
await page.screenshot({ path: "scratch/screens/smoke/sticky-calendar-expanded.png" });
console.log("URL after Full Planner click (should stay on /):", page.url());

// Close it
await page.keyboard.press("Escape").catch(() => {});
await page.click('body', { position: { x: 10, y: 10 } });
await page.waitForTimeout(300);

// Todo panel
await page.click('button[aria-label="To-Do List Quick Access"]');
await page.waitForTimeout(500);
await page.fill('input[placeholder="Quick task, no due date..."]', "Revise Graph Traversal shortcuts");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
await page.screenshot({ path: "scratch/screens/smoke/sticky-todo.png" });

console.log("ERRORS:", errors.length === 0 ? "none" : errors.join("; "));
await browser.close();
