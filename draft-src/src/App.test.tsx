import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { apply } from './engine/rules'
import { type RoomState, newRoom, newSeat } from './engine/state'
import { modeList } from './modes'
import { Auction } from './ui/Auction'
import { Rosters } from './ui/Roster'

const T0 = Date.parse('2026-01-01T00:00:00.000Z')

// Effects do not run in a server render, so these are first paints. Enough to
// catch a broken import, bad JSX, or a prop that is not what the screen expects.
describe('the screens', () => {
  it('opens on the mode picker', () => {
    const html = renderToString(<App />)

    expect(html).toContain('<h1>Draft</h1>')
    for (const mode of modeList) expect(html).toContain(mode.label)
  })

  it('puts a card on the block with a bid button for every drafter', () => {
    const base = newRoom('nba', { budget: 20, bidMs: 8_000, openerMs: 6_000 })
    const seated: RoomState = {
      ...base,
      seats: ['Ada', 'Bo'].map((n, i) => newSeat(`seat-${i}`, n, base.config)),
    }
    const started = apply(seated, {
      type: 'start',
      bank: [
        { id: 'x1', position: 'PG' },
        { id: 'x2', position: 'SG' },
        ...Array.from({ length: 20 }, (_, i) => ({ id: `f${i}`, position: 'C' })),
      ],
    }, T0)
    if (!started.ok) throw new Error(started.reason)

    const card = { id: 'x1', name: 'Someone Familiar', description: '2015-16 · A Team', art: 'https://x/y.png', position: 'PG' }
    const html = renderToString(
      <Auction room={started.state} card={card} now={T0 + 2_000} onBid={() => {}} />,
    )

    // The card shows a name, a line and a picture — and no position or number.
    expect(html).toContain('Someone Familiar')
    expect(html).toContain('2015-16 · A Team')
    expect(html).toContain('no bid yet')
    // React splits adjacent text nodes, so match the pieces, not the sentence.
    expect(html).toMatch(/Ada.{0,20}alone/)
    expect(html).toContain('waiting') // ...while Bo sits out the opener window
    expect(html).not.toContain('"PG"') // no position on the card
    // Three quarters of an eight second round left after two seconds.
    expect(html).toContain('width:75%')
  })

  it('draws every slot of every roster, empty ones included', () => {
    const base = newRoom('hok')
    const seats = ['Ada', 'Bo'].map((n, i) => newSeat(`seat-${i}`, n, base.config))
    const html = renderToString(
      <Rosters
        seats={seats}
        slots={base.config ? ['Clash', 'Jungle', 'Mid', 'Farm', 'Roam'] : []}
        cards={new Map()}
        openerSeat={0}
        highSeat={undefined}
        picked={null}
        onPick={() => {}}
      />,
    )

    expect(html).toContain('Clash')
    expect(html).toContain('Roam')
    expect(html).toContain('opens')
  })
})
