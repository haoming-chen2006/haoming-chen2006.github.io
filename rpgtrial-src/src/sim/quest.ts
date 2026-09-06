// Quest runtime: a small step machine plus cancellable event/poll waiters. The prologue script
// (content/prologue.ts) is written as an async sequence on top of this. sim layer: no three, no DOM.
// content-quest agent owns this file.
import { bus, type Events, type RollResult } from '../core/events.ts';
import type { World } from './world.ts';
import type {
  Actor, QuestStep, SkillKey, AbilityKey, Vec3, DialogueNode, DialogueChoice, EnemyKind, ClassId, InventorySlot,
} from './types.ts';

// ---------------------------------------------------------------------------------------------
// World API contract (ARCHITECTURE.md → "World API"). The sim-rules agent implements these on
// `World`; until they land, content code reaches them through the `WorldAPI` cast below so tsc
// stays clean. Keep the names EXACT.
// ---------------------------------------------------------------------------------------------
export interface CheckOpts { label?: string; bonusDice?: { label: string; expr: string }[]; advantage?: 'adv' | 'dis' | null }
export interface WorldRules {
  spawnEnemy(kind: EnemyKind, pos: Vec3, opts?: { id?: string; yaw?: number; dormant?: boolean; name?: string; level?: number }): Actor;
  startEncounter(id: string, actorIds: string[]): void;
  skillCheck(actor: Actor, skill: SkillKey, dc: number, opts?: CheckOpts): RollResult;
  abilityCheck(actor: Actor, ability: AbilityKey, dc: number, opts?: CheckOpts): RollResult;
  savingThrow(actor: Actor, ability: AbilityKey, dc: number, opts?: CheckOpts): RollResult;
  giveItem(itemId: string, qty?: number): void;
  equip(itemId: string): void;
  useItem(itemId: string): void;
  grantXp(amount: number): void;
  chooseLevelUp(choiceId: string): void;
  rest(kind: 'short' | 'long'): void;
  setPlayerClass(classId: ClassId): void;
  setCinematic(on: boolean): void;
  setCompanionFollow(on: boolean, targetPos?: Vec3): void;
  playAnim(actorId: string, name: string, loop?: boolean, fade?: number, speed?: number): void;
  lookAt(actorId: string, target: string | Vec3): void;
  /** Where respawn() puts the player. */
  checkpoint: Vec3;
  setCheckpoint(pos: Vec3): void;
  /** Bring the player back at the last checkpoint with full HP; clears `dead`; emits `respawn`. */
  respawn(): void;
  flags: Set<string>;
  encounters: Map<string, { alive: number }>;
  inventory: InventorySlot[];
  gold: number;
  /** Quest steps for the journal UI (set by QuestRuntime). */
  quest?: QuestStep[];
  // ---- richer sim API (present on the real World; content uses these only when available) ----
  equipment?: Record<string, string | null>;
  unequip?(slot: string): void;
  removeItem?(itemId: string, qty?: number): boolean;
  hasItem?(itemId: string, qty?: number): boolean;
  killActor?(actorId: string): void;
  setCondition?(actorId: string, name: string, seconds: number): void;
  clearCondition?(actorId: string, name: string): void;
  stats?: Record<string, number>;
  cinematic?: boolean;
}
export type WorldAPI = World & WorldRules;

/** The slice of the UI contract the quest/dialogue runtimes use (ARCHITECTURE.md → "UI context"). */
export interface QuestUI {
  dialogue: {
    present(node: DialogueNode, choices: DialogueChoice[], onPick: (i: number) => void, onContinue: () => void): void;
    hide(): void;
    showRoll(roll: RollResult, onDone: () => void): void;
  };
  tutorial: { show(step: QuestStep): void; complete(id: string): void };
  showScreen(name: string | null): void;
  isBlocking?(): boolean;
}

// ---------------------------------------------------------------------------------------------
// Waiters
// ---------------------------------------------------------------------------------------------
/** Thrown into pending waits when the script is skipped/aborted. Beats catch it and fast-forward. */
export class SkipSignal extends Error {
  target: string | null;
  constructor(target: string | null = null) { super('skip' + (target ? ':' + target : '')); this.name = 'SkipSignal'; this.target = target; }
}
export interface Wait<T> extends Promise<T> { cancel(reason?: Error): void }

