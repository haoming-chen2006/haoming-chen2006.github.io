// The game. Pure functions over RoomState — no clock, no randomness, no network,
// no React. The Edge Function runs this to decide what happens; the browser runs
// the same code to gray out buttons. One copy, so the two can never disagree.
//
// `now` is always epoch milliseconds supplied by the caller. In production that
// is the server's clock and nothing else, which is why browsers with skewed
// clocks cannot resolve a round early.

import type { Action, Result, RoomState } from './state'
import { MIN_SEATS } from './state'

const no = (reason: string): Result => ({ ok: false, reason })
const yes = (state: RoomState): Result => ({ ok: true, state })

export function apply(state: RoomState, action: Action, now: number): Result {
  switch (action.type) {
    case 'start':
      return start(state, action.bank, now)
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
