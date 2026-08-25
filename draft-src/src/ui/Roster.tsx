import type { Card, CardId } from '../engine/card'
import type { Seat } from '../engine/state'

export type Picked = { seat: number; slot: number } | null

export function Rosters({
  seats,
  slots,
  cards,
  highSeat,
  picked,
  onPick,
}: {
  seats: Seat[]
  slots: string[]
  cards: Map<CardId, Card>
  highSeat: number | undefined
  picked: Picked
  onPick: (seat: number, slot: number) => void
}) {
  return (
    <section className="rosters">
      {seats.map((seat, i) => (
        <div
          key={seat.id}
          className={`roster${i === highSeat ? ' leading' : ''}${seat.eliminated ? ' out' : ''}`}
        >
          <header>
            <b>{seat.name}</b>
            {seat.eliminated && <span className="tag out">out</span>}
            {seat.powers.some((p) => !p.used) && (
              <span className="tag quiet">
                {seat.powers.filter((p) => !p.used).length} power
                {seat.powers.filter((p) => !p.used).length === 1 ? '' : 's'}
              </span>
            )}
            <span className="purse">${seat.budget}</span>
          </header>
          <ol>
            {slots.map((label, s) => {
              const id = seat.slots[s] ?? null
              const card = id === null ? undefined : cards.get(id)
              const chosen = picked?.seat === i && picked.slot === s

              return (
                <li key={s}>
                  <button
                    className={`slot${chosen ? ' picked' : ''}${id === null ? ' empty' : ''}`}
                    onClick={() => onPick(i, s)}
                  >
                    <span className="label">{label}</span>
                    <span className="filling">{card ? card.name : '—'}</span>
                    {id !== null && seat.paid[id] !== undefined && (
                      <span className="price">${seat.paid[id]}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </section>
  )
}
