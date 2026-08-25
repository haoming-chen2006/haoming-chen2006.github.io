// The game. Pure functions over RoomState — no clock, no randomness, no network,
// no React. The Edge Function runs this to decide what happens; the browser runs
// the same code to gray out buttons. One copy, so the two can never disagree.
//
// `now` is always epoch milliseconds supplied by the caller. In production that
// is the server's clock and nothing else, which is why browsers with skewed
// clocks cannot resolve a round early.

import { MODES } from './card.ts'
import type { Action, BankCard, PowerId, Result, RoomState, Round, Seat } from './state.ts'
import {
  MAX_SEATS,
  MIN_SEATS,
  OVERDRAFT,
  POWER_IDS,
  POWER_PICKS,
  SQUEEZE,
  holds,
  isFull,
  maxBid,
  newSeat,
  spend,
} from './state.ts'

const no = (reason: string): Result => ({ ok: false, reason })
const yes = (state: RoomState): Result => ({ ok: true, state })

export function apply(state: RoomState, action: Action, now: number): Result {
  switch (action.type) {
    case 'join':
      return join(state, action.seatId, action.name, action.powers)
    case 'start':
      return start(state, action.bank, now)
    case 'bid':
      return bid(state, action.seat, action.amount, now)
    case 'resolve':
      return resolve(state, now)
    case 'swap':
      return swap(state, action.seat, action.a, action.b)
    case 'power':
      return usePower(state, action.seat, action.power, now)
    case 'poach':
      return poach(state, action.seat, action.slot, action.target, action.targetSlot)
    case 'judge':
      return record(state, action.verdict, action.reveal)
  }
  // Every action above is handled, so this is unreachable — and if someone adds
  // an eighth without a case, the compiler stops them here rather than at runtime.
  return no(`${(action as { type: string }).type} is not an action`)
}

/** The verdict landing. Whoever's browser noticed first sends it; a second one
 *  arrives to find the ruling already in and changes nothing, so a race between
 *  four clients costs one wasted call and never two rulings. */
function record(
  state: RoomState,
  verdict: RoomState['verdict'],
  reveal: RoomState['reveal'],
): Result {
  if (state.phase !== 'judging') return yes(state)
  if (state.verdict !== null) return yes(state)
  if (verdict === null) return no('the judge returned nothing')
  return yes({ ...state, phase: 'done', verdict, reveal })
}

/** Taking a seat. The token is the identity: coming back with one you already
 *  hold is a reconnect and changes nothing, which is what makes a reload safe. */
function join(state: RoomState, seatId: string, name: string, powers: PowerId[]): Result {
  if (state.seats.some((seat) => seat.id === seatId)) return yes(state)
  if (state.phase !== 'lobby') return no('this draft has already started')
  if (state.seats.length >= MAX_SEATS) return no(`a room holds ${MAX_SEATS} drafters`)

  const called = name.trim()
  if (called.length === 0) return no('pick a name first')
  if (state.seats.some((seat) => seat.name.toLowerCase() === called.toLowerCase()))
    return no(`somebody here is already called ${called}`)

  const picked = powers.filter((p, i) => POWER_IDS.includes(p) && powers.indexOf(p) === i)
  if (picked.length !== POWER_PICKS) return no(`pick exactly ${POWER_PICKS} powers`)

  return yes({ ...state, seats: [...state.seats, newSeat(seatId, called, state.config, picked)] })
}

function start(state: RoomState, bank: BankCard[], now: number): Result {
  if (state.phase !== 'lobby') return no('the draft has already started')
  if (state.seats.length < MIN_SEATS) return no(`a draft needs at least ${MIN_SEATS} drafters`)

  // The pool is cut here rather than by the caller, so poolSize means one thing
  // and the rules are the ones enforcing scarcity.
  const pool = bank.slice(0, state.config.poolSize)

  // Only one roster's worth is required. A pool too small for everyone is not a
  // mistake any more — it is the game, and somebody is going home empty-handed.
  if (pool.length < state.config.rosterSize)
    return no(`the pool holds ${pool.length} cards and a roster needs ${state.config.rosterSize}`)

  const opened = openRound({ ...state, phase: 'auction', bank: pool }, now)
  return opened ? yes(opened) : no('the pool is empty')
}

/** What this seat may bid right now: its own limit, less any squeeze against it. */
function capFor(state: RoomState, seatIndex: number, seat: Seat): number {
  const squeezed = state.round?.squeezedBy
  const under = squeezed !== null && squeezed !== undefined && squeezed !== seatIndex
  return maxBid(seat) - (under ? SQUEEZE : 0)
}

