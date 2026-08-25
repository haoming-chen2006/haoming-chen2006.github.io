// The game. Pure functions over RoomState — no clock, no randomness, no network,
// no React. The Edge Function runs this to decide what happens; the browser runs
// the same code to gray out buttons. One copy, so the two can never disagree.
//
// `now` is always epoch milliseconds supplied by the caller. In production that
// is the server's clock and nothing else, which is why browsers with skewed
// clocks cannot resolve a round early.

import type { Action, Result, RoomState, Seat } from './state'
import { MIN_SEATS, isFull, maxBid } from './state'

const no = (reason: string): Result => ({ ok: false, reason })
const yes = (state: RoomState): Result => ({ ok: true, state })

export function apply(state: RoomState, action: Action, now: number): Result {
  switch (action.type) {
    case 'start':
      return start(state, action.bank, now)
    case 'bid':
      return bid(state, action.seat, action.amount, now)
    default:
      return no(`${action.type} is not handled yet`)
  }
}

function start(state: RoomState, bank: string[], now: number): Result {
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

/** Draw the next card off the front of the bank and start its round. A drawn card
 *  has left the bank whatever happens to it, so an unsold card is simply gone.
 *  Returns null when there is nothing left to draw. */
function openRound(state: RoomState, now: number): RoomState | null {
  const cardId = state.bank[0]
  if (cardId === undefined) return null

  return {
    ...state,
    bank: state.bank.slice(1),
    roundIndex: state.roundIndex + 1,
    round: {
      cardId,
      // Rotates one seat per round, so the right of first refusal goes around.
      openerSeat: state.roundIndex % state.seats.length,
      exclusiveUntil: new Date(now + state.config.openerMs).toISOString(),
      deadline: new Date(now + state.config.bidMs).toISOString(),
      high: null,
    },
  }
}
