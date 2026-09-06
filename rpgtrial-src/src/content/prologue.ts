// Hollowmere prologue script: a 12–18 minute tutorial that teaches every system, written as an async
// sequence of "beats" on top of sim/quest.ts (cancellable waits) and sim/dialogue.ts (trees as data).
// No three, no DOM: runs headlessly (scripts/test-prologue.ts). content-quest agent owns this file.
//
// Integration (lead): `const prologue = startPrologue({ world, ui, cam, props, fade, setTimeScale })` after
// startGame(classId, name); call `prologue.update(dt)` every frame. Dialogue effect/condition strings resolve
// through `resolveEffect` / `checkCondition`. See NOTES-content.md.
import { bus, type RollResult } from '../core/events.ts';
import { dist2, yawFromDir, type Vec3 } from '../core/math.ts';
import type { World } from '../sim/world.ts';
import { terrainHeight } from '../sim/terrain.ts';
import { mod } from '../sim/dice.ts';
import { SKILL_ABILITY, type Actor, type QuestStep, type SkillKey, type ClassId, type DialogueTree, type Interactable } from '../sim/types.ts';
import { QuestRuntime, SkipSignal, first, tagged, installWorldApiFallbacks, type WorldAPI, type QuestUI, type CheckOpts, type Wait } from '../sim/quest.ts';
import { startDialogue, dialogueVars, substituteVars, type DialogueHandle, type DialogueResult } from '../sim/dialogue.ts';
import { LANDMARKS } from './level.ts';
import { getItem } from './items.ts';
import { DIALOGUES } from './dialogues.ts';
import { AREAS, BARKS, CAST, CLASS_GEAR, CODEX, CRIT_LINES, ITEMS, STEPS, type AreaId, type CodexEntry } from './story.ts';

// ---------------------------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------------------------
/** Plain-object camera shot; the lead wraps pos/look into THREE.Vector3 for render/camera.ts. */
export interface CameraShot { pos: Vec3; look: Vec3; fov?: number; duration?: number; ease?: boolean }
export interface PrologueContext {
  world: World;
  ui: QuestUI;
  cam: { playShot(shot: CameraShot): void; endShot(): void; snapBehind(a: Actor): void };
  props: { openChest(): void; pushBoulder(): void; openGate(): void; openCryptExit(): void };
  fade(out: boolean, seconds?: number): Promise<void>;
  setTimeScale(s: number): void;
}
export interface Prologue {
  update(dt: number): void;
  readonly steps: QuestStep[];
  readonly flags: Set<string>;
  readonly currentStep: QuestStep | null;
  /** Codex entries unlocked so far (journal). */
  readonly codex: CodexEntry[];
  readonly stats: Record<string, number>;
  readonly finished: boolean;
  /** Resolves when the prologue has completed (or been disposed). */
  readonly done: Promise<void>;
  /** Dev: jump forward to a beat/step id (e.g. 'chapel', 'boss'). Earlier beats are fast-forwarded. */
  skip(stepId: string): void;
  /** Death screen → respawn at the last checkpoint now (otherwise the script respawns by itself after ~5 s). */
  respawn(): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------------------------
// Effects & conditions (dialogue trees + script). Multiple effects may be joined with ';'.
//   flag:x | unflag:x | giveGuidance | gold:N | item:id[:qty] | xp:N | rest:short|long | codex:id | toast:text | log:text
//   anim:actorId:name | follow:on|off | bossHesitate
// Conditions: flag:x | !flag:x | class:id | !class:id | hasItem:id | gold>=N | level>=N | area:shore|crypt | codex:id
// ---------------------------------------------------------------------------------------------
const GUIDANCE_SECONDS = 600;
export function resolveEffect(world: World, id: string): void {
  const w = world as WorldAPI;
  for (const raw of id.split(';')) {
    const eff = raw.trim(); if (!eff) continue;
    const i = eff.indexOf(':'); const head = i < 0 ? eff : eff.slice(0, i); const rest = i < 0 ? '' : eff.slice(i + 1);
    switch (head) {
      case 'flag': setFlag(w, rest, true); break;
      case 'unflag': setFlag(w, rest, false); break;
      case 'giveGuidance': {
        const p = w.player; if (p.conditions.guidance) break;
        // the sim consumes `conditions.guidance` (truthy) on the next check and adds 1d4 — see sim/rules.ts
        if (w.setCondition) w.setCondition(p.id, 'guidance', GUIDANCE_SECONDS);
        else { p.conditions.guidance = GUIDANCE_SECONDS; bus.emit('condition', { actorId: p.id, condition: 'guidance', on: true }); }
        w.flags.add('guidance');
        bus.emit('toast', { text: 'Guidance: +1d4 on your next ability check', kind: 'info' });
        break;
      }
      case 'gold': { const n = Number(rest) || 0; w.gold += n; bus.emit('gold', { amount: n, total: w.gold }); break; }
      case 'item': { const [itemId, q] = rest.split(':'); safeGive(w, itemId, Number(q) || 1); break; }
      case 'xp': w.grantXp(Number(rest) || 0); break;
      case 'rest': w.rest(rest === 'long' ? 'long' : 'short'); break;
      case 'codex': unlockCodex(w, rest); break;
      case 'toast': bus.emit('toast', { text: rest }); break;
      case 'log': bus.emit('questLog', { text: rest }); break;
      case 'anim': { const [actorId, name] = rest.split(':'); if (w.actors.has(actorId)) w.playAnim(actorId, name, false, 0.15, 1); break; }
      case 'follow': w.setCompanionFollow(rest !== 'off'); break;
      case 'bossHesitate': {
        const b = w.actors.get(CAST.boss.id); if (!b) break;
        w.flags.add('bossHesitated');
        b.ac -= 2; b.conditions['hesitant'] = 10; b.poise = 0; b.staggerTime = Math.max(b.staggerTime, 2.5); w.setState(b, 'stagger');
        bus.emit('condition', { actorId: b.id, condition: 'hesitant', on: true });
        bus.emit('stagger', { actorId: b.id, pos: { ...b.pos }, seconds: 2.5 });
        const off = bus.on('condition', (e) => { if (e.actorId === b.id && e.condition === 'hesitant' && !e.on) { b.ac += 2; off(); } });
        break;
      }
      default: console.warn(`[prologue] unknown effect '${eff}'`);
    }
  }
}
export function checkCondition(world: World, id: string): boolean {
  const w = world as WorldAPI;
  const cond = id.trim();
  if (cond.startsWith('!')) return !checkCondition(world, cond.slice(1));
  const i = cond.indexOf(':'); const head = i < 0 ? cond : cond.slice(0, i); const rest = i < 0 ? '' : cond.slice(i + 1);
  switch (head) {
    case 'flag': return w.flags.has(rest);
    case 'class': return w.player.classId === rest;
    case 'hasItem': return hasItem(w, rest);
    case 'area': return w.area === rest;
    case 'codex': return w.flags.has('codex:' + rest);
    default: {
      let m = /^gold>=(\d+)$/.exec(cond); if (m) return w.gold >= Number(m[1]);
      m = /^level>=(\d+)$/.exec(cond); if (m) return w.player.level >= Number(m[1]);
      console.warn(`[prologue] unknown condition '${cond}'`); return false;
    }
  }
}
function setFlag(w: WorldAPI, flag: string, on: boolean) {
  if (on) w.flags.add(flag); else w.flags.delete(flag);
  if (on) refreshCodex(w);
}
/** Unlock a codex entry: sets `codex:<id>` and the entry's own unlock flag (ui/journal.ts filters on that). */
function unlockCodex(w: WorldAPI, id: string) {
  const e = CODEX.find((c) => c.id === id); if (!e || w.flags.has('codex:' + id)) return;
  w.flags.add('codex:' + id);
  if (e.unlock) w.flags.add(e.unlock);
  bus.emit('questLog', { text: `Journal updated: ${e.title}` });
  bus.emit('toast', { text: `Journal: ${e.title}`, kind: 'info' });
}
function refreshCodex(w: WorldAPI) { for (const c of CODEX) if (!c.unlock || w.flags.has(c.unlock)) unlockCodex(w, c.id); }
export function hasItem(w: WorldAPI, itemId: string): boolean {
  if (typeof w.hasItem === 'function') return w.hasItem(itemId, 1);
  return (w.inventory ?? []).some((s) => s.itemId === itemId && s.qty > 0);
}
function safeGive(w: WorldAPI, itemId: string, qty = 1) { try { w.giveItem(itemId, qty); } catch (e) { console.warn(`[prologue] giveItem('${itemId}') failed`, e); } }
function safeEquip(w: WorldAPI, itemId: string) { try { w.equip(itemId); } catch (e) { console.warn(`[prologue] equip('${itemId}') failed`, e); } }
const itemName = (id: string) => getItem(id)?.name ?? id.replace(/_/g, ' ');

const SKILL_LABEL: Record<SkillKey, string> = {
  athletics: 'Athletics', acrobatics: 'Acrobatics', sleightOfHand: 'Sleight of Hand', stealth: 'Stealth', arcana: 'Arcana', history: 'History',
  investigation: 'Investigation', nature: 'Nature', religion: 'Religion', animalHandling: 'Animal Handling', insight: 'Insight', medicine: 'Medicine',
  perception: 'Perception', survival: 'Survival', deception: 'Deception', intimidation: 'Intimidation', performance: 'Performance', persuasion: 'Persuasion',
};
const skillFromLabel = (label: string): SkillKey | null => {
  const k = label.toLowerCase().replace(/\s*check$/, '').replace(/[^a-z]/g, '');
  return (Object.keys(SKILL_LABEL) as SkillKey[]).find((s) => s.toLowerCase() === k) ?? null;
};
/** World position on the terrain at a landmark (+ optional offsets). */
const at = (p: { x: number; z: number }, dy = 0, dx = 0, dz = 0): Vec3 => ({ x: p.x + dx, y: terrainHeight(p.x + dx, p.z + dz) + dy, z: p.z + dz });
const yawToward = (from: { x: number; z: number }, to: { x: number; z: number }) => yawFromDir(to.x - from.x, to.z - from.z);
const XP_LEVEL2 = 300;

// Crypt interior anchors (open floor per content/dressing.ts cryptLayout: antechamber z −510..−498, brazier at (0,−504)).
const CRYPT = {
  hallTrigger: { x: 0, z: -499.5, r: 3.2 },
  mage: { x: 1.8, y: 0, z: -508.5 },
  rogue: { x: -2.4, y: 0, z: -502.5 },
  brazier: { x: 0, y: 0, z: -504 },
  bossCheckpoint: { x: 0, y: 0, z: -524 },
};

interface Beat { id: string; steps: QuestStep[]; run: () => Promise<void>; fastForward?: () => void }

// ---------------------------------------------------------------------------------------------
// The script
// ---------------------------------------------------------------------------------------------
class PrologueScript implements Prologue {
  world: WorldAPI;
  ui: QuestUI;
  quest: QuestRuntime;
  stats: Record<string, number> = { rolls: 0, nat20: 0, nat1: 0, checksPassed: 0, checksFailed: 0, damageDealt: 0, damageTaken: 0, kills: 0, potions: 0, deaths: 0, time: 0 };
  finished = false;
  done: Promise<void>;
  private finish: () => void = () => {};
  private beats: Beat[];
  private beatIndex = -1;
  private skipTarget: string | null = null;
  private activeDialogue: DialogueHandle | null = null;
  private activeEncounter: string | null = null;
  private respawnRequested = false;
  private checkpointYaw = LANDMARKS.start.yaw;
  private bossEndSeen = false;
  private bossWatch = false;
  private slowMoArmed = false;
  private slowUntil = 0;
  private holdIlyraFire = false;
  /** The player's own main-hand weapon, taken by the lake and returned at the wreck. */
  private weaponItem: string = ITEMS.longsword;
  // movement tutorial trackers (fed by update())
  private moved = 0; private lastPos: Vec3 | null = null; private sprintTime = 0;
  private sawJump = false; private jumping = false; private sawAbility = false; private sawUseItem = false;
  private talkEnabled = false;
  private ilyraInteractable: Interactable | null = null;
  private chapelIds: string[] = [];
  private hallIds: string[] = [];
  private ctx: PrologueContext;

