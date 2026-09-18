import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "scratch/dashboard-recent-exams.png", fullPage: true });

  // Verify Focus Target button renamed
  const focusBtn = await page.$('button[aria-label="Focus Target"]');
  console.log("Focus Target button found:", !!focusBtn);

  // Verify Results page badge renders if we open one
  const reviewBtn = await page.$('button:has-text("Review")');
  console.log("Has recent exam Review button:", !!reviewBtn);

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
