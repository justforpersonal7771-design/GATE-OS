import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

const targets = [
  { qid: "GATE_CS_2026_FN_Q2", label: "image" },
  { qid: "GATE_CS_2026_FN_Q27", label: "code" },
  { qid: "GATE_CS_2026_FN_Q24", label: "table" },
];

// Use AI Tutor page to render each question directly (accepts ?qid=)
for (const t of targets) {
  await page.goto(`http://localhost:3000/ai-tutor?qid=${t.qid}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `scratch/screens/smoke/content-${t.label}.png`, fullPage: true });
}

console.log("Console errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
