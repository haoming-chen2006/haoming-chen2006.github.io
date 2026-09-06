// Gameplay event -> sound recipes. Subscribes to the typed bus; every recipe layers a recorded sample
// with a synthesized sweetener, placed at the event position with random pitch/volume variation.
import { bus, type Events, type DamageType } from '../core/events.ts';
import type { Vec3 } from '../core/math.ts';
import type { Actor } from '../sim/types.ts';
import { AudioEngine, rand, pick, type VoiceOpts } from './engine.ts';
import { Synth } from './synth.ts';
import { MusicSystem } from './music.ts';

type Info = { model: string; kind: string; skeleton: boolean; player: boolean; boss: boolean; hp: number; maxHp: number; weapon: string | null; offhand: string | null };

/** Best-effort actor lookup through the game orchestrator (game.ts exposes itself as window.__hm). */
function actorInfo(id: string): Info {
  let a: Actor | undefined;
  try { a = (globalThis as any).__hm?.world?.actors?.get?.(id); } catch { /* */ }
  const model = a?.model ?? (id.startsWith('sk') || id.includes('skel') ? 'Skeleton_Minion' : id === 'player' ? 'Knight' : '');
  return {
    model, kind: a?.kind ?? (id === 'player' ? 'player' : 'enemy'),
    skeleton: /skeleton|bone|hollow|undead/i.test(model) || a?.faction === 'undead' || /^sk\d|skel|boss|knight_hollow/i.test(id) && !a,
    player: id === 'player' || a?.kind === 'player',
    boss: !!a?.ai?.boss || /boss/i.test(id),
    hp: a?.hp ?? 1, maxHp: a?.maxHp ?? 1, weapon: a?.weapon ?? null, offhand: a?.offhand ?? null,
  };
}
function actorPos(id: string): Vec3 | null {
  try { const a: Actor | undefined = (globalThis as any).__hm?.world?.actors?.get?.(id); return a ? { x: a.pos.x, y: a.pos.y, z: a.pos.z } : null; } catch { return null; }
}
const normId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export class SfxRouter {
  private offs: (() => void)[] = [];
  private pendingCheck: number | null = null;
  private lastUiDice = -1e9;
  onMood: ((m: 'combat' | 'boss' | 'explore' | 'victory' | 'death' | 'ending' | 'tension' | 'camp' | 'menu') => void) | null = null;
  onArea: ((area: 'shore' | 'crypt') => void) | null = null;

  constructor(private e: AudioEngine, private s: Synth, private music: MusicSystem) {}

  private pl(id: string, o: VoiceOpts & { pitchVar?: number; volVar?: number; rate?: number } = {}) { return this.e.play(id, { bus: 'sfx', ...o }); }
  private up(p: Vec3, y = 1.0): Vec3 { return { x: p.x, y: p.y + y, z: p.z }; }

  subscribe() {
    const on = <K extends keyof Events>(k: K, fn: (p: Events[K]) => void) => this.offs.push(bus.on(k, fn));
    on('footstep', (p) => this.footstep(p));
    on('swing', (p) => this.swing(p));
    on('damage', (p) => this.damage(p));
    on('miss', (p) => this.miss(p));
    on('parry', (p) => this.parry(p));
    on('dodge', (p) => this.dodge(p));
    on('death', (p) => this.death(p));
    on('stagger', (p) => this.stagger(p));
    on('telegraph', (p) => this.telegraph(p));
    on('chargeStart', (p) => { const a = actorInfo(p.actorId); if (a.player) this.s.riser({ dur: 0.45, volume: 0.6 }); });
    on('castStart', (p) => this.cast('cast', p.spellId, this.up(p.pos), p.actorId));
    on('castRelease', (p) => this.cast('release', p.spellId, this.up(p.from), p.actorId, p.to));
    on('spellImpact', (p) => this.cast('impact', p.spellId, this.up(p.pos, 0.6)));
    on('projectile', (p) => this.projectile(p));
    on('heal', (p) => { this.pl('magic_5', { pos: this.up(p.pos), volume: 0.6 }); this.s.heal({ pos: this.up(p.pos), volume: 0.8 }); });
    on('condition', (p) => this.condition(p));
    on('staminaEmpty', (p) => { if (actorInfo(p.actorId).player && this.e.allow('stamina', 2.5)) { this.pl('breath_exhausted', { bus: 'voice', volume: 0.5 }); this.s.breath({ volume: 0.7 }); } });
    on('levelUp', (p) => { if (!actorInfo(p.actorId).player) return; this.levelUp(); });
    on('xp', (p) => { if (this.e.allow('xp', 0.25)) { this.pl('ui_tick', { bus: 'ui', volume: 0.5 }); this.s.tick({ freq: 1800 + Math.min(1200, p.amount * 8), volume: 0.5 }); } });
    on('check', (p) => this.check(p));
    on('questStep', (p) => { if (p.state === 'complete') { this.pl('ui_confirm_2', { bus: 'ui', volume: 0.7 }); this.s.chime([783.99, 1174.66], { volume: 0.4, spacing: 0.14, decay: 1.4 }); } else { this.pl('book_flip', { bus: 'ui', volume: 0.5 }); } });
    on('questLog', () => this.pl('book_flip', { bus: 'ui', volume: 0.35, rate: 0.5 }));
    on('interact', (p) => this.interact(p));
    on('loot', (p) => this.loot(p));
    on('gold', (p) => { this.pl('coins', { bus: 'ui', volume: 0.8 }); if (p.amount >= 10) this.pl('coins_handle', { bus: 'ui', volume: 0.6, delay: 0.12 }); });
    on('itemUsed', (p) => this.itemUsed(p));
    on('equip', (p) => this.equip(p));
    on('rest', (p) => this.rest(p));
    on('dialogueStart', () => { this.music.setDialogue(true); this.e.duckBus('amb', -4, 0.8); this.s.swell({ volume: 0.9 }); });
    on('dialogueLine', () => { if (this.e.allow('dialogueLine', 0.3)) this.pl('book_flip', { bus: 'ui', volume: 0.18, pitchVar: 0.12 }); });
    on('dialogueEnd', () => { this.music.setDialogue(false); this.e.unduckBus('amb', 1.5); this.s.swell({ volume: 0.7, down: true }); });
    on('bossStart', (p) => { this.music.playStinger('sting_bighit_1', { duck: -8, volume: 1 }); this.pl('roar', { pos: this.up(actorPos(p.actorId) ?? this.e.listenerPos, 1.2), volume: 0.9, delay: 0.25 }); this.s.thunder({ volume: 0.5, delay: 0.05 }); this.onMood?.('boss'); });
    on('bossEnd', () => { this.pl('creature_die', { volume: 0.8 }); this.onMood?.('victory'); });
    on('encounterStart', () => { this.s.riser({ dur: 0.9, dark: true, volume: 0.7 }); this.pl('skeleton_rise', { volume: 0.5, delay: 0.1 }); this.onMood?.('combat'); });
    on('encounterEnd', () => { this.music.playStinger('sting_victory_short', { duck: -4, volume: 0.8 }); window.setTimeout(() => this.onMood?.('explore'), 400); });
    // area switching from areaEnter keys off the trigger id only (ids: shore, camp, boulder, chapel, gate, cryptEntrance, cryptBoss)
    on('areaEnter', (p) => { if (this.e.allow('area:' + p.id, 5)) { this.s.chime([587.33, 880, 1318.5], { volume: 0.45, spacing: 0.16, decay: 2.2, send: 0.5 }); this.pl('ui_glass_3', { bus: 'ui', volume: 0.45 }); } if (/^crypt/i.test(p.id)) this.onArea?.('crypt'); else if (/^(shore|camp|boulder|chapel|gate|wreck|lake)/i.test(p.id)) this.onArea?.('shore'); });
    on('teleport', (p) => { this.pl('creak', { volume: 0.7 }); this.pl('air_whoosh', { volume: 0.8, delay: 0.15 }); this.s.whoosh({ heavy: true, dur: 0.7, volume: 0.6, delay: 0.2 }); if (/crypt/i.test(p.area)) this.onArea?.('crypt'); else this.onArea?.('shore'); });
    on('respawn', () => { this.pl('air_whoosh_short', { volume: 0.7 }); this.pl('magic_5', { volume: 0.5, delay: 0.2 }); this.s.heal({ volume: 0.6, delay: 0.2 }); });
    on('lockOn', (p) => { if (p.targetId) { this.pl('ui_tick', { bus: 'ui', volume: 0.7 }); this.s.tick({ freq: 1500, dur: 0.03, volume: 0.6 }); } else this.s.tick({ freq: 900, dur: 0.03, volume: 0.4 }); });
    on('damageMod', (p) => { if (p.mod === 'vulnerable') this.pl('ui_glass_2', { pos: this.up(p.pos), volume: 0.5 }); else if (p.mod === 'immune') this.pl('ui_error_1', { pos: this.up(p.pos), volume: 0.5 }); else this.pl('hit_plate', { pos: this.up(p.pos), volume: 0.35 }); });
    on('gameOver', (p) => { if (p.victory) this.onMood?.('victory'); else { this.pl('grunt_death', { bus: 'voice', volume: 0.8 }); this.onMood?.('death'); } });
    on('prologueComplete', () => this.onMood?.('ending'));
    on('ui', (p) => { const paused = p.screen != null && !['menu', 'classSelect', 'ending', 'death', 'levelUp'].includes(p.screen); this.e.setPaused(paused); if (p.screen === 'menu') this.onMood?.('menu'); });
    on('hitStop', (p) => { if (p.seconds > 0.1 && this.e.allow('hitstop', 0.4)) this.s.thud({ bus: 'sfx', volume: 0.45 }); });
    on('cinematic', (p) => { this.e.duckBus('amb', p.on ? -2 : 0, 1); });
  }
  dispose() { this.offs.forEach((f) => f()); this.offs = []; }

  // ------------------------------------------------------------- movement
  footstep(p: Events['footstep']) {
    const a = actorInfo(p.actorId);
    if (!this.e.allow('step:' + p.actorId, 0.11)) return;
    const d = this.e.distanceTo(p.pos); if (d > 32) return;
    const vol = (a.player ? 0.6 : 0.45) * (p.running ? 1.15 : 0.85);
    const pos = this.up(p.pos, 0.1);
    if (a.skeleton) { this.pl('bone', { pos, volume: vol * 0.7, pitchVar: 0.12, priority: 0 }); this.pl('step_stone', { pos, volume: vol * 0.5, pitchVar: 0.08, priority: 0 }); if (Math.random() < 0.35) this.s.boneRattle({ pos, n: 3, volume: 0.4 }); return; }
    const fam = p.surface === 'grass' ? 'step_grass' : p.surface === 'stone' ? 'step_stone' : p.surface === 'wood' ? 'step_wood' : p.surface === 'water' ? 'step_water' : 'step_dirt';
    this.pl(fam, { pos, volume: vol, pitchVar: 0.09, volVar: 0.2, priority: a.player ? 1 : 0 });
    this.s.footstep(p.surface, { pos, running: p.running, volume: vol * 0.6 });
    if (p.surface === 'water' && Math.random() < 0.3) this.pl('bubble', { pos, volume: 0.25, priority: 0 });
  }
  dodge(p: Events['dodge']) {
    const a = actorInfo(p.actorId); const pos = this.up(p.pos);
    this.pl('cloth', { pos, volume: 0.8, pitchVar: 0.1 }); this.s.whoosh({ pos, volume: 0.5, dur: 0.22 });
    if (a.player && Math.random() < 0.6) this.pl('grunt_effort', { bus: 'voice', pos, volume: 0.45, rate: 0.6 });
    if (a.skeleton) this.s.boneRattle({ pos, n: 5, volume: 0.5 });
  }

  // ------------------------------------------------------------- melee
  swing(p: Events['swing']) {
    const a = actorInfo(p.actorId); const pos = this.up(p.pos, 1.2);
    const heavy = p.kind === 'heavy' || p.kind === 'charged';
    if (p.kind === 'spell') { this.pl('spell_cast', { pos, volume: 0.5 }); return; }
    if (heavy) { this.pl('sword_swing', { pos, volume: 0.75, pitchVar: 0.08 }); this.s.whoosh({ pos, heavy: true, volume: 0.9, dur: p.kind === 'charged' ? 0.45 : 0.34 }); }
    else { this.pl(Math.random() < 0.5 ? 'whoosh_light' : 'blade_swish', { pos, volume: 0.8, pitchVar: 0.1 }); this.s.whoosh({ pos, volume: 0.6 }); }
    if (a.player && heavy && Math.random() < 0.7) this.pl('grunt_effort', { bus: 'voice', pos, volume: 0.5, rate: 0.5 });
    if (a.skeleton && Math.random() < 0.5) this.s.boneRattle({ pos, n: 3, volume: 0.35 });
  }
  damage(p: Events['damage']) {
    const tgt = actorInfo(p.targetId); const pos = this.up(p.pos);
    if (!this.e.allow('dmg:' + p.targetId, 0.04)) return;
    const big = p.crit || p.amount >= 8;
    if (p.blocked) {
      const shield = tgt.offhand && /shield/i.test(tgt.offhand);
      this.pl(shield ? 'shield_wood' : 'hit_plate', { pos, volume: 0.9 }); this.pl('metal_click', { pos, volume: 0.5, delay: 0.02 });
      this.s.impact({ pos, kind: shield ? 'wood' : 'metal', power: 0.8, volume: 0.7 });
      return;
    }
    this.elementalHit(p.type, pos, big ? 1.2 : 0.9);
    if (tgt.skeleton) {
      this.pl('bone', { pos, volume: 0.9, pitchVar: 0.12 }); this.pl('skeleton_hit', { pos, volume: 0.55, offset: rand(0, 0.6), duration: 0.7 });
      this.s.boneRattle({ pos, n: big ? 9 : 5, volume: 0.8 }); this.s.impact({ pos, kind: 'bone', power: big ? 1.1 : 0.7, volume: 0.6 });
    } else {
      this.pl(big ? 'hit_flesh' : 'hit_flesh_light', { pos, volume: 0.85 });
      this.s.impact({ pos, kind: 'body', power: big ? 1.1 : 0.7, volume: 0.6 });
      if (tgt.player) this.pl('grunt_hurt', { bus: 'voice', pos, volume: 0.6, rate: 0.35 });
      else if (tgt.boss) this.pl('creature_hurt', { pos, volume: 0.6, rate: 0.5 });
    }
    if (p.crit) { this.pl('hit_metal', { pos, volume: 0.9, pitch: 0.85, delay: 0.01 }); this.s.impact({ pos, kind: 'metal', power: 1.3, volume: 0.6 }); this.s.thud({ bus: 'sfx', volume: 0.7 }); }
    if (tgt.player && !p.blocked) this.e.duckBus('music', -2.5, 0.05, 0.25, 0.8);
  }
  private elementalHit(type: DamageType, pos: Vec3, power: number) {
    switch (type) {
      case 'slashing': case 'piercing': this.pl('hit_slash', { pos, volume: 0.8 * power }); break;
      case 'bludgeoning': this.pl('hit_generic', { pos, volume: 0.6 * power }); break;
      case 'fire': this.pl('spell_fire', { pos, volume: 0.6 * power, offset: 0.05 }); this.s.fire({ pos, phase: 'impact', size: power, volume: 0.6 }); break;
      case 'cold': this.s.frost({ pos, phase: 'impact', volume: 0.6 }); break;
      case 'radiant': this.pl('ui_glass', { pos, volume: 0.5 }); this.s.radiant({ pos, phase: 'impact', volume: 0.7 }); break;
      case 'necrotic': this.pl('ghost_breath', { pos, volume: 0.5, duration: 1.2 }); this.s.necrotic({ pos, phase: 'impact', volume: 0.7 }); break;
      case 'force': this.pl('magic_4', { pos, volume: 0.45 }); this.s.force({ pos, phase: 'impact', volume: 0.7 }); break;
      case 'lightning': this.pl('thunder_near', { pos, volume: 0.6, duration: 1.0 }); this.s.thunder({ pos, volume: 0.6 }); break;
      case 'poison': this.pl('bubble', { pos, volume: 0.6 }); break;
    }
  }
  miss(p: Events['miss']) {
    const pos = this.up(p.pos);
    switch (p.reason) {
      case 'dodge': this.pl('cloth', { pos, volume: 0.6 }); this.s.whoosh({ pos, volume: 0.5 }); break;
      case 'block': this.pl('shield_wood', { pos, volume: 0.8 }); this.s.impact({ pos, kind: 'wood', power: 0.7, volume: 0.6 }); break;
      case 'parry': this.parry({ defenderId: p.targetId, attackerId: p.attackerId, pos: p.pos }); break;
      default: this.pl('whoosh_light', { pos, volume: 0.4, pitch: 0.9 }); break;
    }
  }
  parry(p: Events['parry']) {
    const pos = this.up(p.pos, 1.2);
    if (!this.e.allow('parry', 0.15)) return;
    this.pl('parry', { pos, volume: 1, pitchVar: 0.05 }); this.pl('metal_ring', { pos, volume: 0.6, delay: 0.03 });
    this.s.impact({ pos, kind: 'metal', power: 1.4, volume: 0.9 });
    this.s.chime([2637], { bus: 'sfx', volume: 0.25, decay: 0.8, send: 0.3 });
    this.e.duckBus('music', -3, 0.03, 0.3, 0.6);
  }
  stagger(p: Events['stagger']) {
    const a = actorInfo(p.actorId); const pos = this.up(p.pos);
    if (a.skeleton) { this.s.boneRattle({ pos, n: 7, spread: 0.07, volume: 0.7 }); this.pl('bone', { pos, volume: 0.6 }); }
    else if (a.player) this.pl('grunt_hurt', { bus: 'voice', pos, volume: 0.6, rate: 0.3 });
    else this.pl('creature_hurt', { pos, volume: 0.5, rate: 0.3 });
  }
  telegraph(p: Events['telegraph']) {
    const a = actorInfo(p.actorId); const pos = this.up(p.pos, 1.2);
    if (this.e.distanceTo(pos) > 26) return;
    if (p.kind === 'spell') { this.pl('magic_2', { pos, volume: 0.5 }); this.s.necrotic({ pos, phase: 'cast', volume: 0.5 }); return; }
    if (p.kind === 'heavy' || p.kind === 'special') { if (a.boss) this.pl('growl', { pos, volume: 0.8 }); this.s.riser({ pos, dur: Math.min(1.2, Math.max(0.3, p.duration)), dark: true, volume: 0.7 }); if (a.skeleton) this.s.boneRattle({ pos, n: 6, spread: 0.08, volume: 0.6 }); }
    else { if (a.skeleton) { this.s.boneRattle({ pos, n: 3, volume: 0.45 }); this.pl('creak', { pos, volume: 0.25, pitch: 0.8, priority: 0 }); } else this.pl('cloth', { pos, volume: 0.3, priority: 0 }); }
  }
  death(p: Events['death']) {
    const a = actorInfo(p.actorId); const pos = this.up(p.pos, 0.4);
    if (a.player) {
      this.pl('grunt_death', { bus: 'voice', volume: 0.9 }); this.pl('body_fall', { pos, volume: 0.9, delay: 0.5 }); this.s.impact({ pos, kind: 'body', power: 1.2, volume: 0.6, delay: 0.5 });
      return;
    }
    if (a.boss) { this.pl('roar', { pos, volume: 1, pitch: 0.85 }); this.pl('creature_die', { pos, volume: 0.9, delay: 0.3 }); this.pl('bone_pile', { pos, volume: 0.9, delay: 0.9 }); this.s.rumble({ pos, dur: 1.6, volume: 0.6, delay: 0.6 }); this.s.impact({ pos, kind: 'stone', power: 1.5, volume: 0.8, delay: 0.9 }); return; }
    if (a.skeleton) {
      this.pl('bone_pile', { pos, volume: 0.9 }); this.pl('skeleton_hit', { pos, volume: 0.5, offset: 0.9, duration: 0.8 });
      this.s.boneRattle({ pos, n: 14, spread: 0.09, volume: 0.9 }); this.pl('bone', { pos, volume: 0.6, delay: 0.25 }); this.pl('bone', { pos, volume: 0.5, delay: 0.45, pitch: 0.9 });
      this.s.impact({ pos, kind: 'bone', power: 0.8, volume: 0.5, delay: 0.3 });
      return;
    }
    this.pl('grunt_death', { bus: 'voice', pos, volume: 0.6 }); this.pl('body_fall', { pos, volume: 0.8, delay: 0.4 });
  }

  // ------------------------------------------------------------- spells
  cast(phase: 'cast' | 'release' | 'impact', spellId: string, pos: Vec3, actorId?: string, to?: Vec3) {
    const id = normId(spellId); const a = actorId ? actorInfo(actorId) : null;
    const v = 0.8;
    const generic = () => { if (phase === 'cast') { this.pl('spell_cast', { pos, volume: 0.6 }); this.s.sparkle({ pos, volume: 0.5 }); } else if (phase === 'release') this.pl('spell_generic', { pos, volume: 0.7 }); else { this.pl('magic_1', { pos, volume: 0.6 }); this.s.force({ pos, phase: 'impact', volume: 0.5 }); } };
    if (/firebolt|fire/.test(id)) {
      if (phase === 'cast') { this.pl('spell_fire', { pos, volume: 0.45 * v, duration: 0.5 }); this.s.fire({ pos, phase: 'cast', volume: 0.7 }); }
      else if (phase === 'release') { this.pl('spell_fire', { pos, volume: 0.8 * v }); this.s.fire({ pos, phase: 'release', volume: 0.8 }); }
      else { this.pl('spell_fire_big', { pos, volume: 0.9 * v }); this.s.fire({ pos, phase: 'impact', size: 1.2, volume: 0.9 }); }
    } else if (/frost|cold|ice/.test(id)) {
      if (phase === 'impact') { this.pl('spell_frost', { pos, volume: 0.6, offset: 0.2 }); this.s.frost({ pos, phase: 'impact', volume: 0.9 }); }
      else { this.s.frost({ pos, phase, volume: 0.8 }); if (phase === 'release') this.pl('spell_frost', { pos, volume: 0.5, duration: 0.7 }); }
    } else if (/magicmissile|missile/.test(id)) {
      if (phase === 'cast') { this.pl('magic_1', { pos, volume: 0.5 }); this.s.force({ pos, phase: 'cast', volume: 0.6 }); }
      else if (phase === 'release') { this.s.force({ pos, phase: 'release', n: 3, volume: 0.7 }); this.pl('magic_6', { pos, volume: 0.5 }); this.pl('magic_6', { pos, volume: 0.45, delay: 0.11, pitch: 1.05 }); this.pl('magic_6', { pos, volume: 0.4, delay: 0.22, pitch: 1.1 }); }
      else { this.pl('magic_4', { pos, volume: 0.5 }); this.s.force({ pos, phase: 'impact', volume: 0.7 }); }
    } else if (/thunder/.test(id)) {
      if (phase === 'cast') this.s.thunder({ pos, phase: 'cast', volume: 0.8 });
      else if (phase === 'release') { this.pl('thunder_near', { pos, volume: 0.9 }); this.s.thunder({ pos, phase: 'release', volume: 1 }); this.pl('stone_heavy', { pos, volume: 0.6, delay: 0.05 }); this.e.duckBus('music', -4, 0.02, 0.4, 0.8); }
      else { this.pl('stone_heavy', { pos, volume: 0.5 }); this.s.impact({ pos, kind: 'stone', power: 1, volume: 0.6 }); }
    } else if (/sacredflame|radiant|sacred/.test(id)) {
      if (phase === 'cast') this.s.radiant({ pos, phase: 'cast', volume: 0.8 });
      else if (phase === 'release') { this.pl('magic_3', { pos, volume: 0.5 }); this.s.radiant({ pos, phase: 'release', volume: 0.8 }); }
      else { this.pl('ui_glass_3', { pos, volume: 0.6 }); this.s.radiant({ pos, phase: 'impact', volume: 1 }); }
    } else if (/healingword|secondwind|heal|cure/.test(id)) {
      if (phase === 'cast') { this.pl('magic_5', { pos, volume: 0.5 }); this.s.sparkle({ pos, volume: 0.5 }); }
      else { this.s.heal({ pos, volume: 0.9 }); this.pl('ui_glass_1', { pos, volume: 0.4, delay: 0.1 }); }
      if (/secondwind/.test(id) && phase !== 'impact') this.s.breath({ volume: 0.5, delay: 0.1 });
    } else if (/rage|reckless/.test(id)) {
      if (phase === 'cast') { this.pl('growl', { bus: 'voice', pos, volume: 0.9, pitch: 1.1 }); this.s.sparkle({ pos, dark: true, volume: 0.7 }); this.s.riser({ pos, dur: 0.5, dark: true, volume: 0.6 }); }
      else if (phase === 'release') { this.pl('roar', { bus: 'voice', pos, volume: 0.8, pitch: 1.15 }); this.s.impact({ pos, kind: 'body', power: 1.2, volume: 0.6 }); this.e.duckBus('music', -3, 0.03, 0.4, 0.8); }
    } else if (/smoke|bomb/.test(id)) {
      if (phase === 'cast') this.pl('cloth_belt', { pos, volume: 0.5 });
      else if (phase === 'release') { this.pl('air_whoosh_short', { pos, volume: 0.8 }); this.s.whoosh({ pos, dur: 0.3, volume: 0.5 }); }
      else { this.pl('bubble_3', { pos, volume: 0.6, pitch: 0.7 }); this.s.windGust({ pos, dur: 1.8, volume: 0.8 }); }
    } else if (/huntersmark|mark/.test(id)) {
      if (phase === 'cast') { this.pl('ui_pluck', { pos, volume: 0.6 }); this.s.sparkle({ pos, volume: 0.4 }); } else { this.pl('ui_glass_2', { pos, volume: 0.5 }); this.s.chime([1174.66, 1568], { bus: 'sfx', volume: 0.3, spacing: 0.08, decay: 1.2 }); }
    } else if (/shieldbash/.test(id)) {
      if (phase === 'cast') this.pl('cloth_belt', { pos, volume: 0.4 }); else if (phase === 'release') { this.pl('sword_swing', { pos, volume: 0.7, pitch: 0.85 }); this.s.whoosh({ pos, heavy: true, volume: 0.9 }); } else { this.pl('shield_wood', { pos, volume: 1 }); this.s.impact({ pos, kind: 'wood', power: 1.3, volume: 0.9 }); }
    } else if (/shield|ward|barrier/.test(id)) {
      this.pl('magic_3', { pos, volume: 0.5 }); this.s.radiant({ pos, phase: 'cast', volume: 0.5 }); this.s.chime([880], { bus: 'sfx', volume: 0.3, decay: 1 });
    } else if (/cunning|dash/.test(id)) { this.pl('cloth', { pos, volume: 0.7 }); this.s.whoosh({ pos, volume: 0.6, dur: 0.3 }); }
    else if (/throwdagger|dagger/.test(id)) { if (phase === 'release') { this.pl('whoosh_light', { pos, volume: 0.8, pitch: 1.2 }); this.s.whoosh({ pos, volume: 0.6, dur: 0.15 }); } else if (phase === 'impact') this.pl('hit_slash', { pos, volume: 0.8 }); else this.pl('sword_draw_2', { pos, volume: 0.5 }); }
    else if (/whirlwind/.test(id)) { if (phase !== 'impact') { this.pl('sword_swing', { pos, volume: 0.8 }); this.s.whoosh({ pos, heavy: true, dur: 0.5, volume: 1 }); this.pl('sword_swing', { pos, volume: 0.7, delay: 0.25, pitch: 1.08 }); this.s.whoosh({ pos, heavy: true, dur: 0.5, volume: 0.9, delay: 0.25 }); } else this.pl('hit_slash', { pos, volume: 0.7 }); }
    else if (/actionsurge|surge/.test(id)) { this.s.riser({ pos, dur: 0.5, volume: 0.7 }); this.pl('sword_draw', { pos, volume: 0.7, delay: 0.2 }); this.s.sparkle({ pos, volume: 0.5, delay: 0.3 }); }
    else if (/necrotic|grave|drain/.test(id)) {
      if (phase === 'cast') { this.pl('ghost_breath', { pos, volume: 0.5 }); this.s.necrotic({ pos, phase: 'cast', volume: 0.8 }); }
      else if (phase === 'release') { this.pl('ghost_moan_2', { pos, volume: 0.5 }); this.s.necrotic({ pos, phase: 'release', volume: 0.8 }); }
      else { this.pl('magic_2', { pos, volume: 0.5 }); this.s.necrotic({ pos, phase: 'impact', volume: 0.9 }); }
    } else if (/summon|raise/.test(id)) {
      if (phase === 'cast') { this.pl('growl', { pos, volume: 0.7, pitch: 0.8 }); this.s.necrotic({ pos, phase: 'cast', volume: 0.8 }); }
      else { this.pl('skeleton_rise', { pos, volume: 0.9 }); this.s.boneRattle({ pos, n: 16, spread: 0.12, volume: 0.9 }); this.pl('bone_pile', { pos, volume: 0.6, delay: 0.4, pitch: 0.9 }); this.s.rumble({ pos, dur: 1.2, volume: 0.5 }); }
    } else generic();
    if (a?.player && phase === 'cast' && /firebolt|frost|missile|thunder|sacred|necrotic/.test(id)) this.s.tick({ freq: 3200, volume: 0.25 });
    if (to && phase === 'release') { /* projectile travel is handled by the projectile event */ }
  }
  projectile(p: Events['projectile']) {
    const id = normId(p.kind); const dist = Math.hypot(p.to.x - p.from.x, p.to.z - p.from.z); const dur = Math.min(2.5, dist / Math.max(1, p.speed));
    if (dur < 0.15 || this.e.distanceTo(p.from) > 40) return;
    let fam = 'air_whoosh_short';
    if (/fire/.test(id)) fam = 'spell_fire_big'; else if (/frost|ice/.test(id)) fam = 'spell_frost'; else if (/necrotic/.test(id)) fam = 'ghost_breath'; else if (/dagger|arrow|bolt/.test(id)) fam = 'whoosh_light';
    const v = this.pl(fam, { pos: this.up(p.from), volume: 0.35, duration: dur, refDistance: 3, priority: 0, loop: /fire|frost|necrotic/.test(id) });
    if (v?.panner?.positionX) { const t = this.e.now; v.panner.positionX.linearRampToValueAtTime(p.to.x, t + dur); v.panner.positionY.linearRampToValueAtTime(p.to.y + 1, t + dur); v.panner.positionZ.linearRampToValueAtTime(p.to.z, t + dur); }
  }
  condition(p: Events['condition']) {
    const a = actorInfo(p.actorId); const c = normId(p.condition);
    if (!a.player) { const ap = actorPos(p.actorId); if (ap && this.e.distanceTo(ap) > 30) return; }
    if (!this.e.allow('cond:' + p.actorId + c + p.on, 0.3)) return;
    if (p.on) {
      if (/rage/.test(c)) return; // covered by the cast
      if (/hidden|invis|stealth/.test(c)) { this.pl('cloth', { volume: 0.5 }); this.s.whoosh({ volume: 0.3, dur: 0.4 }); }
      else if (/guidance|bless|inspir/.test(c)) { this.pl('ui_glass_1', { bus: 'ui', volume: 0.5 }); this.s.sparkle({ volume: 0.5 }); }
      else if (/fright|fear|curse|necro/.test(c)) { this.pl('ghost_breath', { volume: 0.4 }); this.s.necrotic({ phase: 'cast', volume: 0.5 }); }
      else if (/poison/.test(c)) this.pl('bubble', { volume: 0.5 });
      else if (/stagger|prone|stun/.test(c)) return;
      else { this.pl('ui_toggle_1', { bus: 'ui', volume: 0.4 }); this.s.sparkle({ volume: 0.3 }); }
    } else if (a.player && /rage|guidance|bless|hidden|invis|shield|mark/.test(c)) this.pl('ui_back', { bus: 'ui', volume: 0.35 });
  }

  // ------------------------------------------------------------- rolls / items / world
  check(p: Events['check']) {
    const r = p.roll; const t = this.e.now;
    if (t - this.lastUiDice > 0.6) this.rollDice();
    if (this.pendingCheck != null) clearTimeout(this.pendingCheck);
    this.pendingCheck = window.setTimeout(() => { this.pendingCheck = null; this.rollResult(r.success ?? true, r.crit ?? null); }, 950);
  }
  levelUp() {
    if (!this.e.allow('levelup', 3)) return;
    this.music.playStinger('sting_levelup', { duck: -5, volume: 0.9 });
    this.s.chime([587.33, 880, 1174.66, 1760], { volume: 0.5, spacing: 0.1, decay: 1.6, send: 0.5 });
  }
  rollDice() { this.lastUiDice = this.e.now; this.pl('dice', { bus: 'ui', volume: 0.9, pitchVar: 0.05 }); this.s.boneRattle({ bus: 'ui', n: 4, spread: 0.06, volume: 0.25 }); }
  rollResult(success: boolean, crit: 'hit' | 'miss' | null) {
    if (this.pendingCheck != null) { clearTimeout(this.pendingCheck); this.pendingCheck = null; }
    if (crit === 'hit') { this.pl('ui_bong', { bus: 'ui', volume: 0.8 }); this.s.chime([880, 1108.7, 1318.5, 1760, 2637], { volume: 0.6, spacing: 0.07, decay: 2.5, send: 0.6 }); this.pl('ui_glass', { bus: 'ui', volume: 0.5, delay: 0.2 }); this.pl('ui_glass', { bus: 'ui', volume: 0.5, delay: 0.35, pitch: 1.2 }); return; }
    if (crit === 'miss') { this.pl('ui_error_2', { bus: 'ui', volume: 0.7 }); this.s.thud({ volume: 1 }); this.s.thud({ volume: 0.6, delay: 0.18 }); return; }
    if (success) { this.pl('ui_confirm', { bus: 'ui', volume: 0.8 }); this.s.chime([987.77, 1318.5], { volume: 0.5, spacing: 0.1, decay: 1.4 }); }
    else { this.pl('ui_error', { bus: 'ui', volume: 0.7 }); this.s.thud({ volume: 0.8 }); }
  }
  interact(p: Events['interact']) {
    const id = normId(p.id); const pos = this.up(this.e.listenerPos, 0);
    if (/chest|cache|loot/.test(id)) this.chestOpen();
    else if (/gate|door|exit/.test(id)) this.gateOpen();
    else if (/boulder|rock/.test(id)) this.boulder();
    else if (/sword|weapon/.test(id)) { this.pl('sword_draw', { volume: 0.9 }); this.s.chime([1318.5], { bus: 'sfx', volume: 0.2, decay: 0.8 }); }
    else if (/campfire|rest|fire/.test(id)) { this.pl('fire_flare', { volume: 0.6 }); }
    else { this.pl('leather', { volume: 0.5 }); this.pl('cloth_belt', { volume: 0.4, delay: 0.1 }); }
    void pos;
  }
  chestOpen() { this.pl('creak', { volume: 0.8 }); this.pl('door_open_1', { volume: 0.7, delay: 0.05, pitch: 1.1 }); this.pl('metal_click', { volume: 0.6, delay: 0.35 }); this.s.impact({ kind: 'wood', power: 0.5, volume: 0.4, delay: 0.5 }); }
  gateOpen() { this.pl('lock_open', { volume: 0.8 }); this.pl('creak', { volume: 0.9, delay: 0.3, pitch: 0.75 }); this.pl('door_open_2', { volume: 0.9, delay: 0.45, pitch: 0.8 }); this.pl('chain', { volume: 0.5, delay: 0.7 }); this.s.rumble({ dur: 1.2, volume: 0.5, delay: 0.5 }); this.pl('metal_hit', { volume: 0.6, delay: 1.4 }); }
  boulder() { this.pl('stone_heavy', { volume: 0.9 }); this.pl('stones', { volume: 0.8, delay: 0.3 }); this.pl('stones', { volume: 0.7, delay: 0.7, pitch: 0.9 }); this.s.rumble({ dur: 2.2, volume: 1 }); this.s.impact({ kind: 'stone', power: 1.4, volume: 0.8, delay: 1.6 }); }
  lockpick() { this.pl('lock', { volume: 0.7 }); this.pl('lock', { volume: 0.6, delay: 0.25 }); this.pl('metal_click', { volume: 0.6, delay: 0.55 }); }
  loot(p: Events['loot']) {
    const id = normId(p.itemId + ' ' + p.name);
    if (/gold|coin/.test(id)) { this.pl('coins', { bus: 'ui', volume: 0.8 }); return; }
    if (/potion|vial|flask/.test(id)) this.pl('bottle', { bus: 'ui', volume: 0.7 });
    else if (/sword|blade|dagger|axe|weapon/.test(id)) this.pl('sword_draw', { bus: 'ui', volume: 0.8 });
    else if (/armor|mail|shield|helm/.test(id)) this.pl('chainmail', { bus: 'ui', volume: 0.7 });
    else if (/ring|amulet|gem|jewel|crystal/.test(id)) { this.pl('gem', { bus: 'ui', volume: 0.8 }); this.s.sparkle({ volume: 0.4 }); }
    else if (/scroll|book|tome|letter|journal/.test(id)) this.pl('book_flip', { bus: 'ui', volume: 0.7 });
    else if (/ration|bread|food|meat/.test(id)) this.pl('leather', { bus: 'ui', volume: 0.6 });
    else this.pl('item_misc', { bus: 'ui', volume: 0.7 });
    if (/key|relic|sigil|quest|heart|crown|seal/.test(id)) this.music.playStinger('sting_discovery', { duck: -3, volume: 0.6 });
    else this.s.chime([1174.66], { volume: 0.2, decay: 0.7 });
  }
  itemUsed(p: Events['itemUsed']) {
    const id = normId(p.itemId); const a = actorInfo(p.actorId); const pos = this.up(this.e.listenerPos, 0);
    if (/potion|vial|flask|elixir/.test(id)) { this.pl('bottle', { volume: 0.8 }); this.pl('bubble_2', { volume: 0.5, delay: 0.15 }); this.s.gulps({ volume: 0.9, delay: 0.25 }); if (a.player) this.s.heal({ volume: 0.4, delay: 0.9 }); }
    else if (/scroll/.test(id)) { this.pl('book_flip', { volume: 0.8 }); this.pl('spell_long', { volume: 0.5, delay: 0.3, duration: 1.5 }); this.s.sparkle({ volume: 0.6, delay: 0.4 }); }
    else if (/ration|food|bread|meat|apple/.test(id)) { this.pl('leather', { volume: 0.5 }); this.s.gulps({ volume: 0.5, delay: 0.3 }); }
    else this.pl('item_misc', { volume: 0.6 });
    void pos;
  }
  equip(p: Events['equip']) {
    const slot = normId(p.slot); const id = normId(p.itemId);
    if (/mainhand|weapon/.test(slot) || /sword|axe|dagger|staff|bow/.test(id)) { this.pl('sword_draw', { bus: 'ui', volume: 0.8 }); this.pl('cloth_belt', { bus: 'ui', volume: 0.4, delay: 0.1 }); }
    else if (/offhand|shield/.test(slot + id)) { this.pl('metal_click', { bus: 'ui', volume: 0.7 }); this.pl('shield_wood', { bus: 'ui', volume: 0.35, delay: 0.1 }); }
    else if (/armor|chest|body/.test(slot + id)) { this.pl('chainmail', { bus: 'ui', volume: 0.8 }); this.pl('cloth_belt', { bus: 'ui', volume: 0.5, delay: 0.25 }); this.pl('armor_light', { bus: 'ui', volume: 0.5, delay: 0.4 }); }
    else if (/ring|amulet|neck/.test(slot + id)) { this.pl('gem', { bus: 'ui', volume: 0.7 }); this.s.sparkle({ volume: 0.3 }); }
    else { this.pl('cloth_belt', { bus: 'ui', volume: 0.6 }); this.pl('leather', { bus: 'ui', volume: 0.5, delay: 0.1 }); }
  }
  rest(p: Events['rest']) {
    this.pl('fire_flare', { volume: 0.8 }); this.s.fire({ phase: 'release', volume: 0.5, delay: 0.1 });
    this.pl('air_whoosh', { volume: 0.6, delay: 0.6, pitch: 0.8 }); this.s.whoosh({ heavy: true, dur: 1.4, volume: 0.5, delay: 0.7 });
    if (p.kind === 'long') { this.s.swell({ volume: 0.8, delay: 1.2 }); this.onMood?.('camp'); }
    this.e.duckBus('amb', -6, 0.5, 2.5, 2);
  }

  /** UI CustomEvent sounds ('ui:sfx'). */
  ui(kind: string) {
    switch (kind) {
      case 'click': this.pl('ui_click', { bus: 'ui', volume: 0.8, rate: 0.03 }); this.s.tick({ freq: 2200, volume: 0.35 }); break;
      case 'hover': if (this.e.allow('ui:hover', 0.05)) { this.pl('ui_hover', { bus: 'ui', volume: 0.5, priority: 0 }); this.s.tick({ freq: 3200, dur: 0.012, volume: 0.15 }); } break;
      case 'open': this.pl('ui_open', { bus: 'ui', volume: 0.7 }); this.pl('book_open', { bus: 'ui', volume: 0.45, delay: 0.02 }); this.s.swell({ volume: 0.25 }); break;
      case 'close': this.pl('ui_close', { bus: 'ui', volume: 0.7 }); this.pl('book_close', { bus: 'ui', volume: 0.45 }); break;
      case 'dice': this.rollDice(); break;
      case 'success': this.rollResult(true, null); break;
      case 'fail': this.rollResult(false, null); break;
      case 'nat20': this.rollResult(true, 'hit'); break;
      case 'nat1': this.rollResult(false, 'miss'); break;
      case 'levelup': this.levelUp(); break;
      case 'loot': this.pl('leather', { bus: 'ui', volume: 0.6 }); this.pl('item_misc', { bus: 'ui', volume: 0.5, delay: 0.05 }); break;
      case 'equip': this.pl('cloth_belt', { bus: 'ui', volume: 0.6 }); this.pl('metal_click', { bus: 'ui', volume: 0.5, delay: 0.1 }); break;
      case 'error': this.pl('ui_error', { bus: 'ui', volume: 0.6 }); break;
      case 'page': this.pl('book_flip', { bus: 'ui', volume: 0.6 }); break;
      case 'select': this.pl('ui_select', { bus: 'ui', volume: 0.6 }); break;
      case 'back': this.pl('ui_back', { bus: 'ui', volume: 0.6 }); break;
      case 'confirm': this.pl('ui_confirm', { bus: 'ui', volume: 0.7 }); break;
      case 'toggle': this.pl('ui_toggle', { bus: 'ui', volume: 0.6 }); break;
      case 'scroll': this.pl('ui_scroll', { bus: 'ui', volume: 0.4, rate: 0.2 }); break;
      case 'chest': this.chestOpen(); break;
      case 'gate': this.gateOpen(); break;
      case 'boulder': this.boulder(); break;
      case 'lockpick': this.lockpick(); break;
      default: if (this.e.has(kind)) this.pl(kind, { bus: 'ui', volume: 0.7 }); else this.s.tick({ volume: 0.3 });
    }
  }
}
export { pick };
