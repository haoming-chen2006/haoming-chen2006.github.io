import { MODES, type Mode } from '../engine/card.ts'

export const nba: Mode = {
  ...MODES.nba,
  judgeBrief: `These are five NBA player-seasons and a sixth man, each drafted at a price
out of a fixed budget. Judge the team that would actually take the floor, not the
one with the largest totals.

Weigh positional fit first: who guards the opposing wings, whether anyone can
handle the ball under pressure, whether the frontcourt is three of the same
player. Then weigh floor spacing — a lineup that cannot shoot gives the defence
nothing to worry about, however good its parts are. Then weigh how the game
would flow: who closes it, who is on the floor when it is tight, whether the
bench piece covers the starters' worst weakness.

A season is a snapshot of a player at one moment, so read each card as that
year's player and not as a career. Prices are visible to you: a roster that
spent everything on one name and filled out with scraps is making a real bet,
and it should be judged as one rather than praised for its best card.`,
}
