// The game. Pure functions over RoomState — no clock, no randomness, no network,
// no React. The Edge Function runs this to decide what happens; the browser runs
// the same code to gray out buttons. One copy, so the two can never disagree.
//
// `now` is always epoch milliseconds supplied by the caller. In production that
// is the server's clock and nothing else, which is why browsers with skewed
// clocks cannot resolve a round early.

import { MODES } from './card'
import type { Action, BankCard, Result, RoomState, Round, Seat } from './state'
import { MIN_SEATS, isFull, maxBid } from './state'

const no = (reason: string): Result => ({ ok: false, reason })
const yes = (state: RoomState): Result => ({ ok: true, state })

export function apply(state: RoomState, action: Action, now: number): Result {
  switch (action.type) {
    case 'start':
      return start(state, action.bank, now)
    case 'bid':
      return bid(state, action.seat, action.amount, now)
    case 'resolve':
      return resolve(state, now)
    default:
      return no(`${action.type} is not handled yet`)
  }
}

function start(state: RoomState, bank: BankCard[], now: number): Result {
  if (state.phase !== 'lobby') return no('the draft has already started')
  if (state.seats.length < MIN_SEATS) return no(`a draft needs at least ${MIN_SEATS} drafters`)

  const needed = state.seats.length * state.config.rosterSize
  if (bank.length < needed)
    return no(`the bank holds ${bank.length} cards and this draft needs ${needed}`)

  const opened = openRound({ ...state, phase: 'auction', bank }, now)
  return opened ? yes(opened) : no('the bank is empty')
}

function bid(state: RoomState, seatIndex: number, amount: number, now: number): Result {
  const round = state.round
  if (state.phase !== 'auction' || round === null) return no('no card is up for auction')

  const seat: Seat | undefined = state.seats[seatIndex]
  if (seat === undefined) return no(`there is no seat ${seatIndex}`)

  if (now >= Date.parse(round.deadline)) return no('too late — the round has closed')
  if (now < Date.parse(round.exclusiveUntil) && seatIndex !== round.openerSeat)
    return no('the opener has the first bid on this card')

  if (isFull(seat)) return no('your roster is full')
  if (!Number.isInteger(amount)) return no('a bid is a whole number of dollars')

  const floor = round.high === null ? 1 : round.high.amount + 1
  if (amount < floor)
    return no(round.high === null ? 'the opening bid is $1' : `the next bid is $${floor}`)

  // Raising yourself only costs money and pushes the deadline back, so it is a
  // stalling move rather than a bid. The UI disables it; the rules refuse it.
  if (round.high?.seat === seatIndex) return no('you already hold the high bid')

  const ceiling = maxBid(seat)
  if (amount > ceiling)
    return no(`$${ceiling} is your limit — you must keep a dollar for every other empty slot`)

  return yes({
    ...state,
    round: {
      ...round,
      high: { seat: seatIndex, amount },
      // Every accepted bid restarts the full countdown. The opener window is not
      // extended: it is a head start on the card, not on the clock.
      deadline: new Date(now + state.config.bidMs).toISOString(),
    },
  })
}

/** Nobody is awake to fire a timer, so every browser sends `resolve` when its own
 *  clock passes the deadline. Only the server's clock is consulted here, so an
 *  early one does nothing, the first on-time one does the work, and the rest land
 *  on a round that is already gone and do nothing either. Skewed clocks across
 *  browsers cannot move the outcome. */
function resolve(state: RoomState, now: number): Result {
  const round = state.round
  if (state.phase !== 'auction' || round === null) return yes(state)
  if (now < Date.parse(round.deadline)) return yes(state)

  // No bid: the card is unsold. It already left the bank when it was drawn.
  const settled = round.high === null ? state : award(state, round, round.high)
  return yes(closeOrDraw(settled, now))
}

function award(state: RoomState, round: Round, high: { seat: number; amount: number }): RoomState {
  const slots = MODES[state.mode].slots
  return {
    ...state,
    seats: state.seats.map((seat, i) =>
      i === high.seat
        ? {
            ...seat,
            budget: seat.budget - high.amount,
            slots: place(seat, round.card, slots),
            paid: { ...seat.paid, [round.card.id]: high.amount },
          }
        : seat,
    ),
  }
}

/** A won card takes an open slot of its own position where there is one, and the
 *  first open slot otherwise — which is how an NBA centre ends up as the 6th man. */
function place(seat: Seat, card: BankCard, slots: string[]): (string | null)[] {
  const matching = slots.findIndex((label, i) => seat.slots[i] === null && label === card.position)
  const target = matching >= 0 ? matching : seat.slots.findIndex((c) => c === null)
  if (target < 0) return seat.slots // unreachable: a full roster cannot bid
  return seat.slots.map((c, i) => (i === target ? card.id : c))
}

/** The draft closes when every roster is full, and not one round earlier — a
 *  drafter who fills up early simply stops bidding while the others finish. */
function closeOrDraw(state: RoomState, now: number): RoomState {
  if (state.seats.every(isFull)) return { ...state, phase: 'judging', round: null }
  // Only reachable if the bank runs dry, which `start` sizes against. Closing
  // beats stalling forever on a card that will never come.
  return openRound(state, now) ?? { ...state, phase: 'judging', round: null }
}

/** Draw the next card off the front of the bank and start its round. A drawn card
 *  has left the bank whatever happens to it, so an unsold card is simply gone.
 *  Returns null when there is nothing left to draw. */
function openRound(state: RoomState, now: number): RoomState | null {
  const card = state.bank[0]
  if (card === undefined) return null

  return {
    ...state,
    bank: state.bank.slice(1),
    roundIndex: state.roundIndex + 1,
    round: {
      card,
      // Rotates one seat per round, so the right of first refusal goes around.
      openerSeat: state.roundIndex % state.seats.length,
      exclusiveUntil: new Date(now + state.config.openerMs).toISOString(),
      deadline: new Date(now + state.config.bidMs).toISOString(),
      high: null,
    },
  }
}
