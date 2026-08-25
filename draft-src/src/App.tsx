// Two ways to play the same game. Hot seat runs the engine in memory; an online
// room posts every action to the Edge Function and watches the row come back.
// The rules are identical either way — only who calls apply() changes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Bank, ModeId } from './engine/card'
import { apply } from './engine/rules'
import {
  type Action,
  type Config,
  type PowerId,
  type RoomState,
  newRoom,
  newSeat,
} from './engine/state'
import { byId, loadBank, modeList, shuffledBank } from './modes'
import {
  askForVerdict,
  createRoom,
  fetchRoom,
  forgetRoom,
  lastRoom,
  myToken,
  online,
  rememberRoom,
  send,
  watchRoom,
} from './net/room'
import { Auction } from './ui/Auction'
import { BankBrowser } from './ui/BankBrowser'
import { Lobby } from './ui/Lobby'
import { ModePicker } from './ui/ModePicker'
import { OnlineLobby, RoomGate } from './ui/Online'
import { Results } from './ui/Results'
import { type Picked, Rosters } from './ui/Roster'

type Where = 'menu' | 'hotseat' | 'online' | 'banks'

export function App() {
  const [where, setWhere] = useState<Where>('menu')
  const [modeId, setModeId] = useState<ModeId | null>(null)
  const [bank, setBank] = useState<Bank | null>(null)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [flash, setFlash] = useState<string | null>(null)
  const [picked, setPicked] = useState<Picked>(null)
  const [poaching, setPoaching] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)
  const [judging, setJudging] = useState(false)
  const [judgeError, setJudgeError] = useState<string | null>(null)

  // The interval and the key handler outlive the render that made them, so they
  // read the room through a ref rather than a stale closure.
  const roomRef = useRef<RoomState | null>(room)
  roomRef.current = room
  const codeRef = useRef<string | null>(code)
  codeRef.current = code

  const youSeat = useMemo(() => {
    if (room === null || code === null) return null
    const at = room.seats.findIndex((seat) => seat.id === myToken())
    return at < 0 ? null : at
  }, [room, code])
  const youRef = useRef<number | null>(youSeat)
  youRef.current = youSeat

  /** Hot seat applies locally; an online room asks the server and waits for the
   *  row. Either way a refusal comes back as the rule's own words. */
  const dispatch = useCallback((action: Action) => {
    const current = roomRef.current
    if (current === null) return

    const room = codeRef.current
    if (room !== null) {
      send(room, action)
        .then(({ state }) => setRoom(state))
        .catch((err: Error) => setFlash(err.message))
      return
    }

    const result = apply(current, action, Date.now())
    if (!result.ok) return setFlash(result.reason)
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

  // Watch the room row. Realtime pushes every write; a slow poll covers a socket
  // that has quietly died mid-draft.
  useEffect(() => {
    if (code === null) return
    return watchRoom(code, setRoom)
  }, [code])

  // Nobody is awake to fire the countdown, so every browser watches it and sends
  // resolve the moment it passes. Early or duplicate ones are no-ops, which is
  // exactly what makes it safe for four clients to race.
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

  // 1–6 bid the minimum. Online you only ever bid for yourself, so any key bids
  // for your seat; hot seat needs the number to say who is bidding.
  useEffect(() => {
    if (room?.phase !== 'auction') return
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLInputElement) return
      const r = roomRef.current
      if (r?.round == null) return

      const mine = youRef.current
      const seat = mine ?? Number(event.key) - 1
      if (mine === null && (!Number.isInteger(seat) || seat < 0 || seat >= r.seats.length)) return
      if (mine !== null && event.key !== ' ' && Number(event.key) - 1 !== mine) return

      event.preventDefault()
      dispatch({ type: 'bid', seat, amount: r.round.high === null ? 1 : r.round.high.amount + 1 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [room?.phase, dispatch])

  useEffect(() => {
    if (flash === null) return
    const clear = setTimeout(() => setFlash(null), 2_200)
    return () => clearTimeout(clear)
  }, [flash])

  // The draft is done and nobody has ruled yet: whoever notices first asks. The
  // function is idempotent, so a race costs one wasted call and never two rulings.
  const callJudge = useCallback(() => {
    const room = codeRef.current
    if (room === null) return
    setJudging(true)
    setJudgeError(null)
    askForVerdict(room)
      .then(({ state }) => setRoom(state))
      .catch((err: Error) => setJudgeError(err.message))
      .finally(() => setJudging(false))
  }, [])

  useEffect(() => {
    if (room?.phase === 'judging' && room.verdict === null && code !== null && !judging)
      callJudge()
    // Only on entering judging, not on every render while it works.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.phase, code])

  // Walk back into whatever room this browser was last in.
  useEffect(() => {
    if (!online) return
    const kept = lastRoom()
    if (kept === null) return
    fetchRoom(kept)
      .then((state) => {
        if (state === null) return forgetRoom()
        setCode(kept)
        setRoom(state)
        setModeId(state.mode)
        setWhere('online')
      })
      .catch(() => forgetRoom())
  }, [])

  const cards = useMemo(() => (bank === null ? new Map() : byId(bank)), [bank])
  const mode = modeList.find((m) => m.id === modeId)

  function leave() {
    forgetRoom()
    setCode(null)
    setRoom(null)
    setModeId(null)
    setBank(null)
    setPicked(null)
    setPoaching(null)
    setJudgeError(null)
    setWhere('menu')
  }

  function beginHotSeat(drafters: { name: string; powers: PowerId[] }[], config: Partial<Config>) {
    if (bank === null || modeId === null) return
    const base = newRoom(modeId, config)
    const seated: RoomState = {
      ...base,
      seats: drafters.map((d, i) => newSeat(`seat-${i}`, d.name, base.config, d.powers)),
    }
    const started = apply(seated, { type: 'start', bank: shuffledBank(bank) }, Date.now())
    if (!started.ok) return setFlash(started.reason)
    setRoom(started.state)
    setNow(Date.now())
  }

  /** Two clicks. Normally that trades two of your own slots; while Poach is armed
   *  the second click lands on a rival instead and takes their card. */
  function pickSlot(seat: number, slot: number) {
    if (youSeat !== null && poaching === null && seat !== youSeat) return
    if (poaching !== null) {
      if (picked === null || picked.seat === seat) return setPicked({ seat, slot })
      dispatch({
        type: 'poach',
        seat: poaching,
        slot: picked.seat === poaching ? picked.slot : slot,
        target: picked.seat === poaching ? seat : picked.seat,
        targetSlot: picked.seat === poaching ? slot : picked.slot,
      })
      setPicked(null)
      setPoaching(null)
      return
    }
    if (picked === null || picked.seat !== seat) return setPicked({ seat, slot })
    if (picked.slot === slot) return setPicked(null)
    dispatch({ type: 'swap', seat, a: picked.slot, b: slot })
    setPicked(null)
  }

  function usePower(seat: number, power: PowerId) {
    if (power === 'insurance') return
    if (power === 'poach') {
      setPoaching((was) => (was === seat ? null : seat))
      setPicked(null)
      return
    }
    dispatch({ type: 'power', seat, power })
  }

  if (where === 'banks') return <BankBrowser onBack={() => setWhere('menu')} />

  // ---- in a game, either kind
  if (room !== null && mode !== undefined && room.phase !== 'lobby') {
    if (room.phase === 'auction')
      return (
        <main className="playing">
          {flash && <div className="flash">{flash}</div>}
          {code && <div className="code-tab">{code}</div>}
          <Auction
            room={room}
            card={room.round === null ? undefined : cards.get(room.round.card.id)}
            cards={cards}
            now={now}
            poaching={poaching}
            youSeat={youSeat}
            onBid={(seat, amount) => dispatch({ type: 'bid', seat, amount })}
            onPower={usePower}
          />
          <Rosters
            seats={room.seats}
            slots={mode.slots}
            cards={cards}
            highSeat={room.round?.high?.seat}
            picked={picked}
            onPick={pickSlot}
          />
        </main>
      )

    return (
      <main>
        {flash && <div className="flash">{flash}</div>}
        <Results
          room={room}
          mode={mode}
          cards={cards}
          judging={judging}
          canJudge={code !== null}
          error={judgeError}
          onRetry={callJudge}
          onAgain={leave}
        />
      </main>
    )
  }

  // ---- online, before the draft starts
  if (where === 'online') {
    if (code === null || room === null)
      return (
        <main>
          <RoomGate
            busy={busy}
            error={gateError}
            onBack={() => setWhere('menu')}
            onCreate={(mode, config) => {
              setBusy(true)
              setGateError(null)
              createRoom(mode, config)
                .then(({ code, state }) => {
                  rememberRoom(code)
                  setCode(code)
                  setRoom(state)
                  setModeId(mode)
                })
                .catch((err: Error) => setGateError(err.message))
                .finally(() => setBusy(false))
            }}
            onJoin={(entered) => {
              setBusy(true)
              setGateError(null)
              fetchRoom(entered)
                .then((state) => {
                  if (state === null) throw new Error(`there is no room ${entered}`)
                  rememberRoom(entered)
                  setCode(entered)
                  setRoom(state)
                  setModeId(state.mode)
                })
                .catch((err: Error) => setGateError(err.message))
                .finally(() => setBusy(false))
            }}
          />
        </main>
      )

    return (
      <main>
        <OnlineLobby
          code={code}
          room={room}
          youSeat={youSeat}
          busy={busy}
          error={gateError}
          onLeave={leave}
          onJoin={(name, powers) => {
            setBusy(true)
            setGateError(null)
            send(code, { type: 'join', seatId: myToken(), name, powers })
              .then(({ state }) => setRoom(state))
              .catch((err: Error) => setGateError(err.message))
              .finally(() => setBusy(false))
          }}
          onStart={() => {
            setBusy(true)
            setGateError(null)
            send(code, { type: 'start', bank: [] })
              .then(({ state }) => setRoom(state))
              .catch((err: Error) => setGateError(err.message))
              .finally(() => setBusy(false))
          }}
        />
      </main>
    )
  }

  // ---- hot seat
  if (where === 'hotseat') {
    if (modeId === null || mode === undefined)
      return (
        <main>
          <ModePicker onPick={setModeId} />
          <button className="link" onClick={() => setWhere('menu')}>
            ← back
          </button>
        </main>
      )
    return (
      <main>
        <Lobby
          mode={mode}
          cardCount={bank?.cards.length ?? 0}
          defaultPool={newRoom(mode.id).config.poolSize}
          onStart={beginHotSeat}
          onBack={() => {
            setModeId(null)
            setBank(null)
          }}
        />
      </main>
    )
  }

  // ---- the front door
  return (
    <main>
      <section className="picker">
        <h1>Draft</h1>
        <p className="sub">
          A name, a year, a picture. No numbers until it is over. Bid what you remember.
        </p>
        <div className="modes">
          <button className="mode" onClick={() => setWhere('hotseat')}>
            <b>Hot seat</b>
            <span className="shape">everyone round one keyboard</span>
            <span className="note">no setup, start now</span>
          </button>
          <button className="mode" disabled={!online} onClick={() => setWhere('online')}>
            <b>Play with friends</b>
            <span className="shape">a room code, everyone on their own laptop</span>
            <span className="note">
              {online ? 'share the code and go' : 'this build has no server settings'}
            </span>
          </button>
        </div>
        <button className="link" onClick={() => setWhere('banks')}>
          browse the card banks
        </button>
      </section>
    </main>
  )
}
