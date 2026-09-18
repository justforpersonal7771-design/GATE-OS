import { chromium } from "playwright";

const BASE = "http://localhost:3001";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.click('button[aria-label="AI Goal Slider"]');
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const overlay = document.querySelector('.fixed.inset-0.z-\\[100\\]');
    const card = overlay ? overlay.firstElementChild : null;
    const header = card ? card.querySelector('.sticky') : null;
    return {
      overlayRect: overlay ? overlay.getBoundingClientRect() : null,
      cardRect: card ? card.getBoundingClientRect() : null,
      cardScrollTop: card ? card.scrollTop : null,
      cardScrollHeight: card ? card.scrollHeight : null,
      cardClientHeight: card ? card.clientHeight : null,
      headerRect: header ? header.getBoundingClientRect() : null,
      bodyScrollY: window.scrollY,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
