/**
 * Engine-side types.
 *
 * The interfaces themselves live in `src/contract/engine.ts` and are frozen;
 * this file re-exports them and adds only what the contract does not cover but
 * a real implementation needs. Every addition below is an extension, never a
 * replacement — a value produced here still satisfies the contract's type.
 */
import type { Envelope, WireCommand, WireMessage } from '../contract/protocol.ts';

export type {
  DecisionRecord,
  LuaBundle,
  LuaClient,
  LuaHost,
  RoomSpec,
  SeatSpec,
  VmOptions as ContractVmOptions,
} from '../contract/engine.ts';

export type {
  BYTES_PREFIX,
  ClientReply,
  Envelope,
  MessageKind,
  TaggedRef,
  WireCommand,
  WireMessage,
} from '../contract/protocol.ts';

/** `fk.Player_*`, from `src/swig/player.i`. */
export const PlayerState = {
  Invalid: 0,
  Online: 1,
  /** Human seat on autopilot. Takes the AI reply path but still gets `doRequest`. */
  Trust: 2,
  Run: 3,
  Leave: 4,
  Robot: 5,
  Offline: 6,
} as const;

/**
 * The contract's `WireMessage` plus the raw bytes.
 *
 * This is the one place the implementation had to go past the frozen shape, and
 * the reason is fidelity, not convenience. `WireMessage.data` is the payload
 * CBOR-decoded into plain JSON — the right thing for a renderer or for a row in
 * Postgres, but it cannot be fed back into a Lua VM without loss: canonical JSON
 * flattens a Lua float that happens to be integral, stringifies non-string table
 * keys, and turns non-UTF-8 bytes into a `__bytes:` marker. Round-tripping ten
 * thousand messages a game through that is a slow way to introduce a divergence
 * nobody can reproduce.
 *
 * So the payload travels as opaque base64 of the engine's own CBOR, straight
 * from the host VM into the receiving client VM, and `data` is populated only
 * when a consumer actually wants to read it. Structurally this is still a
 * `WireMessage`, so `Envelope` is unchanged.
 */
export interface WirePayloadMessage extends WireMessage {
  /** base64 of the raw CBOR the engine emitted. Never decoded in TypeScript. */
  readonly payload: string;
}

export interface PayloadEnvelope extends Envelope {
  readonly messages: readonly WirePayloadMessage[];
}

/** One message the engine addressed to one connection, before routing. */
export interface AddressedMessage extends WirePayloadMessage {
  readonly connId: number;
  /** Flush batch == one `ResumeRoom` boundary. */
  readonly batch: number;
}

/**
 * The engine's output for one flush, split into what everyone may see and what
 * only one seat may see. `to: null` is the public channel.
 */
export interface RoutedFlush {
  readonly batch: number;
  readonly envelopes: PayloadEnvelope[];
}

export interface ResumeResult {
  over: boolean;
  /** Milliseconds of animation delay the room asked for on this resume. */
  delayMs: number;
  requestTimerMs?: number;
  err?: string;
}

export interface AdvanceOptions {
  reason?: string | null;
  advanceUs?: number;
  maxResumes?: number;
  /**
   * When false (the default) the clock jumps by exactly the delay the engine
   * asked for, so a headless game runs at full speed and reproduces exactly.
   * A live host passes real elapsed time instead, which is what makes a human's
   * request timer expire.
   */
  realtime?: boolean;
  /** Stop the moment a replay runs out of log, parked at the handover point. */
  stopWhenLogExhausted?: boolean;
}

export interface AdvanceResult {
  over: boolean;
  resumes: number;
  /** Connections the room is now waiting on. Empty means it finished. */
  waitingOn: number[];
  /**
   * Why the loop stopped. `budget` and `log` are ordinary outcomes - a bounded
   * advance and a finished replay - so they are reported here rather than as
   * `err`, which is reserved for the engine actually failing.
   */
  stopped: 'over' | 'input' | 'budget' | 'log' | 'error';
  err?: string;
}

export interface HostStats {
  messages: number;
  bytes: number;
  batches: number;
  decisions: number;
  clockUs: number;
  luaHeapKiB: number;
}

/** What the client VM handed the UI. `data` is already decoded, inside Lua. */
export interface UiEvent {
  seq: number;
  command: WireCommand;
  data: unknown;
}

/** What the client VM wants to send back to the authoritative room. */
export interface ClientOutbound {
  seq: number;
  kind: 'reply' | 'notify';
  command: WireCommand;
  /** base64 CBOR, exactly as the client's own engine encoded it. */
  payload: string;
}

/** Replay bookkeeping, so a caller can tell a faithful replay from a hopeful one. */
export interface ReplayStatus {
  applied: number;
  total: number;
  /** Set the moment the log's next decision does not match what the room asked. */
  divergence: string | null;
  /** The log ran out and the room is parked mid-request, ready to go live. */
  exhausted: boolean;
}
