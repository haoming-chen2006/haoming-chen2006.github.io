/**
 * Flowers and eggs, thrown across the table.
 *
 * `Fk/Components/LunarLTK/ChatAnim/{Flower,Egg,GiantEgg}.qml`, plus the button
 * that fires them (`Cheat/PlayerDetail.qml:53-73`) and the interception that
 * receives them (`Pages/Common/RoomPage.qml:582-609`). `present.ts` carries the
 * format and the reasoning about the channel; this file is the table's half.
 *
 * TWO THINGS LIVE HERE, and they are deliberately in one component.
 *
 *   The badge. A small gift on each seat, which opens a two-button picker.
 *   The flight. The arc a thrown present takes, and the splat at the end.
 *
 * They are one component because they need the same thing and it is not cheap
 * to get twice: the live position of every seat. `Indicators.tsx` measures the
 * seat elements rather than recomputing the ring's maths, for the same reason —
 * the arrows have to stay right at any window size — and this does the same,
 * off the same `seatRefs` map and the same container box.
 *
 * WHY THE BADGE IS NOT IN `Photo.tsx`. Because a seat's own surface is spoken
 * for. The portrait carries the kingdom, the role, the seat character, the hp
 * bar, the name, the hand count and the thinking ring, and the hp bar and hand
 * count are being made *larger*. There is no corner left that would not be
 * taken from something a player needs mid-hand. So the badge is placed by this
 * overlay instead, in the strip below the portrait where the equipment rows go,
 * and it is faint until the pointer is on it. `Photo.tsx` does not know this
 * exists and does not have to.
 *
 * WHAT IT REFUSES TO DO. It never covers the table. Nothing here is
 * `pointer-events: auto` except the badges themselves and the picker's own two
 * buttons — the flights, the captions and the container are inert, so a present
 * in the air cannot eat a click on a seat, and a picker that somehow got stuck
 * open costs a 22px circle rather than the game. The picker closes on the next
 * pointer-down anywhere, on Escape, and whenever the engine asks the viewer
 * something new.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatLine } from '../../contract/views';
import { useRoom, useRoomState } from '../RoomContext';
import { roomAudio } from '../audio';
import { cls } from './CardItem';
import type { SeatRefs } from './Indicators';
import {
  encodePresent, decodePresent, rollKind, PresentBudget,
  MAX_IN_FLIGHT, PRESENT_LABEL, RECEIVE_BURST, RECEIVE_GAP_MS, SEND_BURST, SEND_GAP_MS,
  type Present, type PresentKind, type ThrownKind,
} from './present';
import { photoHeight } from './SeatRing';
import './present.css';

/**
 * The art, by URL rather than by import.
 *
 * `public/present/`, resolved exactly as `anim/sheets.ts` resolves an effect
 * sheet — `BASE_URL` because the site is `/freekill/` on Pages and `/` in
 * preview. Importing the nine files through Vite instead would inline every one
 * of them (all are under the 4 kB inline limit) and put 26 kB of base64 into
 * the room chunk for a table that may never see a flower. They are 19 kB, they
 * are fetched on the first throw, and after that they are in the cache.
 * `src/room/assets/present/build-present.mjs` is where they come from.
 */
const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
const art = (file: string): string => `${BASE}present/${file}`;

const eggShot = art('egg-shot.webp');
const eggHits = ['egg-hit1.webp', 'egg-hit2.webp', 'egg-hit3.webp'].map(art) as [string, string, string];
const flowerShot = art('flower-shot.webp');
const flowerHits = ['flower-hit1.webp', 'flower-hit2.webp', 'flower-hit3.webp'].map(art) as [string, string, string];
const flowerStar = art('flower-star.webp');

/**
 * The shape of a throw, in milliseconds and multipliers.
 *
 * Ported from the QML, which runs every one of these as an explicit
 * `PropertyAnimation`. `present.css` owns the curve *within* these numbers —
 * where in the shot the sprite fades, when the impact frames swap — because a
 * keyframe stop cannot be a custom property. The durations are here, in one
 * place, because the component has to know when a flight is over to drop it.
 */
interface Shape {
  /** Wind-up before the sprite moves. `Egg.qml` fades in and hangs there. */
  readonly lead: number;
  readonly fly: number;
  /** Scale at the throw and at the impact. */
  readonly s0: number;
  readonly s1: number;
  /** Scale of the three impact frames. */
  readonly hs: number;
  /** How long each impact frame holds before the next. */
  readonly step: number;
  /** The whole impact, from the first frame to gone. */
  readonly hold: number;
  /** `Egg.qml` spins its egg twice on the way over; a flower is aimed. */
  readonly spin: boolean;
  readonly shot: string;
  readonly hit: readonly [string, string, string];
}

