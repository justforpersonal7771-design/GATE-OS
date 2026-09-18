import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

for (const [path, name] of [["/", "dashboard"], ["/analytics", "analytics"], ["/ai-mentor", "ai-mentor"]]) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `scratch/screens/smoke/premium-${name}.png`, fullPage: false });
}

console.log("Console errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
