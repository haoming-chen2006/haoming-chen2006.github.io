import { useState } from 'react'
import type { Mode } from '../engine/card'
import { MAX_SEATS, MIN_SEATS, type Config } from '../engine/state'

const DEFAULT_NAMES = ['Ada', 'Bo', 'Cy', 'Di', 'Eli', 'Fay']

export function Lobby({
  mode,
  cardCount,
  onStart,
  onBack,
}: {
  mode: Mode
  cardCount: number
  onStart: (names: string[], config: Partial<Config>) => void
  onBack: () => void
}) {
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES.slice(0, 4))
  const [budget, setBudget] = useState(20)
  // The two numbers this whole playtest exists to settle.
  const [bidSec, setBidSec] = useState(8)
  const [openerSec, setOpenerSec] = useState(6)

  const rename = (i: number, value: string) =>
    setNames((was) => was.map((n, j) => (j === i ? value : n)))

  const usable = names.map((n) => n.trim()).filter((n) => n.length > 0)
  const ready = usable.length >= MIN_SEATS && usable.length === names.length

  return (
    <section className="lobby">
      <button className="back" onClick={onBack}>
        ← modes
      </button>
      <h1>{mode.label}</h1>
      <p className="sub">
        {cardCount} cards · roster of {mode.slots.length} · everyone plays on this one keyboard
      </p>

      <h2>Drafters</h2>
      <div className="seats-setup">
        {names.map((name, i) => (
          <label key={i}>
            <span className="key">{i + 1}</span>
            <input value={name} onChange={(e) => rename(i, e.target.value)} placeholder="name" />
          </label>
        ))}
      </div>
      <div className="row">
        <button
          onClick={() => setNames((was) => [...was, DEFAULT_NAMES[was.length] ?? `Seat ${was.length + 1}`])}
          disabled={names.length >= MAX_SEATS}
        >
          add drafter
        </button>
        <button onClick={() => setNames((was) => was.slice(0, -1))} disabled={names.length <= MIN_SEATS}>
          remove
        </button>
      </div>

      <h2>Numbers</h2>
      <p className="sub">
        Change these if the draft feels rushed or slow — that is the point of playing it.
      </p>
      <div className="dials">
        <Dial label="Budget" value={budget} set={setBudget} min={6} max={100} suffix="$" />
        <Dial label="Round" value={bidSec} set={setBidSec} min={3} max={30} suffix="s" />
        <Dial label="Opener window" value={openerSec} set={setOpenerSec} min={0} max={bidSec} suffix="s" />
      </div>

      <button
        className="go"
        disabled={!ready}
        onClick={() => onStart(usable, { budget, bidMs: bidSec * 1000, openerMs: openerSec * 1000 })}
      >
        Start the draft
      </button>
      {!ready && <p className="sub">Every drafter needs a name.</p>}
    </section>
  )
}

function Dial({
  label,
  value,
  set,
  min,
  max,
  suffix,
}: {
  label: string
  value: number
  set: (n: number) => void
  min: number
  max: number
  suffix: string
}) {
  return (
    <label className="dial">
      <span>{label}</span>
      <div>
        <button onClick={() => set(Math.max(min, value - 1))}>−</button>
        <b>
          {suffix === '$' ? '$' : ''}
          {value}
          {suffix === '$' ? '' : suffix}
        </b>
        <button onClick={() => set(Math.min(max, value + 1))}>+</button>
      </div>
    </label>
  )
}
