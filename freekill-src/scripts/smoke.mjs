// The journey, walked in a real browser: URL → name → lobby → room → link →
// waiting room → overview. This is the verification for tasks 4.1 through 4.4
// and 4.8, run end-to-end rather than asserted component by component.
//
//   npm run preview        # in another shell
//   node scripts/smoke.mjs [url] [--shots=dir]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './cdp.mjs';
import { chooseGeneral, fillWithBots, tableState, waitForRealGame } from './game-walk.mjs';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4173/freekill/').replace(/\/$/, '') + '/';
const shotDir = args.find((a) => a.startsWith('--shots='))?.split('=')[1];
if (shotDir) mkdirSync(shotDir, { recursive: true });

const b = await launch();
const steps = [];
let failed = null;

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    if (shotDir) await b.screenshot(join(shotDir, `${steps.length + 1}-${name.replace(/\W+/g, '-')}.png`));
    steps.push({ name, ms: Date.now() - t, ok: true });
    console.log(`  ✓ ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    steps.push({ name, ms: Date.now() - t, ok: false, error: String(e.message ?? e) });
    console.error(`  ✗ ${name}: ${e.message ?? e}`);
    // A bare "timed out waiting for X" says nothing about what the table was
    // actually showing when it gave up.
    try {
      console.error(`      table: ${JSON.stringify(await tableState(b))}`);
      console.error(`      generals rendered: ${await b.evaluate(`document.querySelectorAll('.fk-general').length`)}`);
      const errs = b.errors();
      if (errs.length) console.error(`      page threw: ${errs[0].split('\n')[0]}`);
      const warns = b.consoleLines(['warning', 'error']).slice(-3);
      if (warns.length) console.error(`      console: ${warns.join(' | ')}`);
    } catch { /* the step error is the real news */ }
    failed ??= name;
    throw e;
  }
}

// Real CDP input, never `element.click()`: a scripted click does not reliably
// reach this app's React handlers, and when it fails it fails silently.
const click = (sel, opts) => b.click(sel, opts);
const setInput = (sel, value) => b.setInput(sel, value);

try {
  await step('cold load reaches the name box', async () => {
    await b.call('Network.setCacheDisabled', { cacheDisabled: true });
    await b.call('Page.navigate', { url: base });
    await b.waitFor(`!!document.querySelector('.landing input[type=text]')`);
  });

  await step('signing in with a name', async () => {
    await setInput('.landing input[type=text]', '测试玩家');
    await click('.landing button.primary');
    await b.waitFor(`location.hash.startsWith('#/lobby')`);
    await b.waitFor(`!!document.querySelector('.rooms')`);
  });

  await step('the name survives a reload', async () => {
    await b.call('Page.navigate', { url: `${base}#/lobby` });
    await b.evaluate('location.reload(), true');
    await b.waitFor(`!!document.querySelector('.who')`);
    const who = await b.evaluate(`document.querySelector('.who span').textContent`);
    if (who !== '测试玩家') throw new Error(`identity did not survive reload: got ${who}`);
  });

  await step('creating a room', async () => {
    await b.waitFor(`!!document.querySelector('.card .btn.primary')`);
    await click('.card .btn.primary');
    await b.waitFor(`location.hash.startsWith('#/room/')`);
    await b.waitFor(`!!document.querySelector('.sharebar .code-big')`);
  });

  let joinUrl = '';
  await step('the waiting room shows host controls and a share link', async () => {
    joinUrl = await b.evaluate(`document.querySelector('.sharebar code:not(.code-big)').textContent`);
    if (!/#\/join\/[A-Z0-9]{4}$/.test(joinUrl)) throw new Error(`bad join url: ${joinUrl}`);
    const hostOnly = await b.evaluate(
      `[...document.querySelectorAll('.btn')].some(b => b.textContent.includes('开始游戏'))`);
    if (!hostOnly) throw new Error('host Start button missing for the host');
  });

  await step('adding bot seats fills the table', async () => {
    const seated = await fillWithBots(b, 8);
    if (seated !== 8) throw new Error(`only ${seated}/8 seats filled`);
  });

  await step('the join link deep-links into the same room', async () => {
    const roomHash = await b.evaluate('location.hash');
    await b.call('Page.navigate', { url: joinUrl });
    await b.waitFor(`location.hash.startsWith('#/room/')`, 20000);
    const back = await b.evaluate('location.hash');
    if (back !== roomHash) throw new Error(`join link landed on ${back}, expected ${roomHash}`);
  });

  /**
   * The step that used to be a lie.
   *
   * It waited for `.room-stub, .fk-room` to exist — a container div, which an
   * empty black table satisfies — so it passed green against a build where
   * pressing 开始游戏 produced no game at all. What it asserts now is what a
   * player would check: everyone is at the table, I am holding cards, there is
   * a deck, and the battle log is being written.
   */
  await step('starting the game deals a real hand', async () => {
    await click('.btn', { text: '开始游戏' });
    await b.waitFor(`!!document.querySelector('.fk-room')`, 180000);
    await chooseGeneral(b);
    const t = await waitForRealGame(b, { seats: 8 });
    console.log(`      ${t.photos} photos, ${t.handCards} cards in hand, `
      + `${t.drawPile} in the draw pile, ${t.logLines} log lines`);
  });

  await step('the generals overview renders real generals', async () => {
    await b.call('Page.navigate', { url: `${base}#/overview/generals` });
    // Wait for the full set, not "more than twenty": catching the list
    // mid-render and then asserting it is complete is a false failure, and one
    // this walk has produced.
    await b.waitFor(`document.querySelectorAll('.general-card').length === 25`, 30000);
    const n = await b.evaluate(`document.querySelectorAll('.general-card').length`);
    if (n !== 25) throw new Error(`expected 25 generals, saw ${n}`);
    // The portraits are loading="lazy", so naturalWidth is 0 until the browser
    // gets round to them. Over a real CDN that is not instant; asserting
    // immediately measured the network, not the page.
    const loaded = `[...document.querySelectorAll('.general-card img')].filter(i => i.naturalWidth > 0).length`;
    await b.waitFor(`${loaded} >= 20`, 30000).catch(async () => {
      throw new Error(`only ${await b.evaluate(loaded)}/25 portraits loaded within 30s`);
    });
  });

  await step('general search filters against the real Lua data', async () => {
    await setInput('.filters input[type=text]', '奸雄');
    await b.waitFor(`document.querySelectorAll('.general-card').length === 1`);
    const who = await b.evaluate(`document.querySelector('.general-card .nm').textContent`);
    if (who !== '曹操') throw new Error(`searching 奸雄 found ${who}, expected 曹操`);
    await setInput('.filters input[type=text]', '');
    await b.waitFor(`document.querySelectorAll('.general-card').length === 25`);
  });

  await step('the cards overview renders real card art', async () => {
    await b.call('Page.navigate', { url: `${base}#/overview/cards` });
    await b.waitFor(`document.querySelectorAll('.card-tile').length > 40`);
    // Every tile must resolve to a real hashed asset...
    const unresolved = await b.evaluate(
      `[...document.querySelectorAll('.card-tile img')]
        .filter(i => !/\\/freekill\\/assets\\/[0-9a-f]{12}\\.webp$/.test(i.src)).length`);
    if (unresolved) throw new Error(`${unresolved} card tiles have no manifest asset`);
    // ...and the ones actually on screen must have decoded. The rest are
    // loading="lazy" and only fetch when scrolled to, which is the point.
    const decoded = await b.evaluate(`(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 900));
      const imgs = [...document.querySelectorAll('.card-tile img')];
      await Promise.all(imgs.map(i => i.decode().catch(() => {})));
      return imgs.filter(i => i.naturalWidth > 0).length;
    })()`);
    if (decoded < 43) throw new Error(`only ${decoded}/43 card images decoded`);
  });

  await step('the mode page renders the rules', async () => {
    await b.call('Page.navigate', { url: `${base}#/overview/modes` });
    await b.waitFor(`!!document.querySelector('.markdown table')`);
  });

  await step('the shipped font is the one being used', async () => {
    const ok = await b.evaluate(`(async () => {
      await document.fonts.ready;
      return [...document.fonts].some(f => f.family === 'FKHan' && f.status === 'loaded');
    })()`);
    if (!ok) throw new Error('FKHan did not load');
    // 惇 and 骍 are the glyphs the original LiShu face was missing.
    const width = await b.evaluate(`(() => {
      const c = document.createElement('canvas').getContext('2d');
      c.font = '48px FKHan';
      const a = c.measureText('惇骍').width;
      c.font = '48px "not-a-real-font"';
      return { fk: a, fallback: c.measureText('惇骍').width };
    })()`);
    if (!width.fk) throw new Error('FKHan measured zero width for 惇骍');
  });
} catch { /* reported per step */ }

const errs = b.errors();
if (errs.length) {
  console.error(`\npage errors (${errs.length}):`);
  for (const e of errs.slice(0, 8)) console.error(`  ${e.split('\n')[0]}`);
}

await b.close();
const passed = steps.filter((s) => s.ok).length;
console.log(`\n${passed}/${steps.length} steps passed${shotDir ? `, screenshots in ${shotDir}` : ''}`);
process.exit(failed || errs.length ? 1 : 0);
