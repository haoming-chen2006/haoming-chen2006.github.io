// Typed event bus. Sim emits, render/ui/audio subscribe. Append new events; never rename.
import type { Vec3 } from './math.ts';

export interface RollResult {
  kind: 'attack' | 'save' | 'check' | 'damage' | 'initiative';
  label: string;        // e.g. "Attack roll", "Persuasion check", "Dexterity save"
  d20: number;          // raw die (for attack/save/check)
  bonus: number;        // total modifier
  total: number;
  dc?: number;          // DC or target AC
  success?: boolean;
  crit?: 'hit' | 'miss' | null;
  advantage?: 'adv' | 'dis' | null;
  bonusDice?: { label: string; value: number }[]; // e.g. Guidance 1d4
}

export interface Events {
  // --- combat (from sim) ---
  attackRoll: { attackerId: string; targetId: string; roll: RollResult; pos: Vec3 };
  damage: { sourceId: string; targetId: string; amount: number; type: DamageType; crit: boolean; pos: Vec3; blocked: boolean; killingBlow: boolean };
  heal: { sourceId: string; targetId: string; amount: number; pos: Vec3 };
  miss: { attackerId: string; targetId: string; pos: Vec3; reason: 'miss' | 'dodge' | 'block' | 'parry' };
  parry: { defenderId: string; attackerId: string; pos: Vec3 };
  death: { actorId: string; pos: Vec3; killerId?: string };
  swing: { actorId: string; kind: 'light' | 'heavy' | 'charged' | 'spell'; pos: Vec3 };
  dodge: { actorId: string; pos: Vec3 };
  footstep: { actorId: string; pos: Vec3; surface: 'grass' | 'stone' | 'water' | 'wood' | 'dirt'; running: boolean };
  castStart: { actorId: string; spellId: string; pos: Vec3 };
  castRelease: { actorId: string; spellId: string; from: Vec3; to: Vec3; targetId?: string };
  spellImpact: { spellId: string; pos: Vec3; targetId?: string };
  projectile: { id: number; kind: string; from: Vec3; to: Vec3; speed: number };
  condition: { actorId: string; condition: string; on: boolean };
  staminaEmpty: { actorId: string };
  levelUp: { actorId: string; level: number };
  xp: { amount: number; total: number };
  // --- world / quest ---
  check: { roll: RollResult; pos: Vec3; actorId: string };
  questStep: { id: string; title: string; hint: string; state: 'start' | 'complete' };
  questLog: { text: string };
  trigger: { id: string };
  interactable: { id: string | null; label: string | null }; // what's under the prompt
  interact: { id: string; actorId: string };
  loot: { itemId: string; qty: number; name: string };
  itemUsed: { itemId: string; actorId: string };
  equip: { itemId: string; slot: string };
  gold: { amount: number; total: number };
  rest: { kind: 'short' | 'long' };
  dialogueStart: { id: string; speakerId: string };
  dialogueLine: { speakerId: string; text: string; emote?: string };
  dialogueEnd: { id: string };
  bossStart: { actorId: string; name: string; subtitle: string };
  bossEnd: { actorId: string };
  encounterStart: { id: string };
  encounterEnd: { id: string };
  cinematic: { on: boolean; shot?: string };
  areaEnter: { id: string; name: string };
  teleport: { to: Vec3; area: string };
  // --- ui / meta ---
  toast: { text: string; kind?: 'info' | 'warn' | 'gold' | 'xp' };
  ui: { screen: string | null };
  screenShake: { amount: number; pos?: Vec3 };
  hitStop: { seconds: number };
  gameOver: { victory: boolean };
  prologueComplete: { stats: Record<string, number> };
  // --- sim-rules: appended combat/feedback events ---
  telegraph: { actorId: string; kind: 'light' | 'heavy' | 'special' | 'spell'; pos: Vec3; duration: number }; // enemy wind-up started (readable cue)
  damageMod: { targetId: string; type: DamageType; mod: 'resist' | 'vulnerable' | 'immune'; pos: Vec3 };       // "Vulnerable!" / "Resisted" floaters
  lockOn: { actorId: string; targetId: string | null };
  stagger: { actorId: string; pos: Vec3; seconds: number };
  respawn: { pos: Vec3 };
  chargeStart: { actorId: string };                                                                          // heavy attack is being charged
}
export type DamageType = 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'cold' | 'radiant' | 'necrotic' | 'force' | 'lightning' | 'poison';

type Handler<K extends keyof Events> = (payload: Events[K]) => void;

class EventBus {
  private handlers: { [K in keyof Events]?: Set<Handler<K>> } = {};
  on<K extends keyof Events>(name: K, fn: Handler<K>): () => void {
    (this.handlers[name] ??= new Set<Handler<K>>() as any).add(fn as any);
    return () => this.off(name, fn);
  }
  off<K extends keyof Events>(name: K, fn: Handler<K>) { (this.handlers[name] as Set<Handler<K>> | undefined)?.delete(fn); }
  emit<K extends keyof Events>(name: K, payload: Events[K]) {
    const hs = this.handlers[name] as Set<Handler<K>> | undefined;
    if (!hs) return;
    for (const h of hs) { try { h(payload); } catch (e) { console.error(`[bus:${String(name)}]`, e); } }
  }
  clear() { this.handlers = {}; }
}
export const bus = new EventBus();
