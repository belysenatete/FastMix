// Renders og.html to og.png/og.jpg (1200x630). Copy og.jpg to web/src/app/opengraph-image.jpg and twitter-image.jpg.
// Needs playwright-core with a Chromium install; change the require path below to yours.
const { chromium } = require("C:/Users/belys/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core");
const { pathToFileURL } = require("url");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(__dirname + "/og.html").href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: __dirname + "/og.png" });
  await page.screenshot({ path: __dirname + "/og.jpg", type: "jpeg", quality: 88 });
  await browser.close();
})();
