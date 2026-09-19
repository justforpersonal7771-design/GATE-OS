import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));

  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(5000);

  const regs = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map(r => ({ scope: r.scope, active: !!r.active, installing: !!r.installing, waiting: !!r.waiting }));
  });
  console.log("Registrations:", JSON.stringify(regs));

  await browser.close();
})();