  constructor(ctx: PrologueContext) {
    this.ctx = ctx;
    installWorldApiFallbacks(ctx.world);
    this.world = ctx.world as WorldAPI;
    this.ui = ctx.ui;
    this.quest = new QuestRuntime(this.world, this.ui);
    this.done = new Promise<void>((r) => { this.finish = r; });
    const il = this.world.actors.get(CAST.ilyra.id);
    if (il) { il.important = true; il.name = CAST.ilyra.name; }
    this.beats = [
      { id: 'wake', steps: [STEPS.wake], run: () => this.beatWake(), fastForward: () => this.ffWake() },
      { id: 'move', steps: [STEPS.move, STEPS.sprint, STEPS.dodge, STEPS.jump], run: () => this.beatMove() },
      { id: 'sword', steps: [STEPS.sword, STEPS.inventory, STEPS.equip, STEPS.sheet, STEPS.cardAbilities, STEPS.cardAC, STEPS.cardProf], run: () => this.beatSword(), fastForward: () => this.ffSword() },
      { id: 'cache', steps: [STEPS.cache, STEPS.cacheLoot, STEPS.potion], run: () => this.beatCache(), fastForward: () => this.ffCache() },
      { id: 'talk', steps: [STEPS.talk], run: () => this.beatTalk(), fastForward: () => this.ffTalk() },
      { id: 'camp', steps: [STEPS.camp, STEPS.rest, STEPS.chest, STEPS.hotbar], run: () => this.beatCamp(), fastForward: () => this.ffCamp() },
      { id: 'boulder', steps: [STEPS.boulder, STEPS.boulderHelp], run: () => this.beatBoulder(), fastForward: () => this.ffBoulder() },
      { id: 'chapel', steps: [STEPS.chapel, STEPS.lockOn, STEPS.lightAttack, STEPS.dodgeAttack, STEPS.block, STEPS.heavyAttack, STEPS.ability, STEPS.finishChapel, STEPS.levelUp, STEPS.captain, STEPS.key], run: () => this.beatChapel(), fastForward: () => this.ffChapel() },
      { id: 'gate', steps: [STEPS.gate], run: () => this.beatGate(), fastForward: () => this.ffGate() },
      { id: 'crypt', steps: [STEPS.crypt, STEPS.cryptHall, STEPS.brazier], run: () => this.beatCrypt(), fastForward: () => this.ffCrypt() },
      { id: 'boss', steps: [STEPS.boss], run: () => this.beatBoss(), fastForward: () => this.ffBoss() },
      { id: 'ending', steps: [STEPS.ending], run: () => this.beatEnding() },
    ];
    this.installWorldObjects();
    this.installListeners();
    refreshCodex(this.world);
    void this.run();
  }

