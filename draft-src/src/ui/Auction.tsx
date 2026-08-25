import { useState } from 'react'
import type { Card, CardId } from '../engine/card'
import { POWERS, type PowerId, type RoomState, isFull, maxBid } from '../engine/state'

export function Auction({
  room,
  card,
  cards,
  now,
  poaching,
  onBid,
  onPower,
}: {
  room: RoomState
  card: Card | undefined
  cards: Map<CardId, Card>
  now: number
  poaching: number | null
  onBid: (seat: number, amount: number) => void
  onPower: (seat: number, power: PowerId) => void
}) {
  const round = room.round
  if (round === null) return null

  const left = Math.max(0, Date.parse(round.deadline) - now)
  const fraction = Math.max(0, Math.min(1, left / room.config.bidMs))
  // The pool is the pressure: everything still to come, plus the one on the block.
  const remaining = room.bank.length + 1

  return (
    <section className="auction">
      <div className="clock">
        <div className="bar">
          <div className={`fill${left < 3000 ? ' urgent' : ''}`} style={{ width: `${fraction * 100}%` }} />
        </div>
        <div className="clock-line">
          <span className="secs">{(left / 1000).toFixed(1)}s</span>
          {round.squeezedBy !== null && (
            <span className="excl">{room.seats[round.squeezedBy]?.name} squeezed the table</span>
          )}
          <span className={`round${remaining <= 5 ? ' scarce' : ''}`}>
            {remaining} card{remaining === 1 ? '' : 's'} left in the pool
          </span>
        </div>
      </div>

      <CardFace card={card} />

      {round.scoutedBy.length > 0 && (
        <div className="scouted">
          <span className="label">next up</span>
          {room.bank.slice(0, 2).map((next) => (
            <span key={next.id} className="peek">
              {cards.get(next.id)?.name ?? next.id}
            </span>
          ))}
          {room.bank.length === 0 && <span className="peek">nothing — this is the last card</span>}
          <span className="who">
            scouted by {round.scoutedBy.map((s) => room.seats[s]?.name).join(', ')}
          </span>
        </div>
      )}

      <div className="standing">
        {round.high === null ? (
          <span className="nobid">no bid yet</span>
        ) : (
          <span>
            <b>${round.high.amount}</b> — {room.seats[round.high.seat]?.name}
          </span>
        )}
      </div>

      <div className="bidders">
        {room.seats.map((seat, i) => {
          const floor = round.high === null ? 1 : round.high.amount + 1
          const squeezed = round.squeezedBy !== null && round.squeezedBy !== i
          const ceiling = maxBid(seat) - (squeezed ? 4 : 0)
          const blocked = isFull(seat)
            ? 'roster full'
            : round.high?.seat === i
              ? 'high bid'
              : floor > ceiling
                ? `limit $${ceiling}`
                : null
          const jump = Math.min(floor + 4, ceiling)

          return (
            <div key={seat.id} className={`bidder${blocked ? ' off' : ''}`}>
              <div className="who">
                <span className="key">{i + 1}</span>
                <b>{seat.name}</b>
                <span className="purse">
                  ${seat.budget}
                  {seat.discount > 0 && <em title="Overdraft armed"> −${seat.discount}</em>}
                </span>
              </div>

              {blocked ? (
                <span className="blocked">{blocked}</span>
              ) : (
                <div className="row">
                  <button className="bid" onClick={() => onBid(i, floor)}>
                    ${floor}
                  </button>
                  {jump > floor && (
                    <button className="bid alt" onClick={() => onBid(i, jump)}>
                      ${jump}
                    </button>
                  )}
                </div>
              )}

              <div className="powers">
                {seat.powers.map((held) =>
                  held.id === 'insurance' ? (
                    <span key={held.id} className={`power passive${held.used ? ' spent' : ''}`}>
                      🛡 {held.used ? 'insurance used' : 'insured'}
                    </span>
                  ) : (
                    <button
                      key={held.id}
                      className={`power${held.used ? ' spent' : ''}${poaching === i && held.id === 'poach' ? ' arming' : ''}`}
                      disabled={held.used}
                      title={`${POWERS[held.id].blurb} (${POWERS[held.id].when})`}
                      onClick={() => onPower(i, held.id)}
                    >
                      {POWERS[held.id].label}
                    </button>
                  ),
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="hint">
        Press 1–{room.seats.length} to bid the minimum. Bidding is open the instant a card lands —
        no turns. {poaching !== null && <b>Poaching: click one of your cards, then a rival’s.</b>}
      </p>
    </section>
  )
}

/** All a drafter ever sees: a name, one line, and a picture. No position, no
 *  numbers — the spec is strict about this, and it is the whole game. */
function CardFace({ card }: { card: Card | undefined }) {
  const [failed, setFailed] = useState(false)
  if (card === undefined) return <div className="onblock" />

  return (
    <figure className="onblock" key={card.id}>
      {failed ? (
        <div className="art gone">no picture</div>
      ) : (
        <img className="art" src={card.art} alt="" onError={() => setFailed(true)} />
      )}
      <figcaption>
        <b>{card.name}</b>
        <span>{card.description}</span>
      </figcaption>
    </figure>
  )
}
