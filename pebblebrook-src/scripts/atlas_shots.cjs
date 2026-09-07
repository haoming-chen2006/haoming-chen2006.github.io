// Screenshot the Kenney atlas in labelled sections so tile indices can be read off.
//   npm run dev      (port 5190)
//   node scripts/atlas_shots.cjs [sheet] [cols] [rows] [zoom]
const { chromium } = require('/Users/haoming/crownfall/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const sheet = process.argv[2] || 'rpg';
const COLS = +(process.argv[3] || 15), ROWS = +(process.argv[4] || 8), ZOOM = +(process.argv[5] || 4);
const dims = { rpg: [57, 31], chars: [54, 12], tinytown: [12, 11] };
const [totalCols, totalRows] = dims[sheet];
const OUT = path.join('/private/tmp/claude-501/-Users-haoming/b27c8b36-9962-491e-8347-64c92245a85b/scratchpad', 'atlas');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  for (let y0 = 0; y0 < totalRows; y0 += ROWS) {
    for (let x0 = 0; x0 < totalCols; x0 += COLS) {
      const cols = Math.min(COLS, totalCols - x0), rows = Math.min(ROWS, totalRows - y0);
      const url = `http://127.0.0.1:5190/pebblebrook/scripts/atlas_preview.html?sheet=${sheet}&x0=${x0}&y0=${y0}&cols=${cols}&rows=${rows}&zoom=${ZOOM}`;
      await page.setViewportSize({ width: cols * (16 * ZOOM + 26), height: rows * (16 * ZOOM + 26) });
      await page.goto(url);
      await page.waitForFunction(() => document.title === 'ready');
      const file = path.join(OUT, `${sheet}-x${x0}-y${y0}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
  }
  await browser.close();
})();