  // ---- Prologue interface ----
  get steps() { return this.quest.steps; }
  get flags() { return this.world.flags; }
  get currentStep() { return this.quest.current; }
  get codex() { return CODEX.filter((c) => this.world.flags.has('codex:' + c.id)); }
  respawn() { this.respawnRequested = true; }
  skip(stepId: string) {
    const idx = this.beats.findIndex((b) => b.id === stepId || b.steps.some((s) => s.id === stepId));
    if (idx < 0) { console.warn(`[prologue] skip: unknown step '${stepId}'`); return; }
    if (idx <= this.beatIndex) { console.warn(`[prologue] skip: '${stepId}' is not ahead of the current beat`); return; }
    this.skipTarget = this.beats[idx].id;
    const sig = new SkipSignal(this.skipTarget);
    this.activeDialogue?.abort();
    this.quest.cancelWaits(sig);
  }
  dispose() {
    this.finished = true;
    this.endSlowMo();
    this.activeDialogue?.abort();
    this.quest.dispose();
    this.finish();
  }

  // ---- per-frame ----
  update(dt: number) {
    if (this.finished) return;
    this.quest.update(dt);
    const w = this.world; const p = w.player; if (!p) return;
    if (p.state !== 'cinematic' && !p.dead) {
      if (this.lastPos) { const d = dist2(p.pos, this.lastPos); if (d < 3) this.moved += d; }
      this.lastPos = { ...p.pos };
      const it = w.intent; const moving = Math.abs(it.move.x) + Math.abs(it.move.z) > 0.1;
      if (it.sprint && moving && p.stamina > 0) this.sprintTime += dt;
      if (p.state === 'jump') this.jumping = true; else if (this.jumping && p.onGround) { this.jumping = false; this.sawJump = true; }
      if (it.ability !== null) this.sawAbility = true;
      if (it.useItem) this.sawUseItem = true;
    }
    const il = w.actors.get(CAST.ilyra.id); const ii = this.ilyraInteractable;
    if (il && ii) {
      ii.x = il.pos.x; ii.y = il.pos.y; ii.z = il.pos.z;
      ii.enabled = this.talkEnabled && !this.activeEncounter && !this.activeDialogue?.active && !il.dead && p.state !== 'cinematic';
    }
    // while the combat tutorial stages run, Ilyra keeps her Sacred Flame to herself so the player gets the kills
    if (this.holdIlyraFire && il?.ai) il.ai.castCooldown = Math.max(il.ai.castCooldown ?? 0, 3);
    if (this.slowUntil && Date.now() >= this.slowUntil) { this.slowUntil = 0; this.ctx.setTimeScale(1); }
    if (this.bossWatch) { const b = w.actors.get(CAST.boss.id); if (b && b.hp <= b.maxHp / 2) { this.bossWatch = false; this.bark('bossHalf'); } }
  }

  // ---- setup ----
  private installWorldObjects() {
    const w = this.world;
    const il = w.actors.get(CAST.ilyra.id);
    // small radius: she follows at ~2.5 m, so her prompt must not steal focus from chests/gates — walk up to her to talk
    this.ilyraInteractable = { id: 'ilyra', label: 'Talk to Ilyra', x: il?.pos.x ?? 0, y: il?.pos.y ?? 0, z: il?.pos.z ?? 0, r: 1.6, enabled: false, kind: 'talk' };
    w.interactables.push(this.ilyraInteractable);
    w.interactables.push({ id: 'altar', label: 'Search the altar (Religion / Investigation)', ...at(LANDMARKS.chapelAltar), r: 2.4, enabled: false, kind: 'check' });
    w.interactables.push({ id: 'brazier', label: 'Rest at the brazier (short rest)', ...CRYPT.brazier, r: 2.6, enabled: false, kind: 'rest' });
    w.triggers.push({ id: 'cryptHall', ...CRYPT.hallTrigger, once: true });
    // the chapel's dead lie in their graves from the start so the player can see them on approach
    this.spawnChapelMinions();
  }
  private installListeners() {
    const q = this.quest, w = this.world, pid = w.playerId;
    q.on('check', (e) => {
      if (e.actorId !== pid) return;
      const r = e.roll; this.stats.rolls++;
      if (r.success) this.stats.checksPassed++; else if (r.success === false) this.stats.checksFailed++;
      if (r.d20 === 20) { this.stats.nat20++; this.critBark(r, 'nat20'); }
      else if (r.d20 === 1) { this.stats.nat1++; this.critBark(r, 'nat1'); }
    });
    q.on('attackRoll', (e) => { if (e.attackerId === pid) { this.stats.rolls++; if (e.roll.d20 === 20) this.stats.nat20++; else if (e.roll.d20 === 1) this.stats.nat1++; } });
    q.on('damage', (e) => { if (e.sourceId === pid) this.stats.damageDealt += e.amount; if (e.targetId === pid) this.stats.damageTaken += e.amount; });
    q.on('death', (e) => { if (e.actorId !== pid && w.actors.get(e.actorId)?.faction === 'undead') this.stats.kills++; });
    q.on('itemUsed', (e) => { if (e.actorId === pid && e.itemId === ITEMS.potion) this.stats.potions++; });
    q.on('bossEnd', () => { this.bossEndSeen = true; });
    q.on('condition', (e) => { if (e.actorId === pid && e.condition === 'guidance') { if (e.on) w.flags.add('guidance'); else w.flags.delete('guidance'); } });
    q.on('telegraph', (e) => {
      if (!this.slowMoArmed || w.actors.get(e.actorId)?.faction !== 'undead') return;
      this.slowMoArmed = false; this.ctx.setTimeScale(0.3); this.slowUntil = Date.now() + 1100;
    });
    // re-talk / re-rest after the tutorial steps that introduced them
    q.on('interact', (e) => {
      if (this.activeDialogue?.active || this.activeEncounter) return;
      if (e.id === 'ilyra' && w.flags.has('talkedIlyra')) void this.dialogue(DIALOGUES.ilyraChat);
      else if (e.id === 'campfire' && q.isDone('rest')) void this.dialogue(DIALOGUES.campfire);
      else if (e.id === 'brazier' && q.isDone('brazier')) { w.rest('short'); this.bark('brazierRested'); }
    });
  }