function makeWait<T>(register: (resolve: (v: T) => void, reject: (e: Error) => void) => () => void): Wait<T> {
  let cleanup: () => void = () => {};
  let settled = false;
  let rej: (e: Error) => void = () => {};
  const p = new Promise<T>((resolve, reject) => {
    rej = reject;
    cleanup = register(
      (v) => { if (settled) return; settled = true; cleanup(); resolve(v); },
      (e) => { if (settled) return; settled = true; cleanup(); reject(e); },
    );
  }) as Wait<T>;
  p.cancel = (reason = new SkipSignal()) => { if (settled) return; settled = true; cleanup(); rej(reason); };
  return p;
}

/** Resolve with the first of several waits; cancels the losers. A SkipSignal in any input propagates. */
export function first<A>(a: Wait<A>): Wait<A>;
export function first<A, B>(a: Wait<A>, b: Wait<B>): Wait<A | B>;
export function first<A, B, C>(a: Wait<A>, b: Wait<B>, c: Wait<C>): Wait<A | B | C>;
export function first<A, B, C, D>(a: Wait<A>, b: Wait<B>, c: Wait<C>, d: Wait<D>): Wait<A | B | C | D>;
export function first(...waits: Wait<unknown>[]): Wait<unknown> {
  return makeWait<unknown>((resolve, reject) => {
    for (const w of waits) w.then((v) => resolve(v), (e) => { if (e instanceof SkipSignal) reject(e); });
    return () => { for (const w of waits) w.cancel(new Error('lost race')); };
  });
}
/** Wrap a wait's value with a tag so `first()` results can be discriminated. */
export function tagged<T, S extends string>(w: Wait<T>, tag: S): Wait<{ tag: S; value: T }> {
  return makeWait<{ tag: S; value: T }>((resolve, reject) => {
    w.then((v) => resolve({ tag, value: v }), (e) => reject(e));
    return () => w.cancel(new Error('lost race'));
  });
}

// ---------------------------------------------------------------------------------------------
// Quest runtime
// ---------------------------------------------------------------------------------------------
export class QuestRuntime {
  steps: QuestStep[] = [];
  current: QuestStep | null = null;
  /** Seconds of `update(dt)` time. */
  time = 0;
  private offs: (() => void)[] = [];
  private waits = new Set<Wait<unknown>>();
  private polls = new Set<() => void>();
  world: WorldAPI;
  ui: QuestUI;

  constructor(world: WorldAPI, ui: QuestUI) {
    this.world = world; this.ui = ui;
    world.quest = this.steps;
  }

  // ---- steps ----
  /** Register a step without starting it (journal shows it as upcoming only once started). */
  start(step: QuestStep): QuestStep {
    let s = this.steps.find((x) => x.id === step.id);
    if (!s) { s = { ...step, done: false }; this.steps.push(s); }
    else { s.title = step.title; s.hint = step.hint; s.keys = step.keys; s.done = false; }
    this.current = s;
    bus.emit('questStep', { id: s.id, title: s.title, hint: s.hint, state: 'start' });
    try { this.ui.tutorial.show(s); } catch (e) { console.error('[quest] tutorial.show', e); }
    return s;
  }
  complete(id: string) {
    const s = this.steps.find((x) => x.id === id);
    if (!s || s.done) return;
    s.done = true;
    if (this.current?.id === id) this.current = null;
    bus.emit('questStep', { id: s.id, title: s.title, hint: s.hint, state: 'complete' });
    try { this.ui.tutorial.complete(id); } catch (e) { console.error('[quest] tutorial.complete', e); }
  }
  isDone(id: string) { return !!this.steps.find((x) => x.id === id)?.done; }
  log(text: string) { bus.emit('questLog', { text }); }

  // ---- event subscriptions (tracked for dispose) ----
  on<K extends keyof Events>(name: K, fn: (p: Events[K]) => void): () => void {
    const off = bus.on(name, fn); this.offs.push(off); return off;
  }

