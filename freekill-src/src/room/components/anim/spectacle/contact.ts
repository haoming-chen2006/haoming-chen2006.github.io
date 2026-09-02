/**
 * The contact sheet. Dev only — not an entry in `vite.config.ts`, so it is
 * never built and never shipped; `vite` serves it at
 * `/src/room/components/anim/spectacle/contact.html`.
 *
 * `workbench.html` answers "does the wiring work". This answers the question
 * that actually decides whether this lane is any good: PUT TWELVE OF THEM SIDE
 * BY SIDE AND SEE WHETHER THEY LOOK LIKE TWELVE DIFFERENT THINGS. Designing
 * 537 effects one at a time, each in isolation, is how you end up with 537
 * effects that are all slightly gold and all slightly swirl — which is exactly
 * what the nine upstream sprite strips are.
 *
 * Every cell is a whole miniature table with its own `AnimBus`, driven with the
 * real `Animate{type="InvokeSkill"}` message the engine sends, because the
 * point is to look at what a player would see and not at what a plan object
 * says. `?at=` freezes every cell at the same fraction of the effect, so a
 * screenshot catches the frame worth looking at.
 *
 *   ?pack=standard          one package
 *   ?from=48&count=12       a window into the whole roster
 *   ?q=luo                  every skill whose name or key matches
 *   ?only=designed|fallback which of the two paths to show
 *   ?at=0.45&pace=800       where to freeze, and how fast to run
 *   ?cols=4&lang=en_US
 */
import { AnimBus, seatStage } from '../bus';
import { SIGNATURES } from './signatures';

interface Overview {
  readonly generals: readonly {
    readonly name: string; readonly pack: string; readonly kingdom: string;
    readonly title: string; readonly skills: readonly string[];
  }[];
  readonly translations: Record<string, string>;
  readonly translationsEn: Record<string, string>;
}

const q = new URLSearchParams(location.search);
const base = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL;
const data = await (await fetch(`${base}overview.json`)).json() as Overview;

const en = q.get('lang') === 'en_US';
const tr = (key: string): string =>
  (en ? data.translationsEn[key] : undefined) ?? data.translations[key] ?? key;

(window as unknown as { __fkPace?: number }).__fkPace = Number(q.get('pace') ?? 800);

/* ------------------------------------------------------------ the roster */

interface Row {
  readonly skill: string;
  readonly general: string;
  readonly pack: string;
  readonly kingdom: string;
}

const rows: Row[] = [];
const seen = new Set<string>();
for (const g of data.generals) {
  for (const skill of g.skills) {
    if (seen.has(skill)) continue;
    seen.add(skill);
    rows.push({ skill, general: g.title || g.name, pack: g.pack, kingdom: g.kingdom });
  }
}

/**
 * 锁定技, for the preview only.
 *
 * The room reads this off `Animate{...}.compulsory`, which `lua/web/skillwire.lua`
 * fills in from the engine's own `Skill:hasTag(Skill.Compulsory)`. This page has
 * no engine, only `overview.json`, so it reads the prefix of the translated
 * description instead — the exact heuristic production refuses to use, and for
 * the exact reason it is acceptable here: nothing downstream of this decides
 * anything, it only picks which of two previews to draw. A wrong guess here
 * costs a mislabelled thumbnail.
 */
const LOCK_PREFIX = ['锁定技', '(forced)', 'Tỏa định kỹ'];
const locked = (skill: string): boolean => {
  const desc = data.translations[`:${skill}`] ?? '';
  return LOCK_PREFIX.some((p) => desc.startsWith(p));
};

const pack = q.get('pack');
const needle = (q.get('q') ?? '').toLowerCase();
const only = q.get('only');

