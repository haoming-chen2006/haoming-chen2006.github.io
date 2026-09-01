/**
 * The card-effect workbench. Dev only — not an entry in `vite.config.ts`, so it
 * is never built and never shipped; `vite` serves it at
 * `/src/room/components/anim/preview.html` and nothing else references it.
 *
 * It drives the real `AnimBus` with the real notify messages rather than
 * calling the recipes directly, because most of what can go wrong is in the
 * wiring: the sound path parsing, the cue finding its seat off the `Indicate`
 * that follows it, the geometry of a link across a resized ring. Clicking 杀
 * here sends exactly the three messages the engine sends when a 杀 is used, in
 * the order it sends them.
 */
import { AnimBus, seatStage } from './bus';
import { CARD_FX, HIT_FX } from './cards';

const SEATS = 8;
const bus = new AnimBus((s) => s);

/* ------------------------------------------------------------- fake table */

const ring = document.querySelector<HTMLElement>('.fk-ring')!;
const seats: HTMLElement[] = [];

for (let i = 0; i < SEATS; i += 1) {
  const slot = document.createElement('div');
  slot.className = 'fk-seat-slot';
  const a = (i / SEATS) * Math.PI * 2 - Math.PI / 2;
  slot.style.left = `${50 + Math.cos(a) * 36}%`;
  slot.style.top = `${50 + Math.sin(a) * 30}%`;

  const photo = document.createElement('div');
  photo.className = 'fk-photo';
  photo.textContent = `${i + 1}`;
  const layer = document.createElement('div');
  layer.className = 'fk-anim-layer';
  photo.appendChild(layer);
  slot.appendChild(photo);
  ring.appendChild(slot);
  seats.push(photo);
  bus.registerStage(seatStage(i + 1), layer, photo);
}

bus.replaying = false;

/* ------------------------------------------------------- the engine's word */

/** What `sendCardEmotionAndLog` puts on the wire for a card with targets. */
function useCard(name: string, pkg: string, from: number, to: number[]): void {
  bus.notify('LogEvent', { type: 'PlaySound', name: `./packages/${pkg}/audio/card/male/${name}` });
  bus.notify('Animate', { type: 'Indicate', from, to: to.map((t) => [t]) });
}

function wearEquip(kind: string, from: number): void {
  bus.notify('LogEvent', { type: 'PlaySound', name: `./audio/card/common/${kind}` });
  bus.notify('Animate', { type: 'Indicate', from, to: [] });
}

function damage(to: number, type: string): void {
  bus.notify('LogEvent', { type: 'Damage', to, damageType: `${type}_damage` });
}

/* ------------------------------------------------------------------- ui */

const MANEUVERING = new Set([
  'thunder__slash', 'fire__slash', 'analeptic', 'iron_chain', 'fire_attack', 'supply_shortage',
]);

/** Cards that name someone else. The rest resolve on the user's own seat. */
const TARGETED = new Set([
  'slash', 'fire__slash', 'thunder__slash', 'duel', 'dismantlement', 'snatch',
  'collateral', 'fire_attack', 'iron_chain', 'nullification', 'indulgence',
  'supply_shortage', 'lightning', 'savage_assault', 'archery_attack', 'god_salvation',
]);

const AOE = new Set(['savage_assault', 'archery_attack', 'god_salvation', 'amazing_grace']);

const bar = document.querySelector<HTMLElement>('#bar')!;
let from = 1;
let to = 5;

function button(label: string, run: () => void): void {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = run;
  bar.appendChild(b);
}

function group(title: string): void {
  const h = document.createElement('span');
  h.className = 'grp';
  h.textContent = title;
  bar.appendChild(h);
}

group('cards');
for (const name of CARD_FX.keys()) {
  button(name, () => {
    const pkg = MANEUVERING.has(name) ? 'maneuvering' : 'standard_cards';
    const targets = AOE.has(name)
      ? [2, 3, 4, 6, 7, 8]
      : TARGETED.has(name) ? [to] : [from];
    useCard(name, pkg, from, TARGETED.has(name) ? targets : []);
  });
}

group('damage');
for (const kind of HIT_FX.keys()) button(kind, () => damage(to, kind));

group('gear');
for (const kind of ['weapon', 'armor', 'horse'] as const) button(kind, () => wearEquip(kind, from));
button('chained', () => { bus.notify('PropertyUpdate', [from, 'chained', false]); bus.notify('PropertyUpdate', [from, 'chained', true]); });
button('recast', () => {
  bus.notify('LogEvent', { type: 'PlaySound', name: './audio/system/recast' });
  bus.notify('MoveCards', { merged: [{ from, toArea: 5, ids: [1] }] });
});
button('unknown card', () => useCard('some_new_pack_card', 'somepack', from, [to]));

group('runs');
button('▶ every card', () => {
  const names = [...CARD_FX.keys()];
  names.forEach((name, i) => setTimeout(() => {
    const pkg = MANEUVERING.has(name) ? 'maneuvering' : 'standard_cards';
    const targets = AOE.has(name) ? [2, 3, 4, 6, 7, 8] : TARGETED.has(name) ? [to] : [from];
    useCard(name, pkg, from, TARGETED.has(name) ? targets : []);
  }, i * 1100));
});
button('⚡ storm (load test)', () => {
  for (let i = 0; i < 60; i += 1) {
    setTimeout(() => {
      const a = 1 + Math.floor(Math.random() * SEATS);
      let b = 1 + Math.floor(Math.random() * SEATS);
      if (b === a) b = (b % SEATS) + 1;
      useCard('slash', 'standard_cards', a, [b]);
      damage(b, ['normal', 'fire', 'thunder', 'ice'][i % 4]);
    }, i * 80);
  }
});

group('seats');
const pick = document.createElement('span');
pick.className = 'pick';
bar.appendChild(pick);
function refreshPick(): void { pick.textContent = `${from} → ${to}`; }
button('src+', () => { from = (from % SEATS) + 1; refreshPick(); });
button('dst+', () => { to = (to % SEATS) + 1; refreshPick(); });
refreshPick();

// Named so a screenshot script can fire one effect without clicking.
(window as unknown as Record<string, unknown>).fx = { useCard, damage, wearEquip, bus, seats };
