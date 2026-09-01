/**
 * The skill and slay workbench. Dev only — not an entry in `vite.config.ts`, so
 * it is never built and never shipped; `vite` serves it at
 * `/src/room/components/anim/spectacle/workbench.html` and nothing else
 * references it.
 *
 * It drives the real `AnimBus` with the real notify messages the engine sends,
 * not the plan functions directly, because most of what can go wrong is in the
 * wiring: a `skill_type` that is not one of the nine, a kingdom that arrived
 * before the skill did, a masochism skill finding the element of the damage on
 * the beat before it, a death finding the direction of the line that killed it.
 * Pressing 反馈 here sends exactly what the engine sends, in the order it sends
 * it.
 *
 * `?shot=<name>` fires one case on load and holds the page still, which is how
 * `scripts` outside this lane take a still of an effect at its own peak.
 */
import raw from '../../../dev/data/lua-data.json';
import { AnimBus, seatStage } from '../bus';
import { SLAY_PHASE } from './budget';
import { CATEGORIES, KINGDOMS, ROLES } from './palette';

/**
 * The engine's own dictionary, not a table of names written here.
 *
 * `lua-data.json` is the dump `src/room/__tests__/i18n.test.ts` already treats
 * as the source of truth for what the engine says. Reading it means the
 * workbench shows the same words the room shows, in either language, with no
 * string in this file that a translator cannot reach — and `?lang=en_US` is
 * then a real check that a plaque sized for two characters survives
 * "Unrivalled Might".
 */
const DICT = (raw as unknown as {
  translations: Record<string, Record<string, string>>;
}).translations;

/** One real skill per category, so a shot shows what a player would see. */
const SKILL: Readonly<Record<string, string>> = {
  offensive: 'wushuang', defensive: 'yiji', control: 'lijian', support: 'rende',
  drawcard: 'zhiheng', masochism: 'fankui', negative: 'luoyi', special: 'qicai',
  switch: 'longdan',
};

const q = new URLSearchParams(location.search);
const words = DICT[q.get('lang') ?? 'zh_CN'] ?? DICT.zh_CN;
const tr = (key: string): string => words[key] ?? key;

// The pace the workbench animates at, set before anything reads it —
// `resolvePaceMs()` looks at `window.__fkPace` first and `budget.ts` caches the
// answer for a second.
(window as unknown as { __fkPace?: number }).__fkPace = Number(q.get('pace') ?? 800);

const bus = new AnimBus(tr);

// Nine, not eight: there are nine categories and "all nine" must give each one
// its own seat, or the ninth lands on the first and the cap drops one of them.
const SEATS = 9;

/* -------------------------------------------------------------- fake table */

const ring = document.querySelector<HTMLElement>('.fk-ring')!;
const seats: HTMLElement[] = [];

for (let i = 0; i < SEATS; i += 1) {
  const slot = document.createElement('div');
  slot.className = 'fk-seat-slot';
  const a = (i / SEATS) * Math.PI * 2 - Math.PI / 2;
  slot.style.left = `${50 + Math.cos(a) * 33}%`;
  slot.style.top = `${50 + Math.sin(a) * 35}%`;

  const photo = document.createElement('div');
  photo.className = 'fk-photo';
  const kingdom = KINGDOMS[i % KINGDOMS.length];
  photo.innerHTML = `<b>${i + 1}</b><u>${kingdom}</u>`;
  const layer = document.createElement('div');
  layer.className = 'fk-anim-layer';
  photo.appendChild(layer);
  slot.appendChild(photo);
  ring.appendChild(slot);
  seats.push(photo);
  bus.registerStage(seatStage(i + 1), layer, photo);
}

bus.replaying = false;

/* -------------------------------------------------------- the engine's word */

/** `gamelogic.lua:79` and `:172` — every seat's role and kingdom, at the top. */
function deal(): void {
  for (let i = 0; i < SEATS; i += 1) {
    bus.notify('PropertyUpdate', [i + 1, 'kingdom', KINGDOMS[i % KINGDOMS.length]]);
    bus.notify('PropertyUpdate', [i + 1, 'role', ROLES[i % ROLES.length]]);
  }
}
deal();

/** `Room:notifySkillInvoked` — `room.lua:602`. */
function invoke(type: string, seat: number): void {
  bus.notify('Animate', {
    type: 'InvokeSkill', player: seat, name: SKILL[type] ?? type, skill_type: type,
  });
}

/** `room.lua:609`, the limited-skill path. The engine delays 2000 ms after it. */
function ult(seat: number): void {
  bus.notify('Animate', {
    type: 'InvokeUltSkill', player: seat, name: SKILL.switch, deputy: false,
  });
}

