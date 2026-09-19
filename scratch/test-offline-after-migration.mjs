import { chromium } from "playwright";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // First load: registers SW, precaches assets
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  // Wait for SW to be active
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15000 }).catch(() => {
    console.log("SW controller not detected within timeout (may need a second load to take control)");
  });

  // Reload once more so the SW actually controls this page (first load only registers it)
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const swState = await page.evaluate(() => ({
    controller: !!navigator.serviceWorker.controller,
  }));
  console.log("SW controller active on 2nd load:", swState.controller);

  // Check cache contents directly
  const cacheContents = await page.evaluate(async () => {
    const names = await caches.keys();
    const results = {};
    for (const name of names) {
      const cache = await caches.open(name);
      const reqs = await cache.keys();
      results[name] = reqs.map(r => r.url);
    }
    return results;
  });
  console.log("Cache contents:", JSON.stringify(cacheContents, null, 2));

  // Now go offline and reload
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(e => console.log("Reload while offline error:", e.message));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "scratch/offline-reload-state.png" });

  const bodyText = await page.textContent("body").catch(() => "");
  console.log("Offline reload has 'GATE' text:", bodyText.includes("GATE"));
  console.log("Offline reload has error/503 text:", bodyText.includes("Offline mode active") || bodyText.includes("503"));

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
})();
