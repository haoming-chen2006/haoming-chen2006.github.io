import { describe, expect, it } from 'vitest'
import { MODES, type ModeId } from './card'
import { apply } from './rules'
import {
  type BankCard,
  type Config,
  type PowerId,
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
function lobby(
  mode: ModeId,
  names: string[],
  config: Partial<Config> = {},
  powers: PowerId[] = [],
): RoomState {
  const room = newRoom(mode, config)
  return {
    ...room,
    seats: names.map((name, i) => newSeat(`token-${i}`, name, room.config, powers)),
  }
}

/** A pretend shuffled pool. Positions cycle through the mode's, so a test can say
 *  "the third card" and know what it is. */
function ids(mode: ModeId, n: number): BankCard[] {
  const positions = MODES[mode].positions
  return Array.from({ length: n }, (_, i) => ({
    id: `${mode}-${String(i + 1).padStart(3, '0')}`,
    position: positions[i % positions.length]!,
  }))
}

/** A room mid-auction on its first card, drawn at T0. */
function auction(
  mode: ModeId,
  names: string[],
  config: Partial<Config> = {},
  powers: PowerId[] = [],
): RoomState {
  return ok(apply(lobby(mode, names, config, powers), { type: 'start', bank: ids(mode, 200) }, T0))
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

/** Let the current card go unsold and move on. */
const passOn = (state: RoomState): RoomState =>
  ok(apply(state, { type: 'resolve' }, Date.parse(state.round!.deadline) + 1))

/** That seat takes the card currently up. */
function win(state: RoomState, seat: number, amount = 1): RoomState {
  const bid = ok(apply(state, { type: 'bid', seat, amount }, T0 + 1))
  return ok(apply(bid, { type: 'resolve' }, Date.parse(bid.round!.deadline) + 1))
}

describe('start', () => {
  it('moves a two-seat lobby into the auction and draws a card', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(state.phase).toBe('auction')
    expect(state.round?.card.id).toBe('nba-001')
    expect(state.round?.high).toBeNull()
    expect(state.roundIndex).toBe(1)
  })

  it('cuts the pool to poolSize and takes the drawn card off it', () => {
    const state = auction('nba', ['Ada', 'Bo'], { poolSize: 40 })

    expect(state.bank).toHaveLength(39)
    expect(state.bank.map((c) => c.id)).not.toContain('nba-001')
  })

  it('runs an open round from the first millisecond, with no opener window', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(state.round?.deadline).toBe(new Date(T0 + 8_000).toISOString())
    expect(state.round).not.toHaveProperty('exclusiveUntil')
    expect(state.round).not.toHaveProperty('openerSeat')
  })

  it('allows a pool too small for everyone, because that is now the game', () => {
    // Four seats need 24 cards. Twelve means at least two people go home short.
    const state = auction('nba', ['Ada', 'Bo', 'Cy', 'Di'], { poolSize: 12 })

    expect(state.phase).toBe('auction')
    expect(state.bank).toHaveLength(11)
  })

  it('refuses a pool too small for even one roster', () => {
    const result = apply(
      lobby('nba', ['Ada', 'Bo'], { poolSize: 5 }),
      { type: 'start', bank: ids('nba', 200) },
      T0,
    )

    expect(why(result)).toMatch(/a roster needs 6/)
  })

  it('refuses a lobby with one drafter, and refuses to start twice', () => {
    expect(why(apply(lobby('nba', ['Ada']), { type: 'start', bank: ids('nba', 40) }, T0))).toMatch(
      /at least 2 drafters/,
    )
    expect(
      why(apply(auction('nba', ['Ada', 'Bo']), { type: 'start', bank: ids('nba', 40) }, T0)),
    ).toMatch(/already started/)
  })

  it('leaves the state it was handed untouched', () => {
    const before = lobby('nba', ['Ada', 'Bo'])
    const snapshot = structuredClone(before)
    apply(before, { type: 'start', bank: ids('nba', 40) }, T0)

    expect(before).toEqual(snapshot)
  })
})

