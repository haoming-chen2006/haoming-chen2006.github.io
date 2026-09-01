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
 * WHY CARDS COME OFF THE SOUND. `Room:playCardEmotionAndSound`
 * (`events/usecard.lua:17`) does two things for every card used or played: it
 * calls `setEmotion` with the card's sprite folder *if that folder exists on
 * disk*, and it broadcasts a sound naming the card unconditionally. The web VM
 * mounts `.lua` and nothing else, so `FileIO.exists("./packages/standard_cards/
 * image/anim/slash")` is false and always has been. Measured over a full
 * recorded game the engine sends 97 card sounds and 10 emotions — and the ten
 * are all equipment skills firing, which take a different code path
 * (`events/skill.lua:59`) with no existence check on it. So the twenty-two card
 * sprite sheets have never once played for a card being used, and eighty-seven
 * of ninety-seven card resolutions animated nothing at all. The sound is the
 * signal that was always there: it is sent for every card, it names the card,
 * and it says whether this was a use or an equipment proc. See `cards.ts`.
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
import { CARD_FX, GEAR_FX, GENERIC_FX, HIT_FX, readCue, type CardCue, type CardRecipe } from './cards';
import type { Build, Scene } from './parts';
import { isReady, loadSheet, resolveSheet, sheetUrl } from './sheets';
import { Spectacle } from './spectacle';
import { bearing, dropTableLayer, pointOf, spanOf, tableLayer, type Point } from './table';
import { animationsOff, effectMs, type EffectKind } from './timing';
import './effects.css';

/** Sprite layers alive on one stage at once. Beyond this the oldest is dropped
 *  rather than the newest delayed — see CONCURRENCY above. */
const MAX_PER_STAGE = 3;

/**
 * Authored effects alive on the table layer at once.
 *
 * One more than a seat gets, because the table layer carries the links: a 铁索
 * 连环 with two targets and a 杀 arriving from elsewhere is three, and cutting
 * the oldest of those would cut a strike that is still travelling.
 */
const MAX_ON_TABLE = 4;

/** How many messages a card cue waits for the message that says where it went.
 *  The engine emits that within one or two; eight is slack, not a guess. */
const CUE_PATIENCE = 8;

/** A stage is where effects for one thing get drawn: a seat, or a table card. */
export type StageKey = `seat:${number}` | `card:${number}`;

export const seatStage = (id: number): StageKey => `seat:${id}`;
export const cardStage = (id: number): StageKey => `card:${id}`;

interface Accent {
  /** Class toggled on the stage's host element. */
  readonly cls: string;
  readonly ms: number;
}

/** A card sound waiting for the message that names who used it. */
interface Cue {
  readonly cue: CardCue;
  age: number;
}

export class AnimBus {
  /** Where sprites go, per stage. Registered by the React containers. */
  private readonly stages = new Map<StageKey, HTMLElement>();
  /** What a CSS accent class gets applied to — the seat, not its sprite layer. */
  private readonly hosts = new Map<StageKey, HTMLElement>();
  private readonly live = new Map<string, HTMLElement[]>();
  private readonly accentTimers = new Map<string, number>();
  /** Last hp seen per player, so a recovery can be told from a fresh join. */
  private readonly hp = new Map<number, number>();

  /**
   * Skill invocations and everything that happens to a seat.
   *
   * `components/anim/spectacle/` owns the nine `skill_type` categories and the
   * general-level events; this class stays the intake that reads the notify
   * stream and the sprite lane for the engine's own card art. The split is by
   * subject, not by mechanism: what a seat does is authored there, what a card
   * does is drawn from the shipped strips here.
   */
  private readonly spec: Spectacle;
  /** Last chain state seen per player, so only the moment it changes animates. */
  private readonly chained = new Map<number, boolean>();
  /** The card whose sound just arrived, still looking for its seat. */
  private cue: Cue | null = null;
  /** The measured photo width, and when. Every length in an effect is a
   *  multiple of it, and a burst of ten effects should measure once. */
  private unitAt = 0;
  private unitPx = 0;

  /**
   * True while a client that retains its history is replaying it into a fresh
   * subscriber. `retainingClient.onNotifyUI` hands over every message the table
   * has ever seen before it returns, and animating a whole game's worth of
   * `Animate` at once on a remount is not a feature.
   */
  replaying = true;