const shown = rows.filter((r) => {
  if (pack && r.pack !== pack) return false;
  if (only === 'designed' && !SIGNATURES[r.skill]) return false;
  if (only === 'fallback' && SIGNATURES[r.skill]) return false;
  if (needle) {
    const hay = `${r.skill} ${tr(r.skill)} ${r.general}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
});

const from = Math.max(0, Number(q.get('from') ?? 0));
const count = Math.max(1, Number(q.get('count') ?? 12));
const page = shown.slice(from, from + count);

/* ----------------------------------------------------------------- the bar */

const bar = document.querySelector<HTMLElement>('#bar')!;
const designedHere = shown.filter((r) => SIGNATURES[r.skill]).length;
bar.innerHTML = '';
const say = document.createElement('b');
say.textContent = `${from}–${from + page.length} of ${shown.length}`;
bar.appendChild(say);
const tally = document.createElement('span');
tally.textContent = `${designedHere} designed · ${shown.length - designedHere} on category`;
bar.appendChild(tally);

function jump(label: string, next: number): void {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => {
    const u = new URL(location.href);
    u.searchParams.set('from', String(Math.max(0, next)));
    location.href = u.toString();
  };
  bar.appendChild(b);
}
jump('◀ prev', from - count);
jump('next ▶', from + count);

/* --------------------------------------------------------------- the grid */

const grid = document.querySelector<HTMLElement>('#grid')!;
grid.style.gridTemplateColumns = `repeat(${Number(q.get('cols') ?? 4)}, minmax(0, 1fr))`;

// `?w=` blows a cell up to whatever a seat would be on a very large table.
// Everything in this lane is sized in seat widths, so a signature that only
// works at 118 px stops working when somebody maximises the window — and a
// detail that cannot be seen at 118 px should not have been drawn.
const seatW = Number(q.get('w') ?? 118);

const buses: AnimBus[] = [];

for (const row of page) {
  const cell = document.createElement('div');
  cell.className = 'cell';

  const room = document.createElement('div');
  room.className = 'fk-room';
  room.style.setProperty('--fk-photo-w', `${seatW}px`);
  room.style.height = `${Math.round(seatW * 1.78)}px`;
  const seats = document.createElement('div');
  seats.className = 'fk-seats';
  const photo = document.createElement('div');
  photo.className = 'fk-photo';
  const face = document.createElement('b');
  face.textContent = row.general;
  const layer = document.createElement('div');
  layer.className = 'fk-anim-layer';
  photo.append(face, layer);
  seats.appendChild(photo);
  room.appendChild(seats);

  const cap = document.createElement('div');
  cap.className = SIGNATURES[row.skill] ? 'cap' : 'cap fb';
  const name = document.createElement('i');
  name.textContent = tr(row.skill);
  const key = document.createElement('s');
  key.textContent = row.skill;
  const path = document.createElement('u');
  const m = SIGNATURES[row.skill];
  path.textContent = m ? `${m.figure}/${m.swarm ?? 'mote'}/${m.hue}` : 'category';
  cap.append(name, key, path);

  const rule = document.createElement('div');
  rule.className = 'rule';
  rule.textContent = tr(`:${row.skill}`).replace(/<[^>]+>/g, '');

  cell.append(room, cap, rule);
  grid.appendChild(cell);

  const bus = new AnimBus(tr);
  bus.registerStage(seatStage(1), layer, photo);
  bus.replaying = false;
  bus.notify('PropertyUpdate', [1, 'kingdom', row.kingdom]);
  buses.push(bus);
}

/* -------------------------------------------------------------- and go */

const at = Number(q.get('at') ?? 0.45);

window.setTimeout(() => {
  page.forEach((row, i) => {
    buses[i].notify('Animate', {
      type: 'InvokeSkill', player: 1, name: row.skill,
      // `overview.json` does not carry `anim_type`, and it does not need to:
      // a designed skill never reads it, and a fallback one is being previewed
      // precisely to check that `special` — which 160 of the 537 resolve to —
      // still looks deliberate.
      skill_type: undefined,
      compulsory: locked(row.skill),
    });
  });
  window.setTimeout(() => {
    for (const el of document.querySelectorAll<HTMLElement>('.fk-room *')) {
      el.style.animationPlayState = 'paused';
    }
    (window as unknown as { __sheetReady?: boolean }).__sheetReady = true;
  }, Math.max(0, at * Number(q.get('pace') ?? 800)));
}, 120);
