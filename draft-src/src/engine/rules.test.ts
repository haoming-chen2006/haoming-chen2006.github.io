import { describe, expect, it } from 'vitest'
import { MODES, type ModeId } from './card'
import { apply } from './rules'
import {
  type BankCard,
  type Config,
  type Result,
  type RoomState,
  isFull,
  maxBid,
  newRoom,
  newSeat,
} from './state'

const T0 = Date.parse('2026-01-01T00:00:00.000Z')

/** Unwrap a successful result, or fail loudly with the rule's own words. */
function ok(result: Result): RoomState {
  if (!result.ok) throw new Error(`expected ok, got: ${result.reason}`)
  return result.state
}

function why(result: Result): string {
  if (result.ok) throw new Error('expected the rule to refuse, but it allowed it')
  return result.reason
}

/** A lobby with seats already in it. `join` is not a rule yet, so seats are built
 *  directly — which is also how the Edge Function will make them. */
function lobby(mode: ModeId, names: string[], config: Partial<Config> = {}): RoomState {
  const room = newRoom(mode, config)
  return { ...room, seats: names.map((name, i) => newSeat(`token-${i}`, name, room.config)) }
}

/** A pretend shuffled bank. Positions cycle through the mode's, so a test can say
 *  "the third card" and know what it is. */
function ids(mode: ModeId, n: number): BankCard[] {
  const positions = MODES[mode].positions
  return Array.from({ length: n }, (_, i) => ({
    id: `${mode}-${String(i + 1).padStart(3, '0')}`,
    position: positions[i % positions.length]!,
  }))
}

/** A room mid-auction on its first card, drawn at T0. */
function auction(mode: ModeId, names: string[], config: Partial<Config> = {}): RoomState {
  return ok(apply(lobby(mode, names, config), { type: 'start', bank: ids(mode, 60) }, T0))
}

/** Same room, but that seat has `filled` of its slots already taken. */
function withFilled(state: RoomState, seatIndex: number, filled: number): RoomState {
  return {
    ...state,
    seats: state.seats.map((seat, i) =>
      i === seatIndex
        ? { ...seat, slots: seat.slots.map((c, s) => (s < filled ? `filler-${seatIndex}-${s}` : c)) }
        : seat,
    ),
  }
}

const withFullRoster = (state: RoomState, seatIndex: number): RoomState =>
  withFilled(state, seatIndex, state.config.rosterSize)

describe('start', () => {
  it('moves a two-seat lobby into the auction and draws a card', () => {
    const state = ok(apply(lobby('nba', ['Ada', 'Bo']), { type: 'start', bank: ids('nba', 40) }, T0))

    expect(state.phase).toBe('auction')
    expect(state.round?.card.id).toBe('nba-001')
    expect(state.round?.openerSeat).toBe(0)
    expect(state.round?.high).toBeNull()
    expect(state.roundIndex).toBe(1)
  })

  it('takes the drawn card off the bank', () => {
    const bank = ids('nba', 40)
    const state = ok(apply(lobby('nba', ['Ada', 'Bo']), { type: 'start', bank }, T0))

    expect(state.bank).toHaveLength(39)
    expect(state.bank.map((c) => c.id)).not.toContain('nba-001')
  })

  it('sets the opener window inside the round, both off the caller’s clock', () => {
    const state = ok(apply(lobby('nba', ['Ada', 'Bo']), { type: 'start', bank: ids('nba', 40) }, T0))

    expect(state.round?.exclusiveUntil).toBe(new Date(T0 + 6_000).toISOString())
    expect(state.round?.deadline).toBe(new Date(T0 + 8_000).toISOString())
  })

  it('refuses a lobby with one drafter', () => {
    const result = apply(lobby('nba', ['Ada']), { type: 'start', bank: ids('nba', 40) }, T0)

    expect(why(result)).toMatch(/at least 2 drafters/)
  })

  it('refuses a bank too small to fill every roster', () => {
    // Four seats of six slots need 24 cards; 23 can never finish.
    const result = apply(lobby('nba', ['Ada', 'Bo', 'Cy', 'Di']), { type: 'start', bank: ids('nba', 23) }, T0)

    expect(why(result)).toMatch(/needs 24/)
  })

  it('refuses to start twice', () => {
    const started = ok(apply(lobby('nba', ['Ada', 'Bo']), { type: 'start', bank: ids('nba', 40) }, T0))
    const again = apply(started, { type: 'start', bank: ids('nba', 40) }, T0)

    expect(why(again)).toMatch(/already started/)
  })

  it('leaves the state it was handed untouched', () => {
    const before = lobby('nba', ['Ada', 'Bo'])
    const snapshot = structuredClone(before)
    apply(before, { type: 'start', bank: ids('nba', 40) }, T0)

    expect(before).toEqual(snapshot)
  })
})

