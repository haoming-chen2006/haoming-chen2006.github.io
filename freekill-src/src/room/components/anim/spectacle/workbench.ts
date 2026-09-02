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

/**
 * Portraits, for the four cutscenes that put one on screen.
 *
 * The manifest is fetched rather than imported: `public/asset-manifest.json` is
 * the deployed build's own index, the dev server serves it at the same path the
 * room reads it from, and the alternative — importing `src/room/dev/data/` —
 * would be a second, differently-hashed tree that the room never sees. It is
 * also allowed to fail: this is a dev page and every other case on the bar
 * works without it.
 */
const faces = new Map<string, string>();
const bus = new AnimBus(tr, (g) => faces.get(g));

void fetch(`${import.meta.env.BASE_URL}asset-manifest.json`)
  .then((r) => r.json())
  .then((m: { base?: string; entries: { key: string; href: string }[] }) => {
    const base = m.base ?? '';
    for (const e of m.entries) {
      const hit = /^packages\/[^/]+\/image\/generals\/([^/]+)\.jpg$/.exec(e.key);
      if (hit) faces.set(hit[1], base + e.href);
    }
  })
  .catch(() => { /* no manifest served; the scenes draw without a plate */ });

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

/* -------------------------------------------------------------- cutscenes */

/**
 * The four generals whose signature moment is a whole scene.
 *
 * Each button sends the exact message the engine sends, in the order it sends
 * it — which for three of the six is a `PropertyUpdate` naming the general the
 * seat has BECOME, and that only fires if the seat was already the general it
 * came from. So each case seats the base general first, exactly the way
 * `gamelogic.lua` does at the top of a game, and then transforms it.
 *
 * Two things do not work here and both are the workbench rather than the code:
 * the portraits are `undefined`, because a dev page has no asset manifest, so
 * the plate does not draw; and the `$`-prefixed lines resolve to their own keys,
 * because `lua-data.json` is a partial dump of the standard package. The
 * composition, the rhythm, the wipe and the colours are all real. See the
 * header of `cutscene.ts` for the wire messages these are built from.
 */
group('cutscene');

/** `zhongao.lua` / `xiongzi.lua` / `juejin.lua`'s `broadcastProperty`. */
function becomes(seat: number, from: string, to: string): void {
  bus.notify('PropertyUpdate', [seat, 'general', from]);
  bus.notify('PropertyUpdate', [seat, 'general', to]);
}

button('忠傲 成功', () => becomes(1, 'm_shi__weiyan', 'm_shi2__weiyan'), true);
button('忠傲 失败', () => becomes(2, 'm_shi__weiyan', 'm_shi3__weiyan'), true);
// 雄姿 is the engine's own sequence: the limited-skill banner on the 2 000 ms
// pause, then the portrait and the branch mark once `on_use` runs.
button('雄姿 火', () => {
  bus.notify('Animate', { type: 'InvokeUltSkill', player: 3, name: 'xiongzi' });
  window.setTimeout(() => {
    bus.notify('PropertyUpdate', [3, 'general', 'm_shi2__zhouyu']);
    bus.notify('SetPlayerMark', [3, '@xiongzi-noclear', 'xiongzi_2']);
  }, 2000);
}, true);
button('雄姿 水', () => {
  bus.notify('Animate', { type: 'InvokeUltSkill', player: 4, name: 'xiongzi' });
  window.setTimeout(() => {
    bus.notify('PropertyUpdate', [4, 'general', 'm_shi2__zhouyu']);
    bus.notify('SetPlayerMark', [4, '@xiongzi-noclear', 'xiongzi_1']);
  }, 2000);
}, true);
button('决进', () => {
  bus.notify('Animate', { type: 'InvokeUltSkill', player: 5, name: 'juejin' });
  window.setTimeout(() => becomes(5, 'mobile__caomao', 'mobile2__caomao'), 2000);
}, true);
button('神霈', () => {
  bus.notify('PropertyUpdate', [6, 'general', 'mobile__godjiangwei']);
  bus.notify('Animate', { type: 'InvokeUltSkill', player: 6, name: 'shenpeij' });
}, true);
// `qianlong.lua`'s counter climbing past every threshold it unlocks a skill at.
// No scene fires: `Photo`'s gauge is what these are for, and the workbench has
// no seat chrome to draw it on. Kept so the "nothing happens" is deliberate and
// visible rather than assumed.
button('道心 20→99', () => {
  [20, 30, 55, 80, 99].forEach((n, i) => {
    window.setTimeout(() => bus.notify('SetPlayerMark', [7, '@mobile__qianlong_daoxin', n]), i * 300);
  });
});

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
