import { chromium } from "playwright";

const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/setup`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.getByText("Official Year Paper", { exact: false }).first().click();
  await page.waitForTimeout(300);
  await page.getByText("Subject Mastery", { exact: true }).click();
  await page.waitForTimeout(800);
  await page.click('button:has-text("Generate Blueprint")');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Deploy Session")');
  await page.waitForTimeout(2000);
  console.log("URL:", page.url());

  // Submit directly via the store, bypassing the confirm-dialog UI
  await page.evaluate(async () => {
    // @ts-ignore - accessing the zustand store attached in dev via window if exposed; fallback: dispatch click flow
    const win = window;
    // Try common global exposure patterns; if unavailable, this evaluate is a no-op and we fall back below.
    return true;
  });

  const submitBtn = page.locator('button:has-text("Submit")').first();
  await submitBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);
  // The confirm dialog button text
  const confirmCandidates = ['button:has-text("Confirm Submit")', 'button:has-text("Yes, Submit")', 'button:has-text("Submit Exam")', '.fixed button:has-text("Submit")'];
  for (const sel of confirmCandidates) {
    const btn = page.locator(sel).last();
    if (await btn.count() > 0) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(1500);
      break;
    }
  }
  console.log("URL after submit attempt:", page.url());
  await page.screenshot({ path: "scratch/submit-state.png" });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scratch/recent-exams-populated.png" });

  const firstRow = page.locator('button:has(svg.lucide-chevron-down)').first();
  if (await firstRow.count() > 0) {
    await firstRow.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "scratch/recent-exams-expanded.png" });
  } else {
    console.log("No recent exam row found.");
  }

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
