import { useState } from 'react'
import type { Card } from '../engine/card'
import { type RoomState, isFull, maxBid } from '../engine/state'

export function Auction({
  room,
  card,
  now,
  onBid,
}: {
  room: RoomState
  card: Card | undefined
  now: number
  onBid: (seat: number, amount: number) => void
}) {
  const round = room.round
  if (round === null) return null

  const deadline = Date.parse(round.deadline)
  const exclusiveUntil = Date.parse(round.exclusiveUntil)
  const exclusive = now < exclusiveUntil
  const left = Math.max(0, deadline - now)
  const fraction = Math.max(0, Math.min(1, left / room.config.bidMs))

  const opener = room.seats[round.openerSeat]

  return (
    <section className="auction">
      <div className="clock">
        <div className="bar">
          <div className={`fill${left < 3000 ? ' urgent' : ''}`} style={{ width: `${fraction * 100}%` }} />
        </div>
        <div className="clock-line">
          <span className="secs">{(left / 1000).toFixed(1)}s</span>
          {exclusive ? (
            <span className="excl">{opener?.name} alone — {((exclusiveUntil - now) / 1000).toFixed(1)}s</span>
          ) : (
            <span className="open">open to everyone</span>
          )}
          <span className="round">card {room.roundIndex}</span>
        </div>
      </div>

      <CardFace card={card} />

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
          const ceiling = maxBid(seat)
          const blocked = isFull(seat)
            ? 'roster full'
            : exclusive && i !== round.openerSeat
              ? 'waiting'
              : round.high?.seat === i
                ? 'high bid'
                : floor > ceiling
                  ? `can only go to $${ceiling}`
                  : null
          const jump = Math.min(floor + 4, ceiling)

          return (
            <div key={seat.id} className={`bidder${blocked ? ' off' : ''}`}>
              <div className="who">
                <span className="key">{i + 1}</span>
                <b>{seat.name}</b>
                <span className="purse">${seat.budget}</span>
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
            </div>
          )
        })}
      </div>
      <p className="hint">Press 1–{room.seats.length} to bid the minimum. The clock resets on every bid.</p>
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
