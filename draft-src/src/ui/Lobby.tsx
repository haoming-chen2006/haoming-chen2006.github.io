import { useState } from 'react'
import type { Mode } from '../engine/card'
import {
  MAX_SEATS,
  MIN_SEATS,
  POWERS,
  POWER_IDS,
  POWER_PICKS,
  type Config,
  type PowerId,
} from '../engine/state'

const DEFAULT_NAMES = ['Ada', 'Bo', 'Cy', 'Di', 'Eli', 'Fay']

export function Lobby({
  mode,
  cardCount,
  defaultPool,
  onStart,
  onBack,
}: {
  mode: Mode
  cardCount: number
  defaultPool: number
  onStart: (drafters: { name: string; powers: PowerId[] }[], config: Partial<Config>) => void
  onBack: () => void
}) {
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES.slice(0, 4))
  const [powers, setPowers] = useState<PowerId[][]>(() => names.map(() => []))
  const [budget, setBudget] = useState(20)
  const [bidSec, setBidSec] = useState(8)
  const [pool, setPool] = useState(Math.min(defaultPool, cardCount || defaultPool))
  const [choosing, setChoosing] = useState(0)

  const rename = (i: number, value: string) =>
    setNames((was) => was.map((n, j) => (j === i ? value : n)))

  const toggle = (seat: number, power: PowerId) =>
    setPowers((was) =>
      was.map((held, i) => {
        if (i !== seat) return held
        if (held.includes(power)) return held.filter((p) => p !== power)
        return held.length >= POWER_PICKS ? held : [...held, power]
      }),
    )

  const usable = names.map((n) => n.trim())
  const named = usable.every((n) => n.length > 0) && usable.length >= MIN_SEATS
  const armed = powers.slice(0, names.length).every((held) => held.length === POWER_PICKS)
  const tight = pool < names.length * mode.slots.length

  return (
    <section className="lobby">
      <button className="back" onClick={onBack}>
        ← modes
      </button>
      <h1>{mode.label}</h1>
      <p className="sub">
        {cardCount} cards in the bank · roster of {mode.slots.length} · everyone on this one keyboard
      </p>

      <h2>Drafters</h2>
      <div className="seats-setup">
        {names.map((name, i) => (
          <label key={i} className={choosing === i ? 'on' : ''} onClick={() => setChoosing(i)}>
            <span className="key">{i + 1}</span>
            <input value={name} onChange={(e) => rename(i, e.target.value)} placeholder="name" />
            <span className="count">{powers[i]?.length ?? 0}/{POWER_PICKS}</span>
          </label>
        ))}
      </div>
      <div className="row">
        <button
          onClick={() => {
            setNames((was) => [...was, DEFAULT_NAMES[was.length] ?? `Seat ${was.length + 1}`])
            setPowers((was) => [...was, []])
          }}
          disabled={names.length >= MAX_SEATS}
        >
          add drafter
        </button>
        <button
          onClick={() => {
            setNames((was) => was.slice(0, -1))
            setPowers((was) => was.slice(0, -1))
            setChoosing((c) => Math.min(c, names.length - 2))
          }}
          disabled={names.length <= MIN_SEATS}
        >
          remove
        </button>
      </div>

      <h2>
        {names[choosing] || `Seat ${choosing + 1}`} picks {POWER_PICKS}
      </h2>
      <div className="power-picker">
        {POWER_IDS.map((id) => {
          const held = powers[choosing]?.includes(id) ?? false
          return (
            <button
              key={id}
              className={`power-card${held ? ' on' : ''}`}
              onClick={() => toggle(choosing, id)}
            >
              <b>{POWERS[id].label}</b>
              <span>{POWERS[id].blurb}</span>
              <em>{POWERS[id].when}</em>
            </button>
          )
        })}
      </div>

      <h2>Numbers</h2>
      <div className="dials">
        <Dial label="Budget" value={budget} set={setBudget} min={6} max={100} money />
        <Dial label="Round" value={bidSec} set={setBidSec} min={3} max={30} suffix="s" />
        <Dial label="Pool" value={pool} set={setPool} min={mode.slots.length} max={cardCount || 250} step={2} />
      </div>
      <p className={`sub${tight ? ' warn' : ''}`}>
        {tight
          ? `Only ${pool} cards for ${names.length} rosters of ${mode.slots.length} — somebody is going home short, and out.`
          : `${pool} cards for ${names.length * mode.slots.length} slots. Unsold cards are burned.`}
      </p>

      <button
        className="go"
        disabled={!named || !armed}
        onClick={() =>
          onStart(
            usable.map((name, i) => ({ name, powers: powers[i] ?? [] })),
            { budget, bidMs: bidSec * 1000, poolSize: pool },
          )
        }
      >
        Start the draft
      </button>
      {!named && <p className="sub">Every drafter needs a name.</p>}
      {named && !armed && <p className="sub">Everyone picks {POWER_PICKS} powers first.</p>}
    </section>
  )
}

function Dial({
  label,
  value,
  set,
  min,
  max,
  suffix = '',
  money = false,
  step = 1,
}: {
  label: string
  value: number
  set: (n: number) => void
  min: number
  max: number
  suffix?: string
  money?: boolean
  step?: number
}) {
  return (
    <label className="dial">
      <span>{label}</span>
      <div>
        <button onClick={() => set(Math.max(min, value - step))}>−</button>
        <b>
          {money ? '$' : ''}
          {value}
          {suffix}
        </b>
        <button onClick={() => set(Math.min(max, value + step))}>+</button>
      </div>
    </label>
  )
}
