/**
 * The table's animation, driven straight off the engine's notify stream.
 *
 * WHY THIS IS NOT REACT STATE. Two independent reasons, and either alone would
 * be enough.
 *
 * The first is fidelity. `Animate` carries `skill_type` — which of the nine
 * `skillInvoke` categories a skill belongs to — and `is_card`, which says the
 * effect belongs on a card on the table rather than on a seat. `RoomStore`
 * keeps neither; it reduces the payload to `{playerId, kind, value}` because
 * that is all the seat glyph it feeds ever needed. Reading the raw message is
 * what makes a per-skill effect possible at all across a 319-general pool
 * without hand-writing a map from skill to art.
 *
 * The second is timing. `RoomView` runs `refreshStatusSkills()` every 200 ms
 * and the store commits unconditionally on the resulting burst, so the table
 * re-renders five times a second whether or not anything happened. Anything
 * driven by React state is therefore reconciled mid-flight on a cadence that
 * has nothing to do with the game. Effects here are DOM nodes appended to a
 * container and removed when their CSS animation ends: React renders the empty
 * container once and never touches it again, and a re-render cannot restart,
 * interrupt or drop an effect that is playing.
 *
 * CONCURRENCY. Effects overlap; they never queue. A beat can carry several
 * moves — measured over a full 8-seat game, 35% of beats carry more than one
 * `MoveCards` and the opening deal carries ten — so a queue would fall behind
 * on the first turn and keep sliding for the rest of the game. Overlapping
 * costs nothing because effects land on different seats most of the time, and
 * where they do collide the per-stage cap drops the oldest: the newest effect
 * is the one describing what is happening now, and it is the one that must not
 * be delayed.
 *
 * NO RULES LIVE HERE. Every branch below is a response to something the engine
 * said had happened. Nothing decides whether it should have.
 */
import type { WireCommand } from '../../../contract/protocol';
import { CARD_AREA } from '../../ltk/types';
import type { AnimSheet } from '../../assets/anim/sheets.generated';
import { isReady, loadSheet, resolveSheet, sheetUrl, skillSheet } from './sheets';
import { animationsOff, effectMs, type EffectKind } from './timing';

/** Sprite layers alive on one stage at once. Beyond this the oldest is dropped
 *  rather than the newest delayed — see CONCURRENCY above. */
const MAX_PER_STAGE = 3;

/** A stage is where effects for one thing get drawn: a seat, or a table card. */
export type StageKey = `seat:${number}` | `card:${number}`;

export const seatStage = (id: number): StageKey => `seat:${id}`;
export const cardStage = (id: number): StageKey => `card:${id}`;

interface Accent {
  /** Class toggled on the stage's host element. */
  readonly cls: string;
  readonly ms: number;
}

export class AnimBus {
  /** Where sprites go, per stage. Registered by the React containers. */
  private readonly stages = new Map<StageKey, HTMLElement>();
  /** What a CSS accent class gets applied to — the seat, not its sprite layer. */
  private readonly hosts = new Map<StageKey, HTMLElement>();
  private readonly live = new Map<StageKey, HTMLElement[]>();
  private readonly accentTimers = new Map<string, number>();
  /** Last hp seen per player, so a recovery can be told from a fresh join. */
  private readonly hp = new Map<number, number>();

  /**
   * True while a client that retains its history is replaying it into a fresh
   * subscriber. `retainingClient.onNotifyUI` hands over every message the table
   * has ever seen before it returns, and animating a whole game's worth of
   * `Animate` at once on a remount is not a feature.
   */
  replaying = true;

  constructor(private readonly tr: (s: string) => string) {}

  registerStage(key: StageKey, layer: HTMLElement | null, host?: HTMLElement | null): void {
    if (layer) {
      this.stages.set(key, layer);
      if (host) this.hosts.set(key, host);
    } else {
      this.stages.delete(key);
      this.hosts.delete(key);
      this.live.delete(key);
    }
  }

  /* ---------------------------------------------------------------- intake */

  /**
   * One notify message. Anything not named here is not an animation.
   *
   * Deliberately tolerant: every field is read defensively because these
   * payloads come from Lua, a package can add a type, and a table that throws
   * on an unfamiliar effect is worse than one that does not draw it.
   */
  notify(command: WireCommand, data: unknown): void {
    if (this.replaying || animationsOff()) return;
    try {
      switch (command) {
        case 'Animate': return this.onAnimate(data as Record<string, unknown>);
        case 'LogEvent': return this.onLogEvent(data as Record<string, unknown>);
        case 'PropertyUpdate': return this.onProperty(data as [number, string, unknown]);
        case 'MoveCards': return this.onMoveCards(data as Record<string, unknown>);
        default: return;
      }
    } catch {
      // An effect is never worth a broken table.
    }
  }