describe('bidding', () => {
  const OPENER = 0
  const OTHER = 1
  const DURING_WINDOW = T0 + 1_000
  const AFTER_WINDOW = T0 + 6_500

  it('opens at $1 and no lower', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: OPENER, amount: 0 }, DURING_WINDOW))).toMatch(
      /opening bid is \$1/,
    )
    expect(ok(apply(state, { type: 'bid', seat: OPENER, amount: 1 }, DURING_WINDOW)).round?.high)
      .toEqual({ seat: OPENER, amount: 1 })
  })

  it('takes a raise of at least $1 and refuses a matching bid', () => {
    const opened = ok(apply(auction('nba', ['Ada', 'Bo']), { type: 'bid', seat: OPENER, amount: 4 }, DURING_WINDOW))

    expect(why(apply(opened, { type: 'bid', seat: OTHER, amount: 4 }, AFTER_WINDOW))).toMatch(
      /next bid is \$5/,
    )
    expect(ok(apply(opened, { type: 'bid', seat: OTHER, amount: 5 }, AFTER_WINDOW)).round?.high)
      .toEqual({ seat: OTHER, amount: 5 })
  })

  it('refuses a drafter whose roster is already full', () => {
    const state = withFullRoster(auction('nba', ['Ada', 'Bo']), OTHER)

    expect(why(apply(state, { type: 'bid', seat: OTHER, amount: 1 }, AFTER_WINDOW))).toMatch(
      /roster is full/,
    )
  })

  it('keeps everyone but the opener out until the window closes', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: OTHER, amount: 1 }, DURING_WINDOW))).toMatch(
      /opener has the first bid/,
    )
    expect(ok(apply(state, { type: 'bid', seat: OPENER, amount: 1 }, DURING_WINDOW)).round?.high?.seat)
      .toBe(OPENER)
    // The window is over the moment it is reached, not a tick later.
    expect(ok(apply(state, { type: 'bid', seat: OTHER, amount: 1 }, T0 + 6_000)).round?.high?.seat)
      .toBe(OTHER)
  })

  it('caps a bid at budget minus a dollar for every other empty slot', () => {
    // $20 and six empty slots: bid at most $15 and keep $5 for the other five.
    const state = auction('nba', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: OPENER, amount: 16 }, DURING_WINDOW))).toMatch(
      /\$15 is your limit/,
    )
    expect(ok(apply(state, { type: 'bid', seat: OPENER, amount: 15 }, DURING_WINDOW)).round?.high?.amount)
      .toBe(15)
  })

  it('caps at $16 in a five-slot mode, as the spec says it should', () => {
    const state = auction('hok', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: OPENER, amount: 17 }, DURING_WINDOW))).toMatch(
      /\$16 is your limit/,
    )
    expect(ok(apply(state, { type: 'bid', seat: OPENER, amount: 16 }, DURING_WINDOW)).round?.high?.amount)
      .toBe(16)
  })

  it('restarts the countdown on every accepted bid, but not the opener window', () => {
    const state = auction('nba', ['Ada', 'Bo'])
    const bid = ok(apply(state, { type: 'bid', seat: OPENER, amount: 2 }, T0 + 5_000))

    expect(bid.round?.deadline).toBe(new Date(T0 + 5_000 + 8_000).toISOString())
    expect(bid.round?.exclusiveUntil).toBe(state.round?.exclusiveUntil)
  })

  it('refuses a bid once the deadline has passed', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: OPENER, amount: 3 }, T0 + 8_000))).toMatch(/too late/)
  })

  it('refuses a drafter raising their own standing bid', () => {
    const opened = ok(apply(auction('nba', ['Ada', 'Bo']), { type: 'bid', seat: OPENER, amount: 3 }, DURING_WINDOW))

    expect(why(apply(opened, { type: 'bid', seat: OPENER, amount: 4 }, AFTER_WINDOW))).toMatch(
      /already hold the high bid/,
    )
  })

  it('refuses cents and refuses a seat that does not exist', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: OPENER, amount: 2.5 }, DURING_WINDOW))).toMatch(
      /whole number of dollars/,
    )
    expect(why(apply(state, { type: 'bid', seat: 9, amount: 1 }, DURING_WINDOW))).toMatch(/no seat 9/)
  })
})

