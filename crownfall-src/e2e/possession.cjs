// Possession-focused play-test with deterministic troop selection.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots', 'possession');
require('fs').mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const W = 1280, H = 800;
const SPELLS = new Set(['Meteor', 'Volley', 'Shock', 'Frenzy', 'Frost']);
const BUILDINGS = new Set(['Cannon', 'Arc Tower', 'Barracks']);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(400);
  // Use the Nightfall preset for a fun hero roster (Wraith, Reaper, Drake...)
  await page.click('#btnDeck');
  await page.click('.presets button:has-text("Nightfall")');
  await page.click('#btnDeckBack');
  await page.click('#btnPlay');
  await page.waitForTimeout(800);
  const box = await (await page.$('#canvas')).boundingBox();
  const topMargin = 40;
  const zoom = Math.max(4, Math.min((box.width - 24) / 18, (box.height - 24 - topMargin) / 32));
  const cy = 16 - topMargin / 2 / zoom;
  const toScreen = (x, y) => ({ x: box.x + box.width / 2 + (x - 9) * zoom, y: box.y + box.height / 2 + (y - cy) * zoom });

  const readHand = () => page.evaluate(() => Array.from(document.querySelectorAll('#hand .card')).map((c) => ({ name: c.querySelector('.name').textContent, cost: Number(c.querySelector('.cost').textContent) })));
  const readElixir = () => page.evaluate(() => Number(document.getElementById('elixirText').textContent));
  const shot = (n) => page.screenshot({ path: out(n) });

  async function deployTroop(x, y, prefer) {
    for (let tries = 0; tries < 40; tries++) {
      const hand = await readHand();
      const elixir = await readElixir();
      let idx = hand.findIndex((c) => prefer && c.name === prefer && c.cost <= elixir);
      if (idx < 0) idx = hand.findIndex((c) => !SPELLS.has(c.name) && !BUILDINGS.has(c.name) && c.cost <= elixir);
      if (idx >= 0) {
        await page.keyboard.press(`Digit${idx + 1}`);
        const p = toScreen(x, y);
        await page.mouse.move(p.x, p.y);
        await page.waitForTimeout(80);
        await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(200);
        console.log('deployed', hand[idx].name, 'at', x, y, 'elixir was', elixir);
        return hand[idx].name;
      }
      await page.waitForTimeout(500);
    }
    throw new Error('could not deploy a troop');
  }

  const first = await deployTroop(4, 22);
  await page.waitForTimeout(1300);
  await shot('01-deployed.png');
  // find the deployed unit: hover along the lane until the hint names it
  let possessed = false;
  for (let y = 22; y >= 14 && !possessed; y -= 0.6) {
    const p = toScreen(4, y);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(60);
    const hint = await page.evaluate(() => document.getElementById('hint').innerText);
    if (hint.includes('possess')) {
      await page.keyboard.press('KeyF');
      await page.waitForTimeout(400);
      const hp = await page.evaluate(() => document.getElementById('heroPanel').innerText);
      possessed = hp.includes('SOULBOUND');
      console.log('possess attempt at y', y.toFixed(1), '->', possessed, '|', hint);
    }
  }
  if (!possessed) throw new Error('could not possess ' + first);
  await shot('02-possessed.png');
  // walk up the lane across the bridge with W, aiming at the enemy tower
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 120);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3500);
  await shot('03-walking.png');
  await page.keyboard.press('ShiftLeft');
  await page.waitForTimeout(500);
  await shot('04-dashed.png');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyW');
  // attack + ability toward the cursor
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await shot('05-ability.png');
  await page.waitForTimeout(2000);
  await shot('06-fighting.png');
  // summon a card near the hero while possessed
  await page.mouse.up();
  const hand = await readHand();
  const elixir = await readElixir();
  console.log('hand while possessed', hand, 'elixir', elixir);
  const idx = hand.findIndex((c) => !SPELLS.has(c.name) && c.cost <= elixir);
  if (idx >= 0) {
    await page.keyboard.press(`Digit${idx + 1}`);
    await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
    await page.waitForTimeout(150);
    await shot('07-summon-ghost.png');
    await page.mouse.click(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
    await page.waitForTimeout(800);
    await shot('08-summoned.png');
  }
  // fight until the hero dies or 25s pass
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 100);
  await page.keyboard.down('KeyW');
  await page.mouse.down();
  let died = false;
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(500);
    if (i % 6 === 0) await page.keyboard.press('Space');
    const hp = await page.evaluate(() => document.getElementById('heroPanel').innerText);
    if (!hp.includes('SOULBOUND')) { died = true; break; }
  }
  await page.mouse.up();
  await page.keyboard.up('KeyW');
  console.log('hero died:', died);
  await page.waitForTimeout(300);
  await shot('09-after-hero.png');
  // let the game run and watch the bot; take periodic screenshots
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(8000); await shot(`10-run-${i}.png`); }
  const hud = await page.evaluate(() => ({ timer: document.getElementById('timer').textContent, crowns0: document.querySelectorAll('#p0crowns .on').length, crowns1: document.querySelectorAll('#p1crowns .on').length, elixir: document.getElementById('elixirText').textContent }));
  console.log('HUD', hud);
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED', e); process.exit(1); });
