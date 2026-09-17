import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2025_AN_Q8", { waitUntil: "networkidle", timeout: 30000 });

const marks = [300, 800, 1500, 2500, 4000];
let last = 0;
for (const t of marks) {
  await page.waitForTimeout(t - last);
  last = t;
  await page.screenshot({ path: `scratch/screens/smoke/timing-${t}ms.png`, clip: { x: 30, y: 500, width: 400, height: 350 } });
}

await browser.close();
