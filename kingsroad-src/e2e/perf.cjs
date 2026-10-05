// Measure renderer stats over a bot-heavy match to catch leaks and draw-call bloat.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/13526f25-682c-45cc-a9d7-9e3701dc7200/scratchpad/node_modules/playwright');
const BASE = process.env.BASE || 'http://localhost:5173/kingsroad/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(BASE); await sleep(1500);
  const stats = () => page.evaluate(() => {
    const k = window.__kr; const r = k.view.renderer; const w = k.world();
    return { geos: r.info.memory.geometries, tex: r.info.memory.textures, calls: r.info.render.calls, tris: r.info.render.triangles, objs: k.view.scene.children.length, ents: w ? w.entities.length : 0, fx: w ? w.effects.length : 0, time: w ? Math.round(w.time) : 0 };
  });
  console.log('menu', JSON.stringify(await stats()));
  await page.click('#btnPlay'); await sleep(600); await page.mouse.move(640, 380); await page.click('#btnStart'); await sleep(4000);
  await page.mouse.click(640, 380);
  // skip ahead into the mid game so plenty is happening, then stand in the middle and watch
  await page.evaluate(() => { const k = window.__kr; const sim = k.game.simulation; for (let i = 0; i < 60 * 240; i++) sim.step(1 / 60, new Map()); sim.w.events.length = 0; });
  await page.evaluate(() => { const k = window.__kr; const h = k.hero(); h.pos = { x: 26, y: 30 }; });
  let first = null;
  for (let i = 0; i < 6; i++) {
    await sleep(15000);
    const s = await stats();
    if (!first) first = s;
    console.log('t+' + (i + 1) * 15 + 's', JSON.stringify(s));
  }
  const last = await stats();
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (last.geos > first.geos + 400 || last.tex > first.tex + 10) { console.log('FAIL: renderer memory grows', first, last); process.exit(1); }
  if (errors.length) process.exit(1);
  console.log('perf ok');
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
