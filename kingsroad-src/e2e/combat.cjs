// Drop the hero into the first mid-lane fight and screenshot skills in first person.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/13526f25-682c-45cc-a9d7-9e3701dc7200/scratchpad/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5173/kingsroad/';
const OUT = path.join(__dirname, 'shots', 'combat'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', (e) => { console.log('PAGE ERROR', String(e)); process.exitCode = 1; });
  await page.goto(BASE); await sleep(1500);
  await page.evaluate((h) => { const k = 'kingsroad.settings.v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.hero = h; localStorage.setItem(k, JSON.stringify(s)); }, process.env.HERO || 'daji');
  await page.reload(); await sleep(1500);
  await page.click('#btnPlay'); await sleep(600); await page.mouse.move(640, 380); await page.click('#btnStart'); await sleep(4000);
  await page.mouse.click(640, 380);
  // skip ahead: run the sim 40 s so the first waves meet mid, then teleport next to our wave
  await page.evaluate(() => { const k = window.__kr; const sim = k.game.simulation; for (let i = 0; i < 60 * 40; i++) sim.step(1 / 60, new Map()); sim.w.events.length = 0; });
  await page.evaluate(() => { const k = window.__kr; const w = k.world(); const h = k.hero(); const ours = [...w.units(0)].filter((m) => !m.isHero && m.lane === 1); const path = k.map.lanePath(1, 0); const front = ours.reduce((a, m) => (k.map.laneProgress(path, m.pos) > k.map.laneProgress(path, a.pos) ? m : a), ours[0]); const back = k.map.lanePoint(path, k.map.laneAdvance(path, k.map.laneProgress(path, front.pos), -2.5)); h.pos = k.map.nearestFree(back); const nxt = k.map.lanePoint(path, k.map.laneAdvance(path, k.map.laneProgress(path, h.pos), 3)); k.view.rig.yaw = Math.atan2(nxt.y - h.pos.y, nxt.x - h.pos.x); });
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, '01-lane.png') });
  await page.mouse.down(); await sleep(1200); await page.mouse.up();
  await page.screenshot({ path: path.join(OUT, '02-attack.png') });
  await page.keyboard.press('Digit1'); await sleep(350);
  await page.screenshot({ path: path.join(OUT, '03-skill1.png') });
  await page.evaluate(() => { const h = window.__kr.hero(); const s = window.__kr.world().seatOf(h); s.level = 6; s.skillPoints = 5; });
  await sleep(300);
  await page.keyboard.press('Digit3'); await sleep(process.env.HERO === 'houyi' ? 350 : 900);
  await page.screenshot({ path: path.join(OUT, '04-ult.png') });
  await page.keyboard.press('Digit2'); await sleep(500);
  await page.screenshot({ path: path.join(OUT, '05-skill2.png') });
  const info = await page.evaluate(() => { const k = window.__kr; const h = k.hero(); return { hp: Math.round(h.hp), level: h.level, ranks: h.skillRank, cd: h.skillCd.map((c) => c.toFixed(1)), kills: k.world().players[0].stats.unitKills }; });
  console.log(JSON.stringify(info));
  await browser.close();
  console.log('combat ok');
})();