function bid(state: RoomState, seatIndex: number, amount: number, now: number): Result {
  const round = state.round
  if (state.phase !== 'auction' || round === null) return no('no card is up for auction')

  const seat: Seat | undefined = state.seats[seatIndex]
  if (seat === undefined) return no(`there is no seat ${seatIndex}`)

  // Open from the first millisecond: no opener, no turns. Highest bid wins and a
  // tie goes to whoever got here first, which the standing bid already settles.
  if (now >= Date.parse(round.deadline)) return no('too late — the round has closed')

  if (isFull(seat)) return no('your roster is full')
  if (!Number.isInteger(amount)) return no('a bid is a whole number of dollars')

  const floor = round.high === null ? 1 : round.high.amount + 1
  if (amount < floor)
    return no(round.high === null ? 'the opening bid is $1' : `the next bid is $${floor}`)

  // Raising yourself only costs money and pushes the deadline back, so it is a
  // stalling move rather than a bid. The UI disables it; the rules refuse it.
  if (round.high?.seat === seatIndex) return no('you already hold the high bid')

  const ceiling = capFor(state, seatIndex, seat)
  if (amount > ceiling)
    return no(
      round.squeezedBy !== null && round.squeezedBy !== seatIndex
        ? `squeezed — $${ceiling} is your limit this round`
        : `$${ceiling} is your limit — you must keep a dollar for every other empty slot`,
    )

  return yes({
    ...state,
    round: {
      ...round,
      high: { seat: seatIndex, amount },
      // Every accepted bid restarts the full countdown.
      deadline: new Date(now + state.config.bidMs).toISOString(),
    },
  })
}

/** Rearranging your own lineup. Either end may be an empty slot — moving a card
 *  into a gap is the same move as trading two cards, and a drafter needs both to
 *  present the lineup they mean. Open until judging starts; shut afterwards, or a
 *  drafter could rewrite the roster the judge is already reading. */
function swap(state: RoomState, seatIndex: number, a: number, b: number): Result {
  if (state.phase !== 'lobby' && state.phase !== 'auction')
    return no('the lineups are locked once judging begins')

  const seat: Seat | undefined = state.seats[seatIndex]
  if (seat === undefined) return no(`there is no seat ${seatIndex}`)

  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < seat.slots.length
  if (!inRange(a) || !inRange(b)) return no('that is not one of your slots')
  if (a === b) return no('pick two different slots')

  const slots = [...seat.slots]
  const held = slots[a] ?? null
  slots[a] = slots[b] ?? null
  slots[b] = held

  return yes({
    ...state,
    seats: state.seats.map((s, i) => (i === seatIndex ? { ...s, slots } : s)),
  })
}

/** Nobody is awake to fire a timer, so every browser sends `resolve` when its own
 *  clock passes the deadline. Only the server's clock is consulted here, so an
 *  early one does nothing, the first on-time one does the work, and the rest land
 *  on a round that is already gone and do nothing either. */
function resolve(state: RoomState, now: number): Result {
  const round = state.round
  if (state.phase !== 'auction' || round === null) return yes(state)
  if (now < Date.parse(round.deadline)) return yes(state)

  // No bid: the card is unsold. It already left the pool when it was drawn, and
  // with a finite pool that is a card nobody will ever get.
  const settled = round.high === null ? state : award(state, round, round.high)
  return yes(closeOrDraw(settled, now))
}

