// Usage: node scratch/shot.mjs <path> <outfile> [dark]
import { chromium } from "playwright";

const [, , path, outfile, mode] = process.argv;
if (!path || !outfile) {
  console.error("Usage: node scratch/shot.mjs <path> <outfile> [dark]");
  process.exit(1);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  colorScheme: mode === "dark" ? "dark" : "light",
});
const page = await context.newPage();

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(String(err)));

await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => {
  console.error("Navigation issue:", e.message);
});

// Give client-side hydration / dynamic imports a moment.
await page.waitForTimeout(1500);

await page.screenshot({ path: outfile, fullPage: true });
console.log(`Saved ${outfile}`);
if (errors.length > 0) {
  console.log("CONSOLE ERRORS:");
  errors.forEach((e) => console.log(" -", e));
} else {
  console.log("No console errors.");
}

await browser.close();
