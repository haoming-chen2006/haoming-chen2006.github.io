/**
 * Frame captures of the card effects, from the workbench, deterministically.
 *
 *   npm run dev                       # or any vite serving this tree
 *   node src/room/components/anim/shots.mjs --out=/tmp/shots [--only=slash,peach]
 *
 * WHY NOT JUST SCREENSHOT AFTER A DELAY. A `setTimeout` between firing an
 * effect and capturing it samples wall-clock time on a machine that is also
 * compositing, so the same card comes out at a different phase every run and
 * two captures can never be compared. Instead every running animation is
 * paused and its `currentTime` set — `document.getAnimations()` is the whole
 * effect, root and children, and a paused animation still renders its computed
 * frame. The capture is then exact: t=120 ms is t=120 ms, every time.
 *
 * The output is one contact sheet per card: N frames across the beat, side by
 * side, cropped to the part of the table the effect actually uses. That is the
 * only way to judge motion from stills — a single frame of a strike is a
 * smear, and the shape only reads across the sequence.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from '../../../../scripts/cdp.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const [, v] = hit.split('=');
  return v === undefined ? true : v;
};

const BASE = String(flag('base', 'http://127.0.0.1:5199/freekill/'));
const OUT = String(flag('out', '/tmp/fx-shots'));
const ONLY = flag('only', null);
const STOPS = String(flag('stops', '40,150,270,400,540')).split(',').map(Number);
const SCALE = Number(flag('scale', 1));

mkdirSync(OUT, { recursive: true });

const b = await launch({ width: 1280, height: 820 });

try {
  await b.goto(`${BASE}src/room/components/anim/preview.html`);
  await b.waitFor(`!!(window.fx && document.querySelectorAll('.fk-photo').length === 8)`);
  await b.evaluate(`window.__fkPace = 800; true`);

  const plan = await b.evaluate(`JSON.stringify(window.fx.plan())`);
  let shots = JSON.parse(plan);
  if (ONLY) {
    const want = new Set(String(ONLY).split(','));
    shots = shots.filter((s) => want.has(s.id));
  }

  console.log(`${shots.length} effects x ${STOPS.length} frames -> ${OUT}`);

  for (const shot of shots) {
    for (const t of STOPS) {
      // Fire, let one frame go by so every node exists and its animation is
      // registered, then freeze the whole document at the wanted phase.
      await b.evaluate(`(async () => {
        window.fx.clear();
        await new Promise((r) => requestAnimationFrame(() => r()));
        window.fx.fire(${JSON.stringify(shot.id)});
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        for (const a of document.getAnimations()) {
          try { a.pause(); a.currentTime = ${t}; } catch { /* finished, or not started */ }
        }
        return true;
      })()`);
      const { data } = await b.call('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: 1280, height: 728, scale: SCALE },
        captureBeyondViewport: false,
      });
      writeFileSync(join(OUT, `${shot.id}@${String(t).padStart(3, '0')}.png`), Buffer.from(data, 'base64'));
    }
    console.log(`  ${shot.id}`);
  }
} finally {
  await b.close();
}
