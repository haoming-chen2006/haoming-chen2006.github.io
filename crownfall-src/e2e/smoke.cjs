// Scripted play-test: opens the game, deploys, possesses, fights, and captures screenshots.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots', 'smoke');
require('fs').mkdirSync(OUT, { recursive: true });
const out = (n) => path.join(OUT, n);
const W = 1280, H = 800;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('01-menu.png') });

  // Deck builder screen
  await page.click('#btnDeck');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('02-deck.png') });
  await page.click('#btnDeckBack');
  await page.click('#btnHelp');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('03-help.png') });
  await page.click('#btnHelpBack');

  await page.click('#btnPlay');
  await page.waitForTimeout(1200);
  const box = await (await page.$('#canvas')).boundingBox();
  const zoom = Math.max(4, Math.min((box.width - 24) / 18, (box.height - 24) / 32));
  const toScreen = (x, y) => ({ x: box.x + box.width / 2 + (x - 9) * zoom, y: box.y + box.height / 2 + (y - 16) * zoom });
  console.log('canvas', box, 'zoom', zoom.toFixed(2));
  await page.screenshot({ path: out('04-battle-start.png') });

  // Deploy card 1 on our left lane
  await page.keyboard.press('Digit1');
  let p = toScreen(4, 21);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out('05-placement-ghost.png') });
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(600);
  // Try an invalid deploy (enemy side) with card 2 for the toast
  await page.keyboard.press('Digit2');
  const bad = toScreen(9, 8);
  await page.mouse.click(bad.x, bad.y);
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('06-invalid-deploy.png') });
  await page.keyboard.press('Escape');

  // Drag card from hand onto arena
  const cards = await page.$$('#hand .card');
  const cb = await cards[1].boundingBox();
  const drop = toScreen(13, 22);
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await page.mouse.down();
  await page.mouse.move(drop.x, drop.y, { steps: 8 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('07-after-deploys.png') });

  // Possess the first unit: hover near where it is now (it walked up the lane a bit), press F
  const hero = toScreen(4, 19.5);
  await page.mouse.move(hero.x, hero.y);
  await page.waitForTimeout(150);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('08-possessed.png') });

  // Walk forward (W) for 2.5s while aiming up
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 150);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: out('09-walking.png') });
  // Dash + ability + attack
  await page.keyboard.press('ShiftLeft');
  await page.waitForTimeout(400);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('10-ability.png') });
  await page.keyboard.down('KeyW');
  await page.mouse.down();
  await page.waitForTimeout(4000);
  await page.mouse.up();
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: out('11-fighting.png') });
  // deploy a card near the hero while possessed
  await page.keyboard.press('Digit1');
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out('12-possessed-placement.png') });
  await page.mouse.click(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('13-summoned.png') });
  // keep fighting until death or 20s
  await page.keyboard.down('KeyW');
  await page.mouse.down();
  await page.waitForTimeout(12000);
  await page.mouse.up();
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: out('14-later.png') });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('15-released.png') });
  // pause
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('16-paused.png') });
  await page.keyboard.press('KeyP');
  // let the match run a while to observe bot behaviour
  await page.waitForTimeout(15000);
  await page.screenshot({ path: out('17-midgame.png') });
  const hud = await page.evaluate(() => ({ timer: document.getElementById('timer').textContent, elixir: document.getElementById('elixirText').textContent, hero: document.getElementById('heroPanel').innerText.slice(0, 80), hint: document.getElementById('hint').innerText }));
  console.log('HUD', hud);
  console.log('ERRORS', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED', e); process.exit(1); });
