import { dist } from '../engine/math.ts';
import { areaDamage, damage, heal } from './combat.ts';
import type { Entity, Team, Unit } from './types.ts';
import type { World } from './world.ts';

/**
 * Hero signature passives (被动) and item passives (装备被动), implemented generically from the data in
 * heroes.ts / items.ts. Every hook is deterministic (world rng only).
 */

const passive = (u: Unit) => (u.isHero ? u.def.passive : undefined);
const has = (u: Unit, id: string): boolean => u.items.includes(id);
const itemReady = (w: World, u: Unit, key: string): boolean => { const s = w.seatOf(u); return !!s && (s.itemCd[key] ?? 0) <= w.time; };
const itemUsed = (w: World, u: Unit, key: string, cd: number): void => { const s = w.seatOf(u); if (s) s.itemCd[key] = w.time + cd; };

/** Attack-speed and attack multipliers that depend on live state (called from refreshDerived / attackDamage). */
export function attackSpeedBonus(u: Unit): number {
  const p = passive(u);
  let b = 0;
  if (p?.kind === 'frenzyStacks') b += u.passiveStacks * (p.value ?? 0.06);
  if (has(u, 'yingren') && u.passiveT > 0) b += 0.1;
  return b;
}
export function attackMult(u: Unit): number {
  const p = passive(u);
  if (p?.kind === 'rageAttack') return 1 + (1 - u.hp / Math.max(1, u.maxHp)) * (p.value ?? 0.6);
  return 1;
}

/** Can skill `i` be cast right now as far as passives are concerned (侠客行 / 狂意 gate the 大招). */
export function skillGateOpen(u: Unit, i: number): boolean {
  const p = passive(u);
  if (p?.kind === 'ultGate' && i === 2) return u.passiveStacks > 0;
  return true;
}

/** Called when a basic attack is fired. Returns the crit multiplier override (1 = none), extra shots for burst passives. */
export function onAttackFire(w: World, u: Unit): { critMult: number; burst: number; stun: number; bonus: number } {
  const p = passive(u);
  const out = { critMult: 1, burst: 0, stun: 0, bonus: 1 };
  if (!p) return out;
  switch (p.kind) {
    case 'nthCrit': if ((p.n ?? 0) >= 2 && ++u.passiveN >= (p.n ?? 3)) { u.passiveN = 0; out.critMult = p.value ?? 2; } break;
    case 'nthBurst': if (++u.passiveN >= (p.n ?? 4)) { u.passiveN = 0; out.burst = 2; } break;
    case 'nthStun': if (++u.passiveN >= (p.n ?? 3)) { u.passiveN = 0; out.stun = 0.4; out.bonus = 1 + (p.value ?? 0.5); } break;
    case 'frenzyStacks': u.passiveStacks = Math.min(p.n ?? 5, u.passiveStacks + 1); u.passiveT = 4; w.refreshDerived(u); break;
    case 'ultGate':
      if (u.passiveStacks <= 0 && ++u.passiveN >= (p.n ?? 4)) { u.passiveN = 0; u.passiveStacks = 1; u.passiveT = p.value ?? 5; w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.5, radius: 1.2, color: '#ffd166' }); if (u.possessed) w.text(u.pos, '@fx.ultReady', '#ffd166', 0.7); }
      break;
    default: break;
  }
  return out;
}

/** Called when a basic attack lands on `target` for `amt` (already mitigated). */
export function onAttackHit(w: World, u: Unit, target: Entity, amt: number, raw: number): void {
  const p = passive(u);
  if (p && target.kind === 'unit') {
    if (p.kind === 'burnOnHit') { target.status.burnDps = Math.max(target.status.burnDps, (p.value ?? 20) + u.level * 4); target.status.burnT = 2; u.passiveT = 3; }
    if (p.kind === 'trueDamage') damage(w, target, raw * (p.value ?? 0.1), { source: u, hero: true, type: 'true', chain: true, noVamp: true, silent: true });
  }
  if (target.kind === 'unit') {
    if (has(u, 'moshi')) damage(w, target, target.hp * 0.08, { source: u, hero: true, type: 'magic', chain: true, noVamp: true });
    if (has(u, 'yingren')) u.passiveT = Math.max(u.passiveT, 3);
    if (has(u, 'shandian') && w.rng.chance(0.3)) {
      let best: Unit | null = null, bd = 99;
      for (const e of w.units(target.team as Team)) if (e !== target && !e.dead && dist(e.pos, target.pos) < bd && dist(e.pos, target.pos) <= 3) { bd = dist(e.pos, target.pos); best = e; }
      if (best) { w.addEffect({ type: 'lightning', pos: { ...target.pos }, to: { ...best.pos }, dur: 0.3, radius: 0.15, color: '#7cf7d5' }); damage(w, best, raw * 0.5, { source: u, hero: true, type: 'physical', chain: true, noVamp: true }); }
    }
  }
  void amt;
}

