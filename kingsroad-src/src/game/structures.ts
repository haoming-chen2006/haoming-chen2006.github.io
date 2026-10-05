import { angleOf, dist, sub } from '../engine/math.ts';
import { fireProjectile, tickStatus } from './combat.ts';
import { NEUTRAL, type Entity, type Tower } from './types.ts';
import { attackSpeedMult, frozen, World } from './world.ts';

/** Towers shoot minions first, heroes only when nothing else is in range or when a hero attacked an ally hero underneath. */
function pickTarget(w: World, t: Tower): Entity | undefined {
  const aggro = t.aggroT > 0 ? w.get(t.aggroId) : undefined;
  if (aggro && dist(aggro.pos, t.pos) - aggro.radius <= t.range) return aggro;
  const cur = w.get(t.targetId);
  if (cur && cur.kind === 'unit' && !cur.isHero && dist(cur.pos, t.pos) - cur.radius <= t.range + 0.3) return cur;
  let bestMinion: Entity | undefined, bm = Infinity, bestHero: Entity | undefined, bh = Infinity;
  for (const e of w.enemiesOf(t.team)) {
    if (e.kind !== 'unit' || e.team === NEUTRAL || e.deployT > 0 || e.status.invulnT > 0) continue;
    const d = dist(e.pos, t.pos) - e.radius;
    if (d > t.range) continue;
    if (e.isHero) { if (d < bh) { bh = d; bestHero = e; } }
    else if (d < bm) { bm = d; bestMinion = e; }
  }
  const best = bestMinion ?? bestHero;
  if (best?.id !== t.targetId) { t.heat = 0; t.targetId = best ? best.id : -1; }
  return best;
}

export function updateTowers(w: World, dt: number): void {
  for (const e of w.entities) {
    if (e.dead || e.kind !== 'tower') continue;
    const t: Tower = e;
    tickStatus(w, t, dt);
    if (t.aggroT > 0) t.aggroT -= dt;
    if (t.crownT > 0) t.crownT -= dt;
    // towers regenerate slowly when nothing is around
    if (t.hp < t.maxHp && t.targetId < 0) t.hp = Math.min(t.maxHp, t.hp + t.maxHp * 0.004 * dt);
    if (!t.active) continue;
    t.attackCd -= dt;
    if (frozen(t)) continue;
    const target = pickTarget(w, t);
    if (!target) { t.heat = 0; continue; }
    t.facing = angleOf(sub(target.pos, t.pos));
    if (t.attackCd <= 0) {
      t.attackCd = t.hitSpeed / attackSpeedMult(t) / (t.crownT > 0 ? 1.4 : 1);
      t.attackAnim = 1;
      const heroShot = target.kind === 'unit' && target.isHero;
      const ramp = heroShot ? 1 + Math.min(1.5, t.heat * 0.35) : 1;
      t.heat = heroShot ? t.heat + 1 : 0;
      const from = { x: t.pos.x, y: t.pos.y };
      fireProjectile(w, {
        team: t.team, from, style: t.tier === 'crystal' ? 'cannonball' : 'bolt', speed: t.tier === 'crystal' ? 10 : 14,
        damage: t.damage * ramp * (1 + Math.min(1, w.time / 900) * 0.5), type: 'physical', sourceId: t.id, targetId: target.id, mode: 'homing', radius: 0.25,
      });
      w.emit({ type: 'ranged', pos: t.pos, style: 'bolt' });
    }
  }
}

/** A hero hit an enemy hero: towers in range of the victim turn on the attacker. */
export function towerAggro(w: World, attacker: Entity, victim: Entity): void {
  if (attacker.kind !== 'unit' || !attacker.isHero || victim.kind !== 'unit' || !victim.isHero) return;
  for (const t of w.towers(victim.team as 0 | 1)) {
    if (!t.active || t.dead) continue;
    if (dist(t.pos, attacker.pos) - attacker.radius <= t.range) { t.aggroId = attacker.id; t.aggroT = 3; }
  }
}

export function updateBuildings(_w: World, _dt: number): void { /* no player buildings in this game */ }
