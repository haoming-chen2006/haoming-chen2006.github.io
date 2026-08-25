// A look at the card banks. This is not the game — the auction arrives with the
// hot-seat UI at E10. It exists so a bank can be eyeballed the way a player will
// see it: a name, one line, and a picture, and nothing else.

import { useEffect, useState } from 'react'
import type { Bank, Card, ModeId } from '../engine/card'
import { bankSource, loadBank, modeList } from '../modes'

export function BankBrowser({ onBack }: { onBack: () => void }) {
  const [id, setId] = useState<ModeId>('nba')
  const [bank, setBank] = useState<Bank | null>(null)
  const [broken, setBroken] = useState<string[]>([])

  useEffect(() => {
    let live = true
    setBank(null)
    setBroken([])
    loadBank(id).then((b) => {
      if (live) setBank(b)
    })
    return () => {
      live = false
    }
  }, [id])

  const mode = modeList.find((m) => m.id === id)!
  const source = bankSource(id)

  return (
    <main>
      <header>
        <button className="back" onClick={onBack}>
          ← back
        </button>
        <h1>Draft</h1>
        <p className="sub">
          Card banks, seen the way a drafter sees them. The auction itself is not built yet.
        </p>
      </header>

      <nav>
        {modeList.map((m) => (
          <button key={m.id} className={m.id === id ? 'on' : ''} onClick={() => setId(m.id)}>
            {m.label}
          </button>
        ))}
      </nav>

      <dl className="facts">
        <div>
          <dt>Cards</dt>
          <dd>{bank ? bank.cards.length : '—'}</dd>
        </div>
        <div>
          <dt>Roster</dt>
          <dd>{mode.slots.join(' · ')}</dd>
        </div>
        <div>
          <dt>Bank</dt>
          <dd className={source === 'real' ? 'good' : 'standin'}>
            {source === 'real' ? 'real' : 'stand-in'}
          </dd>
        </div>
        <div>
          <dt>Art failing</dt>
          <dd className={broken.length ? 'bad' : 'good'}>{broken.length}</dd>
        </div>
      </dl>

      {bank === null ? (
        <p className="sub">Loading…</p>
      ) : (
        <section className="grid">
          {bank.cards.map((card) => (
            <CardFace
              key={card.id}
              card={card}
              onBroken={() => setBroken((was) => (was.includes(card.id) ? was : [...was, card.id]))}
            />
          ))}
        </section>
      )}
    </main>
  )
}

function CardFace({ card, onBroken }: { card: Card; onBroken: () => void }) {
  const [failed, setFailed] = useState(false)

  return (
    <figure className="card">
      {failed ? (
        // Never a blank space: a card that cannot load its picture says so.
        <div className="art gone">no picture</div>
      ) : (
        <img
          className="art"
          src={card.art}
          alt=""
          loading="lazy"
          onError={() => {
            setFailed(true)
            onBroken()
          }}
        />
      )}
      <figcaption>
        <b>{card.name}</b>
        <span>{card.description}</span>
      </figcaption>
      <span className="pos">{card.position}</span>
    </figure>
  )
}