  constructor(private readonly tr: (s: string) => string) {
    this.spec = new Spectacle(tr);
  }

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
      // A pending card sound is looking for the message that says whose it was.
      // It has to be offered this one before the switch below consumes it.
      if (this.cue) this.route(command, data);
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
        const emotion = String(d.emotion ?? '');
        // A judgement resolving is a table-scale moment as well as a mark on
        // one card. The mark stays where the engine put it; the verdict goes
        // over the processing area, which is where everyone is already looking.
        if (d.is_card === true && (emotion === 'judgegood' || emotion === 'judgebad')) {
          this.spec.verdict(emotion === 'judgegood');
        }
        const sheet = resolveSheet(emotion);
        if (!sheet) return;
        // A sheet that an authored recipe already covers is not played twice.
        //
        // Today this never fires: the card-use `setEmotion` in
        // `playCardEmotionAndSound` is behind a `FileIO.exists` on a directory
        // the web VM's filesystem does not have, so the six sheets that only
        // that branch can reach — 杀, 闪, 桃, 酒, 火杀, 雷杀 — have never played.
        // If a package ever mounts its `image/anim` folders, they would start
        // arriving on top of the authored effect for the same card rather than
        // instead of it, and two 杀 at once is worse than either alone.
        // `cards.ts` is keyed by the same engine name the sheet is.
        if (d.is_card !== true && CARD_FX.has(sheet.name)) return;
        this.play(d.is_card === true ? cardStage(id) : seatStage(id), sheet, 'card');
        return;
      }
      case 'InvokeSkill': {
        const id = Number(d.player);
        if (!Number.isFinite(id)) return;
        const host = this.hosts.get(seatStage(id));
        if (host) this.spec.skill(id, host, d.skill_type, d.name);
        return;
      }
      case 'InvokeUltSkill': {
        // The engine stops the room for 2000 ms after this one
        // (`room.lua:609`), which is why it — and only it — gets the room.
        const id = Number(d.player);
        if (!Number.isFinite(id)) return;
        const host = this.hosts.get(seatStage(id));
        if (host) this.spec.ult(id, host, d.name);
        return;
      }
      case 'Indicate': {
        // The line itself is drawn by `Indicators.tsx` from store state. Only
        // who it pointed at is kept here, so a seat that falls moments later
        // can be cut from the direction the engine was pointing.
        const to = Array.isArray(d.to) ? d.to : [];
        // Each entry is a CHAIN — `[target, ...subTargets]` — so the head of
        // each is the seat that was acted on.
        this.spec.line(d.from, to.map((leg) => (Array.isArray(leg) ? leg[0] : leg)));
        return;
      }
      default:
        // `SuperLightBox` points at a QML file the web room cannot run.
        return;
    }
  }

  /** `Room:sendLogEvent` — `room.lua:544`. */
  private onLogEvent(d: Record<string, unknown>): void {
    switch (d.type) {
      case 'PlaySound': {
        // Every card resolution in the game passes through here. See the module
        // header for why this and not `Emotion`.
        const cue = readCue(d.name);
        if (cue) this.cue = { cue, age: 0 };
        return;
      }
      case 'Damage': {
        const to = Number(d.to);
        if (!Number.isFinite(to)) return;
        // The impact itself is authored per element — cracks for a plain hit,
        // a column of flame for fire, a strobe and crawling arcs for thunder,
        // frost spidering across the portrait for ice. The upstream `damage`
        // sheet is one grey burst for all four and 25 kB to fetch.
        const type = element(String(d.damageType ?? 'normal_damage'));
        const recipe = HIT_FX.get(type);
        if (recipe) this.card(recipe, to, []);
        // The Qt client trembles the photo here (`Photo.qml:336`) and picks the
        // damage sound by element. The tint follows the same element, and it
        // moves the portrait, which an effect on the unclipped layer cannot.
        this.accent(seatStage(to), { cls: `fk-hit fk-hit--${type}`, ms: effectMs('accent') });
        // `damageNum` is the one field on this message nothing above reads, and
        // the impact above is per-element but not per-magnitude. The spectacle
        // lane states the number and shakes the table for two points or more;
        // it draws no second burst, because there is already a good one here.
        const host = this.hosts.get(seatStage(to));
        if (host) this.spec.damage(to, host, d.damageType, d.damageNum);
        return;
      }
      case 'LoseHP': {
        // No `to` on this one — the engine sends an empty table — so it can
        // only be rendered where it is unambiguous, which is nowhere. The hp
        // watcher below catches the drop instead.
        return;
      }
      case 'ChangeMaxHp': {
        // `{player, num}` — `events/hp.lua:480`. A wire event with a seat and a
        // signed magnitude on it, and until now no rendering at all: the hp bar
        // simply had a different number of slots the next time anyone looked.
        const who = Number(d.player);
        const host = this.hosts.get(seatStage(who));
        if (host) this.spec.maxHp(host, d.num);
        return;
      }
      case 'Death': {
        const to = Number(d.to);
        if (!Number.isFinite(to)) return;
        const host = this.hosts.get(seatStage(to));
        if (host) this.spec.slay(to, host, (id) => this.hosts.get(seatStage(id)));
        return;
      }
      default:
        return;
    }
  }

  /**
   * Health and chains, watched rather than announced.
   *
   * Recovery has no `LogEvent` of its own — a 桃 raises hp through the same
   * `PropertyUpdate` that everything else does. Watching the value is the only
   * way to know it happened, and it is still the engine's word: this reports a
   * change the engine made, it does not decide that one should have happened.
   */
  private onProperty(d: [number, string, unknown]): void {
    if (!Array.isArray(d)) return;
    const [id, prop, value] = d;
    // Kingdom and role are broadcast to every client at the top of the game and
    // again on every change. Neither is drawn on arrival: the kingdom frames a
    // skill banner and opens a turn, and the role is shown only at the instant
    // of a death — the same instant `Photo` starts showing it anyway, because
    // `dead` arrives in the same event (`events/death.lua:122`).
    if (prop === 'kingdom') { this.spec.setKingdom(id, value); return; }
    if (prop === 'role') { this.spec.setRole(id, value); return; }

    if (prop === 'hp') {
      const now = Number(value);
      const was = this.hp.get(id);
      this.hp.set(id, now);
      if (was === undefined || !Number.isFinite(now)) return;
      const host = this.hosts.get(seatStage(id));
      if (!host) return;
      if (now > was) this.spec.mend(host);
      // A drop that came from damage already has the impact above on it, and
      // `Spectacle.drain` drops itself when that is what happened. When it came
      // from a cost or 失去体力 this is the only sign of it, and it is shaped to
      // read as different: a hit arrives from outside, a cost leaves from inside.
      else if (now < was) this.spec.drain(id, host);
      return;
    }
    if (prop === 'chained') {
      // `./audio/system/chain` is broadcast with no player on it
      // (`serverplayer.lua:412`), so the property is the only thing that says
      // whose chain just closed. Only the transition animates; the state itself
      // is already drawn by `.fk-photo--chained`.
      const now = value === true;
      const was = this.chained.get(id);
      this.chained.set(id, now);
      if (was !== undefined && now && !was) {
        const recipe = GEAR_FX.get('chain');
        if (recipe) this.card(recipe, Number(id), []);
      }
      return;
    }
    // Phase 2 is `Start` — the top of a turn, once per turn per player.
    if (prop === 'phase' && Number(value) === 2) {
      // Authored rather than the shipped `playing` strip: a light running once
      // around the frame with the seat's kingdom seal at its shoulder says the
      // same thing as 110 kB of sprite, in the player's own colours, at any
      // seat size.
      const host = this.hosts.get(seatStage(id));
      if (host) this.spec.open(id, host);
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
      const host = this.hosts.get(seatStage(to));
      if (!host) continue;
      if (move.toArea === CARD_AREA.PlayerEquip) this.spec.equip(host);
      else if (move.toArea === CARD_AREA.PlayerHand) this.spec.draw(host, move.ids.length);
      // A delayed trick attaching. 乐不思蜀 and 兵粮寸断 land silently today:
      // a chip appears under the seat and that is the whole of it.
      else if (move.toArea === CARD_AREA.PlayerJudge) this.spec.hex(host);
    }
  }

  /* ----------------------------------------------------- routing a card cue */

  /**
   * Finding the seat a card sound belongs to.
   *
   * The sound carries the card and nothing else, so the seat comes from the
   * message the engine sends next — and which message that is depends on what
   * the card did, all three cases being the engine's own ordering rather than
   * anything inferred here:
   *
   *   使用 with targets  `Animate{Indicate}`, built two lines later in
   *                      `sendCardEmotionAndLog` from `from` and `getSubTos`.
   *   打出 (a response)  no indicate at all; `ShowVirtualCard` names the player.
   *   everything else    the card's own `MoveCards` into the processing area,
   *                      whose `from` is whoever played it.
   *
   * A cue that finds none of them inside `CUE_PATIENCE` messages is dropped. A
   * beat without an effect is the cost of a miss; an effect on the wrong seat
   * would be a lie about what happened.
   */
  private route(command: WireCommand, data: unknown): void {
    const held = this.cue;
    if (!held) return;

    if (command === 'Animate') {
      const d = data as { type?: string; from?: number; to?: unknown };
      if (d?.type === 'Indicate' && Number.isFinite(Number(d.from))) {
        // `to` is a list of CHAINS: `[target, ...subTargets]`. The head of each
        // is the target the card names; 借刀杀人's second hop is a sub-target of
        // the first and is drawn by the recipe, not by a second link.
        const chains = Array.isArray(d.to) ? (d.to as unknown[]) : [];
        const targets: number[] = [];
        for (const chain of chains) {
          const head = Array.isArray(chain) ? Number(chain[0]) : Number(chain);
          if (Number.isFinite(head)) targets.push(head);
        }
        this.cue = null;
        this.cueEffect(held.cue, Number(d.from), targets);
        return;
      }
    } else if (command === 'ShowVirtualCard') {
      const who = Number((data as unknown[])?.[1]);
      if (Number.isFinite(who)) {
        this.cue = null;
        this.cueEffect(held.cue, who, []);
        return;
      }
    } else if (command === 'MoveCards') {
      const merged = (data as { merged?: readonly { toArea?: number; from?: number }[] })?.merged;
      if (Array.isArray(merged)) {
        for (const move of merged) {
          if (move.toArea !== CARD_AREA.Processing) continue;
          const who = Number(move.from);
          if (!Number.isFinite(who)) continue;
          this.cue = null;
          this.cueEffect(held.cue, who, []);
          return;
        }
      }
    }

    held.age += 1;
    if (held.age > CUE_PATIENCE) this.cue = null;
  }

  /** Which recipe a resolved cue gets, and where it is drawn. */
  private cueEffect(cue: CardCue, from: number, targets: readonly number[]): void {
    if (cue.kind === 'gear') {
      // An equipment skill. The engine sends an unguarded `setEmotion` for these
      // (`events/skill.lua:75`) and upstream ships real art for every one of
      // them — a fan opening, a vine burning, a qilin bow — which is better than
      // anything a gradient would say about a specific object. The sprite has
      // it; drawing over it would only muddy it.
      if (resolveSheet(cue.name)) return;
      this.card(GENERIC_FX, from, targets);
      return;
    }
    if (cue.kind === 'equip') {
      const recipe = GEAR_FX.get(cue.name);
      if (recipe) this.card(recipe, from, []);
      return;
    }
    if (cue.kind === 'system') {
      // `chain` is handled off the `chained` property, which is the only thing
      // that says whose it was. `recast` has a player on its move.
      const recipe = cue.name === 'recast' ? GEAR_FX.get('recast') : undefined;
      if (recipe) this.card(recipe, from, []);
      return;
    }
    this.card(CARD_FX.get(cue.name) ?? GENERIC_FX, from, targets);
  }

  /* -------------------------------------------------------- authored output */

  /**
   * Draw one recipe: the caster's seat, each target's seat, a link across the
   * table to each of them, and the table itself.
   *
   * Geometry is measured off the live seat elements at the moment the effect is
   * built, the way `Indicators.tsx` measures the arrows, because the ring
   * resizes with the window and a seat's position is only known by the seat.
   * Nothing here reads layout again once the effect is running.
   */
  private card(recipe: CardRecipe, from: number, targets: readonly number[]): void {
    const ms = effectMs(recipe.wide ? 'wide' : 'strike');
    if (ms <= 0) return;
    const srcHost = this.hosts.get(seatStage(from));
    const u = this.unit(srcHost);
    if (u <= 0) return;

    // The layer is needed for a link, for a table-wide shape, and for the
    // geometry every other part reads — a burst on the victim throws its debris
    // along the line the strike came in on, and that line is only knowable here.
    const layer = srcHost ? tableLayer(srcHost) : null;
    const src = layer && srcHost ? pointOf(srcHost, layer) : null;

    const runs = targets.map((id, i) => {
      const dstHost = this.hosts.get(seatStage(id));
      const dst = layer && dstHost ? pointOf(dstHost, layer) : null;
      const angle = src && dst ? bearing(src, dst) : 0;
      const span = src && dst ? spanOf(src, dst) : 0;
      return { id, dst, scene: { u, span, angle, index: i, count: targets.length } as Scene };
    });

    if (recipe.table && layer) {
      this.mount(layer, 'table', recipe, recipe.table, 'fx--wide', ms,
        { u, span: 0, angle: 0, index: 0, count: 1 }, null);
    }

    if (recipe.source) {
      // The attacker's wind-up points where the strike is going, so the source
      // scene carries the bearing to the first target rather than zero. It read
      // as a glint pointing east on every seat in the ring before this.
      const lead = runs[0]?.scene ?? { u, span: 0, angle: 0, index: 0, count: 1 };
      this.onSeat(from, recipe, recipe.source, ms, lead);
    }

    if (!runs.length) return;

    // A link per target is right for a duel and wrong for 南蛮入侵. Past three
    // the links stop reading as direction and start reading as noise, and the
    // cards that hit everyone have a `table` shape for exactly that reason.
    const links = recipe.link && src && layer ? runs.slice(0, 3) : [];

    for (const run of runs) {
      if (recipe.target) this.onSeat(run.id, recipe, recipe.target, ms, run.scene);
      if (layer && src && run.dst && links.includes(run) && run.scene.span > 4 && recipe.link) {
        this.mount(layer, 'table', recipe, recipe.link, 'fx--link', ms, run.scene,
          { src, span: run.scene.span, angle: run.scene.angle });
      }
    }
  }

  private onSeat(id: number, recipe: CardRecipe, build: Build, ms: number, scene: Scene): void {
    const stage = this.stages.get(seatStage(id));
    if (stage) this.mount(stage, seatStage(id), recipe, build, '', ms, scene, null);
  }

  /**
   * Put one authored effect on a layer.
   *
   * The root carries its own `fx-life` animation and the removal listens for
   * that one specifically. `animationend` bubbles, and an effect here is a dozen
   * children finishing at a dozen different times — without the target check the
   * first shard to land would take the whole strike down with it.
   */
  private mount(
    layer: HTMLElement, bucket: string, recipe: CardRecipe, build: Build,
    scope: string, ms: number, scene: Scene,
    geom: { src: Point; span: number; angle: number } | null,
  ): void {
    const el = document.createElement('div');
    el.className = scope ? `fx ${recipe.cls} ${scope}` : `fx ${recipe.cls}`;
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--fx-ms', `${ms}ms`);
    el.style.setProperty('--fx-u', `${Math.round(scene.u)}px`);
    if (geom) {
      el.style.setProperty('--fx-x', `${Math.round(geom.src.x)}px`);
      el.style.setProperty('--fx-y', `${Math.round(geom.src.y)}px`);
      el.style.setProperty('--fx-len', `${Math.round(geom.span)}px`);
      el.style.setProperty('--fx-ang', `${geom.angle.toFixed(2)}deg`);
    }
    build(el, scene);

    const cap = bucket === 'table' ? MAX_ON_TABLE : MAX_PER_STAGE;
    const alive = this.live.get(bucket) ?? [];
    while (alive.length >= cap) alive.shift()?.remove();
    alive.push(el);
    this.live.set(bucket, alive);

    const done = (e?: Event) => {
      if (e && e.target !== el) return;
      el.remove();
      const list = this.live.get(bucket);
      if (list) this.live.set(bucket, list.filter((x) => x !== el));
    };
    el.addEventListener('animationend', done);
    // A tab backgrounded mid-effect never fires `animationend`. The root runs to
    // 1.35x its nominal length so the slowest child is not cut short, so the
    // safety net has to clear that too.
    window.setTimeout(() => done(), Math.round(ms * 1.35) + 400);
    layer.appendChild(el);
  }

  /**
   * The unit every authored length is a multiple of: the measured photo width.
   *
   * Cached for a quarter second because effects arrive in bursts and a burst
   * shares one table size. It only changes when the window does, and a stale
   * value for one beat after a resize is a slightly small effect, not a wrong
   * one.
   */
  private unit(host: HTMLElement | undefined): number {
    const now = Date.now();
    if (this.unitPx > 0 && now - this.unitAt < 250) return this.unitPx;
    const from = host ?? this.hosts.values().next().value;
    const w = from?.getBoundingClientRect().width ?? 0;
    if (w > 0) { this.unitPx = w; this.unitAt = now; }
    return this.unitPx;
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

  /* ---------------------------------------------------------- sprite output */

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
   * A CSS-authored accent on the seat itself: a hit shake, a heal pulse, an
   * equipment flash.
   *
   * These live on `.fk-photo` rather than on the effect layer because they move
   * the portrait — the layer is unclipped and sits over it, and a shake has to
   * be applied to the thing being shaken.
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
    this.spec.dispose();
    for (const t of this.accentTimers.values()) window.clearTimeout(t);
    this.accentTimers.clear();
    for (const list of this.live.values()) for (const el of list) el.remove();
    this.live.clear();
    dropTableLayer(this.hosts.values().next().value);
    this.stages.clear();
    this.hosts.clear();
    this.cue = null;
  }
}

/** `normal_damage` / `fire_damage` / `thunder_damage` / `ice_damage` -> a tint. */
function element(damageType: string): string {
  const name = damageType.replace(/_damage$/, '');
  return name === 'fire' || name === 'thunder' || name === 'ice' ? name : 'normal';
}