  // ---- helpers ----
  private get classId(): ClassId | undefined { return this.world.player.classId; }
  private vars() { return dialogueVars(this.world, { weapon: itemName(this.weaponItem).toLowerCase() }); }
  private sub(text: string) { return substituteVars(text, this.vars()); }
  /** Start a quest step with `{weapon}`-style vars substituted in its copy. */
  private start(step: QuestStep) { return this.quest.start({ ...step, title: this.sub(step.title), hint: this.sub(step.hint) }); }
  private bark(key: string, speaker = CAST.ilyra.id, emote?: string) {
    const b = BARKS[key]; if (!b) return;
    const raw = typeof b === 'string' ? b : ((this.classId && b[this.classId]) || b.default);
    bus.emit('dialogueLine', { speakerId: speaker, text: this.sub(raw), emote });
    if (emote && this.world.actors.has(speaker)) this.world.playAnim(speaker, emote, false, 0.15, 1);
  }
  /** Ilyra reacts to a natural 20 / 1 — after the dice have been shown, never before (no spoilers). */
  private pendingCrit: (() => void) | null = null;
  private critBark(r: RollResult, kind: 'nat20' | 'nat1') {
    const skill = skillFromLabel(r.label);
    const line = (skill && CRIT_LINES[skill]?.[kind]) || (typeof BARKS[kind] === 'string' ? (BARKS[kind] as string) : (BARKS[kind] as { default: string }).default);
    const say = () => {
      bus.emit('dialogueLine', { speakerId: CAST.ilyra.id, text: this.sub(line), emote: kind === 'nat20' ? 'Cheer' : undefined });
      if (kind === 'nat20' && this.world.actors.has(CAST.ilyra.id)) this.world.playAnim(CAST.ilyra.id, 'Cheer', false, 0.15, 1);
    };
    if (this.activeDialogue?.active) this.pendingCrit = say;          // flushed by onRollDone
    else this.quest.wait(1.3).then(say, () => {});                      // after the HUD's dice animation
  }
  private flushCrit() { const f = this.pendingCrit; this.pendingCrit = null; f?.(); }
  private check(skill: SkillKey, dc: number, extra: CheckOpts = {}): RollResult {
    return this.world.skillCheck(this.world.player, skill, dc, { label: SKILL_LABEL[skill], ...extra });
  }
  private async dialogue(tree: DialogueTree): Promise<DialogueResult> {
    if (this.activeDialogue?.active) this.activeDialogue.abort();
    const h = startDialogue({
      world: this.world, ui: this.ui, resolveEffect, checkCondition,
      vars: () => ({ weapon: itemName(this.weaponItem).toLowerCase() }),
      onRollDone: () => this.flushCrit(),
    }, tree);
    this.activeDialogue = h;
    const r = await h.done;
    if (this.activeDialogue === h) this.activeDialogue = null;
    if (r.aborted && this.skipTarget) throw new SkipSignal(this.skipTarget);
    return r;
  }
  private enterArea(id: AreaId) {
    const a = AREAS[id];
    bus.emit('areaEnter', { id: a.id, name: a.name });
    setFlag(this.world, 'area:' + id, true);
  }
  private checkpoint(pos: Vec3, yaw?: number) { this.world.setCheckpoint(pos); if (yaw !== undefined) this.checkpointYaw = yaw; }
  /** Teleport the player; a mid-air jump would otherwise never land after World.teleport() sets onGround. */
  private teleportPlayer(pos: Vec3, yaw?: number) {
    const w = this.world, p = w.player;
    if (p.state === 'jump') w.setState(p, 'idle');
    w.teleport(p, pos, yaw);
    this.lastPos = null;
  }
  private removeActors(ids: string[]) { for (const id of ids) if (this.world.actors.has(id)) this.world.remove(id); }
  private hasItem(id: string) { return hasItem(this.world, id); }
  private ensureLevel(level: number) {
    const p = this.world.player;
    if (p.level < level && level === 2 && p.xp < XP_LEVEL2) this.world.grantXp(XP_LEVEL2 - p.xp);
  }
  /** The UI opens the level-up screen on `levelUp`; we wait until the choice is made. */
  private async waitLevelUpChoice() {
    const p = this.world.player;
    await this.quest.waitUntil(() => (p.pendingLevelUps ?? 0) === 0);
  }
  private beginEncounter(id: string, ids: string[]) {
    this.activeEncounter = id;
    this.world.startEncounter(id, ids);
    this.world.setCompanionFollow(true);
  }
  /** Resolves 'won' on encounterEnd or 'died' on the player's death. */
  private encounterOutcome(id: string): Wait<{ tag: 'won'; value: unknown } | { tag: 'died'; value: unknown }> {
    const q = this.quest, pid = this.world.playerId;
    const out = first(
      tagged(q.waitEvent('encounterEnd', (e) => e.id === id), 'won'),
      tagged(q.waitEvent('death', (e) => e.actorId === pid), 'died'),
    );
    out.then(() => { this.activeEncounter = null; }, () => { this.activeEncounter = null; });
    return out;
  }
  /** Generic encounter with death → respawn → retry loop. `setup` (re)spawns and returns actor ids. */
  private async runEncounter(id: string, setup: () => string[], onStart?: (retry: boolean) => void): Promise<void> {
    let ids: string[] = []; let retry = false;
    for (;;) {
      ids = setup();
      this.beginEncounter(id, ids); onStart?.(retry);
      const r = await this.encounterOutcome(id);
      if (r.tag === 'won') return;
      await this.deathFlow();
      this.removeActors(ids); retry = true;
    }
  }
  /** Player died: Ilyra's line, fade, (the UI shows the death screen on `death`), respawn at the checkpoint. */
  private async deathFlow() {
    const q = this.quest, w = this.world;
    this.stats.deaths++; this.ctx.setTimeScale(1); this.slowUntil = 0; this.holdIlyraFire = false;
    this.bark('playerDeath');
    await q.wait(2.6);
    await this.ctx.fade(true, 0.8);
    this.respawnRequested = false;
    await first(q.waitUntil(() => this.respawnRequested), q.wait(5));
    this.respawnRequested = false;
    w.respawn(); w.player.yaw = this.checkpointYaw;
    this.ctx.cam.snapBehind(w.player);
    const il = w.actors.get(CAST.ilyra.id); if (il && dist2(il.pos, w.player.pos) > 6) w.teleport(il, at(w.player.pos, 0, 1.4, 1.2));
    this.lastPos = null;
    await this.ctx.fade(false, 0.8);
    this.bark('respawn');
  }
  private waitAbilityUse(): Wait<unknown> {
    const q = this.quest, pid = this.world.playerId;
    return first(
      q.waitUntil(() => this.sawAbility),
      q.waitEvent('castStart', (e) => e.actorId === pid),
      q.waitEvent('swing', (e) => e.actorId === pid && e.kind === 'spell'),
    );
  }
  /** Snap time back to normal (dodge lesson landed, death, skip, finish). Idempotent. */
  private endSlowMo() { if (this.slowUntil) { this.slowUntil = 0; this.ctx.setTimeScale(1); } }
  private afterSkip() {
    this.endSlowMo(); this.ctx.setTimeScale(1); this.slowMoArmed = false; this.holdIlyraFire = false;
    this.ctx.cam.endShot();
    try { this.ui.dialogue.hide(); } catch { /* ignore */ }
    this.world.setCinematic(false);
    bus.emit('cinematic', { on: false });
    void this.ctx.fade(false, 0.3);
    if (this.world.player) this.ctx.cam.snapBehind(this.world.player);
  }

