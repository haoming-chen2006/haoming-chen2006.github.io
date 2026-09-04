// Headless sim tests: `npm test` (node --experimental-strip-types scripts/test.ts). Plain asserts, exit 1 on failure.
import { World } from '../src/sim/world.ts';
import { emptyIntent, type PlayerIntent, type Actor, type ClassId } from '../src/sim/types.ts';
import { bus, type Events } from '../src/core/events.ts';
import { Rng } from '../src/sim/rng.ts';
import { parseDice, rollDice, rollExpr, d20, mod } from '../src/sim/dice.ts';
import { resolveAttack, COMBAT, weaponStats, attackBonusOf } from '../src/sim/combat.ts';
import { terrainHeight } from '../src/sim/terrain.ts';
import { LAKE, WADE_DEPTH, MAP_HALF, LANDMARKS } from '../src/content/level.ts';
import { CLASSES, PLAYABLE_CLASSES } from '../src/content/classes.ts';
import { yawFromDir, dist2 } from '../src/core/math.ts';

let passed = 0, failed = 0; const failures: string[] = [];
function assert(cond: unknown, msg: string) { if (cond) passed++; else { failed++; failures.push(msg); console.log('  FAIL:', msg); } }
async function test(name: string, fn: () => void | Promise<void>) {
  console.log(`\n# ${name}`);
  bus.clear();
  try { await fn(); } catch (e) { failed++; failures.push(`${name}: threw ${(e as Error).stack ?? e}`); console.log('  THREW:', (e as Error).stack ?? e); }
}
type Rec = { [K in keyof Events]?: Events[K][] };
function record(...names: (keyof Events)[]): Rec {
  const r: Rec = {};
  for (const n of names) { (r as any)[n] = []; bus.on(n, (e: any) => (r as any)[n].push(e)); }
  return r;
}
const STEP = 1 / 60;
const run = (w: World, seconds: number, intent: PlayerIntent | (() => PlayerIntent) = emptyIntent()) => { const n = Math.round(seconds / STEP); for (let i = 0; i < n; i++) w.step(STEP, typeof intent === 'function' ? intent() : intent); };
const near = (p: { x: number; z: number }, dx: number, dz: number) => ({ x: p.x + dx, y: 0, z: p.z + dz });
function setup(cls: ClassId = 'fighter', seed = 7) { const w = new World(seed); w.setPlayerClass(cls); return w; }
/** Rng stub that returns queued values for int() then falls back to the real generator. */
class QueuedRng extends Rng { q: number[] = []; constructor(seed: number) { super(seed); } override int(min: number, max: number) { if (this.q.length) return Math.min(max, Math.max(min, this.q.shift()!)); return super.int(min, max); } }

// ------------------------------------------------------------------------------------------------------
await test('dice: parseDice and distribution', () => {
  assert(JSON.stringify(parseDice('2d6+3')) === JSON.stringify({ n: 2, sides: 6, mod: 3 }), 'parse 2d6+3');
  assert(JSON.stringify(parseDice('d4')) === JSON.stringify({ n: 1, sides: 4, mod: 0 }), 'parse d4');
  assert(JSON.stringify(parseDice('1d8-1')) === JSON.stringify({ n: 1, sides: 8, mod: -1 }), 'parse 1d8-1');
  assert(JSON.stringify(parseDice('3')) === JSON.stringify({ n: 0, sides: 0, mod: 3 }), 'parse flat 3');
  const rng = new Rng(42); const counts = new Array(21).fill(0);
  for (let i = 0; i < 20000; i++) counts[rollDice(rng, 1, 20)[0]]++;
  for (let f = 1; f <= 20; f++) assert(counts[f] > 800 && counts[f] < 1200, `d20 face ${f} frequency ${counts[f]} within 800..1200`);
  assert(counts[0] === 0, 'no zero face');
  let minT = 99, maxT = -99;
  for (let i = 0; i < 5000; i++) { const t = rollExpr(rng, '2d6+3').total; minT = Math.min(minT, t); maxT = Math.max(maxT, t); }
  assert(minT === 5 && maxT === 15, `2d6+3 range 5..15 (got ${minT}..${maxT})`);
  const crit = rollExpr(rng, '1d8', 2); assert(crit.dice.length === 2, 'crit doubles dice count');
  const adv = d20(rng, { kind: 'check', label: 'x', bonus: 2, dc: 10, advantage: 'adv' }); assert(adv.advantage === 'adv' && adv.total === adv.d20 + 2, 'd20 with advantage sums');
  assert(mod(16) === 3 && mod(8) === -1 && mod(10) === 0, 'ability modifiers');
});

