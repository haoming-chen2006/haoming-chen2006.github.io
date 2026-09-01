/**
 * Play one game of a chosen mode, through the real UI, to GameOver.
 *
 *   node scripts/mode-walk.mjs dizhu
 *   node scripts/mode-walk.mjs duel --url=http://127.0.0.1:4175/freekill/
 *   node scripts/mode-walk.mjs team --timeout=900000
 *
 * WHY THIS IS NOT PART OF `npm run audit`. It should be, and the change is
 * three lines — `scripts/audit/game.mjs` hardcodes `TABLE_SEATS = 8` and
 * `scripts/game-walk.mjs`'s `createRoom` presses the create button without
 * choosing a mode first. Both files belong to another lane right now, so this
 * drives the same browser, the same probe and the same answering policy from
 * outside them instead of editing them underneath someone. The diff to fold it
 * in is in this lane's report.
 *
 * What it proves is exactly what the headless suite cannot: that a real tab,
 * running the shipped bundle, can open a three-seat 斗地主 from the lobby, fill
 * it, start it, answer every question the engine asks through the actual scene
 * controls, and be told who won.
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSeat, profileFor, sleep } from './audit/seat.mjs';
import { answerOnce, makeContext } from './audit/policy.mjs';
import { signIn } from './game-walk.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, v] = hit.split('=');
  return v === undefined ? true : v;
};

const modeId = argv.find((a) => !a.startsWith('--')) ?? 'dizhu';
const base = String(flag('url', 'http://127.0.0.1:4173/freekill/')).replace(/\/$/, '') + '/';
const timeoutMs = Number(flag('timeout', 12 * 60 * 1000));
const seed = Number(flag('seed', 4242));
const cacheDir = join(ROOT, 'node_modules', '.cache', 'fk-mode-walk', modeId);
mkdirSync(cacheDir, { recursive: true });

const say = (m) => process.stdout.write(`${new Date().toISOString().slice(11, 19)} ${m}\n`);

const seat = await openSeat({
  id: 'p1', name: '房主', profileDir: profileFor(cacheDir, 'p1'), hook: true,
});

let outcome = 'unknown';
let winner = null;
try {
  await signIn(seat.b, base, '房主');
  await seat.ensureProbe();
  say(`signed in at ${base}`);

  /* --------------------------------------------------- open a room in `mode` */

  const chosen = await seat.b.evaluate(`(() => {
    const card = [...document.querySelectorAll('.mode-card')]
      .find((c) => c.dataset.mode === ${JSON.stringify(modeId)});
    if (!card) return null;
    card.click();
    return { seats: card.querySelector('.mode-card__seats')?.textContent ?? '?' };
  })()`);
  if (!chosen) throw new Error(`no mode card for ${modeId}`);
  say(`chose ${modeId} (${chosen.seats})`);

  await seat.b.click('.card .btn.primary');
  await seat.b.waitFor(`location.hash.startsWith('#/room/')`, 60000);
  await seat.b.waitFor(`!!document.querySelector('.seats')`, 30000);

  // The seat grid is sized by the mode, so its length *is* the table size.
  const capacity = await seat.b.evaluate(`document.querySelectorAll('.seat').length`);
  say(`room open, ${capacity} seats`);

  /* ----------------------------------------------------------- fill and start */

  await seat.b.click('.btn', { text: '余下补机器人' });
  await seat.b.waitFor(
    `document.querySelectorAll('.seat:not(.empty-seat)').length === ${capacity}`, 30000);
  say('table full');

  await seat.b.click('.btn', { text: '开始游戏' });
  await seat.b.waitFor(`!!document.querySelector('.fk-room')`, 180000);
  say('table up — playing');

  /* ----------------------------------------------------------------- the loop */

  const deadline = Date.now() + timeoutMs;
  const ctx = makeContext({
    seed,
    settle: async () => { await sleep(150); },
    deadline,
    bias: null,
  });
  let answeredReqSeq = 0;
  let decisions = 0;
  let lastCurrent = null;

  while (Date.now() < deadline) {
    const snap = await seat.snap({ timeoutMs: 25000 });
    if (!snap) { await sleep(300); continue; }
    await seat.drain().catch(() => {});

    if (snap.gameOver) {
      winner = snap.gameOver;
      outcome = 'complete';
      break;
    }
    if (snap.currentId !== lastCurrent) { lastCurrent = snap.currentId; ctx.playsThisTurn = 0; }

    const actions = await seat.actions({ timeoutMs: 25000 });
    const offered = (actions?.actions ?? []).filter((x) => x.enabled && x.visible && x.box);
    const open = snap.request && snap.request.kind !== 'none';
    if (!open || !offered.length || !(snap.reqSeq > answeredReqSeq)) { await sleep(300); continue; }

    const answered = await answerOnce(seat, ctx, actions);
    answeredReqSeq = snap.reqSeq;
    decisions += 1;
    if (answered.played) ctx.playsThisTurn += 1;
    if (decisions % 20 === 0) say(`round ${snap.round}, ${decisions} answers from this seat`);
  }
  if (outcome !== 'complete') outcome = 'timeout';

  const errs = seat.b.errors();
  if (errs.length) say(`page errors: ${errs.slice(0, 3).join(' | ')}`);
  say(`${outcome}: winner = ${winner ?? '(none)'} after ${decisions} answers from this seat`);
} finally {
  await seat.close().catch(() => {});
}

process.exit(outcome === 'complete' && winner ? 0 : 1);
