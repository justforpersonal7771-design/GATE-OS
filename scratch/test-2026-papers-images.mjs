import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

async function runYearPaper(yearShiftLabel) {
  const report = { yearShiftLabel, overflowIssues: [], imageQuestions: [], rawTagLeaks: [], brokenImageQuestions: [] };

  await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  const yearDropdown = page.locator('button').filter({ hasText: /^\d{4}-(FN|AN)$/ }).first();
  await yearDropdown.click();
  await page.waitForTimeout(300);
  await page.getByText(yearShiftLabel, { exact: true }).click();
  await page.waitForTimeout(400);

  await page.click('button:has-text("Generate Blueprint")');
  await page.waitForTimeout(800);
  await page.click('button:has-text("Deploy Session")');
  await page.waitForURL("**/exam/session", { timeout: 15000 });
  await page.waitForTimeout(1500);

  const qCountText = await page.locator('text=/Q\\s*\\d+\\s*\\/\\s*\\d+/').first().textContent().catch(() => "");
  const totalMatch = qCountText.match(/\/\s*(\d+)/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 65;
  report.totalQuestions = total;

  const saveNextBtn = page.getByRole("button", { name: "Save & Next", exact: true });

  for (let i = 0; i < total; i++) {
    await page.waitForTimeout(250); // let MathJax/AST settle after navigation

    const info = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const hasImage = imgs.length > 0;
      const brokenImages = imgs.filter(img => img.complete && img.naturalWidth === 0).length;
      const bodyText = document.body.innerText;
      const rawLeak = /\\cdot|\\ldots|\\frac\{|\[IMAGE_/.test(bodyText);
      const qHeaderMatch = bodyText.match(/Q\s*(\d+)\s*\/\s*\d+/);
      return {
        hasImage,
        imageCount: imgs.length,
        brokenImages,
        rawLeak,
        currentQNum: qHeaderMatch ? parseInt(qHeaderMatch[1], 10) : null,
        textLen: bodyText.length,
      };
    });

    if (info.currentQNum !== i + 1) {
      report.overflowIssues.push({ expected: i + 1, actualOnScreen: info.currentQNum, note: "navigation-mismatch" });
    }

    if (info.hasImage) {
      report.imageQuestions.push({ index: i + 1, imageCount: info.imageCount, brokenImages: info.brokenImages });
      if (info.brokenImages > 0) {
        report.brokenImageQuestions.push(i + 1);
        await page.screenshot({ path: `scratch/screens/smoke/paper-${yearShiftLabel}-q${i + 1}-broken.png`, fullPage: true });
      } else if (report.imageQuestions.filter(q => q.brokenImages === 0).length <= 3) {
        await page.screenshot({ path: `scratch/screens/smoke/paper-${yearShiftLabel}-q${i + 1}-image.png`, fullPage: true });
      }
    }
    if (info.rawLeak) {
      report.rawTagLeaks.push(i + 1);
      await page.screenshot({ path: `scratch/screens/smoke/paper-${yearShiftLabel}-q${i + 1}-rawleak.png`, fullPage: true });
    }
    if (info.textLen < 200) {
      // Suspiciously little content — capture for inspection
      await page.screenshot({ path: `scratch/screens/smoke/paper-${yearShiftLabel}-q${i + 1}-sparse.png`, fullPage: true });
    }

    if (i < total - 1) {
      await saveNextBtn.click();
      await page.waitForTimeout(150);
    }
  }

  return report;
}

const reportFN = await runYearPaper("2026-FN");
const reportAN = await runYearPaper("2026-AN");

console.log("=== 2026-FN SUMMARY ===");
console.log("Total:", reportFN.totalQuestions, "| Images:", reportFN.imageQuestions.length, "| Broken:", reportFN.brokenImageQuestions.length, "| RawLeaks:", reportFN.rawTagLeaks.length, "| NavMismatches:", reportFN.overflowIssues.length);
console.log(JSON.stringify(reportFN, null, 2));
console.log("=== 2026-AN SUMMARY ===");
console.log("Total:", reportAN.totalQuestions, "| Images:", reportAN.imageQuestions.length, "| Broken:", reportAN.brokenImageQuestions.length, "| RawLeaks:", reportAN.rawTagLeaks.length, "| NavMismatches:", reportAN.overflowIssues.length);
console.log(JSON.stringify(reportAN, null, 2));
console.log("=== CONSOLE/PAGE ERRORS ===");
console.log(errors.length ? errors.join(" | ") : "none");

await browser.close();