describe('bidding', () => {
  it('is open to everyone the instant the card lands', () => {
    const state = auction('nba', ['Ada', 'Bo', 'Cy'])

    // No turn order at all: the third seat can take the very first bid.
    expect(ok(apply(state, { type: 'bid', seat: 2, amount: 1 }, T0)).round?.high).toEqual({
      seat: 2,
      amount: 1,
    })
  })

  it('opens at $1 and no lower', () => {
    expect(why(apply(auction('nba', ['Ada', 'Bo']), { type: 'bid', seat: 0, amount: 0 }, T0))).toMatch(
      /opening bid is \$1/,
    )
  })

  it('takes a raise of at least $1 and refuses a matching bid', () => {
    const opened = ok(apply(auction('nba', ['Ada', 'Bo']), { type: 'bid', seat: 0, amount: 4 }, T0))

    expect(why(apply(opened, { type: 'bid', seat: 1, amount: 4 }, T0 + 1))).toMatch(/next bid is \$5/)
    expect(ok(apply(opened, { type: 'bid', seat: 1, amount: 5 }, T0 + 1)).round?.high).toEqual({
      seat: 1,
      amount: 5,
    })
  })

  it('refuses a drafter whose roster is already full', () => {
    const state = withFullRoster(auction('nba', ['Ada', 'Bo']), 1)

    expect(why(apply(state, { type: 'bid', seat: 1, amount: 1 }, T0))).toMatch(/roster is full/)
  })

  it('caps a bid at budget minus a dollar for every other empty slot', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: 0, amount: 16 }, T0))).toMatch(/\$15 is your limit/)
    expect(ok(apply(state, { type: 'bid', seat: 0, amount: 15 }, T0)).round?.high?.amount).toBe(15)
  })

  it('caps at $16 in a five-slot mode, as the spec says it should', () => {
    expect(why(apply(auction('hok', ['Ada', 'Bo']), { type: 'bid', seat: 0, amount: 17 }, T0))).toMatch(
      /\$16 is your limit/,
    )
  })

  it('restarts the countdown on every accepted bid', () => {
    const bid = ok(
      apply(auction('nba', ['Ada', 'Bo']), { type: 'bid', seat: 0, amount: 2 }, T0 + 5_000),
    )

    expect(bid.round?.deadline).toBe(new Date(T0 + 13_000).toISOString())
  })

  it('refuses a bid past the deadline, and a drafter raising themselves', () => {
    const state = auction('nba', ['Ada', 'Bo'])
    expect(why(apply(state, { type: 'bid', seat: 0, amount: 3 }, T0 + 8_000))).toMatch(/too late/)

    const opened = ok(apply(state, { type: 'bid', seat: 0, amount: 3 }, T0))
    expect(why(apply(opened, { type: 'bid', seat: 0, amount: 4 }, T0 + 1))).toMatch(
      /already hold the high bid/,
    )
  })

  it('refuses cents and a seat that does not exist', () => {
    const state = auction('nba', ['Ada', 'Bo'])

    expect(why(apply(state, { type: 'bid', seat: 0, amount: 2.5 }, T0))).toMatch(/whole number/)
    expect(why(apply(state, { type: 'bid', seat: 9, amount: 1 }, T0))).toMatch(/no seat 9/)
  })
})

describe('resolving a round', () => {
  function bidPlaced() {
    const state = ok(
      apply(auction('nba', ['Ada', 'Bo']), { type: 'bid', seat: 0, amount: 5 }, T0 + 1_000),
    )
    return { state, deadline: Date.parse(state.round!.deadline) }
  }

  it('does nothing a millisecond before the deadline', () => {
    const { state, deadline } = bidPlaced()

    expect(ok(apply(state, { type: 'resolve' }, deadline - 1))).toEqual(state)
  })

  it('awards the card and charges the exact bid a millisecond after', () => {
    const { state, deadline } = bidPlaced()
    const after = ok(apply(state, { type: 'resolve' }, deadline + 1))

    expect(after.seats[0]!.budget).toBe(15)
    expect(after.seats[0]!.slots).toContain('nba-001')
    expect(after.seats[0]!.paid).toEqual({ 'nba-001': 5 })
    expect(after.seats[1]!.budget).toBe(20)
  })

  it('burns an unsold card and draws the next', () => {
    const after = passOn(auction('nba', ['Ada', 'Bo']))

    expect(after.round?.card.id).toBe('nba-002')
    expect(after.bank.map((c) => c.id)).not.toContain('nba-001')
    expect(after.seats.every((s) => s.budget === 20)).toBe(true)
  })

  it('is harmless when a second browser sends it late', () => {
    const { state, deadline } = bidPlaced()
    const once = ok(apply(state, { type: 'resolve' }, deadline + 1))

    expect(ok(apply(once, { type: 'resolve' }, deadline + 2))).toEqual(once)
  })
})

