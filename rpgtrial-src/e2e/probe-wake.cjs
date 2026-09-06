const { chromium } = require('/private/tmp/claude-501/-Users-haoming/27c8d279-b89e-49e5-8900-02115df0505c/scratchpad/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); page.setDefaultTimeout(180000);
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type().toUpperCase(), m.text().slice(0, 400)); });
  await page.goto('http://127.0.0.1:5180/rpgtrial/?quality=test');
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hide'), null, { timeout: 200000 });
  await page.evaluate(() => window.__hm.startGame('fighter', 'Tav'));
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const s = await page.evaluate(() => { const g = window.__hm; const p = g.world.player; return { step: g.prologue?.currentStep?.id, st: p.state, anim: p.anim.name, blocking: g.ui.isBlocking(), paused: g.paused, qt: g.prologue?.quest?.time?.toFixed?.(1), wt: g.world.time.toFixed(1), cine: !!g.cam.cinematic, hold: p.animHold }; });
    console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(s));
    if (s.step && s.step !== 'wake') break;
    if (s.blocking) await page.keyboard.press('Space');
    await page.waitForTimeout(1500);
  }
  await browser.close();
})();