  /** `Room:doAnimate` — `roombase.lua:240`. `type` is merged into the payload. */
  private onAnimate(d: Record<string, unknown>): void {
    switch (d.type) {
      case 'Emotion': {
        // `player` is a CARD id when `is_card` is set — `Room:setCardEmotion`
        // sends the judged card's id here, which is how a judgement result
        // lands on the card being judged rather than on a seat.
        const id = Number(d.player);
        if (!Number.isFinite(id)) return;
        const sheet = resolveSheet(String(d.emotion ?? ''));
        if (!sheet) return;
        this.play(d.is_card === true ? cardStage(id) : seatStage(id), sheet, 'card');
        return;
      }
      case 'InvokeSkill': {
        const id = Number(d.player);
        if (!Number.isFinite(id)) return;
        this.play(seatStage(id), skillSheet(d.skill_type), 'skill', this.tr(String(d.name ?? '')));
        return;
      }
      case 'InvokeUltSkill': {
        // The engine's "big" animation. It gets the same banner with more
        // presence rather than a second art pipeline for one case.
        const id = Number(d.player);
        if (!Number.isFinite(id)) return;
        this.play(seatStage(id), skillSheet('special'), 'skill', this.tr(String(d.name ?? '')), 'fk-anim--ult');
        return;
      }
      default:
        // `Indicate` is drawn by `Indicators.tsx` from store state, and
        // `SuperLightBox` points at a QML file the web room cannot run.
        return;
    }
  }

  /** `Room:sendLogEvent` — `room.lua:544`. */
  private onLogEvent(d: Record<string, unknown>): void {
    switch (d.type) {
      case 'Damage': {
        const to = Number(d.to);
        if (!Number.isFinite(to)) return;
        const sheet = resolveSheet('damage');
        if (sheet) this.play(seatStage(to), sheet, 'card');
        // The Qt client trembles the photo here (`Photo.qml:336`) and picks the
        // damage sound by element. The tint follows the same element.
        const type = String(d.damageType ?? 'normal_damage');
        this.accent(seatStage(to), { cls: `fk-hit fk-hit--${element(type)}`, ms: effectMs('accent') });
        return;
      }
      case 'LoseHP': {
        // No `to` on this one — the engine sends an empty table — so it can
        // only be rendered where it is unambiguous, which is nowhere. The hp
        // watcher below catches the drop instead.
        return;
      }
      case 'Death': {
        const to = Number(d.to);
        if (Number.isFinite(to)) this.accent(seatStage(to), { cls: 'fk-fell', ms: 900 });
        return;
      }
      default:
        return;
    }
  }

  /**
   * Health, watched rather than announced.
   *
   * Recovery has no `LogEvent` of its own — a 桃 raises hp through the same
   * `PropertyUpdate` that everything else does. Watching the value is the only
   * way to know it happened, and it is still the engine's word: this reports a
   * change the engine made, it does not decide that one should have happened.
   */
  private onProperty(d: [number, string, unknown]): void {
    if (!Array.isArray(d)) return;
    const [id, prop, value] = d;
    if (prop === 'hp') {
      const now = Number(value);
      const was = this.hp.get(id);
      this.hp.set(id, now);
      if (was === undefined || !Number.isFinite(now)) return;
      if (now > was) this.accent(seatStage(id), { cls: 'fk-heal', ms: effectMs('accent') });
      // A drop already has the damage sprite on it when it came from damage;
      // when it came from a cost or 失去体力 this is the only sign of it.
      else if (now < was) this.accent(seatStage(id), { cls: 'fk-hit fk-hit--normal', ms: effectMs('accent') });
      return;
    }
    // Phase 2 is `Start` — the top of a turn, once per turn per player.
    if (prop === 'phase' && Number(value) === 2) {
      const sheet = resolveSheet('playing');
      if (sheet) this.play(seatStage(id), sheet, 'card');
    }
  }

  /**
   * Cards arriving somewhere visible.
   *
   * The table already animates a card landing in the processing area, and the
   * hand animates a card being dealt, but the seat those cards belong to shows
   * nothing at all — which is why an eight-seat opening deal reads as a row of
   * numbers changing. One flash per destination, per move, on the seat.
   */
  private onMoveCards(d: Record<string, unknown>): void {
    const merged = d.merged as readonly { toArea?: number; to?: number; ids?: number[] }[] | undefined;
    if (!Array.isArray(merged)) return;
    for (const move of merged) {
      const to = Number(move.to);
      if (!Number.isFinite(to) || !move.ids?.length) continue;
      if (move.toArea === CARD_AREA.PlayerEquip) {
        this.accent(seatStage(to), { cls: 'fk-equipped', ms: effectMs('accent') });
      } else if (move.toArea === CARD_AREA.PlayerHand) {
        this.accent(seatStage(to), { cls: 'fk-drew', ms: effectMs('accent') });
      }
    }
  }