describe('the end of the draft', () => {
  /** Play it out: whoever still has a slot open takes the card for $1. */
  function playOut(mode: ModeId, names: string[], config: Partial<Config> = {}) {
    let state = auction(mode, names, config)
    let rounds = 1

    while (state.phase === 'auction' && rounds++ < 400) {
      if (state.seats.some((seat) => !isFull(seat))) expect(state.phase).toBe('auction')
      const buyer = state.seats.findIndex((seat) => !isFull(seat))
      if (buyer >= 0) {
        const bid = apply(state, { type: 'bid', seat: buyer, amount: 1 }, T0)
        if (bid.ok) state = bid.state
      }
      state = ok(apply(state, { type: 'resolve' }, Date.parse(state.round!.deadline) + 1))
    }

    return { state, rounds }
  }

  it('ends a four-seat draft with four full rosters and nobody in the red', () => {
    const { state } = playOut('nba', ['Ada', 'Bo', 'Cy', 'Di'])

    expect(state.phase).toBe('judging')
    expect(state.round).toBeNull()
    for (const seat of state.seats) {
      expect(seat.slots.filter((c) => c !== null)).toHaveLength(6)
      expect(seat.budget).toBeGreaterThanOrEqual(0)
      expect(seat.eliminated).toBe(false)
    }
  })

  it('cannot lock anyone out, even when every drafter bids the most they legally can', () => {
    let state = auction('nba', ['Ada', 'Bo', 'Cy', 'Di'], { poolSize: 200 })
    let rounds = 0

    while (state.phase === 'auction' && rounds++ < 400) {
      for (const [i, seat] of state.seats.entries()) {
        if (isFull(seat)) continue
        const bid = apply(state, { type: 'bid', seat: i, amount: maxBid(seat) }, T0)
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

  it('closes when the pool runs dry and knocks out whoever is short', () => {
    // Eight cards, two drafters, six slots each. Ada takes all eight; Bo is out.
    let state = auction('nba', ['Ada', 'Bo'], { poolSize: 8 })
    while (state.phase === 'auction') {
      const bid = apply(state, { type: 'bid', seat: 0, amount: 1 }, T0)
      if (bid.ok) state = bid.state
      state = ok(apply(state, { type: 'resolve' }, Date.parse(state.round!.deadline) + 1))
    }

    expect(state.phase).toBe('judging')
    expect(state.seats[0]!.eliminated).toBe(false)
    expect(state.seats[1]!.eliminated).toBe(true)
  })

  it('forgives exactly one empty slot for a drafter holding Insurance', () => {
    /** Ada buys all but `gaps` of a five-card pool, then the cards run out. */
    function short(gaps: number, powers: PowerId[]) {
      let state = auction('hok', ['Ada', 'Bo'], { poolSize: 5 }, powers)
      let bought = 0
      while (state.phase === 'auction') {
        if (bought < 5 - gaps) {
          const bid = apply(state, { type: 'bid', seat: 0, amount: 1 }, T0)
          if (bid.ok) {
            state = bid.state
            bought++
          }
        }
        state = ok(apply(state, { type: 'resolve' }, Date.parse(state.round!.deadline) + 1))
      }
      return state.seats[0]!
    }

    expect(short(1, ['insurance']).eliminated).toBe(false)
    expect(short(1, ['scout']).eliminated).toBe(true)
    // Two gaps is one too many even with Insurance.
    expect(short(2, ['insurance']).eliminated).toBe(true)
  })
})

describe('slots', () => {
  it('puts a won card in an open slot of its own position', () => {
    const smallForward = passOn(passOn(auction('nba', ['Ada', 'Bo'])))
    expect(smallForward.round?.card).toEqual({ id: 'nba-003', position: 'SF' })

    expect(win(smallForward, 0).seats[0]!.slots).toEqual([null, null, 'nba-003', null, null, null])
  })

  it('falls back to the first open slot, which is how a centre becomes the 6th man', () => {
    const state = withFilled(auction('nba', ['Ada', 'Bo']), 0, 5)

    expect(MODES.nba.slots[5]).toBe('6th')
    expect(win(state, 0).seats[0]!.slots[5]).toBe('nba-001')
  })

  it('swaps two of a drafter’s own slots and refuses nonsense', () => {
    const withPg = win(auction('nba', ['Ada', 'Bo']), 0)

    expect(ok(apply(withPg, { type: 'swap', seat: 0, a: 0, b: 5 }, T0)).seats[0]!.slots).toEqual([
      null,
      null,
      null,
      null,
      null,
      'nba-001',
    ])
    expect(why(apply(withPg, { type: 'swap', seat: 0, a: 0, b: 9 }, T0))).toMatch(
      /not one of your slots/,
    )
    expect(why(apply(withPg, { type: 'swap', seat: 0, a: 2, b: 2 }, T0))).toMatch(
      /two different slots/,
    )
  })

  it('locks the lineups once judging begins', () => {
    const nearlyDone = withFilled(withFullRoster(auction('hok', ['Ada', 'Bo']), 0), 1, 4)
    const judging = win(nearlyDone, 1)
    expect(judging.phase).toBe('judging')

    expect(why(apply(judging, { type: 'swap', seat: 0, a: 0, b: 1 }, T0))).toMatch(
      /locked once judging/,
    )
  })
})

describe('powers', () => {
  const armed = (powers: PowerId[]) => auction('nba', ['Ada', 'Bo'], {}, powers)

  it('spends itself, and will not be spent twice', () => {
    const once = ok(apply(armed(['scout']), { type: 'power', seat: 0, power: 'scout' }, T0))

    expect(once.seats[0]!.powers).toEqual([{ id: 'scout', used: true }])
    expect(why(apply(once, { type: 'power', seat: 0, power: 'scout' }, T0))).toMatch(
      /do not have that one/,
    )
  })

  it('refuses a power the drafter never picked', () => {
    expect(why(apply(armed(['scout']), { type: 'power', seat: 0, power: 'veto' }, T0))).toMatch(
      /do not have that one/,
    )
  })

  it('Scout marks who may see what is coming, and only them', () => {
    const scouted = ok(apply(armed(['scout']), { type: 'power', seat: 0, power: 'scout' }, T0))

    expect(scouted.round?.scoutedBy).toEqual([0])
  })

  it('Overdraft takes $5 off the next win, never below $1', () => {
    const state = ok(apply(armed(['overdraft']), { type: 'power', seat: 0, power: 'overdraft' }, T0))
    expect(state.seats[0]!.discount).toBe(5)

    const won = win(state, 0, 12)
    expect(won.seats[0]!.budget).toBe(13) // bid $12, billed $7
    expect(won.seats[0]!.paid['nba-001']).toBe(7)
    expect(won.seats[0]!.discount).toBe(0) // spent, not lingering

    const cheap = win(
      ok(apply(armed(['overdraft']), { type: 'power', seat: 0, power: 'overdraft' }, T0)),
      0,
      2,
    )
    expect(cheap.seats[0]!.paid['nba-001']).toBe(1)
  })

  it('Veto bins the card on the block and brings the next one straight up', () => {
    const state = ok(apply(armed(['veto']), { type: 'power', seat: 0, power: 'veto' }, T0))

    expect(state.round?.card.id).toBe('nba-002')
    expect(state.bank.map((c) => c.id)).not.toContain('nba-001')
    expect(state.seats.every((s) => s.slots.every((c) => c === null))).toBe(true)
  })

  it('Squeeze drops everyone else’s limit by $4, and only one drafter may do it', () => {
    const state = ok(apply(armed(['squeeze']), { type: 'power', seat: 0, power: 'squeeze' }, T0))

    expect(why(apply(state, { type: 'bid', seat: 1, amount: 12 }, T0))).toMatch(/squeezed — \$11/)
    expect(ok(apply(state, { type: 'bid', seat: 1, amount: 11 }, T0)).round?.high?.amount).toBe(11)
    // The squeezer keeps their own full limit.
    expect(ok(apply(state, { type: 'bid', seat: 0, amount: 15 }, T0)).round?.high?.amount).toBe(15)
  })

  it('Counterbid takes the card just sold, refunding the drafter who lost it', () => {
    const sold = win(auction('nba', ['Ada', 'Bo'], {}, ['counterbid']), 0, 6)
    expect(sold.seats[0]!.slots).toContain('nba-001')

    const taken = ok(apply(sold, { type: 'power', seat: 1, power: 'counterbid' }, T0))

    expect(taken.seats[1]!.slots).toContain('nba-001')
    expect(taken.seats[1]!.budget).toBe(13) // paid $7
    expect(taken.seats[1]!.paid['nba-001']).toBe(7)
    // Ada is made whole and no longer holds it.
    expect(taken.seats[0]!.slots).not.toContain('nba-001')
    expect(taken.seats[0]!.budget).toBe(20)
    expect(taken.seats[0]!.paid).toEqual({})
  })

  it('Counterbid is only good for the one round after the sale', () => {
    const sold = win(auction('nba', ['Ada', 'Bo'], {}, ['counterbid']), 0, 6)

    expect(why(apply(passOn(sold), { type: 'power', seat: 1, power: 'counterbid' }, T0))).toMatch(
      /nothing has just sold/,
    )
    expect(why(apply(sold, { type: 'power', seat: 0, power: 'counterbid' }, T0))).toMatch(
      /bought that one yourself/,
    )
  })

  it('Poach trades a card for a rival’s, slot for slot', () => {
    const mine = win(auction('nba', ['Ada', 'Bo'], {}, ['poach']), 0, 3)
    const theirs = win(mine, 1, 2)
    expect(theirs.seats[0]!.slots[0]).toBe('nba-001')
    expect(theirs.seats[1]!.slots[1]).toBe('nba-002')

    const after = ok(apply(theirs, { type: 'poach', seat: 0, slot: 0, target: 1, targetSlot: 1 }, T0))

    expect(after.seats[0]!.slots[0]).toBe('nba-002')
    expect(after.seats[1]!.slots[1]).toBe('nba-001')
    // Each keeps a record of what the card they now hold cost.
    expect(after.seats[0]!.paid['nba-002']).toBe(2)
    expect(after.seats[1]!.paid['nba-001']).toBe(3)
  })

  it('Poach needs a card at both ends, and not your own roster', () => {
    const mine = win(auction('nba', ['Ada', 'Bo'], {}, ['poach']), 0, 3)

    expect(
      why(apply(mine, { type: 'poach', seat: 0, slot: 0, target: 1, targetSlot: 1 }, T0)),
    ).toMatch(/both of you have to be holding/)
    expect(
      why(apply(mine, { type: 'poach', seat: 0, slot: 0, target: 0, targetSlot: 1 }, T0)),
    ).toMatch(/poach someone else/)
  })
})

describe('joining a room', () => {
  const empty = () => newRoom('nba')
  const join = (state: RoomState, id: string, name: string, powers: PowerId[] = ['scout', 'veto']) =>
    apply(state, { type: 'join', seatId: id, name, powers }, T0)

  it('seats a drafter with the powers they picked', () => {
    const state = ok(join(empty(), 'tok-1', 'Ada'))

    expect(state.seats).toHaveLength(1)
    expect(state.seats[0]!.name).toBe('Ada')
    expect(state.seats[0]!.powers).toEqual([
      { id: 'scout', used: false },
      { id: 'veto', used: false },
    ])
  })

  it('treats a returning token as a reconnect, not a second seat', () => {
    const once = ok(join(empty(), 'tok-1', 'Ada'))
    const again = ok(join(once, 'tok-1', 'Ada'))

    expect(again).toEqual(once)
    expect(again.seats).toHaveLength(1)
  })

  it('insists on a name nobody else is using, and exactly two powers', () => {
    const one = ok(join(empty(), 'tok-1', 'Ada'))

    expect(why(join(one, 'tok-2', '  '))).toMatch(/pick a name/)
    expect(why(join(one, 'tok-2', 'ada'))).toMatch(/already called ada/)
    expect(why(join(one, 'tok-2', 'Bo', ['scout']))).toMatch(/exactly 2 powers/)
    expect(why(join(one, 'tok-2', 'Bo', ['scout', 'scout']))).toMatch(/exactly 2 powers/)
  })

  it('turns away a seventh drafter and anyone arriving after the start', () => {
    let state = empty()
    for (const [i, name] of ['Ada', 'Bo', 'Cy', 'Di', 'Eli', 'Fay'].entries())
      state = ok(join(state, `tok-${i}`, name))

    expect(why(join(state, 'tok-7', 'Gus'))).toMatch(/holds 6 drafters/)

    const running = ok(apply(state, { type: 'start', bank: ids('nba', 200) }, T0))
    expect(why(join(running, 'tok-8', 'Gus'))).toMatch(/already started/)
  })
})
