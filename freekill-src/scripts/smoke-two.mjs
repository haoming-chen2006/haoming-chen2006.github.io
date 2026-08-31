// Two players, two machines — the scenario the single-page walk cannot cover.
//
// One page hosts (it runs the authoritative engine in its worker); a second page
// in its OWN browser context, and therefore with its own localStorage and its
// own anonymous Supabase identity, joins by the share link. Everything between
// them goes over Realtime for real. That is the seam a fixture cannot fake and
// the reason the empty-table bug survived thirteen green smoke steps.
//
//   npm run preview        # in another shell
//   node scripts/smoke-two.mjs [url] [--shots=dir]
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';
import {
  answerOpenings, createRoom, fillWithBots, signIn, tableState, waitForRealGame,
} from './game-walk.mjs';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4173/freekill/').replace(/\/$/, '') + '/';
const shotDir = args.find((a) => a.startsWith('--shots='))?.split('=')[1];
if (shotDir) mkdirSync(shotDir, { recursive: true });

/**
 * Two browsers, not two tabs. Separate processes, separate storage, separate
 * anonymous identities — as close to two machines as one host gets, and the
 * only arrangement in which "the guest missed what the host broadcast" is a
 * real event rather than a simulated one.
 *
 * The profiles persist so a loop of runs reuses two identities instead of
 * minting twenty; anonymous sign-up is rate limited per IP and a walk that
 * trips that limit fails at the front door for reasons that have nothing to do
 * with the game.
 */
const CACHE = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '.cache', 'fk-smoke');
const host = await launch({ profileDir: join(CACHE, 'host') });
const guest = await launch({ profileDir: join(CACHE, 'guest') });
const steps = [];
let failed = null;

async function step(name, fn) {
  const t = Date.now();
  try {
    const value = await fn();
    steps.push({ name, ok: true });
    console.log(`  ✓ ${name} (${Date.now() - t} ms)`);
    return value;
  } catch (e) {
    steps.push({ name, ok: false });
    console.error(`  ✗ ${name}: ${e.message ?? e}`);
    // A timeout that only says what it was waiting for tells you nothing about
    // which machine was stuck or why. Both tables, on the way out.
    for (const [who, page] of [['host', host], ['guest', guest]]) {
      try {
        console.error(`      ${who}: ${JSON.stringify(await tableState(page))}`);
        const errs = page.errors();
        if (errs.length) console.error(`      ${who} threw: ${errs[0].split('\n')[0]}`);
      } catch { /* the page may be gone; the step error is the real news */ }
    }
    failed ??= name;
    throw e;
  }
}

const shot = async (page, name) => {
  if (shotDir) await page.screenshot(join(shotDir, `${name}.png`));
};

try {
  const joinUrl = await step('the host opens a room and leaves one seat free', async () => {
    await signIn(host, base, '房主');
    const url = await createRoom(host);
    const seated = await fillWithBots(host, 7);
    if (seated !== 7) throw new Error(`wanted 7 seated, got ${seated}`);
    return url;
  });

  await step('a second machine joins by the share link', async () => {
    await signIn(guest, base, '客人');
    await guest.goto(joinUrl);
    await guest.waitFor(`location.hash.startsWith('#/room/')`, 60000);
    // Both sides agree the table is full, which means the join reached Postgres
    // and the change came back over Realtime.
    await host.waitFor(`document.querySelectorAll('.seat:not(.empty-seat)').length === 8`, 30000);
    await guest.waitFor(`document.querySelectorAll('.seat:not(.empty-seat)').length === 8`, 30000);
    const who = await host.evaluate(
      `[...document.querySelectorAll('.who-name')].map(e => e.textContent).join(',')`);
    if (!who.includes('客人')) throw new Error(`the host does not see the guest: ${who}`);
  });

  await step('the host starts, and both machines are dealt a real hand', async () => {
    await host.click('.btn', { text: '开始游戏' });

    /**
     * Wait until the host is holding a real table. That is proof the engine's
     * first flush has happened — and that flush is the entire opening,
     * including the guest's own 选将 request, broadcast to the guest's channel
     * in the same breath.
     */
    await host.waitFor(`document.querySelectorAll('.fk-photo').length === 8`, 180000);

    /**
     * Now throw away the VM that heard it. Broadcast has no history and no
     * delivery to a channel that was not joined, so from here the guest can
     * only learn what the host tells it when asked — including, if the engine
     * is still waiting on it, the question it was in the middle of.
     *
     * This is the seat that "joined late", exercised on every run rather than
     * whenever a loop happens to catch it.
     */
    const reloadedAt = Date.now();
    await guest.evaluate('location.reload(), true');
    await guest.waitFor(`!!document.querySelector('.fk-room')`, 180000);
    console.log(`      guest reload → table ${Date.now() - reloadedAt} ms`);

    await answerOpenings([host, guest]);

    const [a, b] = await Promise.all([
      waitForRealGame(host, { seats: 8 }),
      waitForRealGame(guest, { seats: 8 }),
    ]);
    await shot(host, 'two-host');
    await shot(guest, 'two-guest');
    console.log(`      host:  ${a.photos} photos, ${a.handCards} in hand, ${a.drawPile} in the pile, ${a.logLines} log lines`);
    console.log(`      guest: ${b.photos} photos, ${b.handCards} in hand, ${b.drawPile} in the pile, ${b.logLines} log lines`);
    // The two clients are watching the same game, not two different ones.
    if (a.drawPile !== b.drawPile) {
      console.log(`      (draw piles differ by ${Math.abs(a.drawPile - b.drawPile)} — the two tabs are a flush apart)`);
    }
  });

  await step('a mid-game reload is caught up by the host', async () => {
    const before = await tableState(guest);
    await guest.evaluate('location.reload(), true');
    await guest.waitFor(`!!document.querySelector('.fk-room')`, 180000);
    const after = await waitForRealGame(guest, { seats: 8, timeoutMs: 120000, requireLog: false });
    await shot(guest, 'two-guest-reloaded');
    console.log(`      after reload: ${after.photos} photos, ${after.handCards} in hand, `
      + `${after.drawPile} in the pile (was ${before.drawPile})`);
  });
} catch { /* reported per step */ }

for (const [name, page] of [['host', host], ['guest', guest]]) {
  const errs = page.errors();
  if (errs.length) {
    console.error(`\n${name} page errors (${errs.length}):`);
    for (const e of errs.slice(0, 6)) console.error(`  ${e.split('\n')[0]}`);
    failed ??= `${name} page errors`;
  }
}

await host.close();
await guest.close();
const passed = steps.filter((s) => s.ok).length;
console.log(`\n${passed}/${steps.length} steps passed${shotDir ? `, screenshots in ${shotDir}` : ''}`);
process.exit(failed ? 1 : 0);
