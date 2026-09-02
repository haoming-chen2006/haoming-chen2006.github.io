/**
 * The room's state machine.
 *
 * One `applyNotify(command, data)` per message out of `LuaClient.onNotifyUI`.
 * This is the React equivalent of the `callbacks` table in
 * `Fk/Pages/LunarLTK/RoomLogic.js` (1,616 lines), minus the parts that were only
 * there to poke QML items.
 *
 * Deliberately mutable with a version counter: a full game is 2,286 notify
 * messages arriving in bursts between engine yields, and deep-copying the whole
 * table 2,286 times is the wrong shape. Subscribers read `store.state` after a
 * version bump.
 *
 * NOTHING HERE DECIDES ANYTHING. Card locations, hp, phases and log lines are
 * transcribed from the stream. Selectability lives in `SceneStore`.
 */
import type { SceneChange, ItemData } from '../../contract/scene';
import { CARD_AREA, type CardArea } from '../ltk/types';
import { asLocalized, type Localized } from '../../i18n/localized';
import type {
  AgState, CardState, LogLine, PlayerState, RoomState, SceneState, ToastLine,
} from './types';
import { EMPTY_SCENE } from './types';

type Notify = (command: string, data: unknown) => void;

function emptyPlayer(id: number): PlayerState {
  return {
    id, seat: 0, index: 0, screenName: '', avatar: '',
    general: '', deputyGeneral: '', kingdom: 'unknown', gender: 0,
    role: 'unknown', roleShown: false,
    hp: 0, maxHp: 0, shield: 0, phase: 8, maxCards: 0,
    dead: false, dying: false, chained: false, faceup: true,
    drank: 0, rest: 0, surrendered: false, sealedSlots: [],
    netstate: 'online', marks: {}, skills: [], limitSkills: {},
  };
}

export function initialRoomState(selfId: number | null): RoomState {
  return {
    selfId, playerNum: 0, settings: {}, started: false, round: 0, currentId: null,
    players: {}, circle: [],
    cardArea: {}, hands: {}, equips: {}, judge: {}, piles: {},
    table: [], cards: {}, drawPileCount: 0, discardCount: 0,
    log: [], toasts: [], banners: {}, focus: null, indicators: [], effects: [],
    ag: null, request: { kind: 'none' }, gameOver: null, tick: 0,
  };
}

/** Requests the engine renders as their own dialog rather than through the scene.
 *  Taken from `contract/scene.ts`'s `DIALOG_REQUESTS`. */
const DIALOG_COMMANDS = new Set([
  'AskForGeneral', 'AskForGuanxing', 'AskForArrangeCards', 'AskForExchange',
  'AskForChoice', 'AskForChoices', 'AskForCardChosen', 'AskForCardsChosen',
  'AskForPoxi', 'AskForMoveCardInBoard', 'AskForCardsAndChoice', 'MiniGame',
  'CustomDialog',
]);

/**
 * The status poll's own output — the six commands that repeat themselves.
 *
 * `RoomView` runs `RefreshStatusSkills` every 200 ms — `Room.qml`'s
 * `statusSkillTimer`, kept because it is the only thing that refreshes a hand
 * card's face after a filter skill, a hidden mark, and role visibility. What it
 * emits (`client_util.lua:1225`) is these six and nothing else: a `MaxCard` and
 * a `role_shown` per living player, a `SetPlayerMark` per visible mark, and one
 * each of the last three. Five times a second, for the whole game — about a
 * third of every message the room ever sees.
 *
 * Every other command marks the store dirty on arrival, because it describes
 * something that happened and something that happened is a render. These six
 * are weighed instead: they mark it dirty only where a value actually moved.
 *
 * THE POINT IS NOT THE COMMIT, IT IS THE SEAT. A poll tick usually does carry
 * one real change — somebody drew a card, so the pile count moved — so the
 * commit mostly still happens; measured over two audited games it fell only
 * from 0.94 to 0.91 commits per tick. What changes is what a commit costs.
 * `patchPlayer` below now leaves the seven seats the tick said nothing new
 * about exactly where they were, so `memo` on `Photo` bails out on all seven
 * instead of missing on all eight. Across the same two games that took React's
 * own reconciliation from 3,120 ms of host-seat CPU to 1,146 ms.
 */
const IDEMPOTENT = new Set([
  'MaxCard', 'SetPlayerMark', 'PropertyUpdate',
  'UpdateDrawPile', 'UpdateHandcard', 'UpdateSkill',
]);

/** Requests answered inside the room itself, through the scene's items. */
const SCENE_COMMANDS = new Set([
  'PlayCard', 'AskForUseCard', 'AskForResponseCard', 'AskForUseActiveSkill',
  'AskForSkillInvoke',
]);