  // ---- waits ----
  private track<T>(w: Wait<T>): Wait<T> {
    this.waits.add(w as Wait<unknown>);
    const drop = () => this.waits.delete(w as Wait<unknown>);
    w.then(drop, drop);
    return w;
  }
  /** Resolves with the payload of the next `name` event matching `pred`. */
  waitEvent<K extends keyof Events>(name: K, pred?: (p: Events[K]) => boolean): Wait<Events[K]> {
    return this.track(makeWait<Events[K]>((resolve) => {
      const off = bus.on(name, (p) => { if (!pred || pred(p)) resolve(p); });
      return off;
    }));
  }
  /** Resolves when `pred()` is true (checked every update; also immediately). */
  waitUntil(pred: () => boolean): Wait<void> {
    return this.track(makeWait<void>((resolve) => {
      if (pred()) { queueMicrotask(() => resolve()); return () => {}; }
      const poll = () => { if (pred()) resolve(); };
      this.polls.add(poll);
      return () => this.polls.delete(poll);
    }));
  }
  /** Resolves after `seconds` of update time. */
  wait(seconds: number): Wait<void> {
    const until = this.time + seconds;
    return this.waitUntil(() => this.time >= until);
  }
  /** Resolves when the player interacts with `id` (the `interact` event). */
  waitInteract(id: string): Wait<Events['interact']> { return this.waitEvent('interact', (e) => e.id === id); }
  waitTrigger(id: string): Wait<Events['trigger']> {
    if (this.world.firedTriggers.has(id)) return this.track(makeWait<Events['trigger']>((resolve) => { queueMicrotask(() => resolve({ id })); return () => {}; }));
    return this.waitEvent('trigger', (e) => e.id === id);
  }

  /** Reject every pending wait with `reason` (used by skip / abort). */
  cancelWaits(reason: Error = new SkipSignal()) {
    for (const w of [...this.waits]) w.cancel(reason);
    this.waits.clear();
  }
  update(dt: number) {
    this.time += dt;
    if (this.polls.size) for (const p of [...this.polls]) p();
  }
  /** Record a step as done without ever showing it (used when fast-forwarding a skipped beat). */
  markDone(step: QuestStep) {
    let s = this.steps.find((x) => x.id === step.id);
    if (!s) { s = { ...step, done: true }; this.steps.push(s); }
    else if (s.done) return;
    s.done = true;
    if (this.current?.id === s.id) this.current = null;
    bus.emit('questStep', { id: s.id, title: s.title, hint: s.hint, state: 'complete' });
    try { this.ui.tutorial.complete(s.id); } catch { /* ui may not know the step */ }
  }
  dispose() {
    this.cancelWaits(new SkipSignal('dispose'));
    for (const off of this.offs) off();
    this.offs = []; this.polls.clear();
  }
}

// ---------------------------------------------------------------------------------------------
// Dev fallback for the World API. `startPrologue` calls this so the prologue runs (and the headless
// test can exercise real semantics) before the sim-rules implementations land. Every method is
// installed ONLY if `World` doesn't already have it, and the list of stubs is logged once.
// Semantics are deliberately minimal but faithful to the contract in ARCHITECTURE.md.
// ---------------------------------------------------------------------------------------------
import { d20, mod, profBonus, rollExpr } from './dice.ts';
import { SKILL_ABILITY, type ModelId, type WeaponId, type OffhandId } from './types.ts';
import { yawFromDir } from '../core/math.ts';

