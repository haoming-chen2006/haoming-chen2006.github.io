// Item twists in a real browser: Storm Lance forking bolts and Void Staff marks, plus a Chinese-UI screenshot.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/13526f25-682c-45cc-a9d7-9e3701dc7200/scratchpad/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5173/kingsroad/';
const OUT = path.join(__dirname, 'shots', 'passives'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', (e) => { console.log('PAGE ERROR', String(e)); process.exitCode = 1; });
  await page.goto(BASE); await sleep(1500);
  await page.evaluate(() => { localStorage.setItem('kingsroad-lang', 'zh'); });
  await page.reload(); await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '01-menu-zh.png') });
  await page.evaluate(() => { window.__kr.settings.hero = 'houyi'; });
  await page.click('#btnPlay'); await sleep(600);
  await page.screenshot({ path: path.join(OUT, '02-select-zh.png') });
  await page.mouse.move(640, 380); await page.click('#btnStart'); await sleep(4000);
  await page.mouse.click(640, 380);
  await page.evaluate(() => { const k = window.__kr; const sim = k.game.simulation; for (let i = 0; i < 60 * 40; i++) sim.step(1 / 60, new Map()); sim.w.events.length = 0; });
  // give the hero both twist items and drop it in front of the enemy mid wave
  await page.evaluate(() => {
    const k = window.__kr; const w = k.world(); const h = k.hero(); const s = w.seatOf(h);
    s.items = ['storm_lance', 'void_staff']; h.items = s.items; s.level = 8; h.level = 8; w.refreshDerived(h);
    const foes = [...w.units(1)].filter((m) => !m.isHero && m.lane === 1);
    const front = foes.reduce((a, m) => (m.pos.x < a.pos.x ? m : a), foes[0]);
    h.pos = { x: front.pos.x - 4, y: front.pos.y + 4 }; k.view.rig.yaw = -Math.PI / 4;
  });
  await sleep(500);
  await page.keyboard.press('KeyI'); await sleep(400);
  await page.screenshot({ path: path.join(OUT, '03-shop-zh.png') });
  await page.keyboard.press('KeyI');
  // count lightning effects while holding attack
  await page.evaluate(() => { window.__bolts = 0; const w = window.__kr.world(); const orig = w.addEffect.bind(w); w.addEffect = (e) => { if (e.type === 'lightning' && e.color === '#e8fbff') window.__bolts++; if (e.type === 'burst' && e.color === '#b47cff') window.__bolts += 100; return orig(e); }; });
  await page.mouse.down();
  for (let i = 0; i < 25; i++) { await sleep(1000); if (await page.evaluate(() => window.__bolts > 0)) break; }
  await page.mouse.up(); await sleep(200);
  await page.screenshot({ path: path.join(OUT, '04-storm.png') });
  const info = await page.evaluate(() => { const k = window.__kr; const h = k.hero(); return { bolts: window.__bolts, stormN: h.stormN, items: h.items, attack: k.world().stats(h).attack }; });
  console.log(JSON.stringify(info));
  if (!(info.bolts > 0)) { console.log('FAIL: no storm bolts'); process.exitCode = 1; }
  await browser.close();
  console.log('passives ok');
})();
