import { chromium, devices } from "playwright";
const BASE = "http://localhost:3000";
const iPhone = devices["iPhone 13"];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...iPhone });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "scratch/mobile-topbar-closed.png" });

  // Try opening Calendar quick panel
  const calBtn = page.locator('button[aria-label*="Study Planner" i], button[title*="Study Planner" i]').first();
  if (await calBtn.count() > 0) {
    await calBtn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: "scratch/mobile-calendar-panel.png" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log("Horizontal overflow with calendar panel open (px):", overflow);
    const panelBox = await page.locator('.fixed.z-50, .absolute.z-50').first().boundingBox();
    console.log("Panel bounding box:", JSON.stringify(panelBox));
    await calBtn.click();
    await page.waitForTimeout(400);
  } else {
    console.log("Calendar button not found/visible on mobile");
  }

  // Try To-Do quick panel
  const todoBtn = page.locator('button[aria-label*="To-Do" i], button[title*="To-Do" i]').first();
  if (await todoBtn.count() > 0) {
    await todoBtn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: "scratch/mobile-todo-panel.png" });
    const panelBox2 = await page.locator('.fixed.z-50, .absolute.z-50').first().boundingBox();
    console.log("Todo panel bounding box:", JSON.stringify(panelBox2));
  } else {
    console.log("Todo button not found/visible on mobile");
  }

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