function award(state: RoomState, round: Round, high: { seat: number; amount: number }): RoomState {
  const slots = MODES[state.mode].slots
  const winner = state.seats[high.seat]!
  // Overdraft comes off here, so the bidding stays honest and only the bill changes.
  const price = Math.max(1, high.amount - winner.discount)

  return {
    ...state,
    lastSale: { cardId: round.card.id, seat: high.seat, amount: price, roundIndex: state.roundIndex },
    seats: state.seats.map((seat, i) =>
      i === high.seat
        ? {
            ...seat,
            budget: seat.budget - price,
            slots: place(seat, round.card, slots),
            paid: { ...seat.paid, [round.card.id]: price },
            discount: 0,
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

/** The draft ends when every roster is full or the pool runs dry, whichever comes
 *  first. Anyone still holding an empty slot when the cards run out is eliminated,
 *  unless they had the sense to bring Insurance. */
function closeOrDraw(state: RoomState, now: number): RoomState {
  if (state.seats.every(isFull)) return close(state)
  return openRound(state, now) ?? close(state)
}

function close(state: RoomState): RoomState {
  return {
    ...state,
    phase: 'judging',
    round: null,
    seats: state.seats.map((seat) => {
      const gaps = seat.slots.filter((c) => c === null).length
      const forgiven = holds(seat, 'insurance') ? 1 : 0
      return {
        ...seat,
        eliminated: gaps > forgiven,
        powers: gaps > 0 && forgiven > 0 ? spend(seat, 'insurance') : seat.powers,
      }
    }),
  }
}

/** Draw the next card off the front of the pool and start its round. A drawn card
 *  has left the pool whatever happens to it. Returns null when it is empty. */
function openRound(state: RoomState, now: number): RoomState | null {
  const card = state.bank[0]
  if (card === undefined) return null

  return {
    ...state,
    bank: state.bank.slice(1),
    roundIndex: state.roundIndex + 1,
    round: {
      card,
      deadline: new Date(now + state.config.bidMs).toISOString(),
      high: null,
      scoutedBy: [],
      squeezedBy: null,
    },
  }
}

// ---------------------------------------------------------------- powers

function usePower(
  state: RoomState,
  seatIndex: number,
  power: Exclude<PowerId, 'poach' | 'insurance'>,
  now: number,
): Result {
  const seat: Seat | undefined = state.seats[seatIndex]
  if (seat === undefined) return no(`there is no seat ${seatIndex}`)
  if (!holds(seat, power)) return no('you do not have that one to spend')

  const round = state.round
  if (state.phase !== 'auction' || round === null) return no('there is no card on the block')

  const used = (next: Partial<RoomState>): Result =>
    yes({
      ...state,
      ...next,
      seats: (next.seats ?? state.seats).map((s, i) =>
        i === seatIndex ? { ...s, powers: spend(s, power) } : s,
      ),
    })

  switch (power) {
    case 'scout':
      // The pool ahead is only shown to whoever paid for it.
      return used({ round: { ...round, scoutedBy: [...round.scoutedBy, seatIndex] } })

    case 'overdraft':
      return used({
        seats: state.seats.map((s, i) => (i === seatIndex ? { ...s, discount: OVERDRAFT } : s)),
      })

    case 'squeeze':
      if (round.squeezedBy !== null) return no('someone has already squeezed this round')
      return used({ round: { ...round, squeezedBy: seatIndex } })

    case 'veto': {
      // The card is binned unsold and the next one comes straight up. It has
      // already left the pool, so with a finite pool this is a card destroyed.
      const binned: RoomState = { ...state, round: null }
      const next = openRound(binned, now) ?? close(binned)
      return used({ ...next, seats: next.seats })
    }

    case 'counterbid': {
      const sale = state.lastSale
      // One round of grace: take it while the ink is wet or not at all.
      if (sale === null || sale.roundIndex !== state.roundIndex - 1)
        return no('nothing has just sold')
      if (sale.seat === seatIndex) return no('you bought that one yourself')
      if (isFull(seat)) return no('your roster is full')

      const price = sale.amount + 1
      if (price > maxBid(seat)) return no(`taking it costs $${price}, past your limit`)

      const slots = MODES[state.mode].slots
      return used({
        lastSale: null,
        seats: state.seats.map((s, i) => {
          if (i === sale.seat) {
            // The original buyer is made whole and loses the card.
            const { [sale.cardId]: _refunded, ...paid } = s.paid
            return {
              ...s,
              budget: s.budget + sale.amount,
              slots: s.slots.map((c) => (c === sale.cardId ? null : c)),
              paid,
            }
          }
          if (i === seatIndex)
            return {
              ...s,
              budget: s.budget - price,
              slots: place(s, { id: sale.cardId, position: cardPosition(state, sale.cardId) }, slots),
              paid: { ...s.paid, [sale.cardId]: price },
            }
          return s
        }),
      })
    }
  }
}

/** Counterbid moves a card that has already left the pool, so its position has to
 *  come from the slot it is sitting in on the buyer's roster. */
function cardPosition(state: RoomState, cardId: string): string {
  const slots = MODES[state.mode].slots
  for (const seat of state.seats) {
    const at = seat.slots.indexOf(cardId)
    if (at >= 0) return slots[at] ?? ''
  }
  return ''
}

/** Trade one of your cards for a rival's, slot for slot. Both keep what they paid,
 *  because the point is the player, not a refund. */
function poach(
  state: RoomState,
  seatIndex: number,
  slot: number,
  target: number,
  targetSlot: number,
): Result {
  if (state.phase !== 'auction') return no('too late to poach')

  const seat: Seat | undefined = state.seats[seatIndex]
  const victim: Seat | undefined = state.seats[target]
  if (seat === undefined || victim === undefined) return no('no such seat')
  if (!holds(seat, 'poach')) return no('you do not have that one to spend')
  if (target === seatIndex) return no('poach someone else')

  const mine = seat.slots[slot] ?? null
  const theirs = victim.slots[targetSlot] ?? null
  if (mine === null || theirs === null) return no('both of you have to be holding a card')

  return yes({
    ...state,
    seats: state.seats.map((s, i) => {
      if (i === seatIndex)
        return {
          ...s,
          powers: spend(s, 'poach'),
          slots: s.slots.map((c, j) => (j === slot ? theirs : c)),
          paid: { ...s.paid, [theirs]: victim.paid[theirs] ?? 0 },
        }
      if (i === target)
        return {
          ...s,
          slots: s.slots.map((c, j) => (j === targetSlot ? mine : c)),
          paid: { ...s.paid, [mine]: seat.paid[mine] ?? 0 },
        }
      return s
    }),
  })
}