  /**
   * Play a named effect on a stage, for the two things the notify stream cannot
   * tell us: that a seat has just become a legal target, and that it has just
   * been picked.
   *
   * Selectability lives in the `ui_emu` scene, not in a notify message, so this
   * is the one entry point driven from React rather than from the stream. It is
   * still not a decision: the caller passes on `Photo.enabled` and
   * `Photo.selected` exactly as the engine set them.
   *
   * The Qt client runs `image/anim/selectable` and `selected` as looping
   * indicators for as long as the state holds (`Photo.qml:63,73`). A single
   * pulse on the transition says the same thing for a fraction of the cost —
   * a permanent loop on every candidate seat is a repaint per frame per seat,
   * for the whole time a player is deciding.
   */
  pulse(key: StageKey, name: string): void {
    const sheet = resolveSheet(name);
    if (sheet) this.play(key, sheet, 'accent');
  }

  /* ---------------------------------------------------------------- output */

  /**
   * Put one sprite on a stage.
   *
   * The sheet is fetched on first use and the effect is skipped if it is not
   * decoded yet — a beat without an effect, rather than an empty box that pops
   * when the bytes land. By the second time a card is played it is warm.
   */
  private play(key: StageKey, sheet: AnimSheet | undefined, kind: EffectKind, label?: string, extra?: string): void {
    if (!sheet) return;
    const ms = effectMs(kind);
    if (ms <= 0) return;
    if (!isReady(sheet)) { void loadSheet(sheet); return; }
    const layer = this.stages.get(key);
    if (!layer) return;

    const el = document.createElement('div');
    el.className = extra ? `fk-anim ${extra}` : 'fk-anim';
    // Everything the CSS needs, as custom properties: one keyframe rule drives
    // every effect, and `steps()` walks the strip a frame at a time.
    el.style.setProperty('--fk-anim-url', `url("${sheetUrl(sheet)}")`);
    el.style.setProperty('--fk-anim-frames', String(sheet.frames));
    // The frame's shape, not its pixel size. The effect is drawn at a width
    // derived from the measured seat so it keeps its proportion to the table at
    // any window size, and CSS cannot divide one length by another — so what
    // crosses the boundary is a unitless ratio and the length is built in CSS.
    el.style.setProperty('--fk-anim-ratio', String(sheet.h / sheet.w));
    el.style.setProperty('--fk-anim-ms', `${ms}ms`);
    if (label) {
      const text = document.createElement('span');
      text.className = 'fk-anim__label';
      text.textContent = label;
      el.appendChild(text);
    }

    const alive = this.live.get(key) ?? [];
    // Drop the oldest rather than delay the newest.
    while (alive.length >= MAX_PER_STAGE) alive.shift()?.remove();
    alive.push(el);
    this.live.set(key, alive);

    const done = () => {
      el.remove();
      const list = this.live.get(key);
      if (list) this.live.set(key, list.filter((x) => x !== el));
    };
    el.addEventListener('animationend', done, { once: true });
    // A tab that is backgrounded mid-effect never fires `animationend`, and the
    // node would sit on the stage until the seat unmounted.
    window.setTimeout(done, ms + 400);
    layer.appendChild(el);
  }

  /**
   * A CSS-authored accent: a hit shake, a heal pulse, an equipment flash.
   *
   * These are the moments the engine reports and no art exists for. Built from
   * transforms and filters rather than more sprite frames — the 22 shipped
   * effects cost 3.3 MB, and authoring a dozen more the same way would cost
   * more than the entire rest of the game. A class on the seat costs nothing,
   * stays sharp at any size, and can be tinted per damage element.
   */
  private accent(key: StageKey, a: Accent): void {
    if (a.ms <= 0) return;
    const host = this.hosts.get(key);
    if (!host) return;
    const classes = a.cls.split(' ');
    const timerKey = `${key}:${a.cls}`;
    // Restart rather than stack: re-adding a class that is already there does
    // not replay its animation, so it has to come off and go back on.
    const previous = this.accentTimers.get(timerKey);
    if (previous !== undefined) {
      window.clearTimeout(previous);
      host.classList.remove(...classes);
      void host.offsetWidth; // reflow, so the re-add is seen as a change
    }
    host.classList.add(...classes);
    this.accentTimers.set(timerKey, window.setTimeout(() => {
      host.classList.remove(...classes);
      this.accentTimers.delete(timerKey);
    }, a.ms));
  }

  /** Drop every timer and node. Called when the table unmounts. */
  dispose(): void {
    for (const t of this.accentTimers.values()) window.clearTimeout(t);
    this.accentTimers.clear();
    for (const list of this.live.values()) for (const el of list) el.remove();
    this.live.clear();
    this.stages.clear();
    this.hosts.clear();
  }
}

/** `normal_damage` / `fire_damage` / `thunder_damage` / `ice_damage` -> a tint. */
function element(damageType: string): string {
  const name = damageType.replace(/_damage$/, '');
  return name === 'fire' || name === 'thunder' || name === 'ice' ? name : 'normal';
}
