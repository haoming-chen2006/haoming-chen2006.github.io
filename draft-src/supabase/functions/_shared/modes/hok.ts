import { MODES, type Mode } from '../engine/card.ts'

export const hok: Mode = {
  ...MODES.hok,
  judgeBrief: `These are five Honor of Kings heroes drafted into the five lanes —
clash, jungle, mid, farm and roam — each bought at a price out of a fixed budget.
There is no hidden data here and none is missing: a hero's identity is the whole
picture, so judge the composition itself.

Weigh the damage mix, because a team that is entirely physical or entirely magic
is answered by one item. Weigh whether there is a frontline that can actually
start a fight and something behind it worth protecting. Weigh engage and
disengage — who opens, and whether anyone can get the team out of a fight that
has gone wrong. Weigh the curve: a composition that owns the early game and
falls off is a real strategy, but say so and say what it must do before it
fades.

Above all, name the win condition. A team with no way to close is worse than a
weaker one that knows what it is doing. Prices are visible, so treat a hero
bought for a fortune as a bet the drafter has to justify.`,
}
