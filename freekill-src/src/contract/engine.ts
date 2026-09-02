/**
 * How the app drives the two Lua VMs.
 *
 * The load-bearing shape, confirmed by the spike: every host call the engine
 * makes is SYNCHRONOUS. The whole game runs in one Lua coroutine that yields for
 * decisions; the host answers `doNotify`, `doRequest`, `waitForReply`, the clock
 * and the filesystem without ever awaiting. Keep it that way. Making any of
 * these async means rewriting `lua/server/request.lua`.
 *
 * Placement (do not change without re-measuring): the client VM runs on the main
 * thread so the room's ~164 `Lua.call` sites stay synchronous; only the host's
 * authoritative server VM gets a Web Worker.
 */
import type { Envelope, WireCommand, WireMessage } from './protocol';
import type { SceneInteraction } from './scene';

/* ------------------------------------------------------------------- bundle */

/** path -> Lua source. Mounted into the VM's virtual filesystem at `/fk`. */
export type LuaBundle = Readonly<Record<string, string>>;

export interface VmOptions {
  readonly bundle: LuaBundle;
  /**
   * REQUIRED FOR DETERMINISM. Lua 5.4 seeds its string hash from `time(NULL)` at
   * `lua_newstate`; under emscripten that reads `Date.now()`. A different hash
   * seed changes `pairs` iteration order, which changes
   * `Room:makeGeneralPile`'s pre-shuffle order, which changes the entire game
   * even with an identical `math.randomseed`. Pin this across state creation.
   * Two runs of one seed are byte-identical only when this is pinned.
   */
  readonly hashSeedEpoch: number;
  /** Enables `getMemoryUsed()`. Costs some throughput; off in production. */
  readonly traceAllocations?: boolean;
}

/* -------------------------------------------------------------- client side */

/**
 * The client VM: the room's brain. Every "can I", "what is this", "what does
 * this say" question goes here. No rules predicate may exist in TypeScript.
 */
export interface LuaClient {
  /** Feed one server message in. Drives the client's own engine state. */
  deliver(message: WireMessage): void;
  /** Feed a whole flush at once — the normal path. */
  deliverEnvelope(envelope: Envelope): void;

  /**
   * Everything the client Lua pushes out via `ClientInstance:notifyUI`.
   * Measured: 2,286 calls across a full game for one seat, of which 60 were
   * `UpdateRequestUI`. This is the room's entire render input.
   */
  onNotifyUI(handler: (command: WireCommand, data: unknown) => void): () => void;

  /** `UpdateRequestUI(elemType, id, action, data)` — the only way to interact
   *  with the `ui_emu` scene: card selection, target selection, skill buttons,
   *  OK/Cancel. Legality never leaves Lua. */
  interact(i: SceneInteraction): void;

  /**
   * Answer a dialog-shaped request.
   *
   * The scene model does not cover every ask. Choose-general, guanxing,
   * card-chosen, poxi and amazing-grace arrive as their own commands with their
   * own payloads, and the QML client answers them by calling
   * `ClientInstance:replyToServer(command, reply)` directly
   * (`Fk/Pages/LunarLTK/RoomLogic.js:141`). There is no scene interaction that
   * produces those replies, so `interact` cannot express them.
   *
   * The reply is plain data; the client VM encodes it with the engine's own
   * CBOR, so what reaches the host is byte-identical to what the QML client
   * would have sent.
   */
  replyToServer(command: WireCommand, reply: unknown): void;

  /** The client decided to answer; the transport ships it, the host decides. */
  onReply(handler: (command: WireCommand, reply: unknown) => void): () => void;

  /**
   * Escape hatch onto `lua/client/client_util.lua`. This is the one place a
   * generic call is allowed — `GetCardData`, `CardFitPattern`,
   * `RefreshStatusSkills`, `GetGenerals`, `GetGeneralDetail`, `Translate`.
   * Synchronous by design.
   */
  call<T = unknown>(fn: string, ...args: unknown[]): T;

  /** Resolve a `TaggedRef` from the wire into renderable data. */
  resolve(ref: unknown): unknown;

