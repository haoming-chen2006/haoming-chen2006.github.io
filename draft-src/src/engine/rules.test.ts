import { describe, expect, it } from 'vitest'
import type { CardId, ModeId } from './card'
import { apply } from './rules'
import { type Config, type Result, type RoomState, newRoom, newSeat } from './state'

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

const ids = (mode: ModeId, n: number): CardId[] =>
  Array.from({ length: n }, (_, i) => `${mode}-${String(i + 1).padStart(3, '0')}`)

/** A room mid-auction on its first card, drawn at T0. */
function auction(mode: ModeId, names: string[], config: Partial<Config> = {}): RoomState {
  return ok(apply(lobby(mode, names, config), { type: 'start', bank: ids(mode, 60) }, T0))
}

/** Same room, but that seat's roster is already full. */
function withFullRoster(state: RoomState, seatIndex: number): RoomState {
  return {
    ...state,
    seats: state.seats.map((seat, i) =>
      i === seatIndex ? { ...seat, slots: seat.slots.map((_, s) => `filler-${s}`) } : seat,
    ),
  }
}

describe('start', () => {
  it('moves a two-seat lobby into the auction and draws a card', () => {
    const state = ok(apply(lobby('nba', ['Ada', 'Bo']), { type: 'start', bank: ids('nba', 40) }, T0))

    expect(state.phase).toBe('auction')
    expect(state.round?.cardId).toBe('nba-001')
    expect(state.round?.openerSeat).toBe(0)
    expect(state.round?.high).toBeNull()
    expect(state.roundIndex).toBe(1)
  })

  it('takes the drawn card off the bank', () => {
    const bank = ids('nba', 40)
    const state = ok(apply(lobby('nba', ['Ada', 'Bo']), { type: 'start', bank }, T0))

    expect(state.bank).toHaveLength(39)
    expect(state.bank).not.toContain('nba-001')
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