  // ---- sequencer ----
  private async run() {
    try {
      for (let i = 0; i < this.beats.length; i++) {
        if (this.finished) return;
        const b = this.beats[i]; this.beatIndex = i;
        if (this.skipTarget) {
          if (b.id === this.skipTarget) this.skipTarget = null;
          else { this.fastForward(b); continue; }
        }
        try { await b.run(); }
        catch (e) {
          if (e instanceof SkipSignal) { if (this.finished) return; this.afterSkip(); this.fastForward(b); continue; }
          console.error(`[prologue] beat '${b.id}' failed`, e); throw e;
        }
      }
    } finally { this.finished = true; this.endSlowMo(); this.finish(); }
  }
  private fastForward(b: Beat) {
    for (const s of b.steps) this.quest.markDone(s);
    try { b.fastForward?.(); } catch (e) { console.error(`[prologue] fastForward '${b.id}'`, e); }
  }

  // =========================================================================================
  // 0. Wake on the Drowned Shore
  // =========================================================================================
  /** The lake took the player's weapon; it lies by the wreck. */
  private takeWeapon() {
    const w = this.world;
    if (w.flags.has('weaponTaken')) return;
    w.flags.add('weaponTaken');
    const eq = w.equipment?.mainHand;
    if (eq) { this.weaponItem = eq; w.unequip?.('mainHand'); w.removeItem?.(eq, 1); }
    else if (this.hasItem(ITEMS.longsword)) { this.weaponItem = ITEMS.longsword; w.removeItem?.(ITEMS.longsword, 1); }
    w.player.weapon = null;
    w.setInteractable('sword', { label: `Take the ${itemName(this.weaponItem).toLowerCase()}` });
  }
  private async beatWake() {
    const q = this.quest, w = this.world, p = w.player, il = w.actors.get(CAST.ilyra.id);
    this.start(STEPS.wake);
    await this.ctx.fade(true, 0);
    this.takeWeapon();
    w.setCinematic(true); bus.emit('cinematic', { on: true, shot: 'wide' });
    this.teleportPlayer(LANDMARKS.start, LANDMARKS.start.yaw);
    w.playAnim(p.id, 'Lie_Idle', true, 0);
    if (il) { w.teleport(il, LANDMARKS.ilyraStart, LANDMARKS.ilyraStart.yaw); w.playAnim(il.id, 'Sit_Floor_Idle', true, 0); w.lookAt(il.id, p.id); }
    this.checkpoint(LANDMARKS.start, LANDMARKS.start.yaw);
    w.setCompanionFollow(false);
    this.enterArea('shore');
    const look = at(LANDMARKS.start, 0.9);
    this.ctx.cam.playShot({ pos: { x: -22, y: 10, z: -16 }, look, fov: 48, duration: 0 });
    await q.wait(0.2);
    this.ctx.cam.playShot({ pos: { x: -5.5, y: 2.4, z: 13.5 }, look, fov: 40, duration: 10 });
    await this.ctx.fade(false, 2.5);
    await this.dialogue(DIALOGUES.intro);
    // stand up under a low three-quarter shot, then hand the camera back
    w.setCinematic(true);
    w.playAnim(p.id, 'Lie_StandUp', false, 0.1);
    this.ctx.cam.playShot({ pos: at(LANDMARKS.start, 1.6, 2.6, 2.4), look: at(LANDMARKS.start, 1.1), fov: 45, duration: 1.4 });
    await q.wait(2.4);
    if (il) w.playAnim(il.id, 'Sit_Floor_StandUp', false, 0.1);
    await q.wait(0.9);
    this.ctx.cam.endShot(); this.ctx.cam.snapBehind(p);
    w.setCinematic(false); bus.emit('cinematic', { on: false });
    q.complete('wake');
  }
  private ffWake() {
    const w = this.world; this.takeWeapon(); w.setCinematic(false); this.teleportPlayer(LANDMARKS.start, LANDMARKS.start.yaw); this.checkpoint(LANDMARKS.start, LANDMARKS.start.yaw); this.enterArea('shore');
  }

  // =========================================================================================
  // 1. Move, sprint, dodge, jump
  // =========================================================================================
  private async beatMove() {
    const q = this.quest, pid = this.world.playerId;
    this.start(STEPS.move); this.bark('move'); this.moved = 0; this.lastPos = null;
    await q.waitUntil(() => this.moved >= 8); q.complete('move');
    this.start(STEPS.sprint); this.bark('sprint'); this.sprintTime = 0;
    await q.waitUntil(() => this.sprintTime >= 0.6); q.complete('sprint');
    this.start(STEPS.dodge); this.bark('dodge');
    await q.waitEvent('dodge', (e) => e.actorId === pid); q.complete('dodge');
    this.start(STEPS.jump); this.bark('jump'); this.sawJump = false;
    await q.waitUntil(() => this.sawJump); q.complete('jump');
  }

  // =========================================================================================
  // 2. Your weapon: interact, inventory, equip, character sheet (3 cards)
  // =========================================================================================
  private async beatSword() {
    const q = this.quest, w = this.world, pid = w.playerId;
    const weapon = this.weaponItem;
    this.start(STEPS.sword); this.bark('sword');
    await first(q.waitInteract('sword'), q.waitUntil(() => this.hasItem(weapon)));
    if (!this.hasItem(weapon)) safeGive(w, weapon, 1);
    w.setInteractable('sword', { used: true, enabled: false });
    w.playAnim(pid, 'PickUp', false, 0.1);
    q.complete('sword');

    this.start(STEPS.inventory); this.bark('inventory');
    await first(q.waitEvent('ui', (e) => e.screen === 'inventory'), q.waitEvent('equip', (e) => e.itemId === weapon));
    q.complete('inventory');

    this.start(STEPS.equip); this.bark('equip');
    await first(q.waitEvent('equip', (e) => e.itemId === weapon), q.waitUntil(() => w.equipment?.mainHand === weapon && w.flags.has('equippedWeapon')));
    w.flags.add('equippedWeapon');
    q.complete('equip');

    this.start(STEPS.sheet); this.bark('sheet');
    await q.waitEvent('ui', (e) => e.screen === 'character');
    q.complete('sheet');
    for (const card of [STEPS.cardAbilities, STEPS.cardAC, STEPS.cardProf]) {
      this.start(card);
      await q.wait(7);
      q.complete(card.id);
    }
    this.bark('sheetDone');
  }
  private ffSword() {
    const w = this.world;
    if (!this.hasItem(this.weaponItem)) safeGive(w, this.weaponItem, 1);
    safeEquip(w, this.weaponItem); w.flags.add('equippedWeapon');
    w.setInteractable('sword', { used: true, enabled: false });
  }