await test('attack resolution vs AC, crits and nat 1', () => {
  const w = setup('fighter'); const rng = new QueuedRng(3); w.rng = rng;
  const p = w.player; const e = w.spawnEnemy('minion', near(p.pos, 1.5, 0), { id: 'm' }); e.maxHp = e.hp = 1000;
  const rec = record('attackRoll', 'damage', 'miss');
  const ws = weaponStats(w, p);
  assert(ws.damage === '1d8' && ws.type === 'slashing', `fighter longsword 1d8 slashing (got ${ws.damage} ${ws.type})`);
  assert(attackBonusOf(p, ws) === 5, `fighter attack bonus +5 (got ${attackBonusOf(p, ws)})`);
  // nat 20: crit, doubles dice: 2d8 (queued 8,8) + 3 = 19
  rng.q = [20, 8, 8];
  let r = resolveAttack(w, p, e, { damage: ws.damage, damageType: ws.type, attackBonus: 5, label: 't', poiseDamage: 0, kind: 'light', flatBonus: 3, weaponAttack: true, blockable: true });
  assert(r.hit && r.crit && r.damage === 19, `nat 20 crit doubles dice → 19 (got ${JSON.stringify(r)})`);
  assert(rec.attackRoll!.length === 1 && rec.attackRoll![0].roll.crit === 'hit' && rec.attackRoll![0].roll.kind === 'attack', 'attackRoll event with crit');
  // nat 1 always misses even with a huge bonus
  rng.q = [1];
  r = resolveAttack(w, p, e, { damage: ws.damage, damageType: ws.type, attackBonus: 50, label: 't', poiseDamage: 0, kind: 'light', blockable: true });
  assert(!r.hit && r.reason === 'miss' && rec.miss!.length === 1, 'nat 1 misses');
  // 10 + 5 = 15 vs AC 12 → hit; 6 + 5 = 11 vs AC 12 → miss
  rng.q = [10, 4]; r = resolveAttack(w, p, e, { damage: ws.damage, damageType: ws.type, attackBonus: 5, label: 't', poiseDamage: 0, kind: 'light', flatBonus: 3, weaponAttack: true, blockable: true });
  assert(r.hit && r.damage === 7 && !r.crit, `15 vs AC 12 hits for 4+3 (got ${JSON.stringify(r)})`);
  rng.q = [6]; r = resolveAttack(w, p, e, { damage: ws.damage, damageType: ws.type, attackBonus: 5, label: 't', poiseDamage: 0, kind: 'light', blockable: true });
  assert(!r.hit, '11 vs AC 12 misses');
  // resistances / vulnerabilities on skeletons
  const rec2 = record('damageMod');
  e.hp = 50; rng.q = [15, 4]; r = resolveAttack(w, p, e, { damage: '1d6', damageType: 'bludgeoning', attackBonus: 5, label: 't', poiseDamage: 0, kind: 'light', blockable: true });
  assert(r.damage === 8, `bludgeoning doubled vs skeleton (got ${r.damage})`);
  rng.q = [15, 4]; r = resolveAttack(w, p, e, { damage: '1d6', damageType: 'piercing', attackBonus: 5, label: 't', poiseDamage: 0, kind: 'light', blockable: true });
  assert(r.damage === 2, `piercing halved vs skeleton (got ${r.damage})`);
  assert(rec2.damageMod!.some((m) => m.mod === 'vulnerable') && rec2.damageMod!.some((m) => m.mod === 'resist'), 'damageMod events announce vulnerable/resist');
  // hit rate sanity: +5 vs AC 12 → 70%
  let hits = 0; const N = 3000; e.hp = 1e9; w.rng = new Rng(11);
  for (let i = 0; i < N; i++) { e.hp = 1e9; if (resolveAttack(w, p, e, { damage: '1d8', damageType: 'slashing', attackBonus: 5, label: 't', poiseDamage: 0, kind: 'light', blockable: true }).hit) hits++; }
  assert(Math.abs(hits / N - 0.7) < 0.04, `hit rate ≈ 70% (got ${(hits / N).toFixed(3)})`);
});

await test('blocking halves damage, parry in the first 0.2 s negates and staggers', () => {
  const w = setup('fighter'); const rng = new QueuedRng(5); w.rng = rng;
  const p = w.player; const e = w.spawnEnemy('minion', near(p.pos, 0, 1.5), { id: 'm' });
  p.yaw = yawFromDir(e.pos.x - p.pos.x, e.pos.z - p.pos.z); e.yaw = p.yaw + Math.PI; p.maxHp = p.hp = 100;
  const rec = record('parry', 'damage', 'miss', 'stagger');
  // parry: blocking with parry window open
  p.blocking = true; p.state = 'block'; p.parryWindow = 0.2;
  rng.q = [15, 4];
  let r = resolveAttack(w, e, p, { damage: '1d6+2', damageType: 'slashing', attackBonus: 4, label: 't', poiseDamage: 10, kind: 'light', blockable: true });
  assert(r.reason === 'parry' && r.damage === 0 && rec.parry!.length === 1, `parry negates the hit (${JSON.stringify(r)})`);
  assert(e.state === 'stagger' && e.staggerTime > 1, 'parried attacker is staggered');
  assert(p.parryWindow === 0, 'parry window consumed');
  // block: parry window closed → half damage, stamina cost
  e.state = 'idle'; e.staggerTime = 0; p.stamina = 100; const hp0 = p.hp;
  rng.q = [15, 6];
  r = resolveAttack(w, e, p, { damage: '1d6+2', damageType: 'slashing', attackBonus: 4, label: 't', poiseDamage: 10, kind: 'light', blockable: true });
  assert(r.hit && r.damage === 4 && hp0 - p.hp === 4, `blocked hit halves 8 → 4 (got ${r.damage})`);
  assert(p.stamina < 100, 'blocking costs stamina');
  assert(rec.damage![0].blocked === true, 'damage event flags blocked');
  // a miss while blocking reads as a block
  rng.q = [2];
  r = resolveAttack(w, e, p, { damage: '1d6+2', damageType: 'slashing', attackBonus: 4, label: 't', poiseDamage: 10, kind: 'light', blockable: true });
  assert(r.reason === 'block', 'miss into a raised shield → block');
  // not facing the attacker → no block
  p.yaw += Math.PI; rng.q = [15, 6]; const hp1 = p.hp;
  r = resolveAttack(w, e, p, { damage: '1d6+2', damageType: 'slashing', attackBonus: 4, label: 't', poiseDamage: 10, kind: 'light', blockable: true });
  assert(r.damage === 8 && hp1 - p.hp === 8, `hit from behind ignores the shield (got ${r.damage})`);
  // guard break: out of stamina while blocking → stagger
  p.yaw -= Math.PI; p.stamina = 3; rng.q = [15, 6];
  resolveAttack(w, e, p, { damage: '1d6+2', damageType: 'slashing', attackBonus: 4, label: 't', poiseDamage: 10, kind: 'light', blockable: true });
  assert((p.state as string) === 'stagger' && !p.blocking, 'guard break staggers the player');
  // live timing: hold Q, the parry window closes after 0.2 s
  const w2 = setup('fighter', 9); const p2 = w2.player; w2.spawnEnemy('minion', near(p2.pos, 0, 3), { id: 'm2' });
  run(w2, 0.1, { ...emptyIntent(p2.yaw), block: true });
  assert(p2.blocking && p2.parryWindow > 0 && p2.parryWindow < 0.2, `parry window counting down (${p2.parryWindow.toFixed(3)})`);
  run(w2, 0.2, { ...emptyIntent(p2.yaw), block: true });
  assert(p2.blocking && p2.parryWindow === 0, 'parry window closed after 0.2 s, still blocking');
  run(w2, 0.1, emptyIntent(p2.yaw));
  assert(!p2.blocking && (p2.state as string) === 'idle', 'releasing Q stops blocking');
});