/** Called when a skill lands on `target`. */
export function onSkillHit(w: World, u: Unit, target: Entity, amt: number): void {
  if (target.kind !== 'unit' || amt <= 0) return;
  const p = passive(u);
  if (p) {
    switch (p.kind) {
      case 'shredOnSkill': target.status.shred = p.value ?? 30; target.status.shredT = 3; break;
      case 'skillBurnStack': target.voidMarks = Math.min(3, target.voidMarks + 1); target.status.burnDps = Math.max(target.status.burnDps, (p.value ?? 18) * target.voidMarks * (1 + u.level * 0.05)); target.status.burnT = 2.5; break;
      case 'markDetonateHeal':
        target.voidMarks += 1;
        if (target.voidMarks >= (p.n ?? 4)) {
          target.voidMarks = 0;
          const d = w.stats(u);
          w.addEffect({ type: 'burst', pos: { ...target.pos }, dur: 0.5, radius: 1.3, color: '#ff8ad0', team: u.team });
          damage(w, target, (p.value ?? 220) + d.power * 0.5, { source: u, hero: true, type: 'magic', chain: true, noVamp: true });
          heal(w, u, (p.value ?? 220) * 0.6 + d.power * 0.3);
        } else w.addEffect({ type: 'ring', pos: { ...target.pos }, dur: 0.3, radius: 0.8, color: '#ff8ad0', team: u.team });
        break;
      case 'orbs':
        u.passiveN = Math.min(p.n ?? 5, u.passiveN + 1);
        if (u.passiveN >= (p.n ?? 5)) {
          u.passiveN = 0;
          let best: Unit | null = null, bd = 99;
          for (const e of w.heroes((u.team === 0 ? 1 : 0) as Team)) { const d = dist(e.pos, u.pos); if (d <= 7 && d < bd) { bd = d; best = e; } }
          const victim = best ?? (target.isHero ? target : null);
          if (victim) { for (let k = 0; k < 5; k++) w.addEffect({ type: 'lightning', pos: { x: u.pos.x + (w.rng.next() - 0.5), y: u.pos.y + (w.rng.next() - 0.5) }, to: { ...victim.pos }, dur: 0.3, radius: 0.12, color: '#5ab0ff' }); damage(w, victim, (p.value ?? 160) + w.stats(u).power * 0.6, { source: u, hero: true, type: 'magic', chain: true, noVamp: true }); }
        }
        break;
      default: break;
    }
  }
  if (has(u, 'huixiang') && itemReady(w, u, 'huixiang')) { itemUsed(w, u, 'huixiang', 1.5); damage(w, target, 80 + w.stats(u).power * 0.3, { source: u, hero: true, type: 'magic', chain: true, noVamp: true }); }
  if (has(u, 'tongku') && itemReady(w, u, 'tongku')) { itemUsed(w, u, 'tongku', 1.0); damage(w, target, target.hp * 0.08, { source: u, hero: true, type: 'magic', chain: true, noVamp: true }); }
  if (has(u, 'bingshuang')) { target.status.slow = Math.max(target.status.slow, 0.3); target.status.slowT = Math.max(target.status.slowT, 1.5); }
}

/** Called after any skill cast. */
export function onSkillCast(w: World, u: Unit, i: number): void {
  const p = passive(u);
  if (p?.kind === 'ultGate' && i === 2) { u.passiveStacks = 0; u.passiveT = 0; }
  if (has(u, 'zongshi_zhili') || has(u, 'binghen_zhiwo')) u.empowerT = 3;
  void w;
}

