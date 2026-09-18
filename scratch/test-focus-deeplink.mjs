import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/setup?subject=Algorithms`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scratch/focus-deeplink-subject.png" });

  await page.goto(`${BASE}/setup?topic=${encodeURIComponent("Memory Hierarchy (Direct/Associative Cache Mapping)")}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scratch/focus-deeplink-topic.png" });

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
