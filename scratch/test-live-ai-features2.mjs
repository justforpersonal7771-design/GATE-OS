import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })).newPage();
const errors = [];
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });

const result = {};

try {
  await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2026_FN_Q1", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.waitForSelector('text=Compiling Contextual AI Response', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Wait longer for the follow-up to actually resolve
  const followUpInput = page.locator('input[placeholder*="follow-up"]');
  await followUpInput.fill("Why is the correct answer right?");
  await followUpInput.press("Enter");
  await page.waitForSelector('text=AI Tutor is drafting', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const afterFollowUp = await page.evaluate(() => document.body.innerText);
  result.followUpAnswered = afterFollowUp.includes("Why is the correct answer right");
  result.followUpResponseLength = afterFollowUp.length;
  await page.screenshot({ path: "scratch/screens/smoke/live-ai-followup-resolved.png", fullPage: true });

  // Check what the per-question EXPORT button does
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 10000 }).catch(() => null),
    page.getByRole("button", { name: "Export", exact: true }).click(),
  ]);
  if (download) {
    result.perQuestionExportFilename = download.suggestedFilename();
  } else {
    result.perQuestionExportFilename = "no download event (may open a menu/dialog instead)";
    await page.screenshot({ path: "scratch/screens/smoke/live-ai-export-click.png", fullPage: true });
  }

  // Test Practice Generator ("Generate Set")
  await page.click('button:has-text("Generate Set")');
  await page.waitForTimeout(500);
  await page.waitForSelector('text=Generating...', { state: "detached", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scratch/screens/smoke/live-ai-practice-generated.png", fullPage: true });
  const practiceText = await page.evaluate(() => document.body.innerText);
  result.practiceSetGenerated = !practiceText.includes("No custom practice questions compiled");

  console.log("=== LIVE AI TEST RESULT 2 ===");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  result.exception = String(e).slice(0, 500);
  console.log("=== LIVE AI TEST RESULT 2 (with exception) ===");
  console.log(JSON.stringify(result, null, 2));
}

console.log("=== ERRORS ===");
console.log(errors.length ? errors.join(" | ") : "none");
await browser.close();