/**
 * `EmptyRequest` is the engine's filler when a seat has nothing to be asked —
 * 29 of the reference game's 328 decision slots. `DIALOG_REQUESTS` marks it
 * `rendersUi: false`. Opening a request state for it would flash an empty
 * control row on every one of those slots, so it is a no-op.
 */
const NO_UI_COMMANDS = new Set(['EmptyRequest']);

export class RoomStore {
  state: RoomState;
  scene: SceneState = EMPTY_SCENE;
  /** Everything this room sent back, for the harness's interaction panel. */
  readonly outbound: { command: string; payload: unknown }[] = [];

  private version = 0;
  private readonly listeners = new Set<() => void>();
  private logSeq = 0;
  private toastSeq = 0;
  private effectSeq = 0;
  /**
   * Whether anything has actually moved since the last publish. See
   * `IDEMPOTENT`, and `commit`, which is a no-op when this is false.
   *
   * It starts true so that the first publish always happens, whatever the room
   * was handed first.
   */
  private touched = true;
  /** Set by the caller so `GameLog`'s `$` keys and prompts can be translated. */
  onSound?: (payload: unknown) => void;

  constructor(selfId: number | null) {
    this.state = initialRoomState(selfId);
  }

  /* --------------------------------------------------------- subscription */

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };

  getVersion = (): number => this.version;

  /**
   * Publish. Call once per burst, not once per message.
   *
   * IT PUBLISHES EVERY BURST, AND IT HAS TO.
   *
   * This briefly skipped a publish when no stored field had moved. It desynced
   * the table: two tabs disagreeing on `p6.hand`, 4 against 5, in all 21 samples
   * over ten seconds of the audit. The reason is that the store is not the only
   * thing the table draws from — `UpdateHandcard` and `UpdateSkill` say the
   * client VM's answer changed, the renderer reads that answer from the VM, and
   * there is no field here to notice it by. A tab told its hand had changed
   * never re-rendered to ask what it changed to, and stayed wrong.
   *
   * Making those two touch instead does not work either: `RefreshStatusSkills`
   * emits both five times a second whether or not anything moved, so touching on
   * them publishes every tick and the skip buys nothing.
   *
   * And it need not buy anything. The win in this file is `patchPlayer` below,
   * which keeps a seat's object identity when the poll says nothing new, so the
   * eight `Photo` memos bail out and a publish costs almost nothing. Measured
   * over three audited games, removing this skip moved the worst freeze from
   * 168 ms to 174 ms and left stalls and time lost identical — while taking
   * cross-seat agreement from FAIL back to ok.
   */
  commit(): void {

    this.version += 1;
    this.state = { ...this.state, discardCount: this.countDiscarded(), tick: this.version };
    for (const fn of this.listeners) fn();
  }

  /** Say that something moved, so the next `commit` publishes. */
  private touch(): void {
    this.touched = true;
  }

  /**
   * The discard pile, derived rather than counted up.
   *
   * A card moved from the table to the discard pile stays visible on the table
   * until `DestroyTableCardByEvent` retires it (`RoomLogic.js:194` skips that
   * move outright), so it is in the discard pile by area and on the table by
   * sight at the same time. Incrementing a counter on the move double-counts it;
   * asking the state is always right. The Qt client sidesteps this by not
   * showing a discard count at all (`MiscStatus.qml` shows the draw pile only).
   */
  private countDiscarded(): number {
    const onTable = new Set(this.state.table.map((c) => c.cid));
    let n = 0;
    for (const [cid, area] of Object.entries(this.state.cardArea)) {
      if (area === CARD_AREA.DiscardPile && !onTable.has(Number(cid))) n += 1;
    }
    return n;
  }

  reset(selfId: number | null): void {
    this.state = initialRoomState(selfId);
    this.scene = EMPTY_SCENE;
    this.outbound.length = 0;
    this.logSeq = 0;
    this.touch();
    this.commit();
  }

  /**
   * Leave the interactive state — `Room.qml`'s transition to `notactive`
   * (`Room.qml:64-99`), which disables every card and skill, un-highlights every
   * seat, hides OK/Cancel and clears the prompt.
   *
   * Three things end a request and all three land here: `CancelRequest`,
   * `GameOver`, and — the one that was missing — the room answering. The engine
   * emits `CancelRequest` only *before* the next `AskFor*`, so between a reply
   * and the next question there is nothing at all to switch the board off:
   * `RoomLogic.js:141` does it in `replyToServer` and this is the same line.
   */
  closeRequest(): void {
    this.state.request = { kind: 'none' };
    this.scene = EMPTY_SCENE;
    this.touch();
  }

  /* --------------------------------------------------------- helpers */

  private player(id: number): PlayerState {
    const s = this.state;
    let p = s.players[id];
    if (!p) {
      p = emptyPlayer(id);
      s.players = { ...s.players, [id]: p };
      this.touch();
    }
    return p;
  }

  /**
   * Patch a seat, and leave it alone when the patch says nothing new.
   *
   * THE SINGLE LARGEST THING IN THIS CHANGE. `Photo` is memoised on `player` by
   * reference, and the memo only ever bailed out if the reference held. It did
   * not: `MaxCard` and `role_shown` arrive five times a second per living seat
   * carrying the values already there, and a blind spread rebuilt the object —
   * and `state.players` above it — every time. Eight seats reconciled at 5 Hz
   * for nothing, which is exactly the case the memo was added to catch. On the
   * audited host seat that was 3.5 s of freeze; with this it is 145 ms.
   *
   * Shallow, with `Object.is`, which is the same comparison React's own memo
   * makes and is right for every field on `PlayerState` that the poll touches.
   * A field the engine hands over as a fresh array or object each time —
   * `sealedSlots`, `marks`, `skills` — always reads as changed, which is the
   * safe direction: it publishes a render nobody needed rather than withholding
   * one somebody did.
   */
  private patchPlayer(id: number, patch: Partial<PlayerState>): void {
    const p = this.player(id);
    let moved = false;
    for (const k of Object.keys(patch) as (keyof PlayerState)[]) {
      if (!Object.is(p[k], patch[k])) { moved = true; break; }
    }
    if (!moved) return;
    this.touch();
    this.state.players = { ...this.state.players, [id]: { ...p, ...patch } };
  }

  private card(cid: number): CardState {
    let c = this.state.cards[cid];
    if (!c) {
      c = { cid, known: false };
      this.state.cards = { ...this.state.cards, [cid]: c };
      this.touch();
    }
    return c;
  }

  /** The same identity-preserving patch as `patchPlayer`, for the same reason:
   *  `CardItem` is memoised and a rebuilt card object defeats it. */
  private patchCard(cid: number, patch: Partial<CardState>): void {
    const c = this.card(cid);
    let moved = false;
    for (const k of Object.keys(patch) as (keyof CardState)[]) {
      if (!Object.is(c[k], patch[k])) { moved = true; break; }
    }
    if (!moved) return;
    this.touch();
    this.state.cards = { ...this.state.cards, [cid]: { ...c, ...patch } };
  }

  private appendLog(html: Localized): void {
    this.logSeq += 1;
    const line: LogLine = { id: this.logSeq, html };
    // 400 lines is well past a full game's 389; the cap is a safety valve.
    const log = [...this.state.log, line];
    this.state.log = log.length > 600 ? log.slice(log.length - 600) : log;
  }

  /* ---------------------------------------------------------- card areas */

  /**
   * Which visual container an engine area maps to.
   *
   * `RoomLogic.js:166` (`getAreaItem`): the draw pile is its own invisible area,
   * and processing / discard / void all land on the table.
   */
  private static container(area: CardArea, owner?: number): string {
    switch (area) {
      case CARD_AREA.PlayerHand: return `hand:${owner}`;
      case CARD_AREA.PlayerEquip: return `equip:${owner}`;
      case CARD_AREA.PlayerJudge: return `judge:${owner}`;
      case CARD_AREA.PlayerSpecial: return `special:${owner}`;
      case CARD_AREA.DrawPile: return 'draw';
      case CARD_AREA.Processing:
      case CARD_AREA.DiscardPile:
      case CARD_AREA.Void: return 'table';
      default: return 'none';
    }
  }

  private removeFrom(area: CardArea, owner: number | undefined, ids: readonly number[], specialName?: string): void {
    const s = this.state;
    const drop = (list: readonly number[]) => list.filter((c) => !ids.includes(c));
    switch (area) {
      case CARD_AREA.PlayerHand:
        if (owner == null) return;
        s.hands = { ...s.hands, [owner]: drop(s.hands[owner] ?? []) };
        return;
      case CARD_AREA.PlayerEquip:
        if (owner == null) return;
        s.equips = { ...s.equips, [owner]: drop(s.equips[owner] ?? []) };
        return;
      case CARD_AREA.PlayerJudge:
        if (owner == null) return;
        s.judge = { ...s.judge, [owner]: drop(s.judge[owner] ?? []) };
        return;
      case CARD_AREA.PlayerSpecial: {
        if (owner == null || !specialName) return;
        const owned = s.piles[owner] ?? {};
        s.piles = { ...s.piles, [owner]: { ...owned, [specialName]: drop(owned[specialName] ?? []) } };
        return;
      }
      case CARD_AREA.Processing:
      case CARD_AREA.DiscardPile:
      case CARD_AREA.Void:
        s.table = s.table.filter((c) => !ids.includes(c.cid));
        return;
      default:
        return;
    }
  }

  private addTo(area: CardArea, owner: number | undefined, ids: readonly number[], specialName: string | undefined, eventId: number): void {
    const s = this.state;
    const add = (list: readonly number[]) => [...list, ...ids];
    switch (area) {
      case CARD_AREA.PlayerHand:
        if (owner == null) return;
        s.hands = { ...s.hands, [owner]: add(s.hands[owner] ?? []) };
        return;
      case CARD_AREA.PlayerEquip:
        if (owner == null) return;
        s.equips = { ...s.equips, [owner]: add(s.equips[owner] ?? []) };
        return;
      case CARD_AREA.PlayerJudge:
        if (owner == null) return;
        s.judge = { ...s.judge, [owner]: add(s.judge[owner] ?? []) };
        return;
      case CARD_AREA.PlayerSpecial: {
        if (owner == null || !specialName) return;
        const owned = s.piles[owner] ?? {};
        s.piles = { ...s.piles, [owner]: { ...owned, [specialName]: add(owned[specialName] ?? []) } };
        return;
      }
      case CARD_AREA.Processing:
      case CARD_AREA.DiscardPile:
      case CARD_AREA.Void:
        s.table = [...s.table, ...ids.map((cid) => ({ ...this.card(cid), eventId, expired: false }))];
        return;
      default:
        return;
    }
  }

  /** One arrow, source to targets. `doIndicate` skips a self-pointing leg
   *  rather than the whole line (`RoomLogic.js:568`). */
  private indicate(from: number, to: readonly number[]): void {
    const targets = to.filter((x) => typeof x === 'number' && x !== from);
    if (!targets.length) return;
    this.effectSeq += 1;
    this.state.indicators = [...this.state.indicators.slice(-6), {
      id: this.effectSeq, from, to: targets, at: Date.now(),
    }];
  }

  /** Drop table cards the engine has finished with. Called by the renderer once
   *  its fade-out has played, the way `TablePile.qml`'s vanish timer does. */
  pruneTable(): boolean {
    const kept = this.state.table.filter((c) => !c.expired);
    if (kept.length === this.state.table.length) return false;
    this.state.table = kept;
    this.touch();
    this.commit();
    return true;
  }

  /* ------------------------------------------------------------ the switch */

  applyNotify: Notify = (command, data) => {
    const s = this.state;
    // Every message describes something that happened, and something that
    // happened is a render — except the six the 200 ms status poll repeats,
    // which earn their render by actually differing. See `IDEMPOTENT`.
    if (!IDEMPOTENT.has(command)) this.touch();
    switch (command) {
      /* -------------------------------------------------------- room setup */
      case 'EnterRoom': {
        const [capacity, , settings] = data as [number, number, Record<string, unknown>];
        s.playerNum = capacity;
        // The third element is the room's settings blob, and it was being
        // dropped. It is the only place a seat is ever told what kind of room
        // it is sitting in — the Qt client reads the same values back out of
        // its own copy via `ClientInstance:getSettings`. Kept, never acted on:
        // see `RoomState.settings`.
        if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
          s.settings = settings as Record<string, unknown>;
        }
        return;
      }
      case 'AddPlayer': {
        const [id, name, avatar] = data as [number, string, string, boolean, number];
        this.patchPlayer(id, { screenName: name, avatar });
        return;
      }
      case 'AddNpc': {
        const [id, name, avatar] = data as [number, string, string, boolean, number];
        this.patchPlayer(id, { screenName: name, avatar });
        return;
      }
      case 'RemovePlayer': {
        const [id] = data as [number];
        const players = { ...s.players };
        delete players[id];
        s.players = players;
        return;
      }
      case 'StartGame': {
        s.started = true;
        return;
      }
      case 'ArrangeSeats': {
        // `RoomLogic.js:733`. The engine sends the circle; the viewer is rotated
        // to slot 0 so the room always draws them at the bottom.
        const order = [...(data as number[])];
        s.circle = order;
        s.playerNum = order.length;
        order.forEach((pid, i) => this.patchPlayer(pid, { seat: i + 1 }));
        const selfIdx = s.selfId == null ? 0 : Math.max(0, order.indexOf(s.selfId));
        const rotated = [...order.slice(selfIdx), ...order.slice(0, selfIdx)];
        rotated.forEach((pid, i) => this.patchPlayer(pid, { index: i }));
        return;
      }
      case 'ChangeSelf': {
        s.selfId = data as number;
        this.applyNotify('ArrangeSeats', [...s.circle]);
        return;
      }
      case 'PlayerRunned': {
        const [runner, robot] = data as [number, number];
        const p = s.players[runner];
        if (p) {
          const players = { ...s.players };
          delete players[runner];
          players[robot] = { ...p, id: robot };
          s.players = players;
        }
        return;
      }
      case 'NetStateChanged': {
        const [id, state] = data as [number, PlayerState['netstate']];
        const p = s.players[id];
        this.patchPlayer(id, { netstate: state === 'run' && p?.dead ? 'leave' : state });
        return;
      }

      /* ------------------------------------------------------- player props */
      case 'PropertyUpdate': {
        const [id, prop, value] = data as [number, string, unknown];
        const patch: Record<string, unknown> = {};
        switch (prop) {
          case 'role_shown': patch.roleShown = !!value; break;
          case 'deputyGeneral': patch.deputyGeneral = String(value ?? ''); break;
          case 'MaxCards': patch.maxCards = Number(value); break;
          case 'sealedSlots': patch.sealedSlots = (value as string[]) ?? []; break;
          case 'dead': case 'dying': case 'chained': case 'faceup':
          case 'surrendered':
            patch[prop] = !!value; break;
          case 'phase': {
            patch.phase = Number(value);
            // `Room.qml` derives "who is playing" from phase < NotActive.
            const before = s.currentId;
            if (Number(value) < 8) s.currentId = id;
            else if (s.currentId === id) s.currentId = null;
            // `PropertyUpdate` is idempotent by default because the poll sends
            // `role_shown` on it; a phase change is not the poll and moves the
            // gold ring round the table.
            if (s.currentId !== before) this.touch();
            break;
          }
          default:
            patch[prop] = value;
        }
        this.patchPlayer(id, patch as Partial<PlayerState>);
        return;
      }
      case 'MaxCard': {
        const d = data as { id: number; pcardMax: number; php: number };
        this.patchPlayer(d.id, { maxCards: d.pcardMax, hp: d.php });
        return;
      }
      case 'SetPlayerMark': {
        const [id, mark, value] = data as [number, string, unknown];
        const p = this.player(id);
        const drop = value === 0 || value == null;
        // The poll re-sends every visible `@` mark on every living seat, five
        // times a second. Rebuilding `marks` rebuilds the seat, so the mark is
        // compared first — and only a primitive can be compared, which is what
        // a displayed mark is (`how_to_show` renders it to a number or a
        // string). Anything else falls through and rebuilds, as before.
        const had = Object.prototype.hasOwnProperty.call(p.marks, mark);
        if (drop ? !had : (had && Object.is(p.marks[mark], value) && typeof value !== 'object')) return;
        const marks = { ...p.marks };
        if (drop) delete marks[mark];
        else marks[mark] = value;
        this.patchPlayer(id, { marks });
        return;
      }
      case 'SetBanner': {
        const [mark, value] = data as [string, unknown];
        const banners = { ...s.banners };
        if (value === 0 || value == null) delete banners[mark];
        else banners[mark] = value;
        s.banners = banners;
        return;
      }
      case 'UpdateMarkArea': {
        const { id, change } = data as { id: number; change: Record<string, unknown> };
        this.patchPlayer(id, { marks: { ...this.player(id).marks, ...change } });
        return;
      }
      case 'AddSkill': {
        const [id, skill] = data as [number, string];
        const p = this.player(id);
        if (!p.skills.includes(skill)) this.patchPlayer(id, { skills: [...p.skills, skill] });
        return;
      }
      case 'LoseSkill': {
        const [id, skill] = data as [number, string];
        const p = this.player(id);
        this.patchPlayer(id, { skills: p.skills.filter((x) => x !== skill) });
        return;
      }
      case 'UpdateLimitSkill': {
        const [id, skill, time] = data as [number, string, number];
        this.patchPlayer(id, { limitSkills: { ...this.player(id).limitSkills, [skill]: time } });
        return;
      }
      case 'ChangeSkin': {
        const [id, , path] = data as [number, unknown, string];
        this.patchPlayer(Number(id), { avatar: path === '-' ? '' : path });
        return;
      }

      /* ------------------------------------------------------------- cards */
      case 'MoveCards': {
        const d = data as {
          merged: readonly {
            fromArea: CardArea; toArea: CardArea; ids: number[];
            from?: number; to?: number; specialName?: string; fromSpecialName?: string;
          }[];
          event_id?: number;
          [cid: string]: unknown;
        };
        const eventId = Number(d.event_id ?? 0);
        for (const move of d.merged ?? []) {
          for (const cid of move.ids) {
            this.patchCard(cid, { known: !!d[String(cid)], eventId, expired: false });
            s.cardArea = { ...s.cardArea, [cid]: move.toArea };
          }

          // Pile counters follow every move, even the ones the table ignores.
          if (move.fromArea === CARD_AREA.DrawPile) s.drawPileCount = Math.max(0, s.drawPileCount - move.ids.length);
          if (move.toArea === CARD_AREA.DrawPile) s.drawPileCount += move.ids.length;

          // `RoomLogic.js:194` skips two shapes of move outright, and both
          // matter: a move inside one container is a no-op, and a card going
          // from the table to the discard pile STAYS on the table until the
          // engine's `DestroyTableCardByEvent` retires it. Re-adding it here is
          // what makes the table grow without bound.
          const from = RoomStore.container(move.fromArea, move.from);
          const to = RoomStore.container(move.toArea, move.to);
          if (from === to && from !== 'table') continue;
          if (from === 'table' && move.toArea === CARD_AREA.DiscardPile) continue;

          this.removeFrom(move.fromArea, move.from, move.ids, move.fromSpecialName);
          this.addTo(move.toArea, move.to, move.ids, move.specialName, eventId);
        }
        return;
      }
      case 'SetCardFootnote': {
        const [cid, raw] = data as [number, unknown, boolean];
        const note = asLocalized(raw);
        this.patchCard(cid, { footnote: note });
        s.table = s.table.map((c) => (c.cid === cid ? { ...c, footnote: note } : c));
        return;
      }
      case 'SetCardVirtName': {
        const [ids, name] = data as [number[], string, boolean];
        for (const cid of ids) this.patchCard(cid, { virtName: name });
        s.table = s.table.map((c) => (ids.includes(c.cid) ? { ...c, virtName: name } : c));
        return;
      }
      case 'ShowVirtualCard': {
        // `[card_data, playerid, footnote, event_id]`. `card_data` entries are
        // TaggedRef/opaque objects; the room shows them as face-down proxies
        // carrying the footnote until the caller resolves them.
        const [cardData, , footnote, eventId] = data as [unknown[], number, unknown, number];
        const note = footnote == null ? undefined : asLocalized(footnote);
        const cards: CardState[] = (cardData ?? []).map((_, i) => ({
          cid: -1 - i, known: true, virtual: true, footnote: note, eventId: Number(eventId ?? 0),
        }));
        s.table = [...s.table, ...cards];
        return;
      }
      case 'DestroyTableCard': {
        const ids = data as number[];
        s.table = s.table.map((c) => (ids.includes(c.cid) ? { ...c, expired: true } : c));
        return;
      }
      case 'DestroyTableCardByEvent': {
        const eventId = Number(data);
        // Retire the previous generation before marking a new one. The renderer
        // fades expired cards on a timer, but the timer is wall-clock and the
        // stream is not — a replay at 256x would otherwise pile up every card
        // the game ever put on the table. At most one generation ever lingers.
        s.table = s.table
          .filter((c) => !c.expired)
          .map((c) => ((c.eventId ?? 0) >= eventId ? { ...c, expired: true } : c));
        return;
      }
      case 'UpdateCard': {
        // Card identity changed (a filter skill fired). The card's face is
        // re-read from the client VM by the renderer; nothing to store.
        return;
      }
      case 'UpdateHandcard':
      case 'UpdateSkill':
        // Nothing to store: both say the client VM's own answer changed — which
        // hand cards exist, what a skill's state is — and the renderer reads
        // those from the VM rather than from here. There is no field to compare,
        // which is exactly why `commit` can no longer skip a publish; see there.
        return;
      case 'UpdateDrawPile': {
        const n = Number(data);
        if (n === s.drawPileCount) return;
        s.drawPileCount = n;
        this.touch();
        return;
      }
      case 'SyncDrawPile': {
        // The reshuffle, and the only message that moves cards without a
        // `MoveCards` to justify it.
        //
        // `Client:handleShuffleDrawPile` puts every discarded card back in the
        // draw pile inside the client VM and announces nothing
        // (`lua/lunarltk/client/client.lua:939`), because the Qt client keeps no
        // card-location table of its own — it asks the VM. This store does keep
        // one, so `lua/web/client.lua` forwards the VM's new pile as this
        // notify. Without it `cardArea` holds ~145 cards on `DiscardPile` for
        // the rest of the game while `UpdateDrawPile` pulls the pile count back
        // to the truth, and the room shows 牌堆 137 | 弃牌堆 141 — 278 cards in
        // a 160-card deck.
        //
        // The payload is the pile itself, so the count comes from it rather than
        // being guessed at: an id list is the one thing that can repair a
        // per-card table, and a count could not.
        const ids = (data as readonly number[] | null) ?? [];
        const area = { ...s.cardArea };
        for (const cid of ids) area[Number(cid)] = CARD_AREA.DrawPile;
        s.cardArea = area;
        s.drawPileCount = ids.length;
        return;
      }
      case 'UpdateRoundNum': {
        s.round = Number(data);
        return;
      }

      /* --------------------------------------------------------------- log */
      case 'GameLog': {
        // Already rendered by the engine into colour markup — see
        // `test/lua/lib/ui.lua` for the same conversion on the test side.
        // `lua/web/client.lua` renders it once per language and sends a map;
        // an older recording sends one string, which normalises to both.
        this.appendLog(asLocalized(data));
        return;
      }
      /**
       * The same line again, on the channel that means "announce it".
       *
       * `#NoCardDraw`, `#TimeOutDraw` and `#NoGeneralDraw` are how a game says
       * why it just ended in a draw; `#ChangePindianNumber`, 议事's result and
       * 谷虎's claim are how a skill says what it just decided. All of them are
       * flagged `toast = true` and all of them were arriving as one more line
       * scrolling past in a log the player is not reading during a resolution.
       *
       * Capped at four because they stack and the newest is the one that
       * matters; `Toasts` fades each out on its own clock.
       */
      case 'ShowToast': {
        this.toastSeq += 1;
        const line: ToastLine = { id: this.toastSeq, html: asLocalized(data), at: Date.now() };
        const next = [...s.toasts, line];
        s.toasts = next.length > 4 ? next.slice(next.length - 4) : next;
        return;
      }
      case 'LogEvent': {
        const d = data as { type: string; to?: number; damageType?: string; damageNum?: number };
        this.onSound?.(d);
        if (d.type === 'Damage' && d.to != null) {
          this.effectSeq += 1;
          s.effects = [...s.effects, {
            id: this.effectSeq, playerId: d.to, kind: 'damage',
            value: d.damageType ?? 'normal_damage', at: Date.now(),
          }];
        }
        return;
      }
      case 'Animate': {
        const d = data as {
          type: string; from?: number; to?: number[][]; player?: number;
          emotion?: string; name?: string;
        };
        if (d.type === 'Indicate' && d.from != null) {
          // `to` is a list of CHAINS, not of targets: each entry is
          // `[target, ...subTargets]` and draws two hops — source to target,
          // then target to its own sub-targets (`RoomLogic.js:1313`, and
          // `events/usecard.lua:79` which builds it from `getSubTos`). Collateral
          // is the everyday case: 借刀杀人 points A at B, and B at the victim C.
          // Reading only `t[0]` drew the first hop and silently lost the second.
          for (const chain of d.to ?? []) {
            if (!Array.isArray(chain) || chain.length === 0) continue;
            this.indicate(d.from, [chain[0]]);
            if (chain.length > 1) this.indicate(chain[0], chain.slice(1));
          }
        } else if (d.type === 'Emotion' && d.player != null) {
          this.effectSeq += 1;
          s.effects = [...s.effects, {
            id: this.effectSeq, playerId: d.player, kind: 'emotion',
            value: d.emotion ?? '', at: Date.now(),
          }];
        } else if (d.type === 'InvokeSkill' && d.player != null) {
          this.effectSeq += 1;
          s.effects = [...s.effects, {
            id: this.effectSeq, playerId: d.player, kind: 'skill',
            value: d.name ?? '', at: Date.now(),
          }];
        }
        return;
      }
      case 'MoveFocus': {
        const [ids, cmd, timeout] = data as [number[], string, number | undefined];
        s.focus = { ids, command: cmd, timeout: timeout ?? 15000, startedAt: Date.now() };
        return;
      }

      /* -------------------------------------------------------- amazing grace */
      case 'FillAG': {
        const arr = Array.isArray(data) ? (data as unknown[]) : [];
        s.ag = {
          ids: (arr[0] as number[]) ?? [],
          taken: {},
          interactive: false,
          disabled: (arr[1] as number[]) ?? [],
        };
        return;
      }
      case 'AskForAG': {
        // `[ids, cancelable, reason]` — the ids are the subset still takeable.
        const ids = Array.isArray(data) ? ((data as unknown[])[0] as number[] ?? []) : [];
        if (s.ag) s.ag = { ...s.ag, interactive: true, disabled: s.ag.ids.filter((c) => !ids.includes(c)) };
        s.request = { kind: 'dialog', command: 'AskForAG', data };
        return;
      }
      case 'TakeAG': {
        const [pid, cid] = data as [number, number];
        if (s.ag) s.ag = { ...s.ag, taken: { ...s.ag.taken, [cid]: pid }, interactive: false } as AgState;
        return;
      }
      case 'CloseAG': {
        s.ag = null;
        return;
      }

      /* ---------------------------------------------------------- requests */
      case 'CancelRequest': {
        this.closeRequest();
        return;
      }
      case 'UpdateRequestUI': {
        this.scene = applySceneChange(this.scene, data as SceneChange);
        return;
      }
      case 'GameOver': {
        s.gameOver = String(data);
        this.closeRequest();
        return;
      }
      case 'ReplyToServer': {
        // `doOKButton` does not send anything itself: it pushes this, and
        // `lua/web/client.lua` puts it on the wire. Seeing it is the room's
        // signal that the question it was answering is over.
        this.outbound.push({ command: 'ReplyToServer', payload: data });
        this.closeRequest();
        return;
      }
      default: {
        if (NO_UI_COMMANDS.has(command)) return;
        if (SCENE_COMMANDS.has(command)) {
          s.request = { kind: 'scene', command, promptArg: promptArgOf(command, data) };
          this.scene = { ...this.scene, active: true };
          return;
        }
        if (DIALOG_COMMANDS.has(command)) {
          s.request = { kind: 'dialog', command, data };
          this.scene = { ...this.scene, active: true };
          return;
        }
        // Everything else is engine bookkeeping the room does not draw
        // (SetCardUseHistory and friends — 70% of the wire, 0% of the picture).
        return;
      }
    }
  };
}