describe('resolving a round', () => {
  const OPENER = 0
  const OTHER = 1

  /** Ada opens at $5 one second in, so the round now runs to T0+9s. */
  function bidPlaced() {
    const state = ok(apply(auction('nba', ['Ada', 'Bo']), { type: 'bid', seat: OPENER, amount: 5 }, T0 + 1_000))
    return { state, deadline: Date.parse(state.round!.deadline) }
  }

  it('does nothing a millisecond before the deadline', () => {
    const { state, deadline } = bidPlaced()

    expect(ok(apply(state, { type: 'resolve' }, deadline - 1))).toEqual(state)
  })

  it('awards the card and charges the exact bid a millisecond after', () => {
    const { state, deadline } = bidPlaced()
    const after = ok(apply(state, { type: 'resolve' }, deadline + 1))
    const ada = after.seats[OPENER]!

    expect(ada.budget).toBe(15)
    expect(ada.slots).toContain('nba-001')
    expect(ada.paid).toEqual({ 'nba-001': 5 })
    expect(after.seats[OTHER]!.budget).toBe(20)
  })

  it('charges nobody else and moves straight on to the next card', () => {
    const { state, deadline } = bidPlaced()
    const after = ok(apply(state, { type: 'resolve' }, deadline + 1))

    expect(after.phase).toBe('auction')
    expect(after.round?.card.id).toBe('nba-002')
    expect(after.round?.high).toBeNull()
    expect(after.roundIndex).toBe(2)
    // The right of first refusal has moved one seat along.
    expect(after.round?.openerSeat).toBe(1)
  })

  it('drops an unsold card and draws the next one', () => {
    const state = auction('nba', ['Ada', 'Bo'])
    const after = ok(apply(state, { type: 'resolve' }, T0 + 8_001))

    expect(after.seats.every((s) => s.slots.every((c) => c === null))).toBe(true)
    expect(after.seats.every((s) => s.budget === 20)).toBe(true)
    expect(after.round?.card.id).toBe('nba-002')
    // Drawn is gone: nba-001 is neither on a roster nor back in the bank.
    expect(after.bank.map((c) => c.id)).not.toContain('nba-001')
  })

  it('is harmless when a second browser sends it late', () => {
    const { state, deadline } = bidPlaced()
    const once = ok(apply(state, { type: 'resolve' }, deadline + 1))
    const twice = ok(apply(once, { type: 'resolve' }, deadline + 2))

    // The second lands on the new round, which is nowhere near its own deadline.
    expect(twice).toEqual(once)
    expect(twice.seats[OPENER]!.budget).toBe(15)
  })
})