  // =========================================================================================
  // 3. Perception: the hidden cache. Potions (R).
  // =========================================================================================
  private async beatCache() {
    const q = this.quest, w = this.world, p = w.player;
    this.start(STEPS.cache);
    await q.waitUntil(() => dist2(p.pos, LANDMARKS.cache) < 6.5);
    const roll = this.check('perception', 12);
    const passive = 10 + mod(p.abilities[SKILL_ABILITY.perception]) + (p.skillProfs.includes('perception') ? p.prof : 0);
    const found = !!roll.success || passive >= 12;
    w.setInteractable('cache', { enabled: true });
    if (!roll.crit) this.bark(found ? 'cacheSuccess' : 'cacheFail');
    if (found) w.grantXp(25);
    w.flags.add('cacheFound');
    q.complete('cache');

    this.start(STEPS.cacheLoot);
    await q.waitInteract('cache');
    this.lootCache();
    q.complete('cacheLoot');

    this.start(STEPS.potion); this.bark('potion'); this.sawUseItem = false;
    const r = await first(
      tagged(q.waitEvent('itemUsed', (e) => e.actorId === w.playerId && e.itemId === ITEMS.potion), 'drank'),
      tagged(q.waitUntil(() => this.sawUseItem), 'pressed'),
    );
    if (r.tag === 'drank') this.bark('potionDrunk');
    q.complete('potion');
  }
  private lootCache() {
    const w = this.world; if (w.flags.has('cacheLooted')) return;
    w.flags.add('cacheLooted');
    safeGive(w, ITEMS.potion, 2); resolveEffect(w, 'gold:15');
    w.setInteractable('cache', { used: true });
    w.playAnim(w.playerId, 'PickUp', false, 0.1);
  }
  private ffCache() { this.world.setInteractable('cache', { enabled: true }); this.lootCache(); }

  // =========================================================================================
  // 4. Ilyra: the first real conversation (checks, Guidance)
  // =========================================================================================
  private async beatTalk() {
    const q = this.quest, w = this.world;
    this.start(STEPS.talk); this.bark('talk'); this.talkEnabled = true;
    await q.waitInteract('ilyra');
    await this.dialogue(DIALOGUES.ilyraTalk);
    w.flags.add('talkedIlyra'); w.grantXp(25);
    w.setCompanionFollow(true);
    q.complete('talk');
  }
  private ffTalk() { this.talkEnabled = true; this.world.flags.add('talkedIlyra'); this.world.flags.add('met:ilyra'); refreshCodex(this.world); this.world.setCompanionFollow(true); }

  // =========================================================================================
  // 5. Pilgrim's Rest: rest, chest (gear + ring), hotbar
  // =========================================================================================
  private async beatCamp() {
    const q = this.quest, w = this.world;
    this.start(STEPS.camp);
    if (!w.flags.has('ilyraSaidCamp')) this.bark('toCamp');   // her closing line of the talk already says it
    await q.waitTrigger('camp');
    this.enterArea('camp'); this.checkpoint(at(LANDMARKS.camp, 0, -3, 2), yawToward({ x: LANDMARKS.camp.x - 3, z: LANDMARKS.camp.z + 2 }, LANDMARKS.camp));
    this.bark('camp'); q.complete('camp');

    this.start(STEPS.rest);
    await q.waitInteract('campfire');
    await this.dialogue(DIALOGUES.campfire);
    q.complete('rest');

    this.start(STEPS.chest); this.bark('chest');
    await q.waitInteract('chest');
    this.lootChest();
    this.bark('chestOpened');
    q.complete('chest');

    this.start(STEPS.hotbar); this.bark('hotbar'); this.sawAbility = false;
    await this.waitAbilityUse();
    this.bark('hotbarDone'); q.complete('hotbar');
  }
  private lootChest() {
    const w = this.world; if (w.flags.has('chestLooted')) return;
    w.flags.add('chestLooted');
    this.ctx.props.openChest();
    w.setInteractable('chest', { used: true });
    w.playAnim(w.playerId, 'Interact', false, 0.1);
    const gear = CLASS_GEAR[this.classId ?? 'fighter'];
    for (const g of gear) { safeGive(w, g.id, g.qty); if (g.equip) safeEquip(w, g.id); }
    safeGive(w, ITEMS.ring, 1); safeEquip(w, ITEMS.ring);
  }
  private ffCamp() { const w = this.world; this.teleportPlayer(at(LANDMARKS.camp, 0, -3, 2)); this.enterArea('camp'); this.checkpoint(w.player.pos); this.lootChest(); }

  // =========================================================================================
  // 6. The boulder: Athletics DC 12, Help → advantage
  // =========================================================================================
  private async beatBoulder() {
    const q = this.quest, w = this.world;
    this.start(STEPS.boulder);
    await q.waitTrigger('boulder'); this.bark('boulder');
    let attempts = 0;
    for (;;) {
      await q.waitInteract('boulder');
      const help = w.flags.has('boulderHelp');
      w.playAnim(w.playerId, 'Interact', false, 0.1);
      if (help) w.playAnim(CAST.ilyra.id, 'Interact', false, 0.1);
      const roll = this.check('athletics', 12, help ? { advantage: 'adv' } : {});
      if (roll.success) {
        if (!roll.crit) this.bark(help ? 'boulderHelped' : 'boulderSuccess');
        break;
      }
      attempts++;
      if (attempts === 1 && !help) {
        if (roll.crit) await q.wait(1.8);            // let her nat-1 reaction land before she offers to help
        await this.dialogue(DIALOGUES.boulderHelp);
        if (w.flags.has('boulderHelp')) this.start(STEPS.boulderHelp);
      } else if (!roll.crit) this.bark('boulderFail');
    }
    this.pushBoulder(); w.grantXp(25);
    q.complete('boulderHelp'); q.complete('boulder');
  }
  private pushBoulder() {
    const w = this.world; if (w.flags.has('boulderPushed')) return;
    w.flags.add('boulderPushed'); this.ctx.props.pushBoulder(); w.setInteractable('boulder', { used: true });
  }
  private ffBoulder() { this.pushBoulder(); this.teleportPlayer(at(LANDMARKS.boulder, 0, 3, -3)); }

