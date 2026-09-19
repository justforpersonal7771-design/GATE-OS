import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const requests = [];
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/dataset") || url.includes("/api/image-manifest") || url.includes("/data/")) {
      requests.push(`${res.status()} ${url}`);
    }
  });

  await page.goto(`${BASE}/setup`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "scratch/dataset-migration-setup.png" });

  console.log("Data-related network requests:", JSON.stringify(requests, null, 2));

  // Confirm real content loaded (e.g. Deployment Type dropdown populated)
  const bodyText = await page.textContent("body");
  console.log("Has 'Official Year Paper' text:", bodyText.includes("Official Year Paper"));

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
