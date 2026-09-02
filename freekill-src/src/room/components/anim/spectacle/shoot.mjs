// Takes stills of the contact sheet. Dev tooling for this lane only.
//
//   node src/room/components/anim/spectacle/shoot.mjs --pack=standard --cols=4
//   node src/room/components/anim/spectacle/shoot.mjs --from=0 --count=12 --at=0.5
//   node src/room/components/anim/spectacle/shoot.mjs --all --count=12
//
// Needs `npm run dev` running. `--all` walks the whole roster twelve at a time
// and writes one PNG per page, which is the only practical way to look at 537
// effects and decide whether any two of them are the same picture.
//
// Headless, in its own throwaway profile, and it always kills its Chrome —
// this machine belongs to somebody who is using it.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from '../../../../../scripts/cdp.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const eq = hit.indexOf('=');
  return eq === -1 ? true : hit.slice(eq + 1);
};

const BASE = flag('url', 'http://127.0.0.1:5173/freekill/');
const PAGE = `${BASE.replace(/\/$/, '')}/src/room/components/anim/spectacle/contact.html`;
const OUT = flag('out', '/private/tmp/claude-501/-Users-haoming/6e4404de-0828-4ba2-8d4d-284b7b5f1a9f/scratchpad/shots');
mkdirSync(OUT, { recursive: true });

const cols = Number(flag('cols', 4));
const count = Number(flag('count', 12));
const at = flag('at', '0.45');
const pace = flag('pace', '800');
const w = Number(flag('w', 118));
const rows = Math.ceil(count / cols);

const query = (from) => {
  const p = new URLSearchParams({
    from: String(from), count: String(count), cols: String(cols), at, pace, w: String(w),
  });
  for (const k of ['pack', 'q', 'only', 'lang']) {
    const v = flag(k, null);
    if (v && v !== true) p.set(k, v);
  }
  return p.toString();
};

const { newPage, close } = await launch({
  width: cols * Math.round(w * 1.78) + 40,
  height: rows * (Math.round(w * 1.78) + 58) + 90,
});
const page = await newPage();

try {
  let from = Number(flag('from', 0));
  const all = flag('all', false);
  for (let i = 0; ; i += 1) {
    await page.goto(`${PAGE}?${query(from)}`);
    await page.waitFor('window.__sheetReady === true', 25000);
    const total = await page.evaluate(
      "Number(document.querySelector('#bar b').textContent.split(' of ')[1])");
    const shown = await page.evaluate("document.querySelectorAll('.cell').length");
    const name = join(OUT, `${flag('name', 'sheet')}-${String(from).padStart(3, '0')}.png`);
    await page.screenshot(name);
    const bad = page.errors();
    console.log(`${name}  ${shown} cells${bad.length ? `  ERRORS: ${bad.join(' | ')}` : ''}`);
    from += count;
    if (!all || from >= total) break;
  }
} finally {
  await close();
}
