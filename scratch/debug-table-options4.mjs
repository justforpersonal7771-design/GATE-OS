import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

await page.goto("http://localhost:3000/ai-tutor?qid=GATE_CS_2025_AN_Q8", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2500);

const info = await page.evaluate(() => {
  // Find the mjx-container elements inside the options area
  const mjxEls = Array.from(document.querySelectorAll('mjx-container'));
  return mjxEls.slice(0, 6).map(el => {
    const cs = getComputedStyle(el);
    const parentCs = el.parentElement ? getComputedStyle(el.parentElement) : null;
    return {
      tag: el.tagName,
      visibility: cs.visibility,
      display: cs.display,
      opacity: cs.opacity,
      color: cs.color,
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      parentColor: parentCs ? parentCs.color : null,
      outerHTMLStart: el.outerHTML.slice(0, 150)
    };
  });
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
