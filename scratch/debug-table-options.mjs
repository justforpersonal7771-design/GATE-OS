import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errors = [];
page.on("console", m => errors.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", e => errors.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2025_AN_Q8", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2500);

const optionsHtml = await page.evaluate(() => {
  const optsHeader = Array.from(document.querySelectorAll('*')).find(el => el.textContent.trim() === 'OPTIONS' && el.children.length === 0);
  if (!optsHeader) return "OPTIONS header not found";
  const container = optsHeader.parentElement;
  return container.outerHTML.slice(0, 3000);
});
console.log("=== OPTIONS HTML ===");
console.log(optionsHtml);

console.log("=== CONSOLE LOG ===");
console.log(errors.join("\n"));

await browser.close();
