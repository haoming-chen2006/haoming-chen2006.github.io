import type { World } from './world.ts';

/** FNV-1a over the exact decimal text of every number that matters, so two lockstep peers can compare worlds. */
export function hashWorld(w: World): number {
  let h = 0x811c9dc5;
  const mix = (s: string) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= 0x7c; };
  mix(String(w.time)); mix(w.phase); mix(String(w.elixirRate)); mix(String(w.rng.state));
  for (const p of w.players) { mix(String(p.elixir)); mix(String(p.crowns)); mix(String(p.heroId)); mix(String(p.possessCd)); mix(p.hand.map((c) => c.id).join()); }
  for (const e of w.entities) { if (e.dead) continue; mix(String(e.id)); mix(String(e.hp)); mix(String(e.pos.x)); mix(String(e.pos.y)); mix(String(e.targetId)); mix(String(e.attackCd)); }
  for (const p of w.projectiles) { if (p.dead) continue; mix(String(p.id)); mix(String(p.pos.x)); mix(String(p.pos.y)); }
  mix(String(w.pendingSpells.length)); mix(String(w.zones.length));
  return h >>> 0;
}
