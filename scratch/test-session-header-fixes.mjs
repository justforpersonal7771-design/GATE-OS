import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/setup", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1000);
await page.click('button:has-text("Generate Blueprint")');
await page.waitForTimeout(800);
await page.click('button:has-text("Deploy Session")');
await page.waitForURL("**/exam/session", { timeout: 15000 });
await page.waitForTimeout(1200);

const saveNextBtn = page.getByRole("button", { name: "Save & Next", exact: true });
const overflowFindings = [];

for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(150);
  const info = await page.evaluate(() => {
    const header = document.querySelector('header');
    const overflowingHeader = header ? header.scrollWidth > header.clientWidth + 2 : false;
    // Check the timer ring specifically for clipping (circle bounding box exceeding its container)
    const timerRing = document.querySelector('header svg');
    let ringOverflow = false;
    if (timerRing) {
      const svgRect = timerRing.getBoundingClientRect();
      const parentRect = timerRing.parentElement.getBoundingClientRect();
      ringOverflow = svgRect.width > parentRect.width + 1 || svgRect.height > parentRect.height + 1;
    }
    return {
      overflowingHeader,
      headerScrollWidth: header?.scrollWidth,
      headerClientWidth: header?.clientWidth,
      ringOverflow,
      bodyWidth: document.body.scrollWidth,
      windowWidth: window.innerWidth,
    };
  });
  if (info.overflowingHeader || info.ringOverflow || info.bodyWidth > info.windowWidth + 2) {
    overflowFindings.push({ index: i + 1, ...info });
    await page.screenshot({ path: `scratch/screens/smoke/header-overflow-q${i + 1}.png`, fullPage: false });
  }
  if (i < 19) {
    await saveNextBtn.click();
    await page.waitForTimeout(150);
  }
}

await page.screenshot({ path: "scratch/screens/smoke/session-header-final-check.png" });

console.log("Overflow findings:", JSON.stringify(overflowFindings, null, 2));
console.log("Errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
