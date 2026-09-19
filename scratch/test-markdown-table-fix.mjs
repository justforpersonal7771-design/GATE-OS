import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/ai-tutor?qid=GATE_CS_2025_AN_Q8`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(10000);
  await page.screenshot({ path: "scratch/markdown-table-fix.png", fullPage: true });

  const bodyText = await page.textContent("body");
  const hasRawPipes = /\|\s*Iteration/.test(bodyText || "");
  console.log("Still has raw pipe text:", hasRawPipes);

  const tableCount = await page.locator("table").count();
  console.log("Rendered <table> elements found:", tableCount);

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
