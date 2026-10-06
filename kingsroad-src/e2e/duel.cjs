// Online: two browsers create/join a room, start a 3v3 with bots, play, and must stay in lockstep.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/13526f25-682c-45cc-a9d7-9e3701dc7200/scratchpad/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5173/kingsroad/';
const OUT = path.join(__dirname, 'shots', 'duel');
fs.mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
  const mk = async (tag) => {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 680 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(tag, 'PAGE ERROR', String(e)));
    page.on('console', (m) => { if (m.type() === 'error') console.log(tag, 'console error:', m.text().slice(0, 200)); });
    return page;
  };
  const A = await mk('A'), B = await mk('B');
  await A.goto(BASE); await sleep(2000);
  // host: 3v3 normal
  await A.evaluate(() => { const k = window.__kr; k.settings.mode = '3v3'; k.settings.hero = 'houyi'; });
  await A.click('#btnOnline'); await sleep(2500);
  await A.fill('#onlineName', 'Alice');
  await A.click('#btnCreateRoom');
  await A.waitForSelector('.room-code', { timeout: 20000 });
  const code = await A.$eval('.room-code', (el) => el.textContent.trim());
  console.log('room', code);
  await A.screenshot({ path: out('01-host-room.png') });
  await B.goto(`${BASE}#/join/${code}`); await sleep(1000);
  await B.waitForSelector('.room-code', { timeout: 25000 });
  await B.evaluate(() => { window.__kr.settings.hero = 'daji'; });
  await B.click('.hero-pick[data-hero="daji"]'); await sleep(800);
  await B.click('#btnRoomReady'); await sleep(1200);
  await B.screenshot({ path: out('02-guest-room.png') });
  await A.waitForSelector('#btnRoomStart:not([disabled])', { timeout: 15000 });
  await A.click('#btnRoomStart');
  await sleep(6000);
  await A.mouse.move(550, 340); await B.mouse.move(550, 340);
  await A.mouse.click(550, 340); await B.mouse.click(550, 340);
  await B.keyboard.down('KeyW'); await sleep(3000); await B.keyboard.up('KeyW');
  await A.keyboard.press('Digit1'); await sleep(300);
  await A.screenshot({ path: out('03-host-play.png') }); await B.screenshot({ path: out('04-guest-play.png') });
  const st = async (p) => p.evaluate(() => { const k = window.__kr; const w = k.world(); const n = k.net(); const heroes = [...w.heroes()].map((h) => `${h.team}:${h.def.id}@${h.pos.x.toFixed(2)},${h.pos.y.toFixed(2)}`); return { tick: n && n.tick, wait: n && Math.round(n.waitMs), rtt: n && Math.round(n.rtt), desynced: n && n.desynced, time: +w.time.toFixed(2), heroes, me: k.game.me, seat: k.game.mySeat }; });
  await sleep(8000);
  const a = await st(A), b = await st(B);
  console.log('A', JSON.stringify(a)); console.log('B', JSON.stringify(b));
  // compare hashes at the same tick: pause-free comparison by waiting until both report the same tick
  let same = false;
  for (let i = 0; i < 20 && !same; i++) {
    const [ha, hb] = await Promise.all([A.evaluate(() => [window.__kr.net().tick, window.__kr.hash()]), B.evaluate(() => [window.__kr.net().tick, window.__kr.hash()])]);
    if (ha[0] === hb[0]) { same = ha[1] === hb[1]; console.log('tick', ha[0], 'hashes', ha[1], hb[1], same ? 'MATCH' : 'MISMATCH'); break; }
    await sleep(50);
  }
  const guestMoved = b.heroes.some((h) => h.startsWith('1:daji') && !h.includes('@51.5') );
  console.log('desynced', a.desynced || b.desynced, 'guest hero seen identically', a.heroes.join() === b.heroes.join() ? 'maybe (snapshot differs by tick)' : 'n/a', 'guestMoved', guestMoved);
  await browser.close();
  if (a.desynced || b.desynced) { console.log('DESYNC'); process.exit(1); }
  console.log('duel ok');
})();
