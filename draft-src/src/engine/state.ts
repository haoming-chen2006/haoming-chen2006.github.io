// The shape of a room. This is the whole of what a game is: one JSON value that
// lives in one Postgres row and is pushed to every browser when it changes.
//
// Times are ISO strings because this crosses the wire and lands in jsonb. Only
// the server's clock is ever compared against them — see rules.ts.

import { MODES, type CardId, type ModeId } from './card'

export type Phase = 'lobby' | 'auction' | 'judging' | 'done'

/** The only two things the rules need to know about a card. Name, art, description
 *  and stats are none of the engine's business — and keeping the hidden half out
 *  of the room row is exactly how stats stay hidden. Position has to be here
 *  because auto-assign is a rule: a won card looks for a slot of its own name. */
export type BankCard = { id: CardId; position: string }

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
}

export type Round = {
  card: BankCard
  /** Index into `seats`. Rotates one seat per round. */
  openerSeat: number
  /** Until this moment only the opener may bid. */
  exclusiveUntil: string
  /** When the round closes. Every accepted bid pushes it back. */
  deadline: string
  high: null | { seat: number; amount: number }
}

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
  /** How much of that round belongs to the opener alone. */
  openerMs: number
}

export type RoomState = {
  phase: Phase
  mode: ModeId
  config: Config
  seats: Seat[]
  /** Shuffled at `start`, drawn from the front. A drawn card is off the bank. */
  bank: BankCard[]
  /** Rounds begun so far. Drives the opener rotation. */
  roundIndex: number
  round: Round | null
  verdict: Verdict | null
}

/** Everything a browser can ask the room to do.
 *
 *  `seat` is an index into `seats`, not the secret token: resolving a caller's
 *  token to their index is the Edge Function's job, so the rules stay about
 *  rules and a browser can never act as a seat it does not hold. */
export type Action =
  | { type: 'join'; seatId: string; name: string }
  /** Carries the shuffled bank, so the rules need no randomness of their own. */
  | { type: 'start'; bank: BankCard[] }
  | { type: 'bid'; seat: number; amount: number }
  /** Sent by whichever browser notices the deadline first. Late is fine, early is a no-op. */
  | { type: 'resolve' }
  | { type: 'swap'; seat: number; a: number; b: number }
  | { type: 'judge'; verdict: Verdict }

export type Result = { ok: true; state: RoomState } | { ok: false; reason: string }

/** The numbers most likely to change after the first real playtest. */
export const DEFAULT_CONFIG: Omit<Config, 'rosterSize'> = {
  budget: 20,
  bidMs: 8_000,
  openerMs: 6_000,
}

export const MIN_SEATS = 2
export const MAX_SEATS = 6

export function newRoom(mode: ModeId, config: Partial<Config> = {}): RoomState {
  return {
    phase: 'lobby',
    mode,
    config: { ...DEFAULT_CONFIG, rosterSize: MODES[mode].slots.length, ...config },
    seats: [],
    bank: [],
    roundIndex: 0,
    round: null,
    verdict: null,
  }
}

export const newSeat = (id: string, name: string, config: Config): Seat => ({
  id,
  name,
  budget: config.budget,
  slots: Array<CardId | null>(config.rosterSize).fill(null),
  paid: {},
})

export const emptySlots = (seat: Seat): number => seat.slots.filter((c) => c === null).length

export const isFull = (seat: Seat): boolean => emptySlots(seat) === 0

/** The most a seat may bid: it must keep a dollar for each slot it still has to fill
 *  after this one. Consequently nobody can ever be priced out of finishing a roster. */
export const maxBid = (seat: Seat): number => seat.budget - (emptySlots(seat) - 1)
