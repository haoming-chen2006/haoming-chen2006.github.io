// Screenshot one labelled region of a sheet at high zoom.
//   node scripts/atlas_region.cjs <sheet> <x0> <y0> <cols> <rows> <zoom> <name>
const { chromium } = require('/Users/haoming/crownfall/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const [sheet, x0, y0, cols, rows, zoom, name] = process.argv.slice(2);
const OUT = path.join('/private/tmp/claude-501/-Users-haoming/b27c8b36-9962-491e-8347-64c92245a85b/scratchpad', 'atlas');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  const z = +zoom, cell = 16 * z + 26;
  await page.setViewportSize({ width: +cols * cell, height: +rows * cell });
  await page.goto(`http://127.0.0.1:5190/pebblebrook/scripts/atlas_preview.html?sheet=${sheet}&x0=${x0}&y0=${y0}&cols=${cols}&rows=${rows}&zoom=${z}`);
  await page.waitForFunction(() => document.title === 'ready');
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(file);
  await browser.close();
})();