await test('dodge i-frames avoid damage', () => {
  const w = setup('rogue'); const p = w.player; const e = w.spawnEnemy('minion', near(p.pos, 0, 1.5), { id: 'm' });
  const rec = record('miss', 'damage', 'dodge');
  run(w, 0.02, { ...emptyIntent(0), dodge: true });
  assert(p.state === 'dodge' && p.iframes > 0 && rec.dodge!.length === 1, 'dodge started with i-frames');
  const r = resolveAttack(w, e, p, { damage: '1d6+2', damageType: 'slashing', attackBonus: 20, label: 't', poiseDamage: 10, kind: 'light', blockable: true });
  assert(!r.hit && r.reason === 'dodge' && rec.miss![0]?.reason === 'dodge' && rec.damage!.length === 0, 'attack during i-frames misses with reason dodge');
  run(w, 0.4, emptyIntent(0));
  assert(p.iframes <= 0, 'i-frames expire');
  const st0 = p.stamina; run(w, 0.05, { ...emptyIntent(0), dodge: true }); run(w, 0.6, emptyIntent(0));
  assert(p.stamina < st0 + 20, 'dodge costs stamina');
  // dodge-cancel out of attack recovery
  run(w, 0.02, { ...emptyIntent(0), lightAttack: true });
  assert(p.state === 'attack', 'light attack started');
  run(w, 0.35, emptyIntent(0));
  assert(p.attackPhase === 'recovery', `in recovery (${p.attackPhase})`);
  run(w, 0.02, { ...emptyIntent(0), dodge: true });
  assert(p.state === 'dodge' && p.attack === null, 'dodge cancels attack recovery');
});

await test('combo, buffering, heavy, charge and stamina gating', () => {
  const w = setup('fighter'); const p = w.player;
  const rec = record('swing', 'staminaEmpty', 'hitStop');
  const anims: string[] = [];
  let last = -1;
  const step = (it: PlayerIntent, s: number) => { const n = Math.round(s / STEP); for (let i = 0; i < n; i++) { w.step(STEP, it); if (p.anim.seq !== last) { last = p.anim.seq; anims.push(p.anim.name); } } };
  step({ ...emptyIntent(0), lightAttack: true }, STEP);
  step(emptyIntent(0), 0.3);
  step({ ...emptyIntent(0), lightAttack: true }, STEP);   // pressed during recovery → buffered
  step(emptyIntent(0), 0.5);
  step({ ...emptyIntent(0), lightAttack: true }, STEP);
  step(emptyIntent(0), 1.2);
  const combo = anims.filter((a) => a.startsWith('1H_Melee_Attack'));
  assert(combo.slice(0, 3).join(',') === '1H_Melee_Attack_Slice_Horizontal,1H_Melee_Attack_Slice_Diagonal,1H_Melee_Attack_Chop', `3-hit combo anims (${combo.join(',')})`);
  assert(rec.swing!.filter((s) => s.kind === 'light').length === 3, `three light swings (${rec.swing!.length})`);
  assert(p.stamina < 100, 'attacks spent stamina');
  // heavy tap
  step({ ...emptyIntent(0), heavyAttack: true }, STEP); step(emptyIntent(0), 1.2);
  assert(anims.includes('1H_Melee_Attack_Stab') && rec.swing!.some((s) => s.kind === 'heavy'), 'heavy = stab');
  // charged: hold ≥ 0.25 s then release
  p.stamina = 100;
  step({ ...emptyIntent(0), heavyAttack: true, heavyHold: true }, STEP); step({ ...emptyIntent(0), heavyHold: true }, 0.5);
  assert(p.attackPhase === 'charge' && p.attackKind === 'charged', `charging (${p.attackPhase})`);
  step(emptyIntent(0), 1.0);
  assert(anims.includes('2H_Melee_Attack_Spinning') && rec.swing!.some((s) => s.kind === 'charged'), 'charged release = spinning');
  // no stamina → no attack
  p.stamina = 0; p.staminaRegenDelay = 5;
  step({ ...emptyIntent(0), lightAttack: true }, STEP);
  assert(p.state !== 'attack' && rec.staminaEmpty!.length >= 1, 'attack denied without stamina');
  // can't attack while jumping
  p.stamina = 100; step({ ...emptyIntent(0), jump: true }, STEP);
  assert(p.state === 'jump', 'jumped');
  step({ ...emptyIntent(0), lightAttack: true }, STEP);
  assert(p.state === 'jump', 'no attack mid-air (buffered instead)');
});

