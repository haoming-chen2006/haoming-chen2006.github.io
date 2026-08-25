import type { Card, CardId, Mode } from '../engine/card'
import type { RoomState } from '../engine/state'

/** Where a draft ends today. The verdict and the stat reveal arrive with the
 *  judge; until then this is the roster you built and what you paid for it. */
export function Results({
  room,
  mode,
  cards,
  onAgain,
}: {
  room: RoomState
  mode: Mode
  cards: Map<CardId, Card>
  onAgain: () => void
}) {
  return (
    <section className="results">
      <h1>{room.bank.length === 0 ? 'The pool is empty' : 'Every roster is full'}</h1>
      <p className="sub">
        No verdict yet — the judge is the next thing to build. Here is what everyone bought.
      </p>

      <div className="sheets">
        {room.seats.map((seat) => {
          const spent = Object.values(seat.paid).reduce((a, b) => a + b, 0)
          const dearest = Object.entries(seat.paid).sort((a, b) => b[1] - a[1])[0]

          return (
            <div key={seat.id} className={`sheet${seat.eliminated ? ' out' : ''}`}>
              <header>
                <b>{seat.name}</b>
                {seat.eliminated && <span className="tag out">out — roster unfilled</span>}
                <span className="purse">spent ${spent} · ${seat.budget} left</span>
              </header>
              <ol>
                {mode.slots.map((label, s) => {
                  const id = seat.slots[s] ?? null
                  const card = id === null ? undefined : cards.get(id)
                  return (
                    <li key={s}>
                      <span className="label">{label}</span>
                      <span className="filling">{card?.name ?? '—'}</span>
                      <span className="desc">{card?.description ?? ''}</span>
                      <span className="price">{id !== null ? `$${seat.paid[id] ?? 0}` : ''}</span>
                    </li>
                  )
                })}
              </ol>
              {dearest && (
                <footer>
                  most expensive: {cards.get(dearest[0])?.name} at ${dearest[1]}
                </footer>
              )}
            </div>
          )
        })}
      </div>

      <button className="go" onClick={onAgain}>
        Draft again
      </button>
    </section>
  )
}
