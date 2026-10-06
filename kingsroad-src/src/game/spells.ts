import { dist, type Vec } from '../engine/math.ts';
import { clampArena, resolveGround } from './terrain.ts';
import { inWall } from './map.ts';
import { damage, heal } from './combat.ts';
import type { Role, Team, Unit } from './types.ts';
import type { World } from './world.ts';

/** 召唤师技能: one per seat, chosen before the match. Cooldowns follow 王者荣耀. */
export type SummonerSpell = 'flash' | 'smite' | 'heal' | 'frenzy' | 'sprint' | 'cleanse' | 'execute';
export interface SpellDef { id: SummonerSpell; name: string; desc: string; cooldown: number; icon: string; color: string }
export const SPELLS: Record<SummonerSpell, SpellDef> = {
  flash: { id: 'flash', name: '闪现', desc: '向指定方向瞬移一段距离。', cooldown: 120, icon: '⚡', color: '#ffe27a' },
  smite: { id: 'smite', name: '惩击', desc: '对附近的野怪或小兵造成高额真实伤害（对暴君、主宰尤其有效）。', cooldown: 30, icon: '🔥', color: '#ff8a3c' },
  heal: { id: 'heal', name: '治疗', desc: '立即为自己和附近队友恢复 15% 最大生命，并短暂加速。', cooldown: 120, icon: '✚', color: '#8dff9a' },
  frenzy: { id: 'frenzy', name: '狂暴', desc: '5 秒内攻击速度提升 60%、攻击力提升 10%。', cooldown: 75, icon: '🗡', color: '#ff6b6b' },
  sprint: { id: 'sprint', name: '疾跑', desc: '10 秒内移动速度提升 30%。', cooldown: 100, icon: '👟', color: '#9fe3ff' },
  cleanse: { id: 'cleanse', name: '净化', desc: '解除自身所有控制效果，并在 1.5 秒内免疫控制。', cooldown: 90, icon: '✨', color: '#fff4c2' },
  execute: { id: 'execute', name: '终结', desc: '对附近生命值低于 50% 的敌方英雄造成其 14% 最大生命的真实伤害。', cooldown: 90, icon: '💀', color: '#c56bff' },
};
export const SPELL_LIST: SpellDef[] = Object.values(SPELLS);
export const isSpell = (v: unknown): v is SummonerSpell => typeof v === 'string' && v in SPELLS;

/** The spell a bot of this role picks (mirrors common 王者荣耀 loadouts). */
export function defaultSpell(role: Role, jungler: boolean): SummonerSpell {
  if (jungler) return 'smite';
  switch (role) {
    case 'support': return 'heal';
    case 'marksman': return 'flash';
    case 'tank': return 'flash';
    case 'warrior': return 'flash';
    case 'assassin': return 'flash';
    case 'mage': return 'flash';
  }
}

/** Cast the seat's spell. Returns true when it went off. */
export function castSpell(w: World, u: Unit, spell: SummonerSpell, aimDir: Vec, moveDir: Vec | null): boolean {
  const d = SPELLS[spell];
  switch (spell) {
    case 'flash': {
      const dir = moveDir ?? aimDir;
      let to = { x: u.pos.x + dir.x * 4.2, y: u.pos.y + dir.y * 4.2 };
      to = clampArena(to, u.radius);
      if (inWall(to, u.radius)) to = resolveGround(to, u.radius);
      w.addEffect({ type: 'blink', pos: { ...u.pos }, to: { ...to }, dur: 0.35, radius: u.radius, color: d.color });
      u.pos = to;
      w.emit({ type: 'flash', pos: u.pos, team: u.team, hero: u.possessed });
      return true;
    }
    case 'smite': {
      let best: Unit | null = null, bd = 4.5;
      for (const e of w.units()) { if (e.team === u.team || e.isHero || e.dead) continue; const dd = dist(e.pos, u.pos); if (dd < bd) { bd = dd; best = e; } }
      if (!best) { if (u.possessed) w.text(u.pos, '@fx.noTargets', '#ffffff', 0.5); return false; }
      const amt = best.def.kind === 'monster' ? 520 + u.level * 90 : 300 + u.level * 40;
      w.addEffect({ type: 'burst', pos: { ...best.pos }, dur: 0.5, radius: 1.2, color: d.color, team: u.team });
      damage(w, best, amt, { source: u, hero: true, type: 'true', chain: true, noVamp: true });
      return true;
    }
    case 'heal': {
      for (const a of w.heroes(u.team as Team)) if (dist(a.pos, u.pos) <= 5) { heal(w, a, a.maxHp * 0.15); a.buffT = Math.max(a.buffT, 2); a.buffSpeed = Math.max(a.buffSpeed, 1.15); if (a.buffAttack < 1) a.buffAttack = 1; w.addEffect({ type: 'heal', pos: { ...a.pos }, dur: 0.6, radius: 1.0, color: d.color }); }
      w.emit({ type: 'heal', team: u.team, pos: u.pos });
      return true;
    }
    case 'frenzy': {
      u.buffT = 5; u.buffSpeed = Math.max(1, u.buffSpeed); u.buffAttack = 1.1; u.status.rage = 5; u.status.rageAttack = 1.0; u.status.rageSpeed = 1.0;
      (u as never as { frenzyT: number }).frenzyT = 5;
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.5, radius: 1.2, color: d.color });
      return true;
    }
    case 'sprint': {
      u.buffT = 10; u.buffSpeed = 1.3; if (u.buffAttack < 1) u.buffAttack = 1;
      w.addEffect({ type: 'ring', pos: { ...u.pos }, dur: 0.5, radius: 1.2, color: d.color });
      return true;
    }
    case 'cleanse': {
      u.status.stun = 0; u.status.slow = 0; u.status.slowT = 0; u.status.freeze = 0; u.status.ccImmuneT = 1.5;
      w.addEffect({ type: 'shield', pos: { ...u.pos }, dur: 0.6, radius: u.radius + 0.4, color: d.color });
      return true;
    }
    case 'execute': {
      let best: Unit | null = null, bd = 3.6;
      for (const e of w.heroes((u.team === 0 ? 1 : 0) as Team)) { const dd = dist(e.pos, u.pos); if (dd < bd && e.hp / e.maxHp < 0.5) { bd = dd; best = e; } }
      if (!best) { if (u.possessed) w.text(u.pos, '@fx.noTargets', '#ffffff', 0.5); return false; }
      w.addEffect({ type: 'burst', pos: { ...best.pos }, dur: 0.5, radius: 1.0, color: d.color, team: u.team });
      damage(w, best, best.maxHp * 0.14, { source: u, hero: true, type: 'true', chain: true, noVamp: true });
      return true;
    }
  }
}