await test('melee hits land on enemies in front, never on allies, and stagger', () => {
  const w = setup('fighter'); const p = w.player;
  const e = w.spawnEnemy('minion', near(p.pos, 0, 1.6), { id: 'm' }); e.ai = undefined; e.maxHp = e.hp = 1000;   // passive target dummy
  const il = w.actors.get('ilyra') ?? w.spawn({ id: 'ilyra', kind: 'companion', name: 'Ilyra', model: 'Rogue_Hooded', faction: 'party', pos: near(p.pos, 2.5, 0) });
  p.yaw = yawFromDir(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
  const rec = record('damage', 'attackRoll', 'stagger');
  for (let i = 0; i < 6; i++) { run(w, STEP, { ...emptyIntent(p.yaw), heavyAttack: true }); run(w, 1.3, emptyIntent(p.yaw)); e.hp = 30; e.dead = false; e.state = 'idle'; e.staggerTime = 0; }
  assert(rec.attackRoll!.filter((r) => r.attackerId === 'player').every((r) => r.targetId === 'm'), 'only the enemy is rolled against');
  assert(rec.damage!.filter((d) => d.sourceId === 'player').every((d) => d.targetId === 'm'), 'no friendly fire / self damage');
  assert(rec.damage!.length >= 2, `some heavy hits landed (${rec.damage!.length})`);
  assert(rec.stagger!.some((s) => s.actorId === 'm'), 'heavy hits stagger the minion');
  assert(il.hp === il.maxHp, 'companion untouched');
  // behind the player: no hit
  const w2 = setup('fighter', 3); const p2 = w2.player; const e2 = w2.spawnEnemy('minion', near(p2.pos, 0, -1.6), { id: 'b' }); e2.ai = undefined;
  p2.yaw = 0; const rec2 = record('attackRoll');
  run(w2, STEP, { ...emptyIntent(0), lightAttack: true }); run(w2, 0.8, emptyIntent(0));
  assert(rec2.attackRoll!.filter((r) => r.attackerId === 'player').length === 0, 'enemy behind the swing arc is not hit');
});

// ------------------------------------------------------------------------------------------------------
function bot(w: World, opts: { useAbilities?: boolean } = {}): PlayerIntent {
  const p = w.player; const cls = p.classId;
  const enemies = [...w.actors.values()].filter((a) => a.kind === 'enemy' && !a.dead && !a.hidden);
  const it = emptyIntent(p.yaw);
  if (!enemies.length) return it;
  let e = enemies[0]; for (const x of enemies) if (dist2(x.pos, p.pos) < dist2(e.pos, p.pos)) e = x;
  const d = dist2(e.pos, p.pos);
  it.cameraYaw = yawFromDir(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
  if (!p.targetId) it.lockOn = true;
  const danger = e.state === 'attack' && e.attackPhase === 'startup' && d < 3.4 && (e.attackTime ?? 0) > (e.attack?.startup ?? 1) - 0.3;
  const hurt = p.hp < p.maxHp * 0.4;
  if (hurt && cls === 'fighter' && (p.resources.secondWind ?? 0) > 0 && (p.state === 'idle' || p.state === 'move')) { it.ability = 0; return it; }
  if (hurt && w.countItem('potionHealing') > 0) { if (d > 4.5) { it.useItem = true; return it; } if (!danger) { it.move = { x: 0, z: -1 }; it.sprint = true; return it; } }
  if (danger) { if (p.stamina >= 12) { it.dodge = true; it.move = { x: 1, z: 0 }; return it; } it.block = true; return it; }
  if (cls === 'wizard' && opts.useAbilities !== false) {
    if (e.invulnerable) { it.move = { x: 0, z: -1 }; return it; }
    if (d > 3.0) { if ((p.cooldowns.fireBolt ?? 0) <= 0) it.ability = 0; else if ((p.cooldowns.rayOfFrost ?? 0) <= 0 && !e.conditions.slowed) it.ability = 1; else { it.move = { x: 0.6, z: -1 }; it.sprint = true; } return it; }
    if (p.stamina >= 12 && e.state !== 'stagger') { it.dodge = true; it.move = { x: 1, z: -1 }; return it; }
  }
  if (d > 2.1) { it.move = { x: 0, z: 1 }; it.sprint = d > 8; return it; }
  if (opts.useAbilities !== false && cls === 'barbarian' && !p.conditions.raging && (p.resources.rage ?? 0) > 0) { it.ability = 0; return it; }
  if (p.stamina > 20) it.lightAttack = true;
  else if (e.state === 'attack') it.block = true;
  return it;
}
function fight(cls: ClassId, seed: number, enemies: Array<[import('../src/sim/types.ts').EnemyKind, number, number]>, maxSeconds = 90) {
  const w = new World(seed); w.setPlayerClass(cls);
  const p = w.player;
  w.spawn({ id: 'ilyra', kind: 'companion', name: 'Ilyra', model: 'Rogue_Hooded', faction: 'party', pos: near(p.pos, 1.5, -1), weapon: 'staff' });
  const ids = enemies.map(([k, dx, dz], i) => w.spawnEnemy(k, near(p.pos, dx, dz), { id: `e${i}`, dormant: true }).id);
  const rec = record('damage', 'death', 'encounterEnd', 'attackRoll');
  w.startEncounter('test', ids);
  let t = 0;
  while (t < maxSeconds) { w.step(STEP, bot(w)); t += STEP; if (p.dead) break; if (ids.every((id) => w.actors.get(id)!.dead)) break; }
  const won = ids.every((id) => w.actors.get(id)!.dead) && !p.dead;
  return { w, p, rec, won, t, ids };
}

await test('bot fights 2 minions with every class', () => {
  for (const cls of PLAYABLE_CLASSES) {
    const r = fight(cls, 1, [['minion', 2, 5], ['minion', -2, 5]]);
    assert(r.won, `${cls} wins vs 2 minions in ${r.t.toFixed(1)} s (hp ${r.p.hp}/${r.p.maxHp}, dead=${!!r.p.dead})`);
    const self = r.rec.damage!.filter((d) => d.sourceId === 'player' && (d.targetId === 'player' || d.targetId === 'ilyra'));
    assert(self.length === 0, `${cls}: no self/ally damage from own swings`);
    const dealt = r.rec.damage!.filter((d) => d.sourceId === 'player').reduce((s, d) => s + d.amount, 0);
    assert(dealt > 0, `${cls}: dealt damage (${dealt})`);
    assert(r.rec.encounterEnd!.length === 1 && r.rec.encounterEnd![0].id === 'test', `${cls}: encounterEnd emitted`);
    assert(r.p.xp === 50, `${cls}: kill XP 2×25 (got ${r.p.xp})`);
    const seeds = [2, 3, 4, 5, 6, 7, 8, 9]; let wins = 0; let taken = 0; let enemySwings = r.rec.attackRoll!.filter((a) => a.attackerId !== 'player' && a.attackerId !== 'ilyra').length;
    for (const s of seeds) { const rr = fight(cls, s, [['minion', 2, 5], ['minion', -2, 5]]); if (rr.won) wins++; taken += rr.rec.damage!.filter((d) => d.targetId === 'player').reduce((a, d) => a + d.amount, 0); enemySwings += rr.rec.attackRoll!.filter((a) => a.attackerId !== 'player' && a.attackerId !== 'ilyra').length; }
    console.log(`  ${cls}: ${wins}/${seeds.length} extra seeds won, avg damage taken ${(taken / seeds.length).toFixed(1)}, enemy attack rolls ${enemySwings}`);
    assert(wins >= seeds.length - 2, `${cls}: wins most seeds (${wins}/${seeds.length})`);
    assert(enemySwings > 0, `${cls}: enemies attacked back`);
  }
});

await test('mixed encounter: warrior + rogue + mage (fighter)', () => {
  let wins = 0; const seeds = [1, 2, 3, 4, 5];
  for (const s of seeds) { const r = fight('fighter', s, [['warrior', 0, 6], ['rogue', 3, 7], ['mage', -4, 12]], 150); if (r.won) wins++; if (s === 1) console.log(`  seed 1: won=${r.won} t=${r.t.toFixed(1)} hp=${r.p.hp}/${r.p.maxHp} potions left=${r.w.countItem('potionHealing')}`); }
  console.log(`  fighter vs warrior+rogue+mage: ${wins}/${seeds.length}`);
  assert(wins >= 3, `fighter wins a mixed encounter most of the time (${wins}/${seeds.length})`);
});

await test('abilities spend resources and respect cooldowns', () => {
  // fighter
  let w = setup('fighter'); let p = w.player;
  const rec = record('heal', 'castStart', 'condition', 'toast', 'projectile', 'spellImpact', 'attackRoll');
  p.hp = 5;
  assert(w.useAbility(p, 'secondWind'), 'second wind cast');
  run(w, 1.0);
  assert(p.hp > 5 && p.resources.secondWind === 0 && rec.heal!.length === 1, `second wind healed (${p.hp}) and spent`);
  assert(!w.useAbility(p, 'secondWind'), 'second wind unavailable when spent');
  p.stamina = 10; assert(w.useAbility(p, 'actionSurge'), 'action surge'); run(w, 0.8);
  assert(p.stamina === 100 && p.conditions.actionSurge > 0, 'action surge refilled stamina + buff');
  assert(w.useAbility(p, 'shieldBash'), 'shield bash'); run(w, 1.0);
  assert((p.cooldowns.shieldBash ?? 0) > 0 && !w.useAbility(p, 'shieldBash'), 'shield bash on cooldown');
  // wizard
  w = setup('wizard'); p = w.player; p.invulnerable = true; const e = w.spawnEnemy('minion', near(p.pos, 0, 6), { id: 'm' }); p.yaw = yawFromDir(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
  const rec2 = record('projectile', 'spellImpact', 'attackRoll', 'damage', 'condition');
  assert(w.useAbility(p, 'fireBolt'), 'fire bolt cast'); run(w, 1.5);
  assert(rec2.projectile!.some((x) => x.kind === 'fireBolt') && rec2.spellImpact!.some((x) => x.spellId === 'fireBolt'), 'fire bolt projectile flew and impacted');
  assert(rec2.attackRoll!.some((r) => r.attackerId === 'player' && r.roll.label === 'Fire Bolt'), 'fire bolt made a ranged spell attack roll');
  assert(p.resources.spellSlots1 === 2, 'cantrip costs no slot');
  e.hp = 50; e.dead = false;
  assert(w.useAbility(p, 'magicMissile'), 'magic missile cast'); run(w, 2.0);
  assert(p.resources.spellSlots1 === 1, 'magic missile spent a slot');
  assert(rec2.damage!.filter((d) => d.type === 'force').length === 3, `three darts hit (${rec2.damage!.filter((d) => d.type === 'force').length})`);
  e.hp = 50; e.dead = false; e.state = 'idle'; w.teleport(e, near(p.pos, 0, 2)); e.knockback = null;
  const ez = e.pos.z;
  assert(w.useAbility(p, 'thunderwave'), 'thunderwave cast'); run(w, 1.6);
  assert(p.resources.spellSlots1 === 0, 'thunderwave spent the last slot');
  assert(rec2.attackRoll!.some((r) => r.roll.kind === 'save' && r.targetId === 'm'), 'thunderwave forced a CON save');
  assert(!w.useAbility(p, 'magicMissile'), 'no slots left');
  e.hp = 50; e.dead = false; e.state = 'idle';
  assert(w.useAbility(p, 'rayOfFrost'), 'ray of frost'); run(w, 1.5);
  assert(rec2.condition!.some((c) => c.actorId === 'm' && c.condition === 'slowed') || rec2.attackRoll!.filter((r) => r.roll.label === 'Ray of Frost').every((r) => !r.roll.success), 'ray of frost slows on hit');
  // rogue
  w = setup('rogue'); p = w.player; const e2 = w.spawnEnemy('minion', near(p.pos, 0, 3), { id: 'm' }); e2.ai!.behaviour = 'chase'; e2.ai!.targetId = 'player';
  const rec3 = record('condition', 'spellImpact');
  assert(w.useAbility(p, 'smokeBomb'), 'smoke bomb'); run(w, 0.8);
  assert(e2.ai!.targetId === null && e2.conditions.blinded > 0 && p.resources.smokeBomb === 1, 'smoke bomb blinds and spends');
  assert(w.useAbility(p, 'cunningDash'), 'cunning dash'); run(w, 0.1);
  assert(p.conditions.cunningDash > 0 && (p.cooldowns.cunningDash ?? 0) > 0, 'dash buff + cooldown');
  const st = p.stamina; run(w, 1.0, { ...emptyIntent(0), move: { x: 0, z: 1 }, sprint: true });
  assert(p.stamina >= st - 1, 'sprint is free during cunning dash');
  p.yaw = yawFromDir(e2.pos.x - p.pos.x, e2.pos.z - p.pos.z);
  const rec4 = record('projectile');
  assert(w.useAbility(p, 'throwDagger'), 'throw dagger'); run(w, 1.0);
  assert(rec4.projectile!.some((x) => x.kind === 'dagger'), 'dagger projectile');
  // barbarian
  w = setup('barbarian'); p = w.player;
  assert(w.useAbility(p, 'rage'), 'rage'); run(w, 0.9);
  assert(p.conditions.raging > 0 && p.resources.rage === 1, 'raging + spent');
  const e3 = w.spawnEnemy('minion', near(p.pos, 0, 1.5), { id: 'm' }); e3.ai!.behaviour = 'idle';
  const hp0 = p.hp; const r = resolveAttack(w, e3, p, { damage: '10', damageType: 'slashing', attackBonus: 30, label: 't', poiseDamage: 0, kind: 'light', blockable: true });
  assert(r.hit && hp0 - p.hp === 5, `rage halves slashing (took ${hp0 - p.hp})`);
  assert(w.useAbility(p, 'recklessAttack'), 'reckless'); run(w, 0.6);
  assert(p.conditions.reckless > 0, 'reckless buff');
  assert(w.useAbility(p, 'whirlwind'), 'whirlwind'); run(w, 1.0);
  assert((p.cooldowns.whirlwind ?? 0) > 0, 'whirlwind cooldown');
  assert(!w.useAbility(p, 'nope'), 'unknown ability is refused without throwing');
});

await test('potions heal, are consumed, and can be interrupted', () => {
  const w = setup('fighter'); const p = w.player;
  const rec = record('itemUsed', 'heal', 'toast');
  assert(w.countItem('potionHealing') === 2, 'fighter starts with 2 potions');
  p.hp = 3;
  run(w, STEP, { ...emptyIntent(0), useItem: true });
  assert(p.state === 'drink', 'drinking');
  run(w, 1.3);
  assert(p.hp > 3 && w.countItem('potionHealing') === 1 && rec.itemUsed!.length === 1, `potion healed to ${p.hp} and was consumed`);
  // interrupted drink: no heal, potion kept
  p.hp = 3; run(w, STEP, { ...emptyIntent(0), useItem: true }); run(w, 0.3);
  w.damageActor('player', 1);
  assert(p.state !== 'drink' && p.hp === 2 && w.countItem('potionHealing') === 1, 'hit interrupts the drink, potion kept');
  run(w, 1.5);
  assert(p.hp === 2, 'no heal after interruption');
  // out of potions
  w.removeItem('potionHealing', 1);
  run(w, STEP, { ...emptyIntent(0), useItem: true });
  assert(p.state !== 'drink' && rec.toast!.some((t) => /No potions/.test(t.text)), 'no potions → toast');
  // scroll usable by a fighter
  w.giveItem('scrollMagicMissile'); const e = w.spawnEnemy('minion', near(p.pos, 0, 5), { id: 'm' }); p.yaw = yawFromDir(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
  assert(w.useItem('scrollMagicMissile') && w.countItem('scrollMagicMissile') === 0, 'scroll cast and consumed');
  // equipment: AC rules
  assert(p.ac === 16, `fighter AC 16 (chain shirt 13 + dex 1 + shield 2) got ${p.ac}`);
  w.giveItem('plateArmor'); w.equip('plateArmor'); assert(p.ac === 20 && w.equipment.armor === 'plateArmor' && w.countItem('chainShirt') === 1, `plate → AC 20 (got ${p.ac}), old armor back in the bag`);
  w.giveItem('ringProtection'); w.equip('ringProtection'); assert(p.ac === 21, `ring +1 (got ${p.ac})`);
  w.giveItem('greataxe'); w.equip('greataxe'); assert(w.equipment.offHand === null && p.ac === 19 && p.weapon === 'axe_2handed', 'two-hander unequips the shield');
  w.giveItem('gold', 25); assert(w.gold === 25, 'gold');
  w.giveItem('nope'); w.equip('nope'); w.useItem('nope'); assert(true, 'unknown items do not throw');
});

await test('checks, saves and passive perception', () => {
  const w = setup('rogue'); const p = w.player; const rec = record('check');
  const r = w.skillCheck(p, 'stealth', 10, { label: 'Sneak' });
  assert(r.kind === 'check' && r.bonus === 3 + 2 + 2 && rec.check!.length === 1, `rogue stealth expertise +7 (got +${r.bonus})`);
  p.conditions.guidance = 60;
  const g = w.skillCheck(p, 'persuasion', 12);
  assert(g.bonusDice!.some((d) => d.label === 'Guidance') && !p.conditions.guidance, 'guidance adds 1d4 and is consumed');
  const s = w.savingThrow(p, 'dex', 13); assert(s.kind === 'save' && s.bonus === 3 + 2, `dex save proficient +5 (got ${s.bonus})`);
  const a = w.abilityCheck(p, 'str', 10); assert(a.bonus === 0, 'raw ability check');
  assert(w.passivePerception(p) === 10 + 1 + 2, `passive perception 13 (got ${w.passivePerception(p)})`);
});

await test('XP, level up and feat choice', () => {
  const w = setup('fighter'); const p = w.player; const rec = record('xp', 'levelUp');
  const hp0 = p.maxHp;
  w.grantXp(200); assert(p.level === 1 && rec.xp![0].total === 200, 'no level yet');
  w.grantXp(100); assert(p.level === 2 && rec.levelUp!.length === 1 && rec.levelUp![0].level === 2, 'level 2 at 300 xp');
  assert(p.maxHp > hp0 && p.prof === 2 && p.pendingLevelUps === 1, 'HP rolled up, pending choice');
  w.chooseLevelUp('zzz'); assert(p.pendingLevelUps === 1, 'unknown feat ignored');
  w.chooseLevelUp('greatWeaponMaster'); assert(p.feats!.includes('greatWeaponMaster') && p.pendingLevelUps === 0, 'feat applied');
  w.chooseLevelUp('defensiveDuelist'); assert(!p.feats!.includes('defensiveDuelist'), 'no second feat without a pending level');
  w.grantXp(600); assert(p.level === 3 && p.prof === 2, 'level 3 at 900');
  const w2 = setup('barbarian'); const s = w2.player.abilities.str; w2.grantXp(300); w2.chooseLevelUp('brutalCritical'); assert(w2.player.abilities.str === s + 1, 'feat +1 STR');
});

await test('short and long rest', () => {
  const w = setup('wizard'); const p = w.player; const rec = record('rest', 'heal');
  p.hp = 1; p.resources.spellSlots1 = 0; const tod = w.timeOfDay;
  w.rest('short');
  assert(p.hp > 1 && p.hitDice === 0 && rec.rest![0].kind === 'short', `short rest spent a hit die (hp ${p.hp})`);
  assert(p.resources.spellSlots1 === 1 && p.resources.arcaneRecovery === 0, 'arcane recovery restored a slot');
  p.hp = 1; p.cooldowns.fireBolt = 5; p.conditions.slowed = 3;
  w.rest('long');
  assert(p.hp === p.maxHp && p.hitDice === p.maxHitDice && p.resources.spellSlots1 === 2 && p.resources.arcaneRecovery === 1 && p.cooldowns.fireBolt === 0 && !p.conditions.slowed, 'long rest resets everything');
  assert(w.timeOfDay === (tod + 8) % 24 && rec.rest!.length === 2, 'long rest advances time of day');
});

await test('boss: taunt, phase 2 summon and jump attack', () => {
  const w = setup('fighter', 4); const p = w.player;
  const boss = w.spawnEnemy('boss', near(p.pos, 0, 6), { id: 'boss', dormant: true });
  assert(boss.scale === 1.35 && boss.maxHp === 90 && boss.ac === 15 && boss.ai!.boss?.phase === 1, 'boss stats');
  const rec = record('bossStart', 'castStart', 'encounterStart', 'swing', 'spellImpact', 'attackRoll', 'bossEnd', 'encounterEnd', 'death');
  w.startEncounter('boss', ['boss']);
  assert(rec.encounterStart!.length === 1 && boss.state === 'awaken' && boss.invulnerable, 'boss awakening, invulnerable');
  assert(w.damageActor('boss', 50) === 0 && boss.hp === 90, 'no damage while awakening');
  run(w, 3.5, () => ({ ...emptyIntent(p.yaw), block: true }));
  assert(rec.bossStart!.length === 1 && rec.bossStart![0].name === 'The Hollow Knight', 'boss taunt emitted bossStart');
  boss.hp = 44;
  run(w, 6, () => ({ ...emptyIntent(p.yaw), block: true }));
  assert(boss.ai!.boss!.phase === 2 && rec.castStart!.some((c) => c.spellId === 'summonMinions'), 'phase 2 summon cast');
  const minions = [...w.actors.values()].filter((a) => a.enemyKind === 'minion');
  assert(minions.length === 2 && minions.every((m) => m.encounterId === 'boss'), `2 minions summoned into the encounter (${minions.length})`);
  assert(w.encounters.get('boss')!.alive === 3, `encounter alive = 3 (got ${w.encounters.get('boss')!.alive})`);
  // jump attack: park the player 6 m away and wait
  for (const m of minions) w.killActor(m.id);
  w.teleport(p, near(boss.pos, 0, 6)); boss.ai!.jumpCooldown = 0; boss.ai!.attackCooldown = 0;
  run(w, 4, () => { const it = emptyIntent(p.yaw); const d = dist2(p.pos, boss.pos); it.cameraYaw = yawFromDir(p.pos.x - boss.pos.x, p.pos.z - boss.pos.z); if (d < 5.5) it.move = { x: 0, z: 1 }; return it; });
  assert(rec.spellImpact!.some((s) => s.spellId === 'shockwave'), 'jump attack shockwave happened');
  assert(rec.attackRoll!.some((r) => r.roll.kind === 'save' && r.targetId === 'player'), 'shockwave forced a DEX save on the player');
  w.killActor('boss');
  assert(rec.bossEnd!.length === 1 && rec.encounterEnd!.length === 1 && p.xp >= 450, `boss death → bossEnd + encounterEnd + xp (${p.xp})`);
  assert(p.level >= 2, 'boss XP reaches level 2');
});

await test('companion heals the player and casts sacred flame', () => {
  const w = setup('fighter', 2); const p = w.player;
  const il = w.spawn({ id: 'ilyra', kind: 'companion', name: 'Ilyra', model: 'Rogue_Hooded', faction: 'party', pos: near(p.pos, 2, 0) });
  assert(il.ai?.behaviour === 'follow' && il.important, 'companion initialised');
  const e = w.spawnEnemy('warrior', near(p.pos, 0, 8), { id: 'w' });
  w.startEncounter('c', ['w']);
  const rec = record('heal', 'castStart', 'castRelease', 'projectile');
  p.hp = Math.floor(p.maxHp * 0.3); p.invulnerable = true;
  run(w, 4, () => ({ ...emptyIntent(0), block: true }));
  assert(rec.castStart!.some((c) => c.actorId === 'ilyra' && c.spellId === 'healingWord') && rec.heal!.some((h) => h.sourceId === 'ilyra' && h.targetId === 'player'), 'healing word on the player under 40%');
  assert(rec.castStart!.some((c) => c.actorId === 'ilyra' && c.spellId === 'sacredFlame') && rec.projectile!.some((x) => x.kind === 'sacredFlame'), 'sacred flame cast at the enemy');
  assert(dist2(il.pos, e.pos) > 1.5, `ilyra keeps her distance (${dist2(il.pos, e.pos).toFixed(1)} m)`);
  // follow / hold
  w.killActor('w'); w.teleport(p, near(p.pos, 12, 0)); run(w, 6);
  assert(dist2(il.pos, p.pos) < 4, `ilyra follows (${dist2(il.pos, p.pos).toFixed(1)} m)`);
  w.setCompanionFollow(false, { ...il.pos }); w.teleport(p, near(p.pos, 10, 0)); run(w, 3);
  assert(dist2(il.pos, p.pos) > 8, 'ilyra holds position when told');
  w.setCompanionFollow(true); w.teleport(p, near(p.pos, 40, 0)); run(w, 1);
  assert(dist2(il.pos, p.pos) < 6, 'ilyra teleports when far behind');
  w.setCinematic(true); w.playAnim('ilyra', 'Cheer'); assert(il.anim.name === 'Cheer' && p.state === 'cinematic', 'cinematic + emote');
  w.lookAt('ilyra', 'player'); w.setCinematic(false); run(w, 0.5); assert(p.state === 'idle', 'cinematic released');
  il.hp = 2; w.damageActor('ilyra', 50); assert(il.hp === 1 && !il.dead, 'companion cannot die');
});

await test('lock-on acquires, cycles and clears', () => {
  const w = setup('fighter'); const p = w.player;
  const a = w.spawnEnemy('minion', near(p.pos, 2, 6), { id: 'a' }); const b = w.spawnEnemy('minion', near(p.pos, -2, 6), { id: 'b' });
  const rec = record('lockOn');
  const cam = yawFromDir(0, 1);
  run(w, STEP, { ...emptyIntent(cam), lockOn: true });
  assert(p.targetId === 'a' || p.targetId === 'b', `locked (${p.targetId})`);
  const first = p.targetId; w.cycleTarget(1); assert(p.targetId !== first, 'cycle switches target');
  run(w, STEP, { ...emptyIntent(cam), lockOn: true }); assert(p.targetId === null, 'toggle off');
  run(w, STEP, { ...emptyIntent(cam), lockOn: true }); w.killActor(p.targetId!); run(w, STEP);
  assert(p.targetId === null, 'target cleared on death');
  run(w, STEP, { ...emptyIntent(cam), lockOn: true }); const t = w.actors.get(p.targetId!)!; w.teleport(t, near(p.pos, 0, 40)); run(w, STEP);
  assert(p.targetId === null, 'target cleared beyond 25 m');
  assert(rec.lockOn!.length >= 4, 'lockOn events');
  void a; void b;
});

await test('movement stays on the map and out of deep water', () => {
  const w = setup('fighter', 8); const p = w.player;
  // straight into the lake (north from the start)
  run(w, 25, { ...emptyIntent(0), move: { x: 0, z: 1 }, sprint: true, cameraYaw: yawFromDir(0, -1) });
  assert(terrainHeight(p.pos.x, p.pos.z) >= LAKE.level - WADE_DEPTH - 1e-6, `blocked by deep water (h=${terrainHeight(p.pos.x, p.pos.z).toFixed(2)})`);
  // to the edge
  run(w, 90, { ...emptyIntent(0), move: { x: 0, z: 1 }, sprint: true, cameraYaw: yawFromDir(1, 0) });
  assert(Math.abs(p.pos.x) <= MAP_HALF - 2 + 1e-6 && Math.abs(p.pos.z) <= MAP_HALF - 2 + 1e-6, `inside map bounds (${p.pos.x.toFixed(1)}, ${p.pos.z.toFixed(1)})`);
  // random walk
  const rng = new Rng(99); let ok = true;
  for (let i = 0; i < 3000; i++) { w.step(STEP, { ...emptyIntent(rng.range(-Math.PI, Math.PI)), move: { x: rng.range(-1, 1), z: rng.range(-1, 1) }, sprint: rng.chance(0.5), jump: rng.chance(0.02), dodge: rng.chance(0.05) }); if (Math.abs(p.pos.x) > MAP_HALF || Math.abs(p.pos.z) > MAP_HALF || terrainHeight(p.pos.x, p.pos.z) < LAKE.level - WADE_DEPTH - 1e-6) ok = false; }
  assert(ok, 'random walk never leaves the map or enters deep water');
  // push-apart: can't walk through an enemy
  const w2 = setup('fighter'); const p2 = w2.player; const e = w2.spawnEnemy('warrior', near(p2.pos, 0, 2), { id: 'w' }); e.ai!.behaviour = 'idle'; w2.setCinematic(false);
  run(w2, 3, { ...emptyIntent(0), move: { x: 0, z: 1 }, cameraYaw: yawFromDir(0, 1) });
  assert(dist2(p2.pos, e.pos) >= p2.radius + e.radius - 0.05, `push-apart keeps actors separated (${dist2(p2.pos, e.pos).toFixed(2)})`);
});

await test('player death, gameOver and respawn at the checkpoint', () => {
  const w = setup('fighter'); const p = w.player; const rec = record('death', 'gameOver', 'respawn');
  w.setCheckpoint(LANDMARKS.camp);
  w.damageActor('player', 999);
  assert(p.dead && p.state === 'dead' && p.anim.name === 'Death_A' && rec.death!.length === 1 && rec.gameOver![0].victory === false, 'player died');
  run(w, 1, { ...emptyIntent(0), move: { x: 0, z: 1 }, lightAttack: true });
  assert(p.state === 'dead', 'dead player ignores input');
  w.respawn();
  assert(!p.dead && p.hp === p.maxHp && Math.abs(p.pos.x - LANDMARKS.camp.x) < 0.01 && rec.respawn!.length === 1, 'respawned at the checkpoint with full HP');
});

await test('fuzz: 5000 steps of random input, nothing NaN, nothing thrown', () => {
  const w = setup('barbarian', 123); const p = w.player;
  w.spawn({ id: 'ilyra', kind: 'companion', name: 'Ilyra', model: 'Rogue_Hooded', faction: 'party', pos: near(p.pos, 1, 1) });
  const ids = (['minion', 'warrior', 'mage', 'rogue', 'boss'] as const).map((k, i) => w.spawnEnemy(k, near(p.pos, (i - 2) * 3, 6 + i), { id: 'z' + i, dormant: i % 2 === 0 }).id);
  w.startEncounter('fuzz', ids);
  w.giveItem('potionHealing', 5); w.giveItem('scrollMagicMissile', 2);
  const rng = new Rng(2024); let nan = 0; let threw: unknown = null;
  const check = (v: number) => Number.isFinite(v);
  try {
    for (let i = 0; i < 5000; i++) {
      const it: PlayerIntent = { ...emptyIntent(rng.range(-Math.PI, Math.PI)), move: { x: rng.range(-1, 1), z: rng.range(-1, 1) }, sprint: rng.chance(0.3), walk: rng.chance(0.1), dodge: rng.chance(0.06), jump: rng.chance(0.03),
        lightAttack: rng.chance(0.15), heavyAttack: rng.chance(0.06), heavyHold: rng.chance(0.3), heavyRelease: rng.chance(0.1), heavyHeldFor: rng.range(0, 1), block: rng.chance(0.2), lockOn: rng.chance(0.03), interact: rng.chance(0.02),
        ability: rng.chance(0.08) ? rng.int(0, 5) : null, useItem: rng.chance(0.03), lockTargetHint: rng.chance(0.02) ? 'next' : null };
      w.step(STEP, it);
      if (i % 500 === 0) { if (p.dead) w.respawn(); if (rng.chance(0.5)) w.rest(rng.chance(0.5) ? 'short' : 'long'); w.grantXp(50); w.chooseLevelUp(CLASSES.barbarian.levelUpChoices[0].id); }
      if (i === 2500) { w.useItem('scrollMagicMissile'); w.setCinematic(true); }
      if (i === 2600) w.setCinematic(false);
      for (const a of w.actors.values()) { if (!check(a.pos.x) || !check(a.pos.y) || !check(a.pos.z) || !check(a.hp) || !check(a.stamina) || !check(a.yaw) || !check(a.poise)) nan++; }
      for (const pr of w.projectiles) if (!check(pr.pos.x) || !check(pr.pos.y) || !check(pr.pos.z)) nan++;
    }
  } catch (e) { threw = e; }
  assert(threw === null, `no exception (${threw ? (threw as Error).stack : ''})`);
  assert(nan === 0, `no NaN values (${nan})`);
  // robustness: garbage ids
  w.spawnEnemy('dragon' as any, near(p.pos, 0, 3)); w.startEncounter('ghosts', ['ghost1', 'ghost2']); w.useAbility(p, 'nothing'); w.playAnim('nobody', 'Cheer'); w.lookAt('nobody', 'player'); w.setCompanionFollow(false); w.equip('nope'); w.removeItem('nope'); w.damageActor('nobody', 5);
  w.setPlayerClass('ranger'); w.setPlayerClass('fighter');
  assert(true, 'unknown ids never throw');
});

// ------------------------------------------------------------------------------------------------------
console.log(`\n${'='.repeat(60)}\n${passed} passed, ${failed} failed`);
if (failed) { console.log(failures.map((f) => ' - ' + f).join('\n')); (globalThis as any).process.exit(1); }
