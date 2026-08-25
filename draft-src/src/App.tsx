// The hot seat: one browser, one keyboard, everybody round it. The engine runs
// in memory here — no server, no room codes. Networked play comes later, and
// when it does the rules do not change, only who calls apply().

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Bank, ModeId } from './engine/card'
import { apply } from './engine/rules'
import { type Action, type Config, type RoomState, newRoom, newSeat } from './engine/state'
import { byId, loadBank, modeList, shuffledBank } from './modes'
import { Auction } from './ui/Auction'
import { BankBrowser } from './ui/BankBrowser'
import { Lobby } from './ui/Lobby'
import { ModePicker } from './ui/ModePicker'
import { Results } from './ui/Results'
import { type Picked, Rosters } from './ui/Roster'

export function App() {
  const [modeId, setModeId] = useState<ModeId | null>(null)
  const [bank, setBank] = useState<Bank | null>(null)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [flash, setFlash] = useState<string | null>(null)
  const [picked, setPicked] = useState<Picked>(null)
  const [browsing, setBrowsing] = useState(false)

  // The interval and the key handler outlive the render that made them, so they
  // read the room through a ref rather than a stale closure.
  const roomRef = useRef<RoomState | null>(room)
  roomRef.current = room

  const dispatch = useCallback((action: Action) => {
    const current = roomRef.current
    if (current === null) return
    const result = apply(current, action, Date.now())
    if (!result.ok) {
      setFlash(result.reason)
      return
    }
    roomRef.current = result.state
    setRoom(result.state)
  }, [])

  useEffect(() => {
    if (modeId === null) return
    let live = true
    loadBank(modeId).then((b) => live && setBank(b))
    return () => {
      live = false
    }
  }, [modeId])

  // Nobody is awake to fire the countdown, so the screen watches it and sends
  // resolve the moment it passes. Sending it early or twice is a no-op, which is
  // exactly why this is safe to run on a timer.
  useEffect(() => {
    if (room?.phase !== 'auction') return
    const tick = setInterval(() => {
      setNow(Date.now())
      const r = roomRef.current
      if (r?.phase === 'auction' && r.round !== null && Date.now() >= Date.parse(r.round.deadline))
        dispatch({ type: 'resolve' })
    }, 100)
    return () => clearInterval(tick)
  }, [room?.phase, dispatch])

  // 1–6 bid the minimum for that seat. With an eight-second round, reaching for
  // a mouse is the difference between bidding and not.
  useEffect(() => {
    if (room?.phase !== 'auction') return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const seat = Number(event.key) - 1
      const r = roomRef.current
      if (!Number.isInteger(seat) || seat < 0 || r?.round == null || seat >= r.seats.length) return
      event.preventDefault()
      dispatch({ type: 'bid', seat, amount: r.round.high === null ? 1 : r.round.high.amount + 1 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [room?.phase, dispatch])

  useEffect(() => {
    if (flash === null) return
    const clear = setTimeout(() => setFlash(null), 1_800)
    return () => clearTimeout(clear)
  }, [flash])

  const cards = useMemo(() => (bank === null ? new Map() : byId(bank)), [bank])
  const mode = modeList.find((m) => m.id === modeId)

  function begin(names: string[], config: Partial<Config>) {
    if (bank === null || modeId === null) return
    const base = newRoom(modeId, config)
    const seated: RoomState = {
      ...base,
      seats: names.map((name, i) => newSeat(`seat-${i}`, name, base.config)),
    }
    const started = apply(seated, { type: 'start', bank: shuffledBank(bank) }, Date.now())
    if (!started.ok) {
      setFlash(started.reason)
      return
    }
    setRoom(started.state)
    setNow(Date.now())
  }

  /** Click one slot then another to trade them. Clicking the same one lets go. */
  function pickSlot(seat: number, slot: number) {
    if (picked === null || picked.seat !== seat) return setPicked({ seat, slot })
    if (picked.slot === slot) return setPicked(null)
    dispatch({ type: 'swap', seat, a: picked.slot, b: slot })
    setPicked(null)
  }

  if (browsing) return <BankBrowser onBack={() => setBrowsing(false)} />

  if (modeId === null || mode === undefined)
    return (
      <main>
        <ModePicker onPick={setModeId} />
        <button className="link" onClick={() => setBrowsing(true)}>
          browse the card banks
        </button>
      </main>
    )

  if (room === null)
    return (
      <main>
        <Lobby
          mode={mode}
          cardCount={bank?.cards.length ?? 0}
          onStart={begin}
          onBack={() => {
            setModeId(null)
            setBank(null)
          }}
        />
      </main>
    )

  if (room.phase === 'auction')
    return (
      <main className="playing">
        {flash && <div className="flash">{flash}</div>}
        <Auction
          room={room}
          card={room.round === null ? undefined : cards.get(room.round.card.id)}
          now={now}
          onBid={(seat, amount) => dispatch({ type: 'bid', seat, amount })}
        />
        <Rosters
          seats={room.seats}
          slots={mode.slots}
          cards={cards}
          openerSeat={room.round?.openerSeat}
          highSeat={room.round?.high?.seat}
          picked={picked}
          onPick={pickSlot}
        />
      </main>
    )

  return (
    <main>
      <Results
        room={room}
        mode={mode}
        cards={cards}
        onAgain={() => {
          setRoom(null)
          setPicked(null)
        }}
      />
    </main>
  )
}
