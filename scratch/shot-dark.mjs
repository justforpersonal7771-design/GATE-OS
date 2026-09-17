// Usage: node scratch/shot-dark.mjs <path> <outfile>
// Loads the page, clicks the in-app theme toggle (next-themes, class-based),
// then screenshots — since the app defaults to light regardless of OS scheme.
import { chromium } from "playwright";

const [, , path, outfile] = process.argv;
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1200);

await page.click('button[aria-label="Toggle Theme"]');
await page.waitForTimeout(600); // disableTransitionOnChange should make this instant, small buffer anyway

await page.screenshot({ path: outfile, fullPage: true });
console.log(`Saved ${outfile}`);
console.log(errors.length ? "CONSOLE ERRORS:\n" + errors.map(e => " - " + e).join("\n") : "No console errors.");

await browser.close();
