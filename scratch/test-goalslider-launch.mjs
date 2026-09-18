import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.click('button[aria-label="AI Goal Slider"]');
  await page.waitForTimeout(1200);

  await page.click('button:has-text("Launch Test From Selection")');
  await page.waitForTimeout(3000);
  console.log("URL after launch:", page.url());
  await page.screenshot({ path: "scratch/gs2-launched-session.png" });

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
