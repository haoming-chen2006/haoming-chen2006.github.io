import type { World } from './world.ts';

/** FNV-1a over the exact decimal text of every number that matters, so two lockstep peers can compare worlds. */
export function hashWorld(w: World): number {
  let h = 0x811c9dc5;
  const mix = (s: string) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= 0x7c; };
  mix(String(w.time)); mix(w.phase); mix(String(w.rng.state)); mix(String(w.waveNo));
  for (const p of w.players) { mix(String(p.kills)); mix(String(p.heroId)); for (const s of p.seats) { mix(String(s.heroId)); mix(String(s.gold)); mix(String(s.level)); mix(String(s.xp)); mix(String(s.respawnT)); mix(s.items.join()); } }
  for (const e of w.entities) { if (e.dead) continue; mix(String(e.id)); mix(String(e.hp)); mix(String(e.pos.x)); mix(String(e.pos.y)); mix(String(e.targetId)); mix(String(e.attackCd)); if (e.kind === 'unit') { mix(String(e.mana)); mix(String(e.level)); } }
  for (const p of w.projectiles) { if (p.dead) continue; mix(String(p.id)); mix(String(p.pos.x)); mix(String(p.pos.y)); }
  mix(String(w.zones.length));
  return h >>> 0;
}
