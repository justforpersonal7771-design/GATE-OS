import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2025_AN_Q8", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  const bodyLen = document.body.innerHTML.length;
  const optionEls = Array.from(document.querySelectorAll('*')).filter(el => el.children.length === 0 && /^OPTIONS$/.test(el.textContent.trim()));
  const allTextNodes = document.body.innerText;
  const idx = allTextNodes.indexOf("OPTIONS");
  return {
    bodyLen,
    optionElsCount: optionEls.length,
    surroundingText: allTextNodes.slice(idx, idx + 400)
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