const XP_THRESHOLDS = [0, 300, 900, 2700, 6500];
export function installWorldApiFallbacks(w: World): string[] {
  const api = w as WorldAPI;
  const stubbed: string[] = [];
  const need = <K extends keyof WorldRules>(name: K, impl: WorldRules[K]) => {
    if ((api as any)[name] === undefined) { (api as any)[name] = impl; stubbed.push(name); }
  };
  need('flags', new Set<string>());
  need('encounters', new Map());
  need('inventory', []);
  need('gold', 0);

  const MODEL: Record<EnemyKind, ModelId> = { minion: 'Skeleton_Minion', warrior: 'Skeleton_Warrior', mage: 'Skeleton_Mage', rogue: 'Skeleton_Rogue', boss: 'Skeleton_Warrior' };
  const NAME: Record<EnemyKind, string> = { minion: 'Skeleton', warrior: 'Skeleton Warrior', mage: 'Skeleton Mage', rogue: 'Skeleton Rogue', boss: 'The Hollow Knight' };
  const HP: Record<EnemyKind, number> = { minion: 9, warrior: 16, mage: 11, rogue: 13, boss: 70 };
  const AC: Record<EnemyKind, number> = { minion: 11, warrior: 14, mage: 12, rogue: 13, boss: 17 };
  const WEAPON: Record<EnemyKind, WeaponId> = { minion: 'Skeleton_Blade', warrior: 'Skeleton_Blade', mage: 'Skeleton_Staff', rogue: 'Skeleton_Crossbow', boss: 'Skeleton_Axe' };
  const OFFHAND: Record<EnemyKind, OffhandId> = { minion: null, warrior: 'Skeleton_Shield_Small_A', mage: null, rogue: null, boss: 'Skeleton_Shield_Large_A' };
  let spawnN = 0;
  need('spawnEnemy', (kind, pos, opts = {}) => {
    const id = opts.id ?? `${kind}_${++spawnN}`;
    if (w.actors.has(id)) w.remove(id);
    const a = w.spawn({
      id, kind: 'enemy', name: opts.name ?? NAME[kind], model: MODEL[kind], faction: 'undead', pos, yaw: opts.yaw,
      level: opts.level ?? (kind === 'boss' ? 5 : 1), maxHp: HP[kind], ac: AC[kind], weapon: WEAPON[kind], offhand: OFFHAND[kind],
      ai: { behaviour: opts.dormant ? 'dormant' : 'idle', awakenAnim: kind === 'boss' ? 'Skeletons_Awaken_Standing' : 'Skeletons_Awaken_Floor' },
    });
    a.enemyKind = kind; a.xpValue = kind === 'boss' ? 300 : kind === 'minion' ? 25 : 50;
    if (opts.dormant) w.setAnim(a, kind === 'boss' ? 'Skeleton_Inactive_Standing_Pose' : 'Skeletons_Inactive_Floor_Pose', true, 0);
    return a;
  });
  need('startEncounter', (id, ids) => {
    for (const aid of ids) {
      const a = w.actors.get(aid); if (!a?.ai) continue;
      a.encounterId = id;
      if (a.ai.behaviour === 'dormant') { a.ai.behaviour = 'awaken'; a.ai.timer = 1.6; w.setAnim(a, a.ai.awakenAnim ?? 'Skeletons_Awaken_Floor', false, 0.05); }
    }
    api.encounters.set(id, { alive: ids.length });
    bus.emit('encounterStart', { id });
    const hook = (world: World) => {
      let alive = 0;
      for (const aid of ids) { const a = world.actors.get(aid); if (a && !a.dead && a.hp > 0) alive++; else if (a?.ai && a.dead) a.ai.behaviour = 'idle'; }
      api.encounters.set(id, { alive });
      if (alive === 0) { world.postStep.splice(world.postStep.indexOf(hook), 1); bus.emit('encounterEnd', { id }); }
    };
    w.postStep.push(hook);
  });
  const skillBonus = (a: Actor, skill: SkillKey) => mod(a.abilities[SKILL_ABILITY[skill]]) + (a.skillProfs.includes(skill) ? a.prof * (a.expertise?.includes(skill) ? 2 : 1) : 0);
  const roll = (a: Actor, kind: RollResult['kind'], label: string, bonus: number, dc: number, opts: CheckOpts) => {
    // Guidance (1d4) is consumed by the next check — same rule as sim/rules.ts.
    const dice = [...(opts.bonusDice ?? [])];
    if (a.conditions.guidance) { dice.push({ label: 'Guidance', expr: '1d4' }); delete a.conditions.guidance; bus.emit('condition', { actorId: a.id, condition: 'guidance', on: false }); }
    const r = d20(w.rng, { kind, label, bonus, dc, advantage: opts.advantage ?? null, bonusDice: dice });
    bus.emit('check', { roll: r, pos: { ...a.pos }, actorId: a.id });
    return r;
  };
  need('skillCheck', (a, skill, dc, opts = {}) => roll(a, 'check', opts.label ?? skill, skillBonus(a, skill), dc, opts));
  need('abilityCheck', (a, ab, dc, opts = {}) => roll(a, 'check', opts.label ?? ab, mod(a.abilities[ab]), dc, opts));
  need('savingThrow', (a, ab, dc, opts = {}) => roll(a, 'save', opts.label ?? `${ab} save`, mod(a.abilities[ab]) + (a.saveProfs.includes(ab) ? a.prof : 0), dc, opts));
  need('giveItem', (itemId, qty = 1) => {
    const s = api.inventory.find((x) => x.itemId === itemId);
    if (s) s.qty += qty; else api.inventory.push({ itemId, qty });
    bus.emit('loot', { itemId, qty, name: itemId.replace(/_/g, ' ') });
  });
  const EQUIP: Record<string, { weapon?: WeaponId; offhand?: OffhandId; slot: string }> = {
    longsword: { weapon: 'sword_1handed', slot: 'mainHand' }, greataxe: { weapon: 'axe_2handed', offhand: null, slot: 'mainHand' },
    dagger_pair: { weapon: 'dagger', offhand: 'dagger', slot: 'mainHand' }, wand_oak: { weapon: 'wand', slot: 'mainHand' },
    crossbow_light: { weapon: 'crossbow_2handed', slot: 'mainHand' }, shield_steel: { offhand: 'shield_square', slot: 'offHand' },
    chain_shirt: { slot: 'armor' }, leather_armor: { slot: 'armor' }, ring_protection: { slot: 'ring' },
  };
  need('equip', (itemId) => {
    const p = w.player; const e = EQUIP[itemId];
    if (e?.weapon !== undefined) p.weapon = e.weapon;
    if (e?.offhand !== undefined) p.offhand = e.offhand;
    if (itemId === 'ring_protection' && !api.flags.has('ringEquipped')) { p.ac += 1; api.flags.add('ringEquipped'); }
    bus.emit('equip', { itemId, slot: e?.slot ?? 'mainHand' });
  });
  need('useItem', (itemId) => {
    const p = w.player; const s = api.inventory.find((x) => x.itemId === itemId); if (!s) return;
    s.qty -= 1; if (s.qty <= 0) api.inventory.splice(api.inventory.indexOf(s), 1);
    if (itemId.startsWith('potion')) { const heal = rollExpr(w.rng, '2d4+2').total; p.hp = Math.min(p.maxHp, p.hp + heal); bus.emit('heal', { sourceId: p.id, targetId: p.id, amount: heal, pos: { ...p.pos } }); }
    bus.emit('itemUsed', { itemId, actorId: p.id });
  });
  need('grantXp', (amount) => {
    const p = w.player; p.xp += amount; bus.emit('xp', { amount, total: p.xp });
    while (p.level < XP_THRESHOLDS.length && p.xp >= XP_THRESHOLDS[p.level]) {
      p.level++; p.prof = profBonus(p.level); p.maxHitDice = p.level; p.hitDice = Math.min(p.maxHitDice, p.hitDice + 1);
      const gain = 5 + mod(p.abilities.con); p.maxHp += gain; p.hp += gain; p.pendingLevelUps = (p.pendingLevelUps ?? 0) + 1;
      bus.emit('levelUp', { actorId: p.id, level: p.level });
    }
  });
  need('chooseLevelUp', (choiceId) => {
    const p = w.player; p.pendingLevelUps = Math.max(0, (p.pendingLevelUps ?? 1) - 1); p.feats = [...(p.feats ?? []), choiceId];
    api.flags.add('levelUpChosen');
  });
  need('rest', (kind) => {
    const p = w.player;
    if (kind === 'long') { p.hp = p.maxHp; p.hitDice = p.maxHitDice; }
    else { const heal = Math.ceil(p.maxHp / 2); p.hp = Math.min(p.maxHp, p.hp + heal); if (p.hitDice > 0) p.hitDice--; }
    p.stamina = p.maxStamina; bus.emit('rest', { kind });
  });
  need('setPlayerClass', (classId) => { w.player.classId = classId; });
  need('setCinematic', (on) => {
    const p = w.player; if (!p) return;
    if (on) { if (p.state !== 'cinematic') w.setState(p, 'cinematic'); } else if (p.state === 'cinematic') w.setState(p, 'idle');
    bus.emit('cinematic', { on });
  });
  need('setCompanionFollow', (on, targetPos) => {
    const c = w.actors.get('ilyra'); if (!c) return;
    c.ai ??= { behaviour: 'idle', targetId: null, timer: 0, attackCooldown: 0, home: { ...c.pos }, leash: 60, aggroRange: 12 };
    c.ai.follow = on; c.ai.holdPos = targetPos ?? null; c.ai.behaviour = on ? 'follow' : 'idle';
  });
  need('playAnim', (actorId, name, loop = false, fade = 0.15, speed = 1) => { const a = w.actors.get(actorId); if (a) { w.setAnim(a, name, loop, fade, speed); a.animHold = loop ? 0 : 1.2; } });
  need('lookAt', (actorId, target) => {
    const a = w.actors.get(actorId); if (!a) return;
    const t = typeof target === 'string' ? w.actors.get(target)?.pos : target;
    if (t) a.yaw = yawFromDir(t.x - a.pos.x, t.z - a.pos.z);
  });
  need('checkpoint', { x: 0, y: 0, z: 22 });
  need('setCheckpoint', (pos) => { api.checkpoint = { ...pos }; });
  need('respawn', () => {
    const p = w.player; p.dead = false; p.deathTime = undefined; p.hp = p.maxHp; p.stamina = p.maxStamina; p.conditions = {}; p.targetId = null;
    w.setState(p, 'idle'); w.setAnim(p, 'Idle', true, 0);
    w.teleport(p, api.checkpoint);
    bus.emit('respawn', { pos: { ...p.pos } });
  });
  if (stubbed.length) console.warn(`[quest] World API fallbacks installed for: ${stubbed.join(', ')} (sim-rules will replace these)`);
  return stubbed;
}
