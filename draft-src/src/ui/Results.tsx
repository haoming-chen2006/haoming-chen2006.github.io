import type { Card, CardId, Mode } from '../engine/card'
import type { RoomState } from '../engine/state'

/** The reveal. Every number was hidden from the moment the draft started until
 *  the judge ruled; this is the first and only place they appear. */
export function Results({
  room,
  mode,
  cards,
  judging,
  error,
  onRetry,
  onAgain,
}: {
  room: RoomState
  mode: Mode
  cards: Map<CardId, Card>
  judging: boolean
  error: string | null
  onRetry: () => void
  onAgain: () => void
}) {
  const verdict = room.verdict
  const place = new Map(verdict?.ranking.map((r) => [r.seat, r]) ?? [])

  return (
    <section className="results">
      <h1>{room.bank.length === 0 ? 'The pool is empty' : 'Every roster is full'}</h1>

      {verdict === null ? (
        <div className="judging">
          {judging ? (
            <>
              <p className="sub">
                The judge is reading the numbers you never saw — every roster, every price.
              </p>
              <div className="bar">
                <div className="fill sweep" />
              </div>
            </>
          ) : error !== null ? (
            <>
              <p className="sub warn">{error}</p>
              <button className="go" onClick={onRetry}>
                Ask again
              </button>
            </>
          ) : (
            <button className="go" onClick={onRetry}>
              Send it to the judge
            </button>
          )}
        </div>
      ) : (
        <div className="verdict">
          <h2>
            {room.seats[verdict.winnerSeat]?.name ?? `Seat ${verdict.winnerSeat}`} takes it
          </h2>
          <p className="reasoning">{verdict.reasoning}</p>
        </div>
      )}

      <div className="sheets">
        {[...room.seats.entries()]
          .sort((a, b) => (place.get(a[0])?.place ?? 99) - (place.get(b[0])?.place ?? 99))
          .map(([i, seat]) => {
            const spent = Object.values(seat.paid).reduce((a, b) => a + b, 0)
            const ruling = place.get(i)

            return (
              <div key={seat.id} className={`sheet${seat.eliminated ? ' out' : ''}`}>
                <header>
                  {ruling && <span className="place">#{ruling.place}</span>}
                  <b>{seat.name}</b>
                  {seat.eliminated && <span className="tag out">out — roster unfilled</span>}
                  <span className="purse">
                    spent ${spent} · ${seat.budget} left
                  </span>
                </header>

                {ruling && <p className="summary">{ruling.summary}</p>}

                <ol>
                  {mode.slots.map((label, s) => {
                    const id = seat.slots[s] ?? null
                    const card = id === null ? undefined : cards.get(id)
                    const stats = id === null ? undefined : room.reveal?.[id]

                    return (
                      <li key={s}>
                        <span className="label">{label}</span>
                        <span className="filling">{card?.name ?? '—'}</span>
                        <span className="price">{id !== null ? `$${seat.paid[id] ?? 0}` : ''}</span>
                        <span className="desc">{card?.description ?? ''}</span>
                        {stats && (
                          <span className="stats">
                            {Object.entries(stats).map(([key, value]) => (
                              <em key={key}>
                                <span>{key.replaceAll('_', ' ')}</span>
                                {value}
                              </em>
                            ))}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )
          })}
      </div>

      {!mode.hasHidden && verdict !== null && (
        <p className="sub">
          Nothing was hidden in {mode.label} — the heroes were the whole picture all along.
        </p>
      )}

      <button className="go" onClick={onAgain}>
        Draft again
      </button>
    </section>
  )
}