/** Multiplier on incoming damage from live passives (龙胆, 蝴蝶梦 ward, 影忍之足). */
export function incomingMult(u: Unit, basicAttack: boolean): number {
  let m = 1;
  const p = passive(u);
  if (p?.kind === 'missingHpDR') m *= 1 - (1 - u.hp / Math.max(1, u.maxHp)) * (p.value ?? 0.4);
  if (u.wardT > 0) m *= 1 - u.wardDR;
  if (basicAttack && has(u, 'yingren_zhizu')) m *= 0.85;
  return m;
}

/** Called after damage was applied to a hero; handles lethal saves and reactive item passives. Returns true if death was prevented. */
export function onDamaged(w: World, u: Unit, src: Entity | undefined, amt: number, basicAttack: boolean): void {
  const p = passive(u);
  if (p?.kind === 'lowHpShield' && u.hp > 0 && u.hp < u.maxHp * 0.3 && u.passiveT <= 0) { u.passiveT = p.n ?? 40; u.shield = Math.max(u.shield, (p.value ?? 600) + u.level * 40); w.addEffect({ type: 'shield', pos: { ...u.pos }, dur: 0.5, radius: u.radius + 0.4, color: '#ffb347' }); }
  if (src && src.kind === 'unit' && src.team !== u.team) {
    if (basicAttack && has(u, 'fanshang_cijia')) damage(w, src, amt * 0.25 + 30, { source: u, hero: true, type: 'magic', chain: true, noVamp: true });
    if (has(u, 'buxiang_zhengzhao')) { src.status.slow = Math.max(src.status.slow, 0.3); src.status.slowT = Math.max(src.status.slowT, 1); }
    if (has(u, 'jihan_fengbao')) { src.status.slow = Math.max(src.status.slow, 0.15); src.status.slowT = Math.max(src.status.slowT, 1); }
    if (has(u, 'jinwei_rongyao') && itemReady(w, u, 'jinwei')) { itemUsed(w, u, 'jinwei', 10); for (const a of w.heroes(u.team as Team)) if (a !== u && dist(a.pos, u.pos) <= 4) { a.shield = Math.max(a.shield, 120 + u.level * 15); w.addEffect({ type: 'shield', pos: { ...a.pos }, dur: 0.4, radius: a.radius + 0.3, color: '#ffd166' }); } }
  }
  if (u.hp > 0 && u.hp < u.maxHp * 0.25 && has(u, 'huiyue') && itemReady(w, u, 'huiyue')) { itemUsed(w, u, 'huiyue', 90); u.status.invulnT = 1.5; w.addEffect({ type: 'shield', pos: { ...u.pos }, dur: 1.5, radius: u.radius + 0.5, color: '#fff4c2' }); w.text(u.pos, '辉月', '#fff4c2', 0.7); }
}

/** A hero is about to die: 名刀 / 贤者的庇护. Returns true when the death was cancelled. */
export function cheatDeath(w: World, u: Unit): boolean {
  if (has(u, 'mingdao_siming') && itemReady(w, u, 'mingdao')) { itemUsed(w, u, 'mingdao', 90); u.hp = 1; u.status.invulnT = 1.0; w.addEffect({ type: 'shield', pos: { ...u.pos }, dur: 1, radius: u.radius + 0.5, color: '#fff4c2' }); w.text(u.pos, '名刀·司命', '#fff4c2', 0.8); return true; }
  if (has(u, 'xianzhe_bihu') && itemReady(w, u, 'xianzhe')) { itemUsed(w, u, 'xianzhe', 150); u.hp = u.maxHp * 0.35; u.status.invulnT = 1.2; w.addEffect({ type: 'heal', pos: { ...u.pos }, dur: 0.8, radius: 1.6, color: '#fff4c2' }); w.emit({ type: 'heal', team: u.team, pos: u.pos, text: '@toast.immortal' }); return true; }
  return false;
}

/** Healing multiplier for the target (不死鸟之眼). */
export const healMult = (u: Unit): number => (has(u, 'businiao_zhiyan') ? 1.3 : 1);

