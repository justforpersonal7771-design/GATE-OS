import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // Set a Goal Slider target from the Topbar
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.click('button[aria-label="AI Goal Slider"]');
  await page.waitForTimeout(1000);
  const slider = await page.$('input[type="range"]');
  await slider.fill("40");
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape").catch(() => {});
  await page.click('button[aria-label="Close"]');
  await page.waitForTimeout(500);

  // Go to Setup -> Topic Spotlight
  await page.goto(`${BASE}/setup`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  // Select "Topic Spotlight" in Deployment Type dropdown
  await page.getByText("Official Year Paper", { exact: false }).first().click();
  await page.waitForTimeout(400);
  await page.getByText("Topic Spotlight", { exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scratch/setup-topic-spotlight.png" });

  // Open the Target Topic dropdown to see the starred/sorted list
  const topicLabel = await page.getByText("Target Topic", { exact: false });
  if (await topicLabel.count() > 0) {
    const dropdowns = await page.$$('[class*="cursor-pointer"]');
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: "scratch/setup-topic-test-mode.png", fullPage: true });

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
