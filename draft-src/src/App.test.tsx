import type React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { apply } from './engine/rules'
import { type RoomState, newRoom, newSeat } from './engine/state'
import { Auction } from './ui/Auction'
import { Rosters } from './ui/Roster'

const T0 = Date.parse('2026-01-01T00:00:00.000Z')

/** React separates adjacent text nodes with an empty comment, which turns
 *  "10 cards left" into "10<!-- --> card<!-- -->s<!-- --> left". Strip them so
 *  the assertions can read like the copy actually does on screen. */
const render = (node: React.ReactElement): string =>
  renderToString(node).replaceAll('<!-- -->', '')

function started() {
  const base = newRoom('nba', { budget: 20, bidMs: 8_000, poolSize: 10 })
  const seated: RoomState = {
    ...base,
    seats: [
      newSeat('seat-0', 'Ada', base.config, ['scout', 'veto']),
      newSeat('seat-1', 'Bo', base.config, ['insurance', 'squeeze']),
    ],
  }
  const result = apply(
    seated,
    {
      type: 'start',
      bank: Array.from({ length: 30 }, (_, i) => ({ id: `x${i}`, position: 'PG' })),
    },
    T0,
  )
  if (!result.ok) throw new Error(result.reason)
  return result.state
}

// Effects do not run in a server render, so these are first paints. Enough to
// catch a broken import, bad JSX, or a prop that is not what the screen expects.
describe('the screens', () => {
  it('opens on the front door, offering both ways to play', () => {
    const html = render(<App />)

    expect(html).toContain('<h1>Draft</h1>')
    expect(html).toContain('Hot seat')
    expect(html).toContain('Play with friends')
  })

  it('puts a card up, open to everyone, and counts the pool down', () => {
    const card = {
      id: 'x0',
      name: 'Someone Familiar',
      description: '2015-16 · A Team',
      art: 'https://x/y.png',
      position: 'PG',
    }
    const html = render(
      <Auction
        room={started()}
        card={card}
        cards={new Map([['x0', card]])}
        now={T0 + 2_000}
        poaching={null}
        youSeat={null}
        onBid={() => {}}
        onPower={() => {}}
      />,
    )

    expect(html).toContain('Someone Familiar')
    expect(html).toContain('2015-16 · A Team')
    expect(html).toContain('no bid yet')
    // Nobody is locked out of the first bid any more — no opener, no waiting.
    expect(html).not.toContain('waiting')
    expect(html).not.toContain('alone')
    // Ten in the pool, one of them on the block.
    expect(html).toMatch(/10.{0,30}cards left/)
    // Both drafters can act, and their powers are on the table.
    expect(html).toContain('Scout')
    expect(html).toContain('Squeeze')
    expect(html).toContain('insured')
    // Three quarters of an eight second round left after two seconds.
    expect(html).toContain('width:75%')
  })

  it('draws every slot of every roster and flags anyone knocked out', () => {
    const base = newRoom('hok')
    const seats = [
      newSeat('seat-0', 'Ada', base.config, ['scout', 'veto']),
      { ...newSeat('seat-1', 'Bo', base.config, ['poach', 'insurance']), eliminated: true },
    ]
    const html = render(
      <Rosters
        seats={seats}
        slots={['Clash', 'Jungle', 'Mid', 'Farm', 'Roam']}
        cards={new Map()}
        highSeat={undefined}
        picked={null}
        onPick={() => {}}
      />,
    )

    expect(html).toContain('Clash')
    expect(html).toContain('Roam')
    expect(html).toContain('out')
    expect(html).toContain('2 powers')
  })
})
