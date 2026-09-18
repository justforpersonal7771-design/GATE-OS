import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("dialog", (d) => d.accept());
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  const discardBtn = page.locator('button:has-text("Discard")');
  if (await discardBtn.count() > 0) {
    await discardBtn.click();
    await page.waitForTimeout(1000);
    console.log("Discarded test session.");
  } else {
    console.log("No active session banner found — nothing to discard.");
  }
  await browser.close();
})();
