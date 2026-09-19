import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // Open Focus Target, set to 50%, launch test
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.click('button[aria-label="Focus Target"]');
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Launch Test From Selection")');
  await page.waitForTimeout(3000);
  console.log("URL after launch:", page.url());

  await page.screenshot({ path: "scratch/goaltag-session-state.png" });

  // Bookmark the first question
  const bookmarkBtn = page.locator('button[aria-label*="ookmark" i], button[title*="ookmark" i]').first();
  if (await bookmarkBtn.count() > 0) {
    await bookmarkBtn.click();
    await page.waitForTimeout(500);
  } else {
    console.log("No bookmark button found");
  }

  // Submit without answering (guarantees a mistake) via the submit flow
  const submitBtn = page.locator('button:has-text("Submit")').first();
  if (await submitBtn.count() > 0) {
    await submitBtn.click({ timeout: 10000 }).catch(e => console.log("submit click failed:", e.message));
    await page.waitForTimeout(600);
    const confirmBtn = page.locator('button:has-text("Confirm Submit")');
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
      await page.waitForTimeout(1500);
    }
  } else {
    console.log("No submit button found on session page");
  }

  // Check Mistakes page
  await page.goto(`${BASE}/mistakes`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "scratch/goaltag-mistakes.png" });

  // Check Bookmarks page
  await page.goto(`${BASE}/bookmarks`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "scratch/goaltag-bookmarks.png" });

  // Check Revision page
  await page.goto(`${BASE}/revision`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scratch/goaltag-revision.png" });

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
