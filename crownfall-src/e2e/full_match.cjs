// Full match to the results screen, Play Again, quit to menu, portrait layout.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots', 'full_match');
require('fs').mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => { const l = document.getElementById('loading'); return !l || l.classList.contains('hidden') || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0'; }, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  await page.click('#difficultySeg button[data-d="hard"]');
  await page.click('#btnPlay');
  const t0 = Date.now();
  let ended = false;
  while (Date.now() - t0 < 6.5 * 60 * 1000) {
    await page.waitForTimeout(5000);
    const st = await page.evaluate(() => ({ results: !document.getElementById('results').classList.contains('hidden'), timer: document.getElementById('timer').textContent, phase: document.getElementById('phase').textContent, c0: document.querySelectorAll('#p0crowns .on').length, c1: document.querySelectorAll('#p1crowns .on').length }));
    if ((Date.now() - t0) % 30000 < 5000) console.log('t+' + Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(st));
    if (st.results) { ended = true; break; }
  }
  console.log('ended:', ended, 'after', Math.round((Date.now() - t0) / 1000), 's');
  await page.screenshot({ path: out('01-results.png') });
  const res = await page.evaluate(() => ({ title: document.getElementById('resultTitle').textContent, reason: document.getElementById('resultReason').textContent, stats: document.getElementById('resultStats').innerText.replace(/\n/g, ' | ') }));
  console.log('RESULT', res);
  await page.click('#btnAgain');
  await page.waitForTimeout(1200);
  const again = await page.evaluate(() => ({ timer: document.getElementById('timer').textContent, results: !document.getElementById('results').classList.contains('hidden') }));
  console.log('after play again', again);
  await page.screenshot({ path: out('02-again.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.click('#btnQuit');
  await page.waitForTimeout(300);
  const menu = await page.evaluate(() => ({ menuVisible: !document.getElementById('menu').classList.contains('hidden'), record: document.getElementById('record').textContent }));
  console.log('menu', menu);
  await page.screenshot({ path: out('03-menu-record.png') });
  // portrait layout
  await page.setViewportSize({ width: 480, height: 900 });
  await page.waitForTimeout(200);
  await page.click('#btnPlay');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('04-portrait.png') });
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED', e); process.exit(1); });