/** Per-tick passive upkeep for a hero. */
export function tickPassives(w: World, u: Unit, dt: number): void {
  const p = passive(u);
  const ooc = w.time - u.status.lastHurtT > 5 && w.time - u.lastAttackT > 5;
  if (p) {
    switch (p.kind) {
      case 'oocRegen': if (ooc && u.hp < u.maxHp) heal(w, u, u.maxHp * (p.value ?? 0.02) * dt, true); break;
      case 'periodicHeal':
        u.passiveT -= dt;
        if (u.passiveT <= 0) {
          u.passiveT = p.n ?? 6;
          let best: Unit | null = null, bf = 0.9;
          for (const a of w.heroes(u.team as Team)) { const f = a.hp / a.maxHp; if (dist(a.pos, u.pos) <= 6 && f < bf) { bf = f; best = a; } }
          if (best) { heal(w, best, (p.value ?? 180) + u.level * 20 + w.stats(u).power * 0.4); w.addEffect({ type: 'heal', pos: { ...best.pos }, dur: 0.6, radius: 0.8, color: '#bff5ea' }); }
        }
        break;
      case 'dreamShield':
        u.passiveT -= dt;
        if (u.passiveT <= 0) { u.passiveT = p.n ?? 12; u.wardT = 2; u.wardDR = p.value ?? 0.4; w.addEffect({ type: 'shield', pos: { ...u.pos }, dur: 0.6, radius: u.radius + 0.4, color: '#9be3c8' }); }
        break;
      case 'frenzyStacks': if (u.passiveT > 0) { u.passiveT -= dt; if (u.passiveT <= 0 && u.passiveStacks > 0) { u.passiveStacks = 0; w.refreshDerived(u); } } break;
      case 'ultGate': if (u.passiveStacks > 0) { u.passiveT -= dt; if (u.passiveT <= 0) u.passiveStacks = 0; } break;
      case 'lowHpShield': if (u.passiveT > 0) u.passiveT -= dt; break;
      case 'burnOnHit': if (u.passiveT > 0) u.passiveT -= dt; break;
      default: break;
    }
  }
  if (u.empowerT > 0) u.empowerT -= dt;
  if (u.status.shredT > 0) { u.status.shredT -= dt; if (u.status.shredT <= 0) u.status.shred = 0; }
  if (u.status.ccImmuneT > 0) u.status.ccImmuneT -= dt;
  // item auras
  if (has(u, 'honglian_doupeng')) {
    u.passiveN = (u.passiveN ?? 0);
    const acc = (u as never as { honglianAcc?: number });
    acc.honglianAcc = (acc.honglianAcc ?? 0) + dt;
    if (acc.honglianAcc >= 0.5) { acc.honglianAcc = 0; areaDamage(w, u.team, u.pos, 2.4, (30 + u.level * 5) * 0.5, { source: u, hero: true, type: 'magic', chain: true, noVamp: true, silent: true }); }
  }
  if (has(u, 'bazhe_zhongzhuang') && ooc && u.hp < u.maxHp) heal(w, u, u.maxHp * 0.025 * dt, true);
  if (has(u, 'monv_doupeng') && ooc && u.shield < 300) u.shield = 300 + u.level * 20;
  if (has(u, 'jiushu_zhiyi') && itemReady(w, u, 'jiushu')) {
    for (const a of w.heroes(u.team as Team)) if (a !== u && a.hp / a.maxHp < 0.35 && dist(a.pos, u.pos) <= 4) { itemUsed(w, u, 'jiushu', 12); heal(w, a, 300 + u.level * 25); w.addEffect({ type: 'heal', pos: { ...a.pos }, dur: 0.6, radius: 1, color: '#bff5ea' }); break; }
  }
}

/** Flat defence shred and penetration applied before mitigation. */
export function effectiveDefence(target: Entity, src: Entity | undefined, type: 'physical' | 'magic'): number {
  let def = type === 'physical' ? target.armor : target.resist;
  if (target.kind === 'unit' && type === 'magic') def -= target.status.shred;
  if (src && src.kind === 'unit' && src.isHero) {
    if (type === 'physical') { if (has(src, 'anying_zhanfu')) def -= 80; if (has(src, 'suixing_chui')) def *= 0.6; }
    else { if (has(src, 'xuwu_fazhang')) def *= 0.6; if (has(src, 'mifa_zhixue')) def -= 75; }
  }
  return Math.max(0, def);
}