  // =========================================================================================
  // 7. The Chapel of Saint Aldric: staged combat tutorial, level 2, the captain, the key
  // =========================================================================================
  private spawnChapelMinions(): string[] {
    this.removeActors(this.chapelIds);
    this.chapelIds = LANDMARKS.graves.map((g, i) => this.world.spawnEnemy('minion', at(g), { id: `minion_${i + 1}`, dormant: true, yaw: yawToward(g, LANDMARKS.chapel) }).id);
    return this.chapelIds;
  }
  /** Staged combat lessons. `status()` reports how the encounter ended: 'won' skips the rest, 'died' leaves them for the retry. */
  private async combatStages(done: Set<string>, status: () => 'won' | 'died' | null) {
    const q = this.quest, w = this.world, pid = w.playerId;
    const over = () => status() !== null;
    const stages: { step: QuestStep; bark: string; arm?: () => void; wait: () => Wait<unknown> }[] = [
      { step: STEPS.lockOn, bark: 'lockOn', wait: () => first(q.waitUntil(() => w.player.targetId !== null), q.waitEvent('lockOn', (e) => e.actorId === pid && !!e.targetId)) },
      { step: STEPS.lightAttack, bark: 'lightAttack', wait: () => q.waitEvent('swing', (e) => e.actorId === pid && e.kind === 'light') },
      { step: STEPS.dodgeAttack, bark: 'dodgeAttack', arm: () => { this.slowMoArmed = true; }, wait: () => q.waitEvent('miss', (e) => e.targetId === pid && e.reason === 'dodge') },
      { step: this.classId === 'wizard' ? STEPS.blockWizard : STEPS.block, bark: 'block', wait: () => first(q.waitEvent('miss', (e) => e.targetId === pid && (e.reason === 'block' || e.reason === 'parry')), q.waitEvent('parry', (e) => e.defenderId === pid)) },
      { step: STEPS.heavyAttack, bark: 'heavyAttack', wait: () => q.waitEvent('swing', (e) => e.actorId === pid && (e.kind === 'heavy' || e.kind === 'charged')) },
      { step: STEPS.ability, bark: 'ability', arm: () => { this.sawAbility = false; }, wait: () => this.waitAbilityUse() },
    ];
    this.holdIlyraFire = true;
    try {
      for (const s of stages) {
        if (done.has(s.step.id)) continue;
        if (over()) break;
        this.start(s.step); this.bark(s.bark); s.arm?.();
        const r = await first(tagged(s.wait(), 'ok'), tagged(q.waitUntil(over), 'over'));
        this.slowMoArmed = false; this.endSlowMo();
        if (r.tag === 'over') break;
        done.add(s.step.id); q.complete(s.step.id);
      }
    } finally { this.holdIlyraFire = false; }
    if (status() === 'died') return;                      // resume the remaining lessons after the respawn
    if (status() === 'won') {
      // the fight ended before every lesson landed: never block the player on a tutorial
      if (done.size < stages.length) this.bark('stagesSkipped');
      for (const s of stages) if (!done.has(s.step.id)) { done.add(s.step.id); q.markDone(s.step); }
      return;
    }
    this.start(STEPS.finishChapel); this.bark('stagesDone');
  }
  private async beatChapel() {
    const q = this.quest, w = this.world, pid = w.playerId;
    this.start(STEPS.chapel);
    await q.waitTrigger('chapel');
    this.enterArea('chapel');
    this.checkpoint({ x: 53, y: terrainHeight(53, 4), z: 4 }, yawToward({ x: 53, z: 4 }, LANDMARKS.chapel));
    this.bark('chapel');
    await q.wait(2.0);
    q.complete('chapel');

    // --- the fight: staged tutorial, with death → respawn → retry ---
    const stagesDone = new Set<string>();
    for (;;) {
      const ids = this.chapelIds.length === 3 && this.chapelIds.every((id) => w.actors.has(id) && !w.actors.get(id)!.dead) ? this.chapelIds : this.spawnChapelMinions();
      this.beginEncounter('chapel', ids); this.bark('rising');
      const outcome = this.encounterOutcome('chapel');
      let status: 'won' | 'died' | null = null; outcome.then((o) => { status = o.tag; }, () => {});
      await this.combatStages(stagesDone, () => status);
      const r = await outcome;
      if (r.tag === 'won') break;
      await this.deathFlow();
      this.removeActors(this.chapelIds); this.chapelIds = [];
    }
    q.complete('finishChapel');
    this.bark('chapelDone');

    // --- XP → level 2 → level-up screen (the UI opens it on `levelUp`) ---
    this.ensureLevel(2);
    this.start(STEPS.levelUp); this.bark('levelUp');
    await this.waitLevelUpChoice();
    q.complete('levelUp');

    // --- the captain, who carries the key (the altar keeps a spare) ---
    this.start(STEPS.captain);
    const altar = w.getInteractable('altar'); if (altar) altar.enabled = true;
    await this.runEncounter('captain', () => {
      const c = w.spawnEnemy('warrior', at(LANDMARKS.chapelAltar, 0, 0, 3.2), { id: CAST.captain.id, name: CAST.captain.name, dormant: true, level: 2, yaw: yawToward({ x: LANDMARKS.chapelAltar.x, z: LANDMARKS.chapelAltar.z + 3.2 }, LANDMARKS.chapel) });
      return [c.id];
    }, (retry) => { if (!retry) this.bark('captain'); });
    q.complete('captain');
    const corpse = w.actors.get(CAST.captain.id);
    w.interactables.push({ id: 'captainKey', label: 'Take the key', x: corpse?.pos.x ?? LANDMARKS.chapelAltar.x, y: corpse?.pos.y ?? 0, z: corpse?.pos.z ?? LANDMARKS.chapelAltar.z, r: 2.2, enabled: true, kind: 'loot' });
    this.bark('captainDown');

    this.start(STEPS.key);
    while (!this.hasItem(ITEMS.key)) {
      const r = await first(tagged(q.waitInteract('captainKey'), 'corpse'), tagged(q.waitInteract('altar'), 'altar'));
      if (r.tag === 'corpse') { safeGive(w, ITEMS.key, 1); w.playAnim(pid, 'PickUp', false, 0.1); this.bark('keyTaken'); }
      else {
        const p = w.player;
        const bonus = (s: SkillKey) => mod(p.abilities[SKILL_ABILITY[s]]) + (p.skillProfs.includes(s) ? p.prof : 0);
        const skill: SkillKey = bonus('investigation') > bonus('religion') ? 'investigation' : 'religion';
        w.playAnim(pid, 'Interact', false, 0.1);
        const roll = this.check(skill, 10);
        if (roll.success) { safeGive(w, ITEMS.key, 1); if (!roll.crit) this.bark('altarSuccess'); }
        else if (!roll.crit) this.bark('altarFail');
      }
    }
    w.setInteractable('captainKey', { used: true, enabled: false }); w.setInteractable('altar', { used: true, enabled: false });
    q.complete('key');
  }
  private ffChapel() {
    const w = this.world;
    this.removeActors([...this.chapelIds, CAST.captain.id]); this.chapelIds = [];
    this.enterArea('chapel');
    this.ensureLevel(2); w.player.pendingLevelUps = 0;
    if (!this.hasItem(ITEMS.key)) safeGive(w, ITEMS.key, 1);
    this.teleportPlayer(at(LANDMARKS.chapel, 0, 6, -10)); this.checkpoint(w.player.pos);
  }

  // =========================================================================================
  // 8. The crypt gate: key, or Sleight of Hand DC 14 (retry)
  // =========================================================================================
  private async beatGate() {
    const q = this.quest, w = this.world;
    this.start(STEPS.gate);
    await q.waitTrigger('gate');
    this.bark(this.hasItem(ITEMS.key) ? 'gateKey' : 'gate');
    for (;;) {
      await q.waitInteract('gate');
      w.playAnim(w.playerId, 'Interact', false, 0.1);
      if (this.hasItem(ITEMS.key)) break;
      const roll = this.check('sleightOfHand', 14);
      if (roll.success) break;
      if (!roll.crit) this.bark('gateFail');
    }
    this.openGate();
    this.bark('gateOpen');
    await q.wait(1.6);
    await this.ctx.fade(true, 1.0);
    this.enterCrypt();
    await this.ctx.fade(false, 1.2);
    q.complete('gate');
  }
  private openGate() {
    const w = this.world; if (w.flags.has('gateOpened')) return;
    w.flags.add('gateOpened'); this.ctx.props.openGate(); w.setInteractable('gate', { used: true });
  }
  private enterCrypt() {
    const w = this.world; const p = w.player;
    this.teleportPlayer(LANDMARKS.cryptEntrance, Math.PI);
    const il = w.actors.get(CAST.ilyra.id); if (il) w.teleport(il, { x: 1.4, y: 0, z: LANDMARKS.cryptEntrance.z + 1.6 }, Math.PI);
    this.checkpoint(LANDMARKS.cryptEntrance, Math.PI);
    this.enterArea('crypt');
    this.ctx.cam.snapBehind(p);
    this.lastPos = null;
  }
  private ffGate() { this.openGate(); this.enterCrypt(); }

