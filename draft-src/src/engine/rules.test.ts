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
