import type { Vec } from '../engine/math.ts';
import { deployCard } from './deploy.ts';
import { possess } from './hero.ts';
import type { Team } from './types.ts';
import type { World } from './world.ts';

/**
 * The discrete things a commander can do, as data. A solo match applies them the moment the
 * player clicks; an online match schedules them for a future tick so both browsers apply the
 * same action on the same tick. Either way this is the only path from input to `deployCard`/`possess`.
 */
export type Action =
  | { k: 'deploy'; h: number; x: number; y: number }
  | { k: 'possess'; id: number };

export function applyAction(w: World, team: Team, a: Action): boolean {
  switch (a.k) {
    case 'deploy': return deployCard(w, team, a.h, { x: a.x, y: a.y } satisfies Vec);
    case 'possess': return possess(w, team, a.id);
  }
}