  /**
   * Deliver whatever the client VM has queued for the UI right now.
   *
   * `notifyUI` writes into a buffer inside the VM, and the buffer is normally
   * drained as a side effect of the three calls that already cross the seam:
   * feeding a flush in, an interaction, and a reply. `call` deliberately does
   * NOT drain it — a `Translate` happens inside a React render, and dispatching
   * notifications from there would mutate the store mid-render.
   *
   * That is fine for `RefreshStatusSkills`, whose output is a poll that the next
   * envelope carries along a beat later. It is not fine for a `call` a player
   * PRESSED: `RevertSelection` rewrites the whole card selection inside the VM
   * and announces it with one `UpdateRequestUI`, and without this the board
   * would not repaint until the player's next click.
   *
   * Optional because it is a property of a real VM and not of the contract: a
   * fixture client has no buffer to drain. Never call it from inside a notify
   * handler — that would interleave a newer message into an older batch.
   */
  flushUi?(): void;

  dispose(): void;
}

/* ---------------------------------------------------------------- host side */

/** Identity + state the host's engine needs for a seat. */
export interface SeatSpec {
  readonly playerId: number;
  readonly connId: number;
  readonly screenName: string;
  readonly avatar: string;
  /** `fk.Player_*`. 1 Online, 2 Trust (autopilot), 5 Robot.
   *  NOTE: `ServerRoomBase:checkNoHuman` ends any room whose seats are all
   *  Robot. A bots-only game must seat at least one Trust player. */
  readonly state: 1 | 2 | 5;
}

export interface RoomSpec {
  readonly roomId: string;
  readonly seed: number;
  readonly seats: readonly SeatSpec[];
  readonly ownerId: number;
  readonly timeout: number;
  /** Room settings. `gameMode`, `generalNum`, `generalTimeout`, `luckTime`,
   *  `disabledPack`, `disabledGenerals`, `enableDeputy`, `enableFreeAssign`,
   *  `enableObserverViewCard`, `password`. `generalTimeout` is not optional —
   *  `Room:askToChooseGeneral` reads it and throws on nil. */
  readonly settings: Readonly<Record<string, unknown>>;
}

/**
 * The authoritative server VM, in a Web Worker. Driven only through the three
 * entry points the C++ shell uses: `InitScheduler`, `HandleRequest`,
 * `ResumeRoom`. Everything else is the engine's business.
 */
export interface LuaHost {
  createRoom(spec: RoomSpec): Promise<void>;

  /**
   * Run until the room next yields. Returns whether the game is over.
   * `reason` mirrors the C++ resume reasons: `undefined` to start,
   * `'delay_done'` after a delay, `'request_timer'` on timeout, or a reply
   * arriving. Measured: 298 resumes for a full 8-player game.
   */
  resume(reason?: string): Promise<boolean>;

  /** A player answered. Accepted only if the engine asked them. */
  submitReply(playerId: number, reply: unknown): Promise<void>;

  /**
   * Output, already split. The public stream carries what every seat may see;
   * a per-player stream carries what only that seat may see. A public stream
   * that carries private data is the bug that breaks the privacy criteria.
   */
  onOutput(handler: (envelope: Envelope) => void): () => void;

  /** Every accepted decision, in order. This plus the seed is the command log. */
  onDecision(handler: (d: DecisionRecord) => void): () => void;

  /** Rebuild a room from seed + log, then continue live. Host migration. */
  replay(spec: RoomSpec, log: readonly DecisionRecord[]): Promise<void>;

  /** FNV-1a 64 over a canonical serialisation of `room:serialize()`.
   *  Compared at every decision boundary to prove a replay is faithful. */
  stateDigest(): Promise<string>;

  dispose(): void;
}

/** One accepted decision. 328 of these were a full game; 25 KB as Lua source. */
export interface DecisionRecord {
  /** 1-based, dense, no gaps. */
  readonly seq: number;
  readonly playerId: number;
  readonly command: WireCommand;
  /** Plain data — verified: the whole log serialises as a Lua literal with no
   *  metatables, i.e. no live engine objects leak into the log. */
  readonly reply: unknown;
  /** State digest immediately after this decision. Replay compares these. */
  readonly digest: string;
}
