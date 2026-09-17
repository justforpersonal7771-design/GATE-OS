import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const logs = [];
page.on("console", m => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", e => logs.push(`[pageerror] ${e}`));

await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2025_AN_Q8", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2500);

const html = await page.evaluate(() => {
  const spans = Array.from(document.querySelectorAll('span, div')).filter(el => el.textContent.trim() === 'OPTIONS');
  if (spans.length === 0) return "not found; body snippet: " + document.body.innerHTML.slice(0, 500);
  let el = spans[0];
  // walk up to a reasonable container
  let container = el.parentElement;
  return container ? container.outerHTML.slice(0, 4000) : "no parent";
});
console.log(html);
console.log("=== LOGS ===");
console.log(logs.join("\n"));

await browser.close();
