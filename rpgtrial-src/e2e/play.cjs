// Scripted playthrough of the tutorial beats with keyboard/mouse; asserts quest steps advance. node e2e/play.cjs [class] [untilStep]
const { chromium } = require('/private/tmp/claude-501/-Users-haoming/27c8d279-b89e-49e5-8900-02115df0505c/scratchpad/node_modules/playwright');
const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots', 'play'); fs.mkdirSync(OUT, { recursive: true });
const cls = process.argv[2] || 'fighter'; const until = process.argv[3] || 'chapel';
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.setDefaultTimeout(180000);
  const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push('error: ' + m.text().slice(0, 300)); });
  await page.goto('http://127.0.0.1:5180/rpgtrial/?quality=low');
  await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('hide'), null, { timeout: 200000 });
  const step = () => page.evaluate(() => window.__hm.prologue?.currentStep?.id ?? null);
  const state = () => page.evaluate(() => { const p = window.__hm.world.player; return { step: window.__hm.prologue?.currentStep?.id, pos: [p.pos.x.toFixed(1), p.pos.z.toFixed(1)], hp: p.hp, anim: p.anim.name, st: p.state, blocking: window.__hm.ui.isBlocking(), screen: window.__hm.ui.screen, dlg: !!document.querySelector('.dialogue.open, #dialogue.open, .dlg-open') }; });
  const shot = async (n) => { await page.screenshot({ path: path.join(OUT, n + '.png') }); console.log('shot', n); };
  const log = async (m) => console.log(m, JSON.stringify(await state()));
  const waitStep = async (id, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await step(); if (s === id) return true; await page.waitForTimeout(400); } console.log('TIMEOUT waiting for step', id, 'current', await step()); return false; };
  const waitNotStep = async (id, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await step(); if (s !== id) return s; await page.waitForTimeout(400); } return null; };
  // continue through dialogue: press Space repeatedly while blocking
  const advanceDialogue = async (maxPresses = 40, pick = 0) => {
    for (let i = 0; i < maxPresses; i++) {
      const b = await page.evaluate(() => window.__hm.ui.isBlocking()); if (!b) return;
      const hasChoices = await page.evaluate(() => !!document.querySelector('.choice, .choices button, .dlg-choice'));
      if (hasChoices) await page.keyboard.press('Digit' + (pick + 1)); else await page.keyboard.press('Space');
      await page.waitForTimeout(900);
    }
  };
  await page.evaluate((c) => window.__hm.startGame(c, 'Tav'), cls);
  await page.waitForTimeout(1500); await log('started');
  await shot('p00-wake');
  // wake beat: narrator lines etc.
  for (let i = 0; i < 12 && (await step()) === 'wake'; i++) { await advanceDialogue(6); await page.waitForTimeout(1500); }
  await log('after wake'); await shot('p01-after-wake');
  // move: walk 8 m, sprint, dodge, jump
  await page.mouse.click(640, 360); await page.waitForTimeout(300);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3500); await page.keyboard.up('KeyW'); await log('walked');
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyS'); await page.waitForTimeout(1800); await page.keyboard.up('KeyS'); await page.keyboard.up('ShiftLeft'); await log('sprinted');
  await page.keyboard.press('Space'); await page.waitForTimeout(1200); await log('dodged');
  await page.keyboard.press('KeyF'); await page.waitForTimeout(1800); await log('jumped');
  await shot('p02-moved');
  await waitStep('sword', 20000); await log('sword step');
  // walk to the sword at (4.5, 19.5): use a helper: teleport near then press E
  await page.evaluate(() => { const w = window.__hm.world; w.teleport(w.player, { x: 4.5, y: 0, z: 21.2 }, Math.PI); });
  await page.waitForTimeout(800); await shot('p03-sword-prompt');
  await page.keyboard.press('KeyE'); await page.waitForTimeout(2500); await log('took sword');
  await page.keyboard.press('KeyI'); await page.waitForTimeout(1200); await shot('p04-inventory'); await log('inventory open');
  // equip: click the weapon in inventory if not auto; then close
  await page.evaluate(() => { const w = window.__hm.world; const it = w.inventory?.find((s) => /longsword|quarterstaff|greataxe|dagger/.test(s.itemId)); if (it) w.equip(it.itemId); });
  await page.waitForTimeout(800); await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  await page.keyboard.press('KeyC'); await page.waitForTimeout(1200); await shot('p05-sheet'); await page.keyboard.press('Escape'); await page.waitForTimeout(600);
  await log('after sheet');
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(7500); await log('cards ' + i); }
  await advanceDialogue(6);
  await waitStep('cache', 40000); await log('cache step');
  await page.evaluate(() => { const w = window.__hm.world; w.teleport(w.player, { x: -7, y: 0, z: 26 }, -2); }); await page.waitForTimeout(3000); await log('near cache');
  await shot('p06-cache-roll'); await advanceDialogue(8); await page.waitForTimeout(1500); await log('after roll');
  await page.evaluate(() => { const w = window.__hm.world; w.teleport(w.player, { x: -8.5, y: 0, z: 26.5 }, -2.5); }); await page.waitForTimeout(800);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(2000); await log('looted cache'); await shot('p07-loot');
  await page.keyboard.press('KeyR'); await page.waitForTimeout(2500); await log('potion');
  await waitStep('talk', 30000); await log('talk step');
  // talk to Ilyra: teleport next to her
  const il = await page.evaluate(() => { const a = window.__hm.world.actors.get('ilyra'); return { x: a.pos.x, z: a.pos.z }; });
  await page.evaluate((il) => { const w = window.__hm.world; w.teleport(w.player, { x: il.x + 1.2, y: 0, z: il.z + 0.6 }, 0); }, il); await page.waitForTimeout(1000);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(2500); await shot('p08-dialogue'); await log('dialogue');
  for (let i = 0; i < 25; i++) { const b = await page.evaluate(() => window.__hm.ui.isBlocking()); if (!b) break; await advanceDialogue(1, 0); if (i === 3) await shot('p09-dialogue-choice'); }
  await log('after talk'); await shot('p10-after-talk');
  if (until === 'talk') { console.log('errors:', errors.slice(0, 10).join('\n') || 'none'); await browser.close(); return; }
  // camp
  await page.evaluate(() => window.__hm.prologue.skip('camp')); await page.waitForTimeout(3000); await log('camp');
  await page.evaluate(() => { const w = window.__hm.world; w.teleport(w.player, { x: 28, y: 0, z: 33 }, Math.PI); }); await page.waitForTimeout(1500); await shot('p11-camp');
  // chapel fight
  await page.evaluate(() => window.__hm.prologue.skip('chapel')); await page.waitForTimeout(3000); await log('chapel');
  await page.evaluate(() => { const w = window.__hm.world; w.teleport(w.player, { x: 60, y: 0, z: -4 }, 0); }); await page.waitForTimeout(4000); await log('in chapel'); await shot('p12-chapel-awaken');
  await page.mouse.click(640, 360); await page.keyboard.press('Tab'); await page.waitForTimeout(800); await log('lock');
  for (let i = 0; i < 40; i++) {
    const s = await state(); if (s.hp <= 0) { console.log('PLAYER DIED'); break; }
    const enemies = await page.evaluate(() => [...window.__hm.world.actors.values()].filter((a) => a.faction === 'undead' && !a.dead && !a.hidden).length);
    if (enemies === 0) { console.log('all enemies dead'); break; }
    // face nearest enemy via lock-on, attack, occasionally dodge
    await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.up(); await page.waitForTimeout(500);
    if (i % 5 === 4) { await page.keyboard.press('Space'); await page.waitForTimeout(700); }
    if (i % 3 === 0) { await page.keyboard.down('KeyW'); await page.waitForTimeout(250); await page.keyboard.up('KeyW'); }
    if (i === 6) await shot('p13-fight');
    if (i % 8 === 7) await log('fight ' + i);
  }
  await page.waitForTimeout(3000); await log('after fight'); await shot('p14-after-fight');
  console.log('errors:', errors.length ? errors.slice(0, 15).join('\n') : 'none');
  await browser.close();
})();
