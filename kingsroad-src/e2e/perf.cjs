// Measure renderer stats over a bot-heavy match to catch leaks and draw-call bloat.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => { const l = document.getElementById('loading'); return !l || l.classList.contains('hidden') || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0'; }, null, { timeout: 120000 });
  await page.waitForTimeout(500);
  const stats = () => page.evaluate(() => { const r = window.__cf.view.renderer; return { geos: r.info.memory.geometries, tex: r.info.memory.textures, calls: r.info.render.calls, tris: r.info.render.triangles, objs: window.__cf.view.scene.children.length }; });
  console.log('menu', await stats());
  await page.click('#difficultySeg button[data-d="hard"]');
  await page.click('#btnPlay');
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(15000); console.log('t+' + (i + 1) * 15 + 's', await stats(), 'timer', await page.evaluate(() => document.getElementById('timer').textContent)); }
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
