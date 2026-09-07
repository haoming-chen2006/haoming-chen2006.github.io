// Screenshots of every UI panel against the mock context.
//   npm run dev            # in another terminal (port 5190)
//   node e2e/ui-shots.cjs  # → e2e/shots/ui/*.png
const { chromium } = require('/Users/haoming/crownfall/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:5190/pebblebrook/';
const OUT = path.join(__dirname, 'shots', 'ui');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  const errors = [];
  async function run(size, tag, full) {
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => { if (!/skipping (full reload|hot update)/.test(e.message)) errors.push(`${tag} pageerror: ${e.message}`); });
    let loads = 0; page.on('load', () => { if (++loads > 1) errors.push(`${tag}: the page reloaded mid-run (load #${loads}) — a file changed on the dev server?`); });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag} console: ${m.text().slice(0, 300)}`); });
    await page.goto(BASE + 'ui-preview.html?bar=0&nohmr=1');
    await page.waitForFunction(() => !!window.__pbui, null, { timeout: 30000 });
    const shot = async (n) => { await page.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) }); const open = await page.evaluate(() => window.__pbui.ui.panels.openIds()); console.log('shot', `${tag}-${n}`.padEnd(30), 'open:', JSON.stringify(open)); };
    const show = async (p) => { await page.evaluate((p) => window.__pbui.show(p), p); await sleep(400); };
    const press = async (code) => { await page.evaluate((c) => window.__pbui.press(c), code); await sleep(200); };

    await show('title'); await shot('01-title');
    if (full) {
      await page.click('#pb-title button:has-text("How to play")'); await sleep(300); await shot('02-howto'); await press('Escape');
      await page.click('#pb-title button:has-text("Villagers")'); await sleep(300); await shot('03-roster'); await press('Escape');
      await page.click('#pb-title button:has-text("Settings")'); await sleep(300);
      await page.selectOption('#pb-llm-provider', 'anthropic'); await sleep(200); await shot('04-settings');
      await page.click('#pb-settings-apply'); await sleep(300);
    }
    await show('hud'); await page.evaluate(() => window.__pbui.toast()); await page.evaluate(() => window.__pbui.happen()); await sleep(500); await shot('05-hud');
    if (full) {
      // hover card: move the mouse over Bram's fake sprite
      const pos = await page.evaluate(() => window.__pbui.mock.screenPos('bram'));
      await page.mouse.move(pos.x, pos.y - 10); await sleep(400); await shot('06-hover');
      await page.mouse.move(5, 5); await sleep(300);
      // speed keys
      await press('Equal'); await press('Equal'); await sleep(300); await shot('07-speed4x'); await press('Space'); await sleep(300); await shot('08-paused'); await press('Space'); await press('Minus'); await press('Minus');
    }
    await show('dialogue'); await sleep(2200); await shot('10-dialogue');
    if (full) {
      await page.click('#pb-dialogue button[data-intent="gossip"]'); await sleep(2500); await shot('11-dialogue-gossip');
      await page.click('#pb-dialogue button[data-intent="gift"]'); await sleep(300); await shot('12-dialogue-gift');
      await page.click('#pb-dialogue .picker .pb-card:nth-child(5)'); await sleep(1800); await shot('13-dialogue-gifted');
      await page.click('#pb-dialogue button[data-intent="about"]'); await sleep(300); await shot('14-dialogue-about');
      await page.click('#pb-dialogue .picker .pb-card:nth-child(1)'); await sleep(2000);
      await page.evaluate(() => window.__pbui.llm(true)); await sleep(400);
      await page.fill('#pb-chat', 'What do you think of the new bridge?'); await page.press('#pb-chat', 'Enter'); await sleep(2600); await shot('15-dialogue-chat');
      await page.evaluate(() => window.__pbui.llm(false));
      await page.click('#pb-dialogue button[data-intent="trade"]'); await sleep(400); await shot('16-dialogue-trade');
      await press('Escape'); await sleep(200);
      await press('Escape'); await sleep(200);
    } else await press('Escape');
    await show('inspector'); await sleep(600); await shot('20-inspector');
    if (full) {
      await press('Tab'); await sleep(500); await shot('21-inspector-tab');
      await page.click('#pb-inspector .memtools button[data-kind="gossip"]'); await sleep(600); await shot('22-inspector-filter');
      await page.click('#pb-inspector .memtools button[data-kind="all"]');
      await page.fill('#pb-inspector .memtools input', 'bram'); await sleep(700); await shot('23-inspector-search');
      await page.fill('#pb-inspector .memtools input', ''); await page.keyboard.press('Escape');
      await page.hover('#pb-inspector .rel:nth-child(1)'); await sleep(300); await shot('24-inspector-reltip');
    }
    await show('village'); await sleep(500); await shot('30-village');
    if (full) {
      await page.click('#pb-village .pb-tab:has-text("Storyboard")'); await sleep(400); await shot('31-storyboard');
      await page.click('#pb-village .pb-tab:has-text("Relationships")'); await sleep(600); await shot('32-web');
      await page.hover('#pb-village .node:nth-child(3)'); await sleep(300); await shot('33-web-focus');
    }
    await press('Escape'); await press('Escape'); await sleep(200);
    await show('board'); await sleep(500); await shot('40-board');
    if (full) {
      await page.click('#pb-board .pb-req:nth-child(1) button:has-text("Accept")').catch(() => {}); await sleep(400); await shot('41-board-accepted');
      await page.click('#pb-board .pb-foot button:has-text("Post a request")'); await sleep(300);
      await page.fill('#pb-board textarea', 'Anyone have a spare lantern? Nights are long.'); await sleep(200); await shot('42-board-post');
      await page.click('#pb-board button:has-text("Pin it")'); await sleep(500); await shot('43-board-posted');
    }
    await press('Escape'); await sleep(200);
    await show('shop'); await sleep(500); await shot('50-shop');
    if (full) {
      await page.click('#pb-shop .it:nth-child(2)'); await sleep(200); await page.fill('#pb-shop .qty input', '3'); await sleep(200); await shot('51-shop-qty');
      await page.click('#pb-shop .pb-foot .pb-btn:last-child'); await sleep(500);
      await page.click('#pb-shop .pb-tab:has-text("Sell")'); await sleep(400); await shot('52-shop-sell');
    }
    await press('Escape'); await sleep(200);
    await show('director'); await sleep(500); await shot('60-director');
    if (full) {
      await page.click('#pb-director .ev:nth-child(3) button'); await sleep(600); await shot('61-director-fired');
      await page.click('#pb-director button:has-text("Export chronicle")'); await sleep(500); await shot('62-director-export');
      await page.click('#pb-director button:has-text("Next morning")'); await sleep(800); await shot('63-director-morning');
    }
    await press('Escape'); await sleep(200);
    await show('menu'); await sleep(400); await shot('70-menu');
    await press('Escape'); await sleep(200);
    if (full) {
      await page.evaluate(() => window.__pbui.night()); await sleep(300); await page.evaluate(() => window.__pbui.rain()); await sleep(400); await shot('80-night-rain');
      // several non-modal panels at once
      await show('inspector'); await press('KeyV'); await sleep(500); await shot('81-inspector-and-village');
      await press('Escape'); await press('Escape');
    }
    const modal = await page.evaluate(() => window.__pbui.ui.modal);
    console.log(`${tag}: modal after closing everything = ${modal}`);
    await ctx.close();
  }
  const only = process.env.ONLY;
  if (!only || only === '1280') await run({ width: 1280, height: 800 }, '1280', true);
  if (!only || only === '1920') await run({ width: 1920, height: 1080 }, '1920', false);
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('ok, no page errors');
})();
