// Generic screenshot harness: node e2e/shot.cjs [url-suffix] [actions...]
// actions: wait:ms, key:Code:ms(hold), shot:name, mouse:dx,dy, eval:js, click
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/27c8d279-b89e-49e5-8900-02115df0505c/scratchpad/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const args = process.argv.slice(2);
  const url = (process.env.HM_URL || 'http://127.0.0.1:5180/rpgtrial/') + (args[0] && !args[0].includes(':') ? args.shift() : '');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 400)); });
  const t0 = Date.now();
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'quality=medium');
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hide'), null, { timeout: 90000 }).catch(() => console.log('loading did not finish'));
  console.log('loaded in', Date.now() - t0, 'ms');
  for (const a of args) {
    const [cmd, ...rest] = a.split(':');
    if (cmd === 'wait') await page.waitForTimeout(Number(rest[0]));
    else if (cmd === 'shot') { const f = path.join(OUT, rest[0] + '.png'); await page.screenshot({ path: f, timeout: 120000 }); console.log('shot', f); }
    else if (cmd === 'key') { await page.keyboard.down(rest[0]); await page.waitForTimeout(Number(rest[1] ?? 100)); await page.keyboard.up(rest[0]); }
    else if (cmd === 'press') { await page.keyboard.press(rest[0]); }
    else if (cmd === 'click') { await page.mouse.click(640, 360); }
    else if (cmd === 'mouse') { await page.mouse.move(640, 360); await page.mouse.move(640 + Number(rest[0]), 360 + Number(rest[1]), { steps: 10 }); }
    else if (cmd === 'eval') { const r = await page.evaluate(rest.join(':')); console.log('eval →', JSON.stringify(r)); }
  }
  console.log('errors:', errors.length ? '\n' + errors.slice(0, 12).join('\n') : 'none');
  await browser.close();
})();
