import { MODES, type Mode } from '../engine/card.ts'

export const soccer: Mode = {
  ...MODES.soccer,
  judgeBrief: `These are six footballer-seasons picked to a shape: a keeper, two
defenders, two midfielders and a forward, each bought at a price out of a fixed
budget. Judge the side that would actually walk out, not the one with the
biggest numbers.

Weigh shape first: whether the two midfielders can hold the ball against a
proper press and still get it forward, whether the defenders cover for each
other, whether anyone supplies the forward at all. A brilliant forward starved
of service is worth less than a good one who is fed.

Weigh the era and the league a season came from — a monstrous return in a weak
league is not the same as a modest one in a hard one — and read each card as
that season's player rather than the player's reputation. Prices are visible:
say plainly when a side has overpaid for a name and left a hole behind it.`,
}
