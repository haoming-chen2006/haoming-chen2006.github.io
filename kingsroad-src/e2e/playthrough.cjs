// Human-style playthrough: walk the mid lane with WASD, fight the wave, buy from the shop with the mouse, recall home.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/13526f25-682c-45cc-a9d7-9e3701dc7200/scratchpad/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5173/kingsroad/';
const OUT = path.join(__dirname, 'shots', 'playthrough'); fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE); await sleep(1500);
  await page.evaluate((h) => { const k = 'kingsroad.settings.v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.hero = h; s.firstPerson = true; localStorage.setItem(k, JSON.stringify(s)); }, process.env.HERO || 'houyi');
  await page.reload(); await sleep(1500);
  await page.click('#btnPlay'); await sleep(600); await page.mouse.move(640, 380); await page.click('#btnStart'); await sleep(4500);
  await page.mouse.click(640, 380);
  await page.waitForFunction(() => window.__kr.world() && window.__kr.world().phase !== 'countdown', null, { timeout: 20000 });
  // walk the mid lane: face the next lane point, hold W, re-aim every 300 ms
  const start = await page.evaluate(() => ({ ...window.__kr.hero().pos }));
  const t0 = Date.now();
  let stuck = 0, lastD = 0;
  await page.keyboard.down('KeyW');
  while (Date.now() - t0 < 45000) {
    const st = await page.evaluate(() => {
      const k = window.__kr; const h = k.hero(); const path = k.map.lanePath(1, 0);
      const prog = k.map.laneProgress(path, h.pos); const nxt = k.map.lanePoint(path, k.map.laneAdvance(path, prog, 3));
      k.view.rig.yaw = Math.atan2(nxt.y - h.pos.y, nxt.x - h.pos.x);
      const foes = [...k.world().units(1)].filter((u) => Math.hypot(u.pos.x - h.pos.x, u.pos.y - h.pos.y) < 7).length;
      return { d: Math.hypot(h.pos.x - 3.4, h.pos.y - 52.6), hp: h.hp / h.maxHp, foes, prog, gold: h.gold, inWall: k.map.inWall(h.pos, 0.2) };
    });
    if (st.foes > 0 || st.prog > 0.42) break;
    if (st.d - lastD < 0.05) stuck++; else stuck = 0;
    if (stuck > 8) { console.log('FAIL: stuck while walking', st); errors.push('stuck'); break; }
    lastD = st.d;
    await sleep(300);
  }
  await page.keyboard.up('KeyW');
  const walked = await page.evaluate(() => { const h = window.__kr.hero(); return { pos: h.pos, time: Math.round(window.__kr.world().time) }; });
  console.log('walked', JSON.stringify({ from: start, to: walked }));
  await page.screenshot({ path: path.join(OUT, '01-arrived.png') });
  // wait for the first enemy wave to reach us (the walk is faster than the minions)
  await page.waitForFunction(() => { const k = window.__kr; const h = k.hero(); return h && [...k.world().units(1)].some((u) => Math.hypot(u.pos.x - h.pos.x, u.pos.y - h.pos.y) < 8); }, null, { timeout: 40000 });
  // fight: hold attack at the nearest enemy, use skill 1 twice
  const before = await page.evaluate(() => window.__kr.world().players[0].stats.unitKills);
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => { const k = window.__kr; const h = k.hero(); let best = null, bd = 99; for (const u of k.world().units(1)) { const d = Math.hypot(u.pos.x - h.pos.x, u.pos.y - h.pos.y); if (d < bd) { bd = d; best = u; } } if (best) k.view.rig.yaw = Math.atan2(best.pos.y - h.pos.y, best.pos.x - h.pos.x); });
    await page.mouse.down(); await sleep(500); await page.mouse.up();
    if (i === 2 || i === 6) await page.keyboard.press('Digit1');
  }
  const after = await page.evaluate(() => { const k = window.__kr; const h = k.hero(); return { kills: k.world().players[0].stats.unitKills, gold: Math.round(h.gold), hp: Math.round(h.hp), cd1: h.skillCd[0].toFixed(1) }; });
  console.log('fight', JSON.stringify({ killsBefore: before, ...after }));
  await page.screenshot({ path: path.join(OUT, '02-fight.png') });
  // shop with the mouse: open, click the first affordable item
  await page.evaluate(() => { const k = window.__kr; const s = k.world().seatOf(k.hero()); s.gold = 3000; k.hero().gold = 3000; s.autoBuy = false; k.hero().autoBuy = false; });
  await page.keyboard.press('KeyI'); await sleep(500);
  const itemsBefore = await page.evaluate(() => window.__kr.hero().items.length);
  const bought = await page.evaluate(() => { const b = [...document.querySelectorAll('#shopGrid .shop-item')].find((e) => !e.disabled && !e.classList.contains('owned') && !e.classList.contains('poor')); if (!b) return null; b.scrollIntoView(); const r = b.getBoundingClientRect(); return { id: b.dataset.id, x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (bought) { await page.mouse.click(bought.x, bought.y); await sleep(400); }
  await page.screenshot({ path: path.join(OUT, '03-shop.png') });
  const itemsAfter = await page.evaluate(() => window.__kr.hero().items);
  console.log('shop', JSON.stringify({ clicked: bought && bought.id, itemsBefore, itemsAfter }));
  await page.keyboard.press('KeyI'); await sleep(200);
  // recall: press B and wait for the channel
  await page.keyboard.press('KeyB'); await sleep(1000);
  const recalling = await page.evaluate(() => window.__kr.hero().recallT);
  await sleep(4500);
  const home = await page.evaluate(() => { const h = window.__kr.hero(); return { pos: h.pos, d: Math.hypot(h.pos.x - 3.4, h.pos.y - 52.6) }; });
  console.log('recall', JSON.stringify({ recalling, home }));
  await page.screenshot({ path: path.join(OUT, '04-home.png') });
  await browser.close();
  if (errors.length) { console.log('ERRORS', errors.join('\n')); process.exit(1); }
  if (!(after.kills > before)) { console.log('FAIL: no kills while fighting'); process.exit(1); }
  if (bought && itemsAfter.length <= itemsBefore) { console.log('FAIL: shop click bought nothing'); process.exit(1); }
  if (home.d > 6 && recalling > 0) { console.log('FAIL: recall did not bring the hero home'); process.exit(1); }
  console.log('playthrough ok');
})();
