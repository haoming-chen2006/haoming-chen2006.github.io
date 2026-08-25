// The shape of a room. This is the whole of what a game is: one JSON value that
// lives in one Postgres row and is pushed to every browser when it changes.
//
// Times are ISO strings because this crosses the wire and lands in jsonb. Only
// the server's clock is ever compared against them — see rules.ts.

import { MODES, type CardId, type HiddenStats, type ModeId } from './card.ts'

export type Phase = 'lobby' | 'auction' | 'judging' | 'done'

/** The only two things the rules need to know about a card. Name, art, description
 *  and stats are none of the engine's business — and keeping the hidden half out
 *  of the room row is exactly how stats stay hidden. Position has to be here
 *  because auto-assign is a rule: a won card looks for a slot of its own name. */
export type BankCard = { id: CardId; position: string }

export type PowerId =
  | 'scout'
  | 'overdraft'
  | 'veto'
  | 'counterbid'
  | 'poach'
  | 'insurance'
  | 'squeeze'

export type Held = { id: PowerId; used: boolean }

export const POWERS: Record<PowerId, { label: string; blurb: string; when: string }> = {
  scout: {
    label: 'Scout',
    blurb: 'See the next two cards coming up.',
    when: 'any time a card is on the block',
  },
  overdraft: {
    label: 'Overdraft',
    blurb: 'Your next win costs $5 less, down to a minimum of $1.',
    when: 'arm it before you bid',
  },
  veto: {
    label: 'Veto',
    blurb: 'Bin the card on the block. Nobody gets it, and it never comes back.',
    when: 'while a card is up',
  },
  counterbid: {
    label: 'Counterbid',
    blurb: 'Take the card that just sold, at the winning price plus $1.',
    when: 'during the round straight after a sale',
  },
  poach: {
    label: 'Poach',
    blurb: 'Trade one of your cards for a rival’s, slot for slot.',
    when: 'any time before judging',
  },
  insurance: {
    label: 'Insurance',
    blurb: 'One empty slot is forgiven — it will not knock you out.',
    when: 'automatic, at the close',
  },
  squeeze: {
    label: 'Squeeze',
    blurb: 'Every other drafter’s limit drops $4 for this round.',
    when: 'while a card is up',
  },
}

export const POWER_IDS = Object.keys(POWERS) as PowerId[]
/** How many each drafter carries into a draft. */
export const POWER_PICKS = 2
/** What Overdraft takes off, and what Squeeze takes off everyone else. */
export const OVERDRAFT = 5
export const SQUEEZE = 4

export type Seat = {
  /** Random token, kept in the browser's localStorage. Never leaves the seat's owner. */
  id: string
  name: string
  budget: number
  /** One entry per slot in the mode's roster, in the mode's slot order. */
  slots: (CardId | null)[]
  /** What each won card cost. The results screen reads it; nothing else can
   *  recover it once the budget has been debited. */
  paid: Record<CardId, number>
  powers: Held[]
  /** Armed by Overdraft, spent on the next card won. */
  discount: number
  /** Set at the close for anyone who did not fill their roster. */
  eliminated: boolean
}

export type Round = {
  card: BankCard
  /** When the round closes. Every accepted bid pushes it back. */
  deadline: string
  high: null | { seat: number; amount: number }
  /** Seats that have scouted this round, so their screens show what is coming. */
  scoutedBy: number[]
  /** A seat that squeezed this round; everyone else's limit is $4 lower. */
  squeezedBy: number | null
}

/** The last card sold, kept exactly one round so Counterbid has something to take. */
export type Sale = { cardId: CardId; seat: number; amount: number; roundIndex: number }

export type Verdict = {
  ranking: { seat: number; place: number; summary: string }[]
  winnerSeat: number
  reasoning: string
}

export type Config = {
  budget: number
  rosterSize: number
  /** How long a round runs from its start, and again from each accepted bid. */
  bidMs: number
  /** How many cards this draft will ever see. Run out with an empty slot and
   *  you are out — which is what makes passing on a card a gamble. */
  poolSize: number
}