/** `events/hp.lua:38`. */
function damage(seat: number, type: string, num: number): void {
  bus.notify('LogEvent', { type: 'Damage', to: seat, damageType: `${type}_damage`, damageNum: num });
  bus.notify('PropertyUpdate', [seat, 'hp', 4 - num]);
}

/**
 * A kill, exactly as the engine sends one: the killer points at the victim, the
 * victim takes damage, then `Death`. The blade's angle comes from the line.
 */
function kill(killer: number, victim: number, role: string): void {
  bus.notify('PropertyUpdate', [victim, 'role', role]);
  bus.notify('Animate', { type: 'Indicate', from: killer, to: [[victim]] });
  bus.notify('LogEvent', { type: 'Damage', to: victim, damageType: 'normal_damage', damageNum: 2 });
  window.setTimeout(() => bus.notify('LogEvent', { type: 'Death', to: victim }), 220);
}

/* --------------------------------------------------------------------- bar */

const bar = document.querySelector<HTMLElement>('#bar')!;

function group(label: string): void {
  const s = document.createElement('span');
  s.className = 'grp';
  s.textContent = label;
  bar.appendChild(s);
}

function button(label: string, run: () => void, hot = false): void {
  const b = document.createElement('button');
  b.textContent = label;
  if (hot) b.className = 'hot';
  b.onclick = run;
  bar.appendChild(b);
  CASES.set(label, run);
}

/** Every case by name, so `?shot=` can fire one without a click. */
const CASES = new Map<string, () => void>();

group('skills');
CATEGORIES.forEach((c, i) => button(c, () => invoke(c, (i % SEATS) + 1)));
button('all nine', () => CATEGORIES.forEach((c, i) => invoke(c, (i % SEATS) + 1)));

group('masochism + element');
for (const el of ['fire', 'thunder', 'ice'] as const) {
  button(`${el} then masochism`, () => {
    damage(3, el, 1);
    window.setTimeout(() => invoke('masochism', 3), 300);
  });
}

group('ult');
button('limit skill', () => ult(1), true);

group('hit');
button('1', () => damage(5, 'normal', 1));
button('2', () => damage(5, 'fire', 2));
button('3', () => damage(5, 'thunder', 3));

group('seat');
button('heal', () => { bus.notify('PropertyUpdate', [2, 'hp', 2]); bus.notify('PropertyUpdate', [2, 'hp', 4]); });
button('maxhp +1', () => bus.notify('LogEvent', { type: 'ChangeMaxHp', player: 2, num: 1 }));
button('maxhp −1', () => bus.notify('LogEvent', { type: 'ChangeMaxHp', player: 2, num: -1 }));
button('turn', () => bus.notify('PropertyUpdate', [4, 'phase', 2]));
button('draw 3', () => bus.notify('MoveCards', { merged: [{ to: 6, toArea: 1, ids: [1, 2, 3] }] }));
button('equip', () => bus.notify('MoveCards', { merged: [{ to: 6, toArea: 2, ids: [4] }] }));
button('judge zone', () => bus.notify('MoveCards', { merged: [{ to: 6, toArea: 3, ids: [5] }] }));
button('judge pass', () => bus.notify('Animate', { type: 'Emotion', player: 9, emotion: 'judgegood', is_card: true }));
button('judge fail', () => bus.notify('Animate', { type: 'Emotion', player: 9, emotion: 'judgebad', is_card: true }));

group('slay');
ROLES.forEach((role, i) => button(role, () => kill(((i + 4) % SEATS) + 1, (i % SEATS) + 1, role), true));
button('unknown', () => kill(5, 1, 'x'), true);

/* ------------------------------------------------------------------- stills */

/**
 * `?shot=<case>&at=<0..1>` fires one case and freezes the page at that fraction
 * of the effect's own length, so a screenshot lands on the frame worth looking
 * at rather than on whatever the capture happened to catch. `at` defaults to
 * the moment a slay's seal has just stamped.
 */
const shot = q.get('shot');
if (shot) {
  const run = CASES.get(shot);
  const at = Number(q.get('at') ?? SLAY_PHASE.seal + 0.12);
  const ms = Number(q.get('ms') ?? 1750);
  if (run) {
    bar.style.display = 'none';
    window.setTimeout(() => {
      run();
      window.setTimeout(() => {
        for (const el of document.querySelectorAll<HTMLElement>('*')) {
          el.style.animationPlayState = 'paused';
        }
        (window as unknown as { __shotReady?: boolean }).__shotReady = true;
      }, Math.max(0, at * ms));
    }, 60);
  }
}
