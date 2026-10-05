// Menu -> hero select -> battle; screenshots into e2e/shots/smoke; fails on page errors.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/13526f25-682c-45cc-a9d7-9e3701dc7200/scratchpad/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5173/kingsroad/';
const OUT = path.join(__dirname, 'shots', 'smoke');
fs.mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const gpu = process.env.SWIFTSHADER === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu-rasterization'];
  const browser = await chromium.launch({ args: [...gpu, '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.type(), m.text().slice(0, 300)); });
  await page.goto(BASE, { waitUntil: 'load' });
  await sleep(2500);
  await page.screenshot({ path: out('01-menu.png') });
  await page.click('#btnPlay');
  await sleep(1500);
  await page.screenshot({ path: out('02-select.png') });
  await page.mouse.move(640, 380);
  await page.click('#btnStart');
  await sleep(4500);
  await page.screenshot({ path: out('03-intro.png') });
  // click to capture, walk forward a bit
  await page.mouse.click(640, 380);
  await page.keyboard.down('KeyW'); await sleep(6000); await page.keyboard.up('KeyW');
  await page.screenshot({ path: out('04-fp.png') });
  const info = await page.evaluate(() => { const k = window.__kr; const w = k.world(); const h = k.hero(); return { time: w.time, phase: w.phase, ents: w.entities.length, hero: h ? { id: h.def.id, pos: h.pos, hp: h.hp } : null, mode: k.game.preferFirst }; });
  console.log('state', JSON.stringify(info));
  await page.keyboard.press('KeyV'); await sleep(1500);
  await page.screenshot({ path: out('05-third.png') });
  await page.keyboard.press('Tab'); await page.keyboard.down('Tab'); await sleep(300);
  await page.screenshot({ path: out('06-scoreboard.png') }); await page.keyboard.up('Tab');
  await page.keyboard.press('KeyI'); await sleep(500);
  await page.screenshot({ path: out('07-shop.png') });
  await page.keyboard.press('KeyI');
  await page.keyboard.press('KeyM'); await sleep(300);
  await page.screenshot({ path: out('08-map.png') });
  await page.keyboard.press('KeyM');
  // run the match for a while
  await sleep(20000);
  await page.screenshot({ path: out('09-later.png') });
  const info2 = await page.evaluate(() => { const k = window.__kr; const w = k.world(); return { time: w.time, ents: w.entities.length, kills: [w.players[0].kills, w.players[1].kills], fps: k.view.quality }; });
  console.log('state2', JSON.stringify(info2));
  await browser.close();
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('smoke ok');
})();
