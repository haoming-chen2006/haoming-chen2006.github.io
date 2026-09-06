// 3D play-test: menu with live battle, deck builder thumbnails, commander view, first/third person possession.
const { chromium } = require('playwright');
const path = require('path');
const PRESET = process.env.PRESET || 'Nightfall';
const PREFER = process.env.PREFER || '';
const OUT = path.join(__dirname, 'shots', 'possession3d' + (process.env.TAG || ''));
require('fs').mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const SPELLS = new Set(['Meteor', 'Volley', 'Shock', 'Frenzy', 'Frost']);
const BUILDINGS = new Set(['Cannon', 'Arc Tower', 'Barracks']);

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').slice(0, 600)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text().slice(0, 300)); });
  const t0 = Date.now();
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => { const l = document.getElementById('loading'); return !l || l.classList.contains('hidden') || getComputedStyle(l).display === 'none' || getComputedStyle(l).opacity === '0'; }, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  console.log('loaded in', Date.now() - t0, 'ms');
  const shot = async (n) => { await page.screenshot({ path: out(n) }); console.log('shot', n); };
  await shot('01-menu.png');
  await page.waitForTimeout(3000);
  await shot('02-menu-later.png');
  await page.click('#btnDeck');
  await page.waitForTimeout(800);
  await shot('03-deck.png');
  await page.click(`.presets button:has-text("${PRESET}")`);
  await page.click('#btnDeckBack');
  await page.click('#btnPlay');
  await page.waitForTimeout(1200);
  await shot('04-intro.png');
  await page.waitForTimeout(3500);
  await shot('04-commander.png');

  const toScreen = (x, z, y = 0.05) => page.evaluate(([x, z, y]) => window.__cf.toScreen(x, z, y), [x, z, y]);
  const readHand = () => page.evaluate(() => Array.from(document.querySelectorAll('#hand .card')).map((c) => ({ name: c.querySelector('.name').textContent, cost: Number(c.querySelector('.cost').textContent) })));
  const readElixir = () => page.evaluate(() => parseFloat((document.getElementById('elixirText').textContent || '0').replace(/[^0-9.]/g, '')) || 0);
  const heroPanel = () => page.evaluate(() => document.getElementById('heroPanel').innerText);

  async function deployTroop(x, z) {
    for (let tries = 0; tries < 40; tries++) {
      const hand = await readHand(); const elixir = await readElixir();
      let idx = PREFER ? hand.findIndex((c) => c.name === PREFER && c.cost <= elixir) : -1;
      if (idx < 0 && (!PREFER || tries > 12)) idx = hand.findIndex((c) => !SPELLS.has(c.name) && !BUILDINGS.has(c.name) && c.cost <= elixir);
      if (idx >= 0) {
        await page.keyboard.press(`Digit${idx + 1}`);
        const p = await toScreen(x, z);
        await page.mouse.move(p.x, p.y); await page.waitForTimeout(120);
        await shot('05-placement.png');
        await page.mouse.click(p.x, p.y); await page.waitForTimeout(200);
        console.log('deployed', hand[idx].name, 'at', x, z, 'screen', p);
        return hand[idx].name;
      }
      await page.waitForTimeout(500);
    }
    throw new Error('no troop deployable');
  }
  const name = await deployTroop(4, 22);
  await page.waitForTimeout(1300);
  await shot('06-deployed.png');
  // find the unit and possess it
  let possessed = false;
  for (let z = 22.5; z >= 12 && !possessed; z -= 0.5) {
    const p = await toScreen(4, z, 0.5);
    await page.mouse.move(p.x, p.y); await page.waitForTimeout(60);
    const hint = await page.evaluate(() => document.getElementById('hint').innerText);
    if (hint.includes('possess')) {
      await page.keyboard.press('KeyF'); await page.waitForTimeout(1300);
      possessed = (await heroPanel()).includes('SOULBOUND');
      console.log('possess at z', z, '->', possessed);
    }
  }
  if (!possessed) throw new Error('could not possess ' + name);
  await shot('07-first-person.png');
  const box = await (await page.$('#canvas')).boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); // dead zone: keep the initial facing (toward the enemy)
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  await shot('08-walking.png');
  await page.waitForTimeout(2500);
  await shot('08b-bridge.png');
  await page.keyboard.press('KeyV'); await page.waitForTimeout(900);
  await shot('09-third-person.png');
  await page.keyboard.press('ShiftLeft'); await page.waitForTimeout(300);
  await page.keyboard.press('Space'); await page.waitForTimeout(350);
  await shot('10-ability-third.png');
  await page.keyboard.press('KeyV'); await page.waitForTimeout(600);
  await page.mouse.down(); await page.waitForTimeout(1500);
  await shot('11-attacking-first.png');
  await page.waitForTimeout(3500);
  await shot('11b-closer.png');
  await page.keyboard.press('Space'); await page.waitForTimeout(400);
  await shot('11c-ability-close.png');
  await page.waitForTimeout(2500);
  await shot('11d-enemy-close.png');
  await page.mouse.up();
  await page.keyboard.up('KeyW');
  const hand = await readHand(); const elixir = await readElixir();
  const idx = hand.findIndex((c) => !SPELLS.has(c.name) && c.cost <= elixir);
  if (idx >= 0) {
    await page.keyboard.press(`Digit${idx + 1}`); await page.waitForTimeout(300);
    await page.mouse.move(cx, cy + 120); await page.waitForTimeout(200);
    await shot('12-reticle.png');
    await page.mouse.click(cx, cy + 120); await page.waitForTimeout(900);
    await page.mouse.move(cx, cy);
    await shot('13-summoned.png');
  }
  await page.keyboard.down('KeyW'); await page.mouse.down();
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); if (i % 8 === 0) await page.keyboard.press('Space'); if (!(await heroPanel()).includes('SOULBOUND')) break; }
  await page.mouse.up(); await page.keyboard.up('KeyW');
  await shot('14-after.png');
  await page.keyboard.press('KeyE'); await page.waitForTimeout(1500);
  await shot('15-commander-again.png');
  await page.waitForTimeout(8000);
  await shot('16-later.png');
  const hud = await page.evaluate(() => ({ timer: document.getElementById('timer').textContent, hero: document.getElementById('heroPanel').innerText.slice(0, 40), c0: document.querySelectorAll('#p0crowns .on').length, c1: document.querySelectorAll('#p1crowns .on').length }));
  console.log('HUD', hud);
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
  console.log('fps (software GL)', fps);
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED', e); process.exit(1); });