describe('the end of the draft', () => {
  /** Play a whole draft: whoever still has a slot open takes the card for $1.
   *  Returns the finished room and how many rounds it took. */
  function playOut(mode: ModeId, names: string[]) {
    let state = ok(apply(lobby(mode, names), { type: 'start', bank: ids(mode, 80) }, T0))
    let rounds = 0

    while (state.phase === 'auction' && rounds++ < 200) {
      // Everyone with an empty roster slot is still full and unfinished, so the
      // draft must not have closed on us.
      if (state.seats.some((seat) => !isFull(seat))) expect(state.phase).toBe('auction')

      const buyer = state.seats.findIndex((seat) => !isFull(seat))
      const openToAll = Date.parse(state.round!.exclusiveUntil)
      const bid = apply(state, { type: 'bid', seat: buyer, amount: 1 }, openToAll)
      if (bid.ok) state = bid.state

      state = ok(apply(state, { type: 'resolve' }, Date.parse(state.round!.deadline) + 1))
    }

    return { state, rounds }
  }

  it('ends a four-seat draft with four full rosters and nobody in the red', () => {
    const { state, rounds } = playOut('nba', ['Ada', 'Bo', 'Cy', 'Di'])

    expect(state.phase).toBe('judging')
    expect(state.round).toBeNull()
    expect(state.seats).toHaveLength(4)
    for (const seat of state.seats) {
      expect(seat.slots.filter((c) => c !== null)).toHaveLength(6)
      expect(seat.budget).toBeGreaterThanOrEqual(0)
    }
    // 4 seats x 6 slots, one card each round, nothing wasted.
    expect(rounds).toBe(24)
  })

  it('ends a five-slot Honor of Kings draft the same way', () => {
    const { state } = playOut('hok', ['Ada', 'Bo', 'Cy'])

    expect(state.phase).toBe('judging')
    for (const seat of state.seats) expect(seat.slots.filter((c) => c !== null)).toHaveLength(5)
  })

  it('cannot lock anyone out, even when every drafter bids the most they legally can', () => {
    // The whole point of the budget - (emptySlots - 1) cap. If it were wrong,
    // someone would run out of money with slots still to fill and the draft
    // could never close.
    let state = ok(apply(lobby('nba', ['Ada', 'Bo', 'Cy', 'Di']), { type: 'start', bank: ids('nba', 80) }, T0))
    let rounds = 0

    while (state.phase === 'auction' && rounds++ < 200) {
      const openToAll = Date.parse(state.round!.exclusiveUntil)
      // Every seat with room shoves its entire legal limit in, in turn.
      for (const [i, seat] of state.seats.entries()) {
        if (isFull(seat)) continue
        const bid = apply(state, { type: 'bid', seat: i, amount: maxBid(seat) }, openToAll)
        if (bid.ok) state = bid.state
      }
      state = ok(apply(state, { type: 'resolve' }, Date.parse(state.round!.deadline) + 1))
    }

    expect(state.phase).toBe('judging')
    for (const seat of state.seats) {
      expect(seat.slots.filter((c) => c !== null)).toHaveLength(6)
      expect(seat.budget).toBeGreaterThanOrEqual(0)
    }
  })

  it('stays open while one drafter still has a slot to fill', () => {
    // Ada is done, Bo needs two more. Bo takes one; the draft carries on.
    const started = auction('hok', ['Ada', 'Bo'])
    const state = withFilled(withFullRoster(started, 0), 1, 3)
    const bid = ok(apply(state, { type: 'bid', seat: 1, amount: 1 }, T0 + 6_500))
    const after = ok(apply(bid, { type: 'resolve' }, Date.parse(bid.round!.deadline) + 1))

    expect(after.phase).toBe('auction')
    expect(after.round).not.toBeNull()
  })

  it('closes the moment the last slot is filled', () => {
    const started = auction('hok', ['Ada', 'Bo'])
    const state = withFilled(withFullRoster(started, 0), 1, 4)
    const bid = ok(apply(state, { type: 'bid', seat: 1, amount: 1 }, T0 + 6_500))
    const after = ok(apply(bid, { type: 'resolve' }, Date.parse(bid.round!.deadline) + 1))

    expect(after.phase).toBe('judging')
    expect(after.round).toBeNull()
  })
})
