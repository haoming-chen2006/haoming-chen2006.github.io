// Screenshot the render preview in a set of scenes.
//   npm run dev                      (port 5190)
//   node scripts/render_shots.cjs    [only-scene-name] [--out dir]
const { chromium } = require('/Users/haoming/crownfall/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : path.join('/private/tmp/claude-501/-Users-haoming/b27c8b36-9962-491e-8347-64c92245a85b/scratchpad', 'shots');
const only = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:5190/pebblebrook/scripts/preview.html';

const SCENES = {
  'noon-spring': 'world=fake&hour=12&season=spring&weather=sunny',
  'dusk-autumn': 'world=fake&hour=18.6&season=autumn&weather=cloudy',
  'night-winter-snow': 'world=fake&hour=22&season=winter&weather=snow',
  'storm-summer': 'world=fake&hour=15&season=summer&weather=storm',
  'fog-morning': 'world=fake&hour=7&season=spring&weather=fog',
  'summer-night': 'world=fake&hour=21.5&season=summer&weather=sunny',
  'farm-noon': 'world=fake&hour=11&season=summer&weather=sunny&follow=none&x=70&y=39',
  'square-rain': 'world=fake&hour=14&season=spring&weather=rain&follow=none&x=34&y=28',
  'bakery': 'world=fake&hour=12&season=spring&weather=sunny&follow=none&x=34&y=19',
  'tavern-store': 'world=fake&hour=13&season=spring&weather=sunny&follow=none&x=35&y=37',
  'lake': 'world=fake&hour=12&season=spring&weather=sunny&follow=none&x=16&y=44',
  'forest': 'world=fake&hour=12&season=spring&weather=sunny&follow=none&x=8&y=7',
  'real-square': 'world=real&hour=12&season=spring&weather=sunny&follow=none&x=43&y=33',
  'birds': 'world=real&hour=10&season=spring&weather=sunny&follow=none&x=43&y=33&birds=1',
  'real-winter-night': 'world=real&hour=23&season=winter&weather=snow&follow=none&x=43&y=33',
  'real-storm': 'world=real&hour=15&season=autumn&weather=storm&follow=none&x=43&y=33',
  'real-mine': 'world=real&hour=16&season=summer&weather=sunny&follow=none&x=60&y=8',
  'real-lake': 'world=real&hour=12&season=autumn&weather=cloudy&follow=none&x=66&y=58',
  'real-farm': 'world=real&hour=9&season=spring&weather=sunny&follow=none&x=82&y=24',
  'real-festival-night': 'world=real&hour=21&season=summer&weather=sunny&follow=none&x=30&y=36',
  'chars': 'mode=chars',
  'pieces': 'mode=pieces',
  'items': 'mode=items',
  'door': 'world=fake&hour=12&season=spring&weather=sunny&px=24&py=20',
  'hover': 'world=fake&hour=12&season=spring&weather=sunny&follow=cerys&speed=0&walk=0',
  'evening-smoke': 'world=fake&hour=19.2&season=autumn&weather=cloudy&follow=none&x=34&y=20&inside=cerys:bakery,bram:smithy,hal:home_hal&birds=1',
  'door-inside': 'world=fake&hour=12&season=spring&weather=sunny&px=24&py=20&walk=0',
  'lowq': 'world=fake&hour=21&season=summer&weather=rain&quality=low',
  'winter-day': 'world=fake&hour=13&season=winter&weather=cloudy&follow=none&x=16&y=44',
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text().slice(0, 300)}`); });
  for (const [name, params] of Object.entries(SCENES)) {
    if (only.length && !only.includes(name)) continue;
    const t0 = Date.now();
    await page.goto(`${BASE}?${params}`);
    await page.waitForFunction(() => window.__pv && window.__pv.ready, null, { timeout: 30000 });
    await page.waitForTimeout(name === 'chars' || name === 'pieces' || name === 'items' ? 300 : 2200);
    const file = path.join(OUT, `${name}.png`);
    if (name === 'hover') {
      // hover the first villager near the square and highlight a tile
      const p = await page.evaluate(() => { const pv = window.__pv; const v = pv.sim.villagers.find((v) => v.id === 'cerys'); const s = pv.renderer.tileToScreen({ x: v.pos.x + 0.5, y: v.pos.y + 0.6 }); pv.renderer.highlight = { x: Math.floor(v.pos.x) + 2, y: Math.floor(v.pos.y) }; return s; });
      await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(300);
    }
    if (name === 'chars' || name === 'pieces' || name === 'items') { const size = await page.evaluate(() => { const c = document.getElementById('canvas'); return [c.width, c.height]; }); await page.setViewportSize({ width: size[0], height: size[1] }); await page.waitForTimeout(200); await page.screenshot({ path: file }); await page.setViewportSize({ width: 1280, height: 800 }); }
    else await page.screenshot({ path: file });
    console.log(`${name}: ${file} (${Date.now() - t0} ms)`);
  }
  if (errors.length) { console.log('--- page errors/warnings ---'); for (const e of errors) console.log(e); }
  await browser.close();
})();
