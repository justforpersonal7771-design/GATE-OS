import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

const report = {};
const DEPLOYMENT_LABELS = ["Official Year Paper", "Section Sprint", "Subject Mastery", "Topic Spotlight", "Custom Advanced Generator"];

async function selectDeploymentType(label) {
  const trigger = page.getByRole("button", { name: new RegExp(DEPLOYMENT_LABELS.join("|")) }).first();
  await trigger.click();
  await page.waitForTimeout(300);
  await page.getByText(label, { exact: true }).click();
  await page.waitForTimeout(500);
}

async function generateAndDeploy(name) {
  const result = { name };
  try {
    await page.click('button:has-text("Generate Blueprint")');
    await page.waitForTimeout(1000);
    result.blueprintGenerated = await page.locator('text=Generated Blueprint').isVisible().catch(() => false);

    await page.click('button:has-text("Deploy Session")');
    await page.waitForURL("**/exam/session", { timeout: 15000 });
    await page.waitForTimeout(1500);

    const timerText = await page.locator('.font-mono').first().textContent().catch(() => "");
    result.timerText = timerText;
    await page.screenshot({ path: `scratch/screens/smoke/examtype-${name}.png` });

    await page.click('button:has-text("Submit")');
    await page.waitForTimeout(400);
    await page.click('button:has-text("Confirm Submit")');
    await page.waitForTimeout(800);
    await page.click('button:has-text("Compute Results")');
    await page.waitForURL("**/exam/results?id=**", { timeout: 10000 });
    await page.waitForTimeout(1200);
    result.reachedResults = true;
    await page.screenshot({ path: `scratch/screens/smoke/examtype-${name}-results.png` });
  } catch (e) {
    result.exception = String(e).slice(0, 400);
  }
  return result;
}

// 1. Year Paper (default)
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
report.yearPaper = await generateAndDeploy("year-paper");

// 2. Section Sprint
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await selectDeploymentType("Section Sprint");
report.sectionTest = await generateAndDeploy("section");

// 3. Subject Mastery
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await selectDeploymentType("Subject Mastery");
report.subjectTest = await generateAndDeploy("subject");

// 4. Topic Spotlight
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await selectDeploymentType("Topic Spotlight");
report.topicTest = await generateAndDeploy("topic");

// 5. Custom Advanced Generator
await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await selectDeploymentType("Custom Advanced Generator");
await page.waitForTimeout(600);
await page.screenshot({ path: "scratch/screens/smoke/examtype-custom-builder.png" });

const customReport = { name: "custom" };
try {
  // Add a block and select a Section to populate it via includeAll default
  const addBlockBtn = page.locator('button:has-text("Add Block"), button:has-text("Add Selection")').first();
  if (await addBlockBtn.count() === 0) {
    // Maybe a block already exists by default
    customReport.defaultBlockPresent = true;
  } else {
    await addBlockBtn.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: "scratch/screens/smoke/examtype-custom-block.png" });

  // Try selecting first available Section dropdown inside a block
  const sectionDropdowns = page.locator('button', { hasText: /Select Section|All Sections|Section/ });
  customReport.sectionDropdownCount = await sectionDropdowns.count();

  // Try clicking Generate Blueprint at bottom if visible for custom test too
  const generateBtn = page.locator('button:has-text("Generate")').first();
  customReport.generateButtonVisible = await generateBtn.isVisible().catch(() => false);
} catch (e) {
  customReport.exception = String(e).slice(0, 400);
}
report.customTest = customReport;

console.log("=== EXAM TYPE TEST REPORT ===");
console.log(JSON.stringify(report, null, 2));
console.log("=== CONSOLE/PAGE ERRORS ===");
console.log(errors.length ? errors.join(" | ") : "none");

await browser.close();
