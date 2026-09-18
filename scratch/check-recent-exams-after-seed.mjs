import { chromium } from "playwright";
const BASE = "http://localhost:3000";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 }, storageState: undefined });
  // Reuse same browser profile as previous script? Playwright launches fresh each time,
  // so instead we click through fully in one continuous script below.
  await browser.close();
})();
