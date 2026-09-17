import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const failedReqs = [];
page.on("requestfailed", r => failedReqs.push(`${r.url()} -- ${r.failure()?.errorText}`));
page.on("response", r => { if (r.status() >= 400) failedReqs.push(`${r.status()} ${r.url()}`); });

await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2025_AN_Q8", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3000);

const fontCheck = await page.evaluate(async () => {
  const fonts = [];
  document.fonts.forEach(f => fonts.push(`${f.family} ${f.status}`));
  await document.fonts.ready;
  return fonts;
});
console.log("FONTS:", JSON.stringify(fontCheck, null, 2));
console.log("FAILED REQUESTS:", failedReqs.length ? failedReqs.join("\n") : "none");

// zoomed screenshot of just the options area
const optionsBox = await page.evaluate(() => {
  const mjx = document.querySelectorAll('mjx-container')[4]; // the wide option one
  if (!mjx) return null;
  const r = mjx.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
console.log("Option 5 bbox:", optionsBox);
if (optionsBox) {
  await page.screenshot({
    path: "scratch/screens/smoke/option-zoom.png",
    clip: { x: Math.max(0, optionsBox.x - 20), y: Math.max(0, optionsBox.y - 10), width: optionsBox.width + 100, height: optionsBox.height + 20 }
  });
}

await browser.close();
