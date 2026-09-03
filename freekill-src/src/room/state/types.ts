/**
 * What the room renders.
 *
 * Every field here is set by a command in the notify stream and by nothing else.
 * There is no derived-legality field: whether a card may be picked, whether a
 * player may be targeted and whether OK is pressable all live in `SceneState`,
 * which is a straight copy of the Lua `ui_emu` scene.
 */
import type { Localized } from '../../i18n/localized';
import type { ItemData } from '../../contract/scene';
import type { CardArea } from '../ltk/types';

export interface PlayerState {
  readonly id: number;
  /** Position in the circle as the engine ordered it (`ArrangeSeats`). */
  seat: number;
  /** Rendering slot: 0 is the viewer, 1..n-1 clockwise from them. */
  index: number;
  screenName: string;
  avatar: string;
  general: string;
  deputyGeneral: string;
  kingdom: string;
  gender: number;
  role: string;
  roleShown: boolean;
  hp: number;
  maxHp: number;
  shield: number;
  /** `Player.Phase`; 8 is NotActive. */
  phase: number;
  maxCards: number;
  dead: boolean;
  dying: boolean;
  chained: boolean;
  faceup: boolean;
  drank: number;
  rest: number;
  surrendered: boolean;
  sealedSlots: readonly string[];
  netstate: 'online' | 'offline' | 'run' | 'trust' | 'leave' | 'robot';
  /** `@`-prefixed marks only; the client filters the rest out. */
  marks: Readonly<Record<string, unknown>>;
  /** Skill names, in the order the engine granted them. */
  skills: readonly string[];
  /** `UpdateLimitSkill` — remaining uses of a limit/wake skill. */
  limitSkills: Readonly<Record<string, number>>;
}

/** A card sitting somewhere the room draws it. */
export interface CardState {
  readonly cid: number;
  /** False while the viewer may not see the face. */
  known: boolean;
  /**
   * Rendered under the card on the table. Already HTML from the engine, which
   * means it is already translated — so the engine sends one rendering per
   * language and the renderer picks. See `src/i18n/localized.ts`.
   */
  footnote?: Localized;
  /** A filter skill renamed it (`fire__slash` over a `slash`). */
  virtName?: string;
  /** `data.event_id` of the move that put it on the table. */
  eventId?: number;
  /** Set by `DestroyTableCardByEvent`; the card fades and leaves. */
  expired?: boolean;
  /** Only for virtual cards pushed by `ShowVirtualCard`. */
  virtual?: boolean;
}

export interface AgState {
  readonly ids: readonly number[];
  /** cid -> the player who took it. */
  readonly taken: Readonly<Record<number, number>>;
  /** True once `AskForAG` arrives for this viewer. */
  readonly interactive: boolean;
  readonly disabled: readonly number[];
}

export interface FocusState {
  readonly ids: readonly number[];
  /** The `AskFor*` name; rendered as "<command> thinking…". */
  readonly command: string;
  readonly timeout: number;
  /** `performance.now()` when it started, for the progress ring. */
  readonly startedAt: number;
}

export interface LogLine {
  readonly id: number;
  /**
   * Engine-rendered HTML-ish markup — colours and `<b>` already applied, which
   * also means already translated. `Client:parseMsg` runs inside the client VM
   * and leaves no key behind, so `lua/web/client.lua` renders each line once per
   * language and both are kept: the panel picks at render time, and switching
   * language retranslates the scrollback rather than only the next line.
   */
  readonly html: Localized;
}

/**
 * A line the engine wanted said out loud rather than filed.
 *
 * `Client:appendLog` sends `ShowToast` alongside `GameLog` for every log
 * message flagged `toast = true` (`lua/lunarltk/client/client.lua:234`, mirrored
 * by `lua/web/client.lua:187`) — the same rendered markup, a second time, on a
 * channel whose only purpose is "look at this now". Upstream shows it as a
 * fading plate over the table (`Fk/Base/ToastManager.qml`).
 *
 * It is the same `Localized` pair as a log line, because it is literally the
 * same string.
 */
export interface ToastLine {
  readonly id: number;
  readonly html: Localized;
  /** `Date.now()` when it arrived; the renderer fades it out from here. */
  readonly at: number;
}

/** A transient arrow between seats (`Animate` / `Indicate`). */
export interface IndicatorState {
  readonly id: number;
  readonly from: number;
  readonly to: readonly number[];
  readonly at: number;
}

/** A transient overlay on a seat (`Animate` / `Emotion`, `InvokeSkill`). */
export interface SeatEffect {
  readonly id: number;
  readonly playerId: number;
  readonly kind: 'emotion' | 'skill' | 'damage';
  /** Emotion sprite name, or the translated skill name. */
  readonly value: string;
  readonly at: number;
}