const FLOWER: Shape = {
  lead: 0, fly: 380, s0: 0.7, s1: 0.5, hs: 0.7, step: 170, hold: 1100, spin: false,
  shot: flowerShot, hit: flowerHits,
};
const EGG: Shape = {
  lead: 460, fly: 520, s0: 0.7, s1: 0.4, hs: 0.7, step: 160, hold: 560, spin: true,
  shot: eggShot, hit: eggHits,
};
/** `GiantEgg.qml` is `Egg.qml` at 2.1x falling to 1.2x. Same art, same clock. */
const GIANT: Shape = { ...EGG, s0: 2.1, s1: 1.2, hs: 2.1, hold: 620 };

const SHAPE: Readonly<Record<PresentKind, Shape>> = { Flower: FLOWER, Egg: EGG, GiantEgg: GIANT };

const shotMs = (s: Shape) => s.lead + s.fly;
const totalMs = (s: Shape) => shotMs(s) + s.hold;

/** One present in the air. Coordinates are frozen at launch, in ring space. */
interface Flight {
  readonly id: string;
  readonly kind: PresentKind;
  /** The name on the chat row the present arrived on — the server's word for
   *  who threw it, never the seat the payload claimed. */
  readonly who: string;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Degrees, `Flower.qml:21`. Zero for a spinning egg. */
  readonly rot: number;
}

export interface PresentsProps {
  /** Every chat line, presents included. `RoomView` hands the *filtered* list
   *  to the log and the bubbles; this one gets the raw feed. */
  readonly chat: readonly ChatLine[];
  readonly onChat: (text: string) => void;
  readonly seatRefs: SeatRefs;
  readonly container: HTMLElement | null;
  /** Seats in ring order, so a badge can be drawn for each. */
  readonly seats: readonly number[];
  /**
   * The ring's measured metrics, used here as a change token and nothing else:
   * the seats are laid out from it, so a new one is the only thing that can
   * have moved a badge. See `badges` below for why that matters.
   */
  readonly ring?: unknown;
}