export type RoomState = {
  phase: Phase
  mode: ModeId
  config: Config
  seats: Seat[]
  /** The pool, shuffled and cut to size at `start`, drawn from the front.
   *  A drawn card has left it whatever happens to it. */
  bank: BankCard[]
  /** Rounds begun so far. */
  roundIndex: number
  round: Round | null
  lastSale: Sale | null
  verdict: Verdict | null
  /** The numbers, finally. Sent back by the judge along with its ruling, because
   *  until that moment they have never been in a browser and must not be. */
  reveal: Record<CardId, HiddenStats> | null
}

/** Everything a browser can ask the room to do.
 *
 *  `seat` is an index into `seats`, not the secret token: resolving a caller's
 *  token to their index is the Edge Function's job, so the rules stay about
 *  rules and a browser can never act as a seat it does not hold. */
export type Action =
  | { type: 'join'; seatId: string; name: string; powers: PowerId[] }
  /** Carries the shuffled pool, so the rules need no randomness of their own. */
  | { type: 'start'; bank: BankCard[] }
  | { type: 'bid'; seat: number; amount: number }
  /** Sent by whichever browser notices the deadline first. Late is fine, early is a no-op. */
  | { type: 'resolve' }
  | { type: 'swap'; seat: number; a: number; b: number }
  /** Insurance is passive and Poach needs a target, so neither comes through here. */
  | { type: 'power'; seat: number; power: Exclude<PowerId, 'poach' | 'insurance'> }
  | { type: 'poach'; seat: number; slot: number; target: number; targetSlot: number }
  | { type: 'judge'; verdict: Verdict; reveal: Record<CardId, HiddenStats> }

export type Result = { ok: true; state: RoomState } | { ok: false; reason: string }

/** The numbers most likely to change after a night of play. */
export const DEFAULT_CONFIG: Omit<Config, 'rosterSize' | 'poolSize'> = {
  budget: 20,
  bidMs: 8_000,
}

/** Honor of Kings is the whole roster of heroes; the other two are deliberately
 *  scarce, so a draft is a race for a shrinking pool rather than a shopping trip. */
export const DEFAULT_POOL: Record<ModeId, number> = { nba: 40, soccer: 40, hok: 132 }

export const MIN_SEATS = 2
export const MAX_SEATS = 6

export function newRoom(mode: ModeId, config: Partial<Config> = {}): RoomState {
  return {
    phase: 'lobby',
    mode,
    config: {
      ...DEFAULT_CONFIG,
      rosterSize: MODES[mode].slots.length,
      poolSize: DEFAULT_POOL[mode],
      ...config,
    },
    seats: [],
    bank: [],
    roundIndex: 0,
    round: null,
    lastSale: null,
    verdict: null,
    reveal: null,
  }
}

export const newSeat = (id: string, name: string, config: Config, powers: PowerId[] = []): Seat => ({
  id,
  name,
  budget: config.budget,
  slots: Array<CardId | null>(config.rosterSize).fill(null),
  paid: {},
  powers: powers.map((p) => ({ id: p, used: false })),
  discount: 0,
  eliminated: false,
})

export const emptySlots = (seat: Seat): number => seat.slots.filter((c) => c === null).length

export const isFull = (seat: Seat): boolean => emptySlots(seat) === 0

/** The most a seat may bid: it must keep a dollar for each slot it still has to fill
 *  after this one. You can lose by being outbid or by the pool running dry, but
 *  never by bricking your own budget four rounds ago. */
export const maxBid = (seat: Seat): number => seat.budget - (emptySlots(seat) - 1)

export const holds = (seat: Seat, power: PowerId): boolean =>
  seat.powers.some((p) => p.id === power && !p.used)

export const spend = (seat: Seat, power: PowerId): Held[] =>
  seat.powers.map((p) => (p.id === power ? { ...p, used: true } : p))
