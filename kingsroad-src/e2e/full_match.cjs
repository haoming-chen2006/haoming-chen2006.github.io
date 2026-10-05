// Full match to the results screen (sim fast-forwarded), Play Again, quit to menu; screenshots of scoreboard and results.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/13526f25-682c-45cc-a9d7-9e3701dc7200/scratchpad/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5173/kingsroad/';
const OUT = path.join(__dirname, 'shots', 'full_match'); fs.mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(BASE); await sleep(1500);
  await page.click('#btnPlay'); await sleep(600); await page.mouse.move(640, 380); await page.click('#btnStart'); await sleep(4000);
  await page.mouse.click(640, 380);
  // fast-forward in chunks (the human seat idles; bots play the match out)
  let ended = false;
  for (let i = 0; i < 40 && !ended; i++) {
    ended = await page.evaluate(() => { const k = window.__kr; const sim = k.game.simulation; for (let t = 0; t < 60 * 45 && sim.w.phase !== 'ended'; t++) { sim.step(1 / 60, new Map()); if (sim.w.phase !== 'ended') sim.w.events.length = 0; } return sim.w.phase === 'ended'; });
    if (i === 8) { await page.keyboard.down('Tab'); await sleep(400); await page.screenshot({ path: out('00-scoreboard.png') }); await page.keyboard.up('Tab'); }
  }
  if (!ended) { console.log('FAIL: match did not end'); process.exit(1); }
  await sleep(600);
  // let the screen notice the end through its normal frame loop
  await page.waitForFunction(() => !document.getElementById('results').classList.contains('hidden'), null, { timeout: 15000 });
  await sleep(1200);
  await page.screenshot({ path: out('01-results.png') });
  const res = await page.evaluate(() => ({ title: document.getElementById('resultTitle')?.textContent, rows: document.querySelectorAll('#results .sb-row, #results tr').length }));
  console.log('results', JSON.stringify(res));
  await page.click('#btnAgain'); await sleep(3000);
  const again = await page.evaluate(() => { const k = window.__kr; const w = k.world(); return { active: k.game.active, time: w ? Math.round(w.time) : -1, results: !document.getElementById('results').classList.contains('hidden') }; });
  console.log('again', JSON.stringify(again));
  await page.keyboard.press('Escape'); await sleep(400);
  await page.screenshot({ path: out('02-pause.png') });
  await page.click('#btnQuit'); await sleep(4500);
  const surrendered = await page.evaluate(() => ({ results: !document.getElementById('results').classList.contains('hidden'), title: document.getElementById('resultTitle')?.textContent }));
  console.log('surrender', JSON.stringify(surrendered));
  await page.click('#btnMenu'); await sleep(1500);
  const menu = await page.evaluate(() => ({ menuShown: !document.getElementById('menu').classList.contains('hidden'), record: window.__kr.settings.record }));
  console.log('menu', JSON.stringify(menu));
  await page.screenshot({ path: out('03-menu.png') });
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  if (errors.length || !again.active || !menu.menuShown) process.exit(1);
  console.log('full match ok');
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