export const Presents = memo(function Presents(props: PresentsProps) {
  const { chat, onChat, seatRefs, container, seats, ring } = props;
  const { lua, mode, meId } = useRoom();
  const state = useRoomState();

  const [flights, setFlights] = useState<readonly Flight[]>([]);
  const [picking, setPicking] = useState<number | null>(null);
  const [cooling, setCooling] = useState(false);

  /** Every chat id this component has already looked at. Seeded from whatever
   *  was on screen when it mounted, so joining a room part-way through does not
   *  replay an hour of other people's flowers at you. */
  const seen = useRef<Set<string> | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const incoming = useRef(new PresentBudget(RECEIVE_GAP_MS, RECEIVE_BURST));
  const outgoing = useRef(new PresentBudget(SEND_GAP_MS, SEND_BURST));

  useEffect(() => () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current.clear();
  }, []);

  /** A seat's centre, and the bottom of its portrait, in the ring's own box. */
  const geometry = useCallback((pid: number) => {
    if (!container) return null;
    const el = seatRefs.get(pid);
    if (!el) return null;
    const box = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    const left = r.left - box.left;
    const top = r.top - box.top;
    return {
      cx: left + r.width / 2,
      cy: top + photoHeight(r.width) / 2,
      /** The strip under the portrait, where the badge sits. */
      badgeY: top + photoHeight(r.width) + 10,
      width: r.width,
    };
  }, [container, seatRefs]);

  const launch = useCallback((id: string, who: string, p: Present) => {
    const to = geometry(p.to);
    const from = p.from == null ? null : geometry(p.from);
    if (!to) return;
    // A present from a seat the viewer cannot see — an observer's, a seat that
    // left — still lands. It comes in from above the target rather than from
    // nowhere, which is the only honest thing to draw.
    const x0 = from ? from.cx : to.cx;
    const y0 = from ? from.cy : to.cy - 240;
    const shape = SHAPE[p.kind];
    const dx = to.cx - x0;
    const dy = to.cy - y0;
    // `Flower.qml:21`, verbatim, including its use of the absolute values.
    const rot = shape.spin || (dx === 0 && dy === 0)
      ? 0
      : (Math.atan(Math.abs(dy) / Math.abs(dx)) / Math.PI) * 180 + 90 * (dx > 0 ? 1 : -1);

    setFlights((live) => (
      live.length >= MAX_IN_FLIGHT
        ? live
        : [...live, { id, kind: p.kind, who, x0, y0, x1: to.cx, y1: to.cy, rot }]
    ));
    // The engine's own sounds for this cannot ship — `audio/system/egg1.mp3`
    // and friends carry a live third-party copyright. This is a synthesised
    // stand-in through the cue the audio lane exposes, and it is tagged so a
    // burst of them collapses to one.
    roomAudio.notify('Present', { kind: p.kind });

    const t = setTimeout(() => {
      timers.current.delete(t);
      setFlights((live) => live.filter((f) => f.id !== id));
    }, totalMs(shape) + 80);
    timers.current.add(t);
  }, [geometry]);

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(chat.map((c) => c.id));
      return;
    }
    const known = seen.current;
    const now = Date.now();
    for (const line of chat) {
      if (known.has(line.id)) continue;
      known.add(line.id);
      const present = decodePresent(line.text);
      if (!present) continue;
      // The identity that spends the budget is the chat row's name, because
      // that is the field the server wrote. Rate-limiting on the seat inside
      // the payload would let one client spend eight seats' worth of budget.
      if (!incoming.current.take(line.displayName || String(present.from), now)) continue;
      launch(line.id, line.displayName, present);
    }
    // The set grows by one per chat line and a room keeps 80; this is a
    // lifetime of the room, not of the game, so it is trimmed rather than kept.
    if (known.size > 400) {
      seen.current = new Set(chat.map((c) => c.id));
    }
  }, [chat, launch]);

  /* --------------------------------------------------------------- throwing */

  const canThrow = mode === 'play' && meId != null;

  const throwAt = useCallback((to: number, picked: ThrownKind) => {
    if (meId == null) return;
    const now = Date.now();
    if (!outgoing.current.take('me', now)) return;
    setPicking(null);
    setCooling(true);
    const t = setTimeout(() => { timers.current.delete(t); setCooling(false); }, SEND_GAP_MS);
    timers.current.add(t);
    onChat(encodePresent({ kind: rollKind(picked, Math.random()), to, from: meId }));
  }, [meId, onChat]);

  /**
   * Three ways out of an open picker, none of which is a click the table would
   * otherwise have wanted: a pointer-down anywhere outside it, Escape, and the
   * engine asking a new question.
   *
   * The outside test is a `closest` on the event's target rather than a
   * `stopPropagation` on the badge's own handler, and that is not a style
   * choice. `pointerdown` fires before `click`, so a handler that closed on
   * every pointer-down unmounted the two buttons between the press and the
   * release — the release then landed on nothing, no `click` was ever
   * delivered, and pressing 送花 did exactly nothing. It reproduced on the
   * first real throw in a browser.
   */
  useEffect(() => {
    if (picking == null) return;
    const shut = (e: Event) => {
      const el = e.target as Element | null;
      if (el && typeof el.closest === 'function' && el.closest('.fk-present-badge')) return;
      setPicking(null);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicking(null); };
    window.addEventListener('pointerdown', shut);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', shut);
      window.removeEventListener('keydown', key);
    };
  }, [picking]);

  const asked = state.request.kind === 'none' ? '' : state.request.command;
  useEffect(() => { setPicking(null); }, [asked]);

  /* ---------------------------------------------------------------- drawing */

  /**
   * Where the badges go — measured when the ring moves, not when the table
   * commits.
   *
   * This used to be eight `getBoundingClientRect` pairs taken on every render,
   * on the reasoning that the seats move on resize and a badge drawn at last
   * frame's coordinates is a badge on the felt. The first half is true; the
   * conclusion is not. A rect read during a render is a synchronous
   * style-and-layout flush of the whole room, and this component subscribes to
   * the room state, so it rendered on every committed burst — thousands of
   * times a game — while the seats move only when the window does. Sixteen
   * forced layouts per commit here, plus `Indicators` doing the same thing for
   * arrows that mostly did not exist, made `getBoundingClientRect` the largest
   * named function in a CPU profile of the host seat at 3.4 s. Between the two
   * fixes it is 0.25 s.
   *
   * `ring` is the answer to "when could a seat have moved": `useRingMetrics`
   * publishes a new object out of its own `ResizeObserver`, and the seats are
   * laid out from it, so it changes exactly when they do. Measuring inside the
   * memo rather than in an effect keeps the first paint correct — an effect
   * would put every badge on screen a frame late, and would put none at all in
   * a server render.
   */
  // The seat *set* rather than the array, because `RoomView` rebuilds the order
  // array on every render and depending on its identity would defeat the memo.
  const roster = seats.join(',');
  const badges = useMemo(() => {
    if (!canThrow || !container) return [];
    const out: { pid: number; x: number; y: number }[] = [];
    for (const pid of roster ? roster.split(',').map(Number) : []) {
      if (pid === meId) continue;
      const g = geometry(pid);
      if (g) out.push({ pid, x: g.cx, y: g.badgeY });
    }
    return out;
  }, [canThrow, container, roster, meId, geometry, ring]);

  if (!container) return null;

  return (
    <div className="fk-presents">
      {badges.map((b) => (
        <div
          key={b.pid}
          className="fk-present-badge"
          style={{ left: b.x, top: b.y }}
        >
          <button
            type="button"
            className={cls('fk-present-badge__btn', picking === b.pid && 'fk-present-badge__btn--on')}
            title={lua.tr('Give Flower')}
            disabled={cooling}
            onClick={() => setPicking(picking === b.pid ? null : b.pid)}
          >
            {/* A wrapped present. The engine ships no icon for this — its own
                button is a text label in a panel that does not exist here. */}
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path d="M1.5 7h13v7.5h-13z" />
              <path d="M0.8 4.2h14.4V7H0.8z" />
              <path d="M7 4.2h2V15H7z" className="fk-present-badge__ribbon" />
              <path d="M8 4.4C6.6 1.6 3.4 1.6 3.4 3.3c0 1.2 2 1.6 4.6 1.1zM8 4.4c1.4-2.8 4.6-2.8 4.6-1.1 0 1.2-2 1.6-4.6 1.1z" />
            </svg>
          </button>

          {picking === b.pid ? (
            <div className="fk-present-pick" role="group">
              {(['Flower', 'Egg'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className="fk-present-pick__btn"
                  onClick={() => throwAt(b.pid, kind)}
                >
                  <img src={kind === 'Flower' ? flowerShot : eggShot} alt="" draggable={false} />
                  <span>{lua.tr(PRESENT_LABEL[kind])}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}

      {flights.map((f) => <Arc key={f.id} flight={f} />)}
    </div>
  );
});

/**
 * One present, mid-air.
 *
 * It reaches the translator through `useRoom()` rather than being handed one,
 * and that is a scar. It used to take `tr={lua.tr}` — an unbound method off a
 * class whose `tr` opens with `this.#freshForLanguage()`. Called with no
 * receiver it throws, the throw happens inside a render, and React tore the
 * whole table down to the error boundary the first time anybody threw a flower.
 * Nothing caught it earlier because the unit test passes a plain function as
 * `tr`, where losing the receiver costs nothing. Taking the service from the
 * context instead removes the shape of the mistake rather than the instance.
 */
function Arc({ flight }: { flight: Flight }) {
  const { lua } = useRoom();
  const s = SHAPE[flight.kind];
  const shot = shotMs(s);
  const style = {
    ['--fk-p-x0' as string]: `${flight.x0}px`,
    ['--fk-p-y0' as string]: `${flight.y0}px`,
    ['--fk-p-x1' as string]: `${flight.x1}px`,
    ['--fk-p-y1' as string]: `${flight.y1}px`,
    ['--fk-p-s0' as string]: String(s.s0),
    ['--fk-p-s1' as string]: String(s.s1),
    ['--fk-p-hs' as string]: String(s.hs),
    ['--fk-p-rot' as string]: `${s.spin ? 0 : flight.rot}deg`,
    ['--fk-p-rot1' as string]: `${s.spin ? 720 : flight.rot}deg`,
    ['--fk-p-shot' as string]: `${shot}ms`,
    ['--fk-p-step' as string]: `${s.step}ms`,
    ['--fk-p-last' as string]: `${Math.max(0, s.hold - s.step * 2)}ms`,
    ['--fk-p-d0' as string]: `${shot}ms`,
    ['--fk-p-d1' as string]: `${shot + s.step}ms`,
    ['--fk-p-d2' as string]: `${shot + s.step * 2}ms`,
    ['--fk-p-hold' as string]: `${s.hold}ms`,
  };
  const kindClass = flight.kind === 'Flower' ? 'fk-present--flower'
    : flight.kind === 'GiantEgg' ? 'fk-present--giant' : 'fk-present--egg';

  return (
    <div className={cls('fk-present', kindClass)} style={style} aria-hidden="true">
      <img className="fk-present__shot" src={s.shot} alt="" draggable={false} />
      <img className="fk-present__hit fk-present__hit--a" src={s.hit[0]} alt="" draggable={false} />
      <img className="fk-present__hit fk-present__hit--b" src={s.hit[1]} alt="" draggable={false} />
      <img className="fk-present__hit fk-present__hit--c" src={s.hit[2]} alt="" draggable={false} />
      {flight.kind === 'Flower' ? (
        <>
          <img className="fk-present__star fk-present__star--a" src={flowerStar} alt="" draggable={false} />
          <img className="fk-present__star fk-present__star--b" src={flowerStar} alt="" draggable={false} />
        </>
      ) : null}
      {/* Who threw what at whom. The arc says whom; this says who and what. */}
      <div className="fk-present__tag">
        <b>{flight.who}</b>
        <span>{lua.tr(flight.kind === 'Flower' ? 'Give Flower' : 'Give Egg')}</span>
      </div>
    </div>
  );
}
