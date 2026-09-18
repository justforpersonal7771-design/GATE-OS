import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });

const result = {};

async function getResponseText() {
  return page.evaluate(() => {
    const el = document.querySelector('[class*="prose"], main');
    return document.body.innerText.slice(0, 2000);
  });
}

try {
  await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2026_FN_Q1", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  // Wait for the initial "Detailed" + "Mentor" explanation to finish loading
  await page.waitForSelector('text=Compiling Contextual AI Response', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const initialText = await getResponseText();
  result.initialResponseHasContent = initialText.length > 500 && !initialText.includes("Compiling Contextual AI Response");
  result.initialResponseSnippet = initialText.slice(initialText.indexOf("CONCEPT OVERVIEW") - 50, initialText.indexOf("CONCEPT OVERVIEW") + 300);
  await page.screenshot({ path: "scratch/screens/smoke/live-ai-initial.png", fullPage: true });

  // Switch explanation mode to "Simple" — should trigger a fresh generation
  const modeDropdown = page.getByRole("button", { name: /Detailed Format/ }).first();
  await modeDropdown.click();
  await page.waitForTimeout(300);
  await page.getByText("Simple Format", { exact: true }).click();
  await page.waitForTimeout(1500);
  await page.waitForSelector('text=Compiling Contextual AI Response', { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const simpleText = await getResponseText();
  result.simpleModeResponseChanged = simpleText !== initialText && simpleText.length > 300;
  await page.screenshot({ path: "scratch/screens/smoke/live-ai-simple-mode.png", fullPage: true });

  // Send a follow-up chat message
  const followUpInput = page.locator('input[placeholder*="follow-up"]');
  await followUpInput.fill("Why is the correct answer right?");
  await followUpInput.press("Enter");
  await page.waitForTimeout(4000);
  const afterFollowUp = await getResponseText();
  result.followUpAnswered = afterFollowUp.includes("Why is the correct answer right");
  await page.screenshot({ path: "scratch/screens/smoke/live-ai-followup.png", fullPage: true });

  console.log("=== LIVE AI TEST RESULT ===");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  result.exception = String(e).slice(0, 500);
  console.log("=== LIVE AI TEST RESULT (with exception) ===");
  console.log(JSON.stringify(result, null, 2));
}

console.log("=== ERRORS ===");
console.log(errors.length ? errors.join(" | ") : "none");

await browser.close();