/**
 * What a scene request names in `data[0]`: the skill it is offering, or the
 * card it wants used or played.
 *
 * `ReqInvoke` never calls `setPrompt` at all, and `ReqResponseCard` sets
 * whatever the server sent — which is `""` for every ordinary "play a Jink".
 * The scene therefore carries no prompt for the two commonest questions in the
 * game, and the QML client fills the gap from the payload rather than from the
 * scene (`RoomLogic.js:825`, `:1233`, `:1266`). This is that payload field; the
 * dashboard puts it into `%1` of `#<command>` when the scene has nothing.
 */
function promptArgOf(command: string, data: unknown): string | undefined {
  if (command !== 'AskForSkillInvoke' && command !== 'AskForUseCard'
    && command !== 'AskForResponseCard') return undefined;
  const first = Array.isArray(data) ? data[0] : undefined;
  return typeof first === 'string' && first !== '' ? first : undefined;
}

/**
 * Apply one `UpdateRequestUI` diff to the held scene.
 *
 * The payload is a diff, never a snapshot (`lua/ui_emu/base.lua` accumulates
 * `parent.change` and clears it every interaction). Underscore keys are
 * metadata; every other key is an elemType whose array holds changed items.
 */
export function applySceneChange(prev: SceneState, change: SceneChange): SceneState {
  const items: Record<string, Record<string, ItemData>> = {};
  for (const [k, v] of Object.entries(prev.items)) items[k] = { ...v };
  const uiData: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(prev.uiData)) uiData[k] = { ...v };
  const created: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(prev.created)) created[k] = [...v];

  for (const entry of change._new ?? []) {
    const t = entry.type;
    const id = String(entry.data.id);
    items[t] = items[t] ?? {};
    items[t][id] = { ...entry.data };
    created[t] = created[t] ?? [];
    if (!created[t].includes(id)) created[t].push(id);
    if (entry.ui_data !== undefined) {
      uiData[t] = uiData[t] ?? {};
      uiData[t][id] = entry.ui_data;
    }
  }

  for (const [key, value] of Object.entries(change)) {
    if (key.startsWith('_')) continue;
    const arr = value as ItemData[];
    if (!Array.isArray(arr)) continue;
    items[key] = items[key] ?? {};
    for (const item of arr) {
      const id = String(item.id);
      items[key][id] = { ...items[key][id], ...item };
    }
  }

  for (const entry of change._delete ?? []) {
    const t = entry.type;
    const id = String(entry.id);
    if (items[t]) delete items[t][id];
    if (uiData[t]) delete uiData[t][id];
    if (created[t]) created[t] = created[t].filter((x) => x !== id);
  }

  return {
    type: change._type ?? prev.type,
    prompt: change._prompt ?? prev.prompt,
    items,
    uiData,
    created,
    // Whether a request is open is the request's business, not the diff's. The
    // engine sends one last empty `{_type = "Room"}` after every reply
    // (`RequestHandler:_finish`), and a diff that re-armed the board would undo
    // the `notactive` the reply just put it in.
    active: prev.active,
  };
}