  // =========================================================================================
  // 9. The Warden's Crypt: ranged ambush, the brazier
  // =========================================================================================
  private spawnHall(): string[] {
    this.removeActors(this.hallIds);
    const w = this.world;
    this.hallIds = [
      w.spawnEnemy('mage', CRYPT.mage, { id: 'crypt_mage', dormant: true, yaw: 0 }).id,
      w.spawnEnemy('rogue', CRYPT.rogue, { id: 'crypt_rogue', dormant: true, yaw: 0 }).id,
    ];
    return this.hallIds;
  }
  private async beatCrypt() {
    const q = this.quest, w = this.world;
    this.spawnHall();
    this.start(STEPS.crypt); this.bark('crypt');
    await q.waitTrigger('cryptHall');
    q.complete('crypt');

    this.start(STEPS.cryptHall);
    await this.runEncounter('cryptHall', () => (this.hallIds.length && this.hallIds.every((id) => w.actors.has(id) && !w.actors.get(id)!.dead) ? this.hallIds : this.spawnHall()), (retry) => { if (!retry) this.bark('cryptHall'); });
    q.complete('cryptHall'); this.bark('cryptHallDone');

    this.start(STEPS.brazier); this.bark('brazier');
    const brazier = w.getInteractable('brazier'); if (brazier) brazier.enabled = true;
    const r = await first(tagged(q.waitInteract('brazier'), 'rest'), tagged(q.waitTrigger('cryptBoss'), 'skip'));
    if (r.tag === 'rest') { w.rest('short'); w.playAnim(w.playerId, 'Sit_Floor_Down', false, 0.1); this.bark('brazierRested'); }
    q.complete('brazier');
  }
  private ffCrypt() { const w = this.world; this.removeActors(this.hallIds); this.hallIds = []; const b = w.getInteractable('brazier'); if (b) b.enabled = true; this.teleportPlayer(CRYPT.brazier, Math.PI); this.checkpoint(CRYPT.brazier, Math.PI); }

  // =========================================================================================
  // 10. The Hollow Knight, Warden of the Drowned
  // =========================================================================================
  private spawnBoss(): Actor {
    const w = this.world; this.removeActors([CAST.boss.id]);
    const b = w.spawnEnemy('boss', at(LANDMARKS.cryptBoss), { id: CAST.boss.id, name: CAST.boss.name, dormant: true, yaw: 0, level: 5 });
    if (b.ai) b.ai.boss = { phase: 1, name: CAST.boss.name, subtitle: CAST.boss.subtitle };
    return b;
  }
  /** The AI emits `bossStart` when the Warden first takes a target; if it hasn't within 4 s, we do. */
  private ensureBossBanner() {
    const q = this.quest;
    first(tagged(q.waitEvent('bossStart', (e) => e.actorId === CAST.boss.id), 'seen'), tagged(q.wait(4), 'timeout'))
      .then((r) => { if (r.tag === 'timeout') bus.emit('bossStart', { actorId: CAST.boss.id, name: CAST.boss.name, subtitle: CAST.boss.subtitle }); }, () => {});
  }
  private async beatBoss() {
    const q = this.quest, w = this.world, p = w.player;
    this.spawnBoss();
    await q.waitTrigger('cryptBoss');
    this.checkpoint(CRYPT.bossCheckpoint, Math.PI);
    // cinematic: the Warden rises
    w.setCinematic(true); bus.emit('cinematic', { on: true, shot: 'wide' });
    const B = LANDMARKS.cryptBoss;
    this.ctx.cam.playShot({ pos: { x: B.x + 4.5, y: 1.1, z: B.z + 9 }, look: { x: B.x, y: 1.6, z: B.z }, fov: 40, duration: 0 });
    await q.wait(0.2);
    this.ctx.cam.playShot({ pos: { x: B.x + 2.2, y: 1.7, z: B.z + 5.5 }, look: { x: B.x, y: 1.8, z: B.z }, fov: 34, duration: 5 });
    w.lookAt(p.id, CAST.boss.id);
    await q.wait(1.2);
    await this.dialogue(DIALOGUES.bossIntro);
    this.ctx.cam.endShot(); this.ctx.cam.snapBehind(p);
    w.setCinematic(false); bus.emit('cinematic', { on: false });
    this.start(STEPS.boss);
    this.bossEndSeen = false;
    await this.runEncounter('boss', () => {
      const b = w.actors.get(CAST.boss.id);
      const ids = b && !b.dead ? [b.id] : [this.spawnBoss().id];
      this.bossWatch = true;
      return ids;
    }, (retry) => {
      this.ensureBossBanner();
      if (!retry) this.bark(w.flags.has('bossHesitated') ? 'bossHesitate' : 'bossFail');
    });
    this.bossWatch = false;
    if (!this.bossEndSeen) bus.emit('bossEnd', { actorId: CAST.boss.id });
    w.flags.add('bossDead');
    q.complete('boss');
    await q.wait(1.5);
    this.bark('bossDown');
    // the Warden is worth a level by himself; let the player take it before the last conversation
    if ((p.pendingLevelUps ?? 0) > 0) { this.bark('levelUpAgain'); await this.waitLevelUpChoice(); }
  }
  private ffBoss() { const w = this.world; this.removeActors([CAST.boss.id]); w.flags.add('bossDead'); this.teleportPlayer(at(LANDMARKS.cryptBoss, 0, 0, 6), Math.PI); }

  // =========================================================================================
  // 11. No bells
  // =========================================================================================
  private async beatEnding() {
    const q = this.quest, w = this.world, p = w.player;
    this.start(STEPS.ending);
    w.setCompanionFollow(false);
    const il = w.actors.get(CAST.ilyra.id);
    if (il && dist2(il.pos, p.pos) > 4) w.teleport(il, at(p.pos, 0, 1.6, 1.2));
    await q.wait(1.2);
    await this.dialogue(DIALOGUES.ending);
    q.complete('ending');
    await this.ctx.fade(true, 2.5);
    this.stats.time = Math.round(this.quest.time);
    const stats = { ...(w.stats ?? {}), ...this.stats, level: p.level, xp: p.xp, gold: w.gold };
    w.flags.add('prologueComplete');
    // the UI shows the ending screen on this event
    bus.emit('prologueComplete', { stats });
  }
}

export function startPrologue(ctx: PrologueContext): Prologue {
  return new PrologueScript(ctx);
}
