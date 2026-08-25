import { useState } from 'react'
import type { ModeId } from '../engine/card'
import {
  MIN_SEATS,
  POWERS,
  POWER_IDS,
  POWER_PICKS,
  type Config,
  type PowerId,
  type RoomState,
} from '../engine/state'
import { modeList } from '../modes'

/** Make a room or walk into one. Both ends of the only thing a friend needs: a
 *  four-letter code. */
export function RoomGate({
  busy,
  error,
  onCreate,
  onJoin,
  onBack,
}: {
  busy: boolean
  error: string | null
  onCreate: (mode: ModeId, config: Partial<Config>) => void
  onJoin: (code: string) => void
  onBack: () => void
}) {
  const [mode, setMode] = useState<ModeId>('nba')
  const [code, setCode] = useState('')
  const [budget, setBudget] = useState(20)
  const [bidSec, setBidSec] = useState(8)
  const [pool, setPool] = useState(40)

  return (
    <section className="lobby">
      <button className="back" onClick={onBack}>
        ← back
      </button>
      <h1>Play with friends</h1>
      <p className="sub">One of you makes a room and reads out the code. Everyone else joins it.</p>
      {error && <p className="sub warn">{error}</p>}

      <h2>Join a room</h2>
      <div className="row">
        <input
          className="code-in"
          value={code}
          maxLength={4}
          placeholder="CODE"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && code.length === 4 && onJoin(code)}
        />
        <button className="go" disabled={code.length !== 4 || busy} onClick={() => onJoin(code)}>
          Join
        </button>
      </div>

      <h2>Or make one</h2>
      <div className="modes">
        {modeList.map((m) => (
          <button
            key={m.id}
            className={`mode${m.id === mode ? ' on' : ''}`}
            onClick={() => {
              setMode(m.id)
              setPool(m.id === 'hok' ? 132 : 40)
            }}
          >
            <b>{m.label}</b>
            <span className="shape">{m.slots.join(' · ')}</span>
          </button>
        ))}
      </div>
      <div className="dials">
        <Dial label="Budget" value={budget} set={setBudget} min={6} max={100} money />
        <Dial label="Round" value={bidSec} set={setBidSec} min={3} max={30} suffix="s" />
        <Dial label="Pool" value={pool} set={setPool} min={6} max={250} step={2} />
      </div>
      <button
        className="go"
        disabled={busy}
        onClick={() => onCreate(mode, { budget, bidMs: bidSec * 1000, poolSize: pool })}
      >
        {busy ? 'Making it…' : 'Make a room'}
      </button>
    </section>
  )
}

/** The waiting room. Pick a name and two powers, then watch people arrive. */
export function OnlineLobby({
  code,
  room,
  youSeat,
  busy,
  error,
  onJoin,
  onStart,
  onLeave,
}: {
  code: string
  room: RoomState
  youSeat: number | null
  busy: boolean
  error: string | null
  onJoin: (name: string, powers: PowerId[]) => void
  onStart: () => void
  onLeave: () => void
}) {
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<PowerId[]>([])
  const mode = modeList.find((m) => m.id === room.mode)!
  const host = youSeat === 0

  const toggle = (power: PowerId) =>
    setPicked((was) =>
      was.includes(power)
        ? was.filter((p) => p !== power)
        : was.length >= POWER_PICKS
          ? was
          : [...was, power],
    )

  return (
    <section className="lobby">
      <button className="back" onClick={onLeave}>
        ← leave
      </button>
      <div className="code-badge">
        <span>room</span>
        <b>{code}</b>
      </div>
      <h1>{mode.label}</h1>
      <p className="sub">
        ${room.config.budget} each · roster of {mode.slots.length} · {room.config.poolSize} cards in
        the pool · {room.config.bidMs / 1000}s a round
      </p>
      {error && <p className="sub warn">{error}</p>}

      <h2>In the room ({room.seats.length})</h2>
      <div className="seats-setup">
        {room.seats.map((seat, i) => (
          <label key={seat.id} className={i === youSeat ? 'on' : ''}>
            <span className="key">{i + 1}</span>
            <span className="filling">
              {seat.name}
              {i === 0 && ' · host'}
              {i === youSeat && ' · you'}
            </span>
          </label>
        ))}
        {room.seats.length === 0 && <p className="sub">Nobody yet.</p>}
      </div>

      {youSeat === null ? (
        <>
          <h2>Take a seat</h2>
          <div className="row">
            <input
              className="name-in"
              value={name}
              maxLength={16}
              placeholder="your name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <h2>Pick {POWER_PICKS} powers</h2>
          <div className="power-picker">
            {POWER_IDS.map((id) => (
              <button
                key={id}
                className={`power-card${picked.includes(id) ? ' on' : ''}`}
                onClick={() => toggle(id)}
              >
                <b>{POWERS[id].label}</b>
                <span>{POWERS[id].blurb}</span>
                <em>{POWERS[id].when}</em>
              </button>
            ))}
          </div>
          <button
            className="go"
            disabled={busy || name.trim().length === 0 || picked.length !== POWER_PICKS}
            onClick={() => onJoin(name, picked)}
          >
            Join the draft
          </button>
        </>
      ) : host ? (
        <>
          <button
            className="go"
            disabled={busy || room.seats.length < MIN_SEATS}
            onClick={onStart}
          >
            Start the draft
          </button>
          {room.seats.length < MIN_SEATS && (
            <p className="sub">Waiting for at least {MIN_SEATS} drafters.</p>
          )}
        </>
      ) : (
        <p className="sub">You are in. Waiting for {room.seats[0]?.name ?? 'the host'} to start.</p>
      )}
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
