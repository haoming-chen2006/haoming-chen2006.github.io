import { angleOf, dist, sub } from '../engine/math.ts';
import { fireProjectile, kill, tickStatus } from './combat.ts';
import { troopById } from './cards.ts';
import { attackSpeedMult, canTarget, frozen, World } from './world.ts';
import type { Building, Entity, TargetType, Tower } from './types.ts';

function pickTarget(w: World, e: Entity, range: number, targets: TargetType): Entity | undefined {
  const cur = w.get(e.targetId);
  if (cur && canTarget(targets, cur) && dist(cur.pos, e.pos) - cur.radius <= range + 0.3) return cur;
  let best: Entity | undefined, bd = Infinity;
  for (const en of w.enemiesOf(e.team)) {
    if (!canTarget(targets, en)) continue;
    if (en.kind === 'unit' && en.deployT > 0) continue;
    const d = dist(en.pos, e.pos) - en.radius;
    if (d <= range && d < bd) { bd = d; best = en; }
  }
  e.targetId = best ? best.id : -1;
  return best;
}

export function updateTowers(w: World, dt: number): void {
  for (const e of w.entities) {
    if (e.dead || e.kind !== 'tower') continue;
    const t: Tower = e;
    tickStatus(w, t, dt);
    if (!t.active) continue;
    t.attackCd -= dt;
    if (frozen(t)) continue;
    const target = pickTarget(w, t, t.range, 'both');
    if (!target) continue;
    t.facing = angleOf(sub(target.pos, t.pos));
    if (t.attackCd <= 0) {
      t.attackCd = t.hitSpeed / attackSpeedMult(t);
      t.attackAnim = 1;
      const from = { x: t.pos.x, y: t.pos.y - 0.6 };
      fireProjectile(w, {
        team: t.team, from, style: t.towerType === 'king' ? 'cannonball' : 'arrow', speed: t.towerType === 'king' ? 9 : 12,
        damage: t.damage, sourceId: t.id, targetId: target.id, mode: 'homing', radius: 0.2,
      });
      w.emit({ type: 'ranged', pos: t.pos, style: t.towerType === 'king' ? 'cannonball' : 'arrow' });
    }
  }
}

export function updateBuildings(w: World, dt: number): void {
  for (const e of w.entities) {
    if (e.dead || e.kind !== 'building') continue;
    const b: Building = e;
    tickStatus(w, b, dt);
    if (b.deployT > 0) { b.deployT -= dt; continue; }
    b.lifetime -= dt;
    // buildings slowly decay as their lifetime runs out
    b.hp = Math.min(b.hp, Math.max(1, b.maxHp * (b.lifetime / b.def.lifetime) + 1));
    if (b.lifetime <= 0) { kill(w, b); continue; }
    if (frozen(b)) continue;
    const spawn = b.def.spawn;
    if (spawn) {
      b.spawnT -= dt;
      if (b.spawnT <= 0) {
        b.spawnT = spawn.every;
        const def = troopById(spawn.unit);
        const forward = b.team === 0 ? -1 : 1;
        for (let i = 0; i < spawn.count; i++) {
          const pos = { x: b.pos.x + (i - (spawn.count - 1) / 2) * 0.5, y: b.pos.y + forward * (b.radius + 0.4) };
          w.spawnUnit(def, b.team, pos, { deployTime: 0.3, fromSpawner: true });
        }
        w.addEffect({ type: 'spawn', pos: { x: b.pos.x, y: b.pos.y + forward * (b.radius + 0.4) }, dur: 0.4, radius: 0.6, color: def.look.color });
        w.emit({ type: 'summon', pos: b.pos, team: b.team });
      }
    }
    if (b.def.damage <= 0) continue;
    b.attackCd -= dt;
    const target = pickTarget(w, b, b.def.range, b.def.targets);
    if (!target) continue;
    b.facing = angleOf(sub(target.pos, b.pos));
    if (b.attackCd <= 0) {
      b.attackCd = b.def.hitSpeed / attackSpeedMult(b);
      b.attackAnim = 1;
      fireProjectile(w, {
        team: b.team, from: { x: b.pos.x, y: b.pos.y - 0.3 }, style: b.def.projectile ?? 'cannonball', speed: b.def.projectileSpeed ?? 10,
        damage: b.def.damage, sourceId: b.id, targetId: target.id, mode: 'homing', radius: 0.2,
      });
      w.emit({ type: 'ranged', pos: b.pos, style: b.def.projectile ?? 'cannonball' });
    }
  }
}
