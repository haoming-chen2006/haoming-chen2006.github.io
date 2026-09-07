// Two browsers, one duel: host creates a room, guest joins by invite link, both play, host concedes,
// both rematch, guest leaves. Compares the two worlds' lockstep hashes and takes screenshots of both.
//
//   npm run dev                         # in another terminal
//   node e2e/duel.cjs                   # direct (WebRTC) link
//   RELAY=1 node e2e/duel.cjs           # force the relayed path through Supabase
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const RELAY = process.env.RELAY === '1';
const BASE = process.env.BASE || 'http://localhost:5173/crownfall/';
const OUT = path.join(__dirname, 'shots', RELAY ? 'duel-relay' : 'duel');
fs.mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // Headless Chromium can drive the real GPU through ANGLE/Metal on a Mac (about 20x faster than SwiftShader).
  const gpu = process.env.SWIFTSHADER === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=metal', '--enable-gpu-rasterization'];
  const browser = await chromium.launch({ args: [...gpu, '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'] });
  const mk = async (tag) => {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 640 } });
    // Software rendering is slow: keep the graphics on Low so two browsers fit on one CPU.
    await ctx.addInitScript(() => { try { const k = 'crownfall.settings.v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.quality = 'low'; s.music = false; s.showTutorial = false; localStorage.setItem(k, JSON.stringify(s)); } catch {} });
    const page = await ctx.newPage();
    page.errors = [];
    page.on('pageerror', (e) => page.errors.push(`${tag} pageerror: ${e.message}\n${(e.stack || '').slice(0, 400)}`));
    page.on('console', (m) => { if (m.type() === 'error') page.errors.push(`${tag} console.error: ${m.text().slice(0, 300)}`); });
    page.tag = tag;
    return page;
  };
  const host = await mk('host'), guest = await mk('guest');
  const loaded = (p) => p.waitForFunction(() => { const l = document.getElementById('loading'); return !l || l.classList.contains('hidden'); }, null, { timeout: 120000 });
  const visible = (p, id) => p.waitForFunction((id) => !document.getElementById(id).classList.contains('hidden'), id, { timeout: 60000 });
  const shot = async (p, n) => { await p.screenshot({ path: out(`${p.tag}-${n}.png`) }); console.log('shot', `${p.tag}-${n}`); };
  const net = (p) => p.evaluate(() => window.__cf.net());
  const fail = (msg) => { console.log('FAIL:', msg); throw new Error(msg); };
  let step = 0;
  const say = (m) => console.log(`${String(++step).padStart(2, '0')}. ${m}`);

  // ---------------------------------------------------------------- host: create room
  await host.goto(BASE + (RELAY ? '?relay=1' : ''));
  await loaded(host);
  await host.click('#btnOnline');
  await visible(host, 'online');
  await host.fill('#onlineName', 'Ada');
  await host.click('#btnCreateRoom');
  await visible(host, 'room');
  const code = await host.textContent('#roomCode');
  const link = await host.textContent('#roomLink');
  say(`host opened room ${code} · link ${link}`);
  if (!/^[A-Z0-9]{4}$/.test(code)) fail('bad room code');
  if (!link.includes(`#/join/${code}`)) fail('share link does not carry the code');
  await shot(host, '01-room-empty');

  // ---------------------------------------------------------------- guest: join by link
  await guest.goto(link + (RELAY ? '?relay=1' : ''));
  await loaded(guest);
  await visible(guest, 'online');
  await guest.fill('#onlineName', 'Bob');
  await guest.click('#btnJoinRoom');
  await visible(guest, 'room');
  say('guest joined through the invite link');
  await host.waitForFunction(() => !document.getElementById('seatGuest').classList.contains('empty'), null, { timeout: 20000 });
  await guest.click('#btnRoomReady');
  await host.waitForFunction(() => !document.getElementById('btnRoomStart').disabled, null, { timeout: 20000 });
  say('host sees the guest ready');
  // link mode while waiting (direct should come up within a few seconds)
  if (!RELAY) await host.waitForFunction(() => document.getElementById('roomLink2').classList.contains('p2p'), null, { timeout: 15000 }).catch(() => {});
  await sleep(RELAY ? 1500 : 1000);
  const modeHost = await host.textContent('#roomLink2'), modeGuest = await guest.textContent('#roomLink2');
  say(`link mode · host: "${modeHost}" · guest: "${modeGuest}"`);
  await shot(host, '02-room-ready');
  await shot(guest, '02-room-ready');
  // chat
  await guest.fill('#roomChatInput', 'gl hf');
  await guest.press('#roomChatInput', 'Enter');
  await host.waitForFunction(() => document.getElementById('roomChatLog').textContent.includes('gl hf'), null, { timeout: 10000 });
  say('chat line reached the host');

  // ---------------------------------------------------------------- start
  await host.click('#btnRoomStart');
  await visible(host, 'game');
  await visible(guest, 'game');
  say('both browsers entered the match');
  await sleep(5500);
  const n0h = await net(host), n0g = await net(guest);
  say(`after countdown · host tick ${n0h.tick} phase ${n0h.phase} delay ${n0h.delay} · guest tick ${n0g.tick} phase ${n0g.phase}`);
  if (n0h.phase !== 'regulation' || n0g.phase !== 'regulation') fail('match did not leave the countdown on both sides');
  await shot(host, '03-battle-start');
  await shot(guest, '03-battle-start');

  // ---------------------------------------------------------------- deploy on both sides
  const toScreen = (p, x, z) => p.evaluate(([x, z]) => window.__cf.toScreen(x, z, 0.05), [x, z]);
  // Hands are dealt from the seed, so pick whichever affordable troop card is in the hand right now.
  const SPELLS = new Set(['Meteor', 'Volley', 'Shock', 'Frenzy', 'Frost']), BUILDINGS = new Set(['Cannon', 'Arc Tower', 'Barracks']);
  const deploy = async (p, x, z) => {
    for (let tries = 0; tries < 30; tries++) {
      const hand = await p.evaluate(() => Array.from(document.querySelectorAll('#hand .card')).map((c) => ({ name: c.querySelector('.name').textContent, cost: Number(c.querySelector('.cost').textContent) })));
      const elixir = await p.evaluate(() => parseFloat((document.getElementById('elixirText').textContent || '0').replace(/[^0-9.]/g, '')) || 0);
      const idx = hand.findIndex((c) => !SPELLS.has(c.name) && !BUILDINGS.has(c.name) && c.cost <= elixir);
      if (idx >= 0) {
        await p.keyboard.press(`Digit${idx + 1}`);
        const s = await toScreen(p, x, z);
        await p.mouse.move(s.x, s.y); await sleep(120);
        await p.mouse.click(s.x, s.y); await sleep(200);
        return hand[idx].name;
      }
      await sleep(400);
    }
    fail(`${p.tag} never had an affordable troop card`);
  };
  say(`host deploys ${await deploy(host, 4, 23)} · guest deploys ${await deploy(guest, 14, 9)}`);
  await sleep(2500);
  const ents = async (p) => p.evaluate(() => { const w = window.__cf.world(); return w.entities.filter((e) => e.kind === 'unit').map((e) => `${e.team}:${e.def.id}`).sort().join(','); });
  const eh = await ents(host), eg = await ents(guest);
  say(`units · host sees [${eh}] · guest sees [${eg}]`);
  if (eh !== eg) fail('the two worlds hold different units');
  if (!eh.includes('0:') || !eh.includes('1:')) fail('a deployment did not land on both teams');
  await shot(host, '04-deployed');
  await shot(guest, '04-deployed');

  // ---------------------------------------------------------------- guest possesses and moves
  await guest.keyboard.press('KeyF');
  await sleep(1200);
  const heroes = async (p) => (await net(p)).heroes.join('/');
  say(`heroes (team0/team1) · host ${await heroes(host)} · guest ${await heroes(guest)}`);
  const hg = (await net(guest)).heroes;
  if (hg[1] < 0) fail('guest could not possess its troop');
  const heroPos = (p) => p.evaluate(() => { const w = window.__cf.world(); const h = w.hero(1); return h ? [h.pos.x, h.pos.y] : null; });
  const before = await heroPos(guest);
  await guest.mouse.move(512, 320);
  await guest.keyboard.down('KeyW');
  await sleep(1800);
  await guest.keyboard.up('KeyW');
  await sleep(600);
  const afterG = await heroPos(guest), afterH = await heroPos(host);
  say(`guest hero moved from ${before?.map((v) => v.toFixed(2))} to ${afterG?.map((v) => v.toFixed(2))} · host sees ${afterH?.map((v) => v.toFixed(2))}`);
  if (!before || !afterG || Math.hypot(afterG[0] - before[0], afterG[1] - before[1]) < 0.8) fail('guest hero did not move');
  await shot(guest, '05-first-person');
  await shot(host, '05-host-sees-champion');
  await guest.keyboard.press('KeyV');
  await sleep(900);
  await shot(guest, '06-third-person');

  // ---------------------------------------------------------------- lockstep hashes agree
  await sleep(3000);
  const nh = await net(host), ng = await net(guest);
  const mapH = new Map(nh.hashes), mapG = new Map(ng.hashes);
  let compared = 0, mism = 0;
  for (const [t, h] of mapH) if (mapG.has(t)) { compared++; if (mapG.get(t) !== h) mism++; }
  say(`hash check · compared ${compared} ticks · mismatches ${mism} · desynced host ${nh.desynced} guest ${ng.desynced} · host tick ${nh.tick} guest tick ${ng.tick} · wait ${nh.waitMs}/${ng.waitMs} ms`);
  if (compared < 3) fail('too few common hash ticks');
  if (mism > 0 || nh.desynced || ng.desynced) fail('worlds diverged');
  const pill = await host.textContent('#netPill');
  say(`host net pill: "${pill}"`);

  // ---------------------------------------------------------------- host concedes → guest wins
  await host.keyboard.press('Escape');
  await sleep(300);
  await host.keyboard.press('Escape');
  await visible(host, 'pauseOverlay');
  await shot(host, '07-menu-overlay');
  await host.click('#btnQuit');
  await guest.waitForFunction(() => !document.getElementById('results').classList.contains('hidden'), null, { timeout: 15000 });
  await host.waitForFunction(() => !document.getElementById('results').classList.contains('hidden'), null, { timeout: 15000 });
  const titleG = await guest.textContent('#resultTitle'), titleH = await host.textContent('#resultTitle');
  const reasonG = await guest.textContent('#resultReason');
  say(`results · guest "${titleG}" (${reasonG}) · host "${titleH}"`);
  if (titleG !== 'Victory' || titleH !== 'Defeat') fail('forfeit did not resolve as guest victory / host defeat');
  await shot(guest, '08-results');
  await shot(host, '08-results');

  // ---------------------------------------------------------------- rematch
  await host.click('#btnAgain');
  await sleep(500);
  await guest.click('#btnAgain');
  await host.waitForFunction(() => document.getElementById('results').classList.contains('hidden') && window.__cf.net() && window.__cf.net().tick < 200, null, { timeout: 20000 });
  await guest.waitForFunction(() => document.getElementById('results').classList.contains('hidden') && window.__cf.net() && window.__cf.net().tick < 200, null, { timeout: 20000 });
  say('rematch started on both sides');
  await sleep(4500);
  const r1 = await net(host), r2 = await net(guest);
  say(`rematch · host tick ${r1.tick} ${r1.phase} · guest tick ${r2.tick} ${r2.phase}`);
  if (r1.phase !== 'regulation' || r2.phase !== 'regulation') fail('rematch did not get going');
  await shot(guest, '09-rematch');

  // ---------------------------------------------------------------- guest walks out mid-match → host wins by forfeit
  await guest.keyboard.press('Escape');
  await sleep(200);
  await guest.keyboard.press('Escape');
  await visible(guest, 'pauseOverlay');
  await guest.click('#btnQuit');
  await host.waitForFunction(() => !document.getElementById('results').classList.contains('hidden'), null, { timeout: 15000 });
  say(`host result after guest left: "${await host.textContent('#resultTitle')}" (${await host.textContent('#resultReason')})`);
  await guest.waitForFunction(() => !document.getElementById('results').classList.contains('hidden'), null, { timeout: 15000 });
  await guest.click('#btnMenu');
  await visible(guest, 'room');
  await guest.click('#btnRoomLeave');
  await visible(guest, 'online');
  await host.click('#btnMenu');
  await visible(host, 'room');
  await host.waitForFunction(() => document.getElementById('seatGuest').classList.contains('empty'), null, { timeout: 20000 });
  say('guest left; host is back in an empty room');
  await shot(host, '10-room-after');

  const errors = [...host.errors, ...guest.errors].filter((e) => !/favicon|ERR_INTERNET|WebSocket/i.test(e));
  if (errors.length) { console.log('page errors:\n' + errors.join('\n')); }
  await browser.close();
  console.log(errors.length ? 'DUEL E2E: completed with page errors' : 'DUEL E2E: all steps passed');
  process.exit(errors.length ? 1 : 0);
})().catch(async (e) => { console.error(e); process.exit(1); });
process.on('exit', () => { try { require('child_process').execSync('pkill -f "Google Chrome for Testing" || true'); } catch {} });
