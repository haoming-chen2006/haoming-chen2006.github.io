// Full-game play-test: boots the real game, starts a village, lets it run, drives the player,
// opens every panel, fires an event, jumps to night, and screenshots each state. Fails on page errors.
//
//   npm run dev   (port 5190)      then:   node e2e/shot.cjs [seed]
const { chromium } = require('/Users/haoming/crownfall/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const SEED = process.argv[2] || '7';
const BASE = process.env.BASE || 'http://localhost:5190/pebblebrook/';
const OUT = path.join(__dirname, 'shots', 'game');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${(e.stack || '').slice(0, 500)}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 400)}`); });
  let n = 0;
  const shot = async (name) => { n++; const f = path.join(OUT, `${String(n).padStart(2, '0')}-${name}.png`); await page.screenshot({ path: f }); console.log('shot', path.basename(f)); };
  const state = () => page.evaluate(() => {
    const s = window.__pb.sim; const t = s.world.time;
    return { time: `${t.hour}:${String(t.min).padStart(2, '0')} day ${t.dayIndex} ${t.season}`, weather: s.world.weather.kind, villagers: s.villagers.map((v) => `${v.name.split(' ')[0]}@${v.inside ?? `${v.pos.x.toFixed(1)},${v.pos.y.toFixed(1)}`}:${v.action?.label ?? 'idle'}`), player: s.player.pos, chronicle: s.chronicle.slice(-3).map((c) => c.text), modal: window.__pb.ui.modal };
  });

  await page.goto(`${BASE}?seed=${SEED}`);
  await page.waitForSelector('#pb-title', { timeout: 60000 });
  await sleep(1200);
  await shot('title');
  await page.click('#pb-new');
  await page.waitForFunction(() => !window.__pb.ui.modal, null, { timeout: 30000 });
  await sleep(2500);
  const s0 = await state();
  console.log('started:', s0.time, s0.weather, 'player', s0.player);
  await shot('village-morning');

  // let the village live for a while at 8x and see that villagers move and act
  await page.evaluate(() => { window.__pb.sim.world.speed = 8; });
  await sleep(6000);
  await page.evaluate(() => { window.__pb.sim.world.speed = 1; });
  const s1 = await state();
  console.log('after 6s@8x:', s1.time, '\n  ' + s1.villagers.join('\n  '), '\n  chronicle:', s1.chronicle.join(' | '));
  const moved = s1.villagers.filter((v, i) => v !== s0.villagers[i]).length;
  console.log(`villagers whose state changed: ${moved}/10`);
  await shot('village-living');

  // walk the player around with real keys
  await page.keyboard.down('KeyD'); await sleep(900); await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyS'); await sleep(600); await page.keyboard.up('KeyS');
  const s2 = await state();
  console.log('player walked to', s2.player, 'prompt:', await page.evaluate(() => window.__pb.player.prompt()));
  await shot('walked');

  // talk to the nearest villager through the real dialogue panel
  const talked = await page.evaluate(() => { const s = window.__pb.sim; const v = s.villagersNear(s.player.pos, 40).filter((x) => !x.inside).sort((a, b) => Math.hypot(a.pos.x - s.player.pos.x, a.pos.y - s.player.pos.y) - Math.hypot(b.pos.x - s.player.pos.x, b.pos.y - s.player.pos.y))[0]; if (!v) return null; window.__pb.ui.openDialogue(v); return v.name; });
  console.log('dialogue with', talked);
  await sleep(1500);
  await shot('dialogue');
  const intents = ['day', 'gossip', 'compliment'];
  for (const it of intents) { const b = await page.$(`#pb-dialogue button[data-intent="${it}"]`); if (b) { await b.click(); await sleep(1500); } }
  await shot('dialogue-after-intents');
  const lines = await page.evaluate(() => Array.from(document.querySelectorAll('#pb-dialogue .pb-line, #pb-dialogue .line, #pb-dialogue p')).map((e) => e.textContent.trim()).filter(Boolean).slice(-6));
  console.log('dialogue lines:', lines);
  await page.keyboard.press('Escape'); await sleep(400);

  // inspector, village, board, director
  await page.evaluate(() => window.__pb.ui.panels.open('inspector')); await sleep(800); await shot('inspector');
  await page.evaluate(() => window.__pb.ui.panels.close('inspector'));
  await page.evaluate(() => window.__pb.ui.panels.open('village')); await sleep(800); await shot('village-panel');
  await page.evaluate(() => window.__pb.ui.panels.close('village'));
  await page.evaluate(() => window.__pb.ui.openBoard()); await sleep(800); await shot('board');
  await page.keyboard.press('Escape'); await sleep(300);
  await page.evaluate(() => window.__pb.ui.panels.open('director')); await sleep(800); await shot('director');
  const events = await page.evaluate(() => window.__pb.director.list().map((e) => `${e.id}${e.canFire ? '' : '(x)'}`));
  console.log(`director events (${events.length}):`, events.join(', '));
  const storm = await page.evaluate(() => { const l = window.__pb.director.list(); const e = l.find((x) => /storm/i.test(x.id)) || l.find((x) => /rain/i.test(x.id)); if (!e) return null; const r = window.__pb.director.fire(e.id); return r ? r.name : `fire(${e.id}) returned null`; });
  console.log('fired:', storm);
  await page.evaluate(() => window.__pb.ui.panels.close('director'));
  await sleep(2500);
  await shot('rain');

  // jump to evening: advance the sim to 21:00
  await page.evaluate(() => { const s = window.__pb.sim; const t = s.world.time; const target = 21 * 60; let cur = t.hour * 60 + t.min; let left = target > cur ? target - cur : 24 * 60 - cur + target; while (left > 0) { const step = Math.min(20, left); s.update(step); window.__pb.director.update(step); left -= step; } });
  await sleep(2000);
  const s3 = await state();
  console.log('night:', s3.time, s3.weather, '\n  ' + s3.villagers.join('\n  '));
  await shot('night');
  await page.evaluate(() => window.__pb.ui.panels.open('village')); await sleep(600); await shot('night-storyboard');
  await page.keyboard.press('Escape');
  // ---------------------------------------------------------------- farm, shop, sleep, save/load
  const farm = await page.evaluate(async () => {
    const s = window.__pb.sim, w = s.world, out = [];
    const plots = w.objectsAt('player_farm', 'plot');
    // stand just below the bottom row of plots, facing up, so the plot in front is unambiguous
    const maxY = Math.max(...plots.map((o) => o.pos.y));
    const plot = plots.find((o) => o.pos.y === maxY);
    s.player.pos = { x: plot.pos.x, y: plot.pos.y + 1 }; s.player.facing = 'up';
    const slot = (id) => s.player.inventory.findIndex((it) => it.id === id);
    const press = async (code) => { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); await new Promise((r) => setTimeout(r, 60)); window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    s.player.hotbar = slot('hoe'); await wait(100); out.push('prompt:' + window.__pb.player.prompt()); await press('KeyE'); await wait(1400); out.push('till→' + w.plot(plot.id).state);
    s.player.hotbar = slot('turnip_seed'); await wait(100); await press('KeyE'); await wait(400); out.push('plant→' + w.plot(plot.id).state + ':' + w.plot(plot.id).crop);
    s.player.hotbar = slot('watering_can'); await wait(100); await press('KeyE'); await wait(1200); out.push('water→' + w.plot(plot.id).watered);
    return out;
  });
  console.log('farm:', farm.join(' · '));
  await shot('farmed');
  const shop = await page.evaluate(async () => {
    const s = window.__pb.sim, w = s.world; const store = w.place('store');
    s.player.pos = { x: store.door.x, y: store.door.y + 1 };
    await new Promise((r) => setTimeout(r, 150));
    const prompt = window.__pb.player.prompt();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));
    const money0 = s.player.money; const r = s.playerBuy('store', 'bread', 1);
    return { prompt, inside: s.player.inside, modal: window.__pb.ui.modal, buy: r, money: [money0, s.player.money], open: window.__pb.ui.panels.openIds() };
  });
  console.log('shop:', JSON.stringify(shop));
  await shot('shop');
  await page.keyboard.press('Escape'); await sleep(300);
  await page.evaluate(() => { const s = window.__pb.sim; s.playerLeave(); });
  const slept = await page.evaluate(async () => {
    const s = window.__pb.sim, w = s.world; const home = w.place('home_player');
    s.player.pos = { x: home.door.x, y: home.door.y + 1 };
    await new Promise((r) => setTimeout(r, 150));
    const press = async (code) => { window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); await new Promise((r) => setTimeout(r, 60)); window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })); };
    await press('KeyE'); await new Promise((r) => setTimeout(r, 400));
    const p1 = window.__pb.player.prompt();
    await press('KeyE'); await new Promise((r) => setTimeout(r, 2600));
    const t = w.time; return { promptInside: p1, after: `${t.hour}:${String(t.min).padStart(2, '0')} day ${t.dayIndex}`, energy: s.player.energy };
  });
  console.log('sleep:', JSON.stringify(slept));
  await shot('morning-after');
  // save via the menu, reload, continue
  await page.keyboard.press('Escape'); await sleep(400);
  await page.click('#pb-menu button:has-text("Save")'); await sleep(400);
  const savedNow = await page.evaluate(() => !!localStorage.getItem('pebblebrook.save.v1'));
  const dayBefore = await page.evaluate(() => window.__pb.sim.world.time.dayIndex);
  await page.reload(); await page.waitForSelector('#pb-title', { timeout: 60000 }); await sleep(800);
  await page.click('#pb-continue'); await page.waitForFunction(() => !window.__pb.ui.modal, null, { timeout: 30000 }); await sleep(1500);
  const dayAfter = await page.evaluate(() => window.__pb.sim.world.time.dayIndex);
  console.log('save/load:', { savedNow, dayBefore, dayAfter });
  await shot('loaded');
  if (!savedNow || dayAfter !== dayBefore) errors.push('save/load did not round-trip');
  // fps
  const fps = await page.evaluate(() => new Promise((r) => { let c = 0; const t = performance.now(); const f = () => { c++; if (performance.now() - t < 2000) requestAnimationFrame(f); else r(c / 2); }; requestAnimationFrame(f); }));
  console.log('fps', fps.toFixed(0));
  // save/load

  await browser.close();
  if (errors.length) { console.log('PAGE ERRORS:\n' + errors.slice(0, 8).join('\n')); process.exit(1); }
  console.log('GAME PLAY-TEST: all steps passed');
})().catch(async (e) => { console.error('FAILED', e); process.exit(1); });
