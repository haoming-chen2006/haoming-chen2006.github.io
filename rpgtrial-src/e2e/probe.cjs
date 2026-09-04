// Frame-time probe: loads the page, then measures rAF intervals with a hard wall-clock budget.
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/27c8d279-b89e-49e5-8900-02115df0505c/scratchpad/node_modules/playwright');
(async () => {
  const q = process.argv[2] || 'low';
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.setDefaultTimeout(300000);
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('error: ' + m.text().slice(0, 300)); });
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:5180/rpgtrial/?quality=' + q);
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hide'), null, { timeout: 200000 }).catch(() => console.log('loading did not finish'));
  console.log('loaded in', Date.now() - t0, 'ms');
  for (let i = 0; i < 4; i++) {
    const t1 = Date.now();
    const r = await page.evaluate(() => new Promise((res) => { const a = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - a))); })).catch((e) => 'ERR ' + e.message);
    console.log('two frames:', typeof r === 'number' ? r.toFixed(0) + ' ms' : r, '(wall', Date.now() - t1, 'ms)');
  }
  const info = await page.evaluate(() => { const g = window.__hm; const r = g.renderer.renderer.info; return JSON.stringify({ calls: r.render.calls, tris: r.render.triangles, geoms: r.memory.geometries, tex: r.memory.textures, programs: r.programs?.length }); }).catch((e) => e.message);
  console.log('renderer info', info);
  console.log('errors:', errors.length ? '\n' + errors.slice(0, 10).join('\n') : 'none');
  await browser.close();
})();
