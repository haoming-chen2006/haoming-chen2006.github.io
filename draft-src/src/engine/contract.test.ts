import { describe, expect, it } from 'vitest'
import { MIN_CARDS, MODES } from './card'

// card.ts is the frozen contract. These are the assumptions the rest of the
// engine makes about it, so a change to it fails here first.
describe('the contract', () => {
  it('has three modes, each keyed by its own id', () => {
    expect(Object.keys(MODES)).toEqual(['nba', 'soccer', 'hok'])
    for (const [key, mode] of Object.entries(MODES)) expect(mode.id).toBe(key)
  })

  it('can seat every position in some slot', () => {
    // Auto-assign looks for an open slot matching the card's position, so a
    // position with no slot to land in would be unplaceable.
    for (const mode of Object.values(MODES))
      for (const position of mode.positions) expect(mode.slots).toContain(position)
  })

  it('sets a minimum bank size for every mode', () => {
    for (const mode of Object.values(MODES)) expect(MIN_CARDS[mode.id]).toBeGreaterThan(0)
  })
})