export type PendingRequest =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'scene';
      readonly command: string;
      /**
       * What the request is asking for — a skill name or a card name — taken
       * from `data[0]`. Three scene requests carry no prompt of their own more
       * often than not (`ReqInvoke` never sets one at all; `AskForUseCard` and
       * `AskForResponseCard` arrive with `prompt == ""` for every "play a Jink"),
       * and the QML client fills the gap by putting this into `%1` of
       * `#<command>` — `RoomLogic.js:825`, `:1233`, `:1266`.
       */
      readonly promptArg?: string;
      /**
       * The prompt the *caller* wrote, from `data[1]`, when it wrote one.
       *
       * `RoomLogic.js:829` prefers it over the `#<command>` template and only
       * falls back to `promptArg` when it is empty — so a request that says
       * what it wants says it in its own words. Nearly every `AskForSkillInvoke`
       * leaves it blank, which is why the fallback exists at all; 手气卡 does
       * not, and it is the one place the difference is load-bearing, because
       * the count of redraws you have left lives in this string and nowhere
       * else (`gameflow.lua:139`, `request.lua:168`).
       *
       * A `processPrompt` key, not a sentence: `#AskForLuckCard:::5`.
       */
      readonly promptKey?: string;
    }
  | { readonly kind: 'dialog'; readonly command: string; readonly data: unknown };

export interface RoomState {
  /** Seat the viewer occupies. Null for observers and replays. */
  selfId: number | null;
  playerNum: number;
  /**
   * The room's settings, as `EnterRoom` sent them.
   *
   * `data[2]` of the very first message any seat receives — `gameMode`,
   * `generalNum`, `generalTimeout`, `enableDeputy`, `enableFreeAssign`,
   * `disabledPack`, and the rest. The Qt client reads the same values back
   * through `ClientInstance:getSettings(key)` (`core/roombase.lua:85`) and
   * gates UI on them; `ChooseGeneralBox.qml:29` and `:176` are two such gates.
   *
   * It is a bag of unknowns on purpose. A package may put anything in here, and
   * nothing in the room is allowed to turn one of these into a rule — the only
   * legitimate use is deciding what UI to *offer*, which is exactly what the
   * QML does with it.
   */
  settings: Readonly<Record<string, unknown>>;
  started: boolean;
  round: number;
  /** `SetCurrent`-equivalent: the player whose turn it is. Derived from `phase`. */
  currentId: number | null;
  players: Readonly<Record<number, PlayerState>>;
  /** Engine seat order, as `ArrangeSeats` gave it. */
  circle: readonly number[];

  /** cid -> where it is. Bookkeeping the client Lua also keeps; never a rule. */
  cardArea: Readonly<Record<number, CardArea>>;
  /** pid -> ordered hand. Face-down for everyone but the viewer. */
  hands: Readonly<Record<number, readonly number[]>>;
  equips: Readonly<Record<number, readonly number[]>>;
  judge: Readonly<Record<number, readonly number[]>>;
  /** pid -> pile name -> cards. `AskForUseActiveSkill.expand_pile` renders these. */
  piles: Readonly<Record<number, Readonly<Record<string, readonly number[]>>>>;

  /** Processing / discard / void — everything the table shows. */
  table: readonly CardState[];
  cards: Readonly<Record<number, CardState>>;
  drawPileCount: number;
  discardCount: number;

  log: readonly LogLine[];
  /** `ShowToast` — the log lines the engine also wanted announced. */
  toasts: readonly ToastLine[];
  banners: Readonly<Record<string, unknown>>;
  focus: FocusState | null;
  indicators: readonly IndicatorState[];
  effects: readonly SeatEffect[];
  ag: AgState | null;

  /** The request currently open, if any. */
  request: PendingRequest;
  /** Winner string from `GameOver`, e.g. `rebel+rebel_chief+civilian`. */
  gameOver: string | null;

  /** Monotonic counters for React keys. */
  tick: number;
}

/** The `ui_emu` scene, mirrored. This is the only place selectability exists. */
export interface SceneState {
  readonly type: string;
  /** Raw i18n key; the room translates it through `processPrompt`. */
  readonly prompt: string;
  /** elemType -> id -> the item's data, exactly as Lua sent it. */
  readonly items: Readonly<Record<string, Readonly<Record<string, ItemData>>>>;
  /** `_new` entries keep their `ui_data` render hints (footnote, reason). */
  readonly uiData: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /**
   * elemType -> ids the request created after the scene was built (`_new`),
   * minus the ones it has since retracted (`_delete`).
   *
   * For `CardItem` this is precisely the expanded piles. `RoomScene:initialize`
   * builds the hand's items before `RequestHandler.change` exists, so they are
   * never announced as `_new`; the only thing that adds a card to a *live*
   * scene is `ReqActiveSkill:expandPile`. `Dashboard.qml:155-179` keys off
   * exactly this to add and remove the cards it shows beside the hand.
   */
  readonly created: Readonly<Record<string, readonly string[]>>;
  /** True between `PlayCard`/`AskFor*` and the reply or `CancelRequest`. */
  readonly active: boolean;
}

export const EMPTY_SCENE: SceneState = {
  type: 'Room', prompt: '', items: {}, uiData: {}, created: {}, active: false,
};
