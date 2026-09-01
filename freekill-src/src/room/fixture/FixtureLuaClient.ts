/**
 * A `LuaClient` (contract/engine.ts) backed by Agent 0's recorded fixtures.
 *
 * This is the room lane's development engine. It replays the real `notifyUI`
 * stream that a real 8-player 身份局 produced, and answers `call(...)` from a
 * dump of the same engine's static data. Agent 1's client VM replaces it
 * verbatim — same interface, same shapes, same order.
 *
 * What it deliberately does NOT do: decide anything. `interact` is recorded and
 * surfaced, never interpreted. There is no local model of what a click means,
 * because that model lives in `lua/client/request/` and nowhere else.
 */
import type { LuaClient } from '../../contract/engine';
import type { Envelope, WireCommand, WireMessage } from '../../contract/protocol';
import type { SceneInteraction } from '../../contract/scene';
import * as data from './luaData';
import type { Language } from './luaData';

export interface NotifyFrame {
  readonly seq: number;
  readonly command: string;
  readonly data?: unknown;
}

/** A `Lua.call` the fixture could not answer. Surfaced in the harness so a gap
 *  in the recording is visible rather than silently rendered as a blank. */
export interface UnansweredCall {
  readonly fn: string;
  readonly args: readonly unknown[];
  count: number;
}

export interface FixtureLuaClientOptions {
  readonly frames: readonly NotifyFrame[];
  readonly language?: Language;
  /** Pile size at `StartGame`; the fixture's `PrepareDrawPile` had 160. */
  readonly initialDrawPile?: number;
}

export class FixtureLuaClient implements LuaClient {
  private readonly notifyHandlers = new Set<(c: WireCommand, d: unknown) => void>();
  private readonly replyHandlers = new Set<(c: WireCommand, r: unknown) => void>();
  private readonly frames: readonly NotifyFrame[];
  private readonly initialDrawPile: number;

  /** Index of the next frame to emit. */
  cursor = 0;
  language: Language;

  /** Every `UpdateRequestUI(elemType, id, action, data)` the room produced. */
  readonly interactions: SceneInteraction[] = [];
  /** Every dialog-shaped reply the room sent back. */
  readonly replies: { command: WireCommand; reply: unknown }[] = [];
  /** Every `call` the fixture had no answer for, deduped. */
  readonly unanswered = new Map<string, UnansweredCall>();
  /** Every envelope handed in via `deliver*`; unused in replay mode. */
  readonly delivered: WireMessage[] = [];
  private readonly watchers = new Set<() => void>();

  constructor(opts: FixtureLuaClientOptions) {
    this.frames = opts.frames;
    this.language = opts.language ?? 'zh_CN';
    this.initialDrawPile = opts.initialDrawPile ?? 160;
  }

  get total(): number { return this.frames.length; }
  get done(): boolean { return this.cursor >= this.frames.length; }
  peek(): NotifyFrame | undefined { return this.frames[this.cursor]; }

  /* ------------------------------------------------------------- playback */

  /** Emit the next frame. Returns false at the end of the recording. */
  step(): boolean {
    const frame = this.frames[this.cursor];
    if (!frame) return false;
    this.cursor += 1;
    this.emit(frame.command, frame.data);
    // `UpdateDrawPile` only ever reaches the UI from `RefreshStatusSkills`,
    // which the spike never ran, so the recording has none. The pile size at
    // StartGame is recoverable from the seat stream's `PrepareDrawPile`; the
    // room's own MoveCards accounting keeps it current after that.
    if (frame.command === 'StartGame') this.emit('UpdateDrawPile', this.initialDrawPile);
    if (frame.command === 'ReplyToServer') {
      for (const h of this.replyHandlers) h('ReplyToServer' as WireCommand, frame.data);
    }
    return true;
  }

  /** Emit frames until `predicate` is satisfied by the frame just emitted. */
  stepUntil(predicate: (f: NotifyFrame) => boolean, limit = 5000): number {
    let n = 0;
    while (n < limit && !this.done) {
      const frame = this.frames[this.cursor];
      this.step();
      n += 1;
      if (frame && predicate(frame)) break;
    }
    return n;
  }

  seek(index: number, replayFrom: () => void): void {
    this.cursor = 0;
    replayFrom();
    while (this.cursor < index && this.step()) { /* advance */ }
  }

  /**
   * Push a message that is not the next frame.
   *
   * Used by the harness to replay one of the distinct `UpdateRequestUI` diffs in
   * `fixtures/request-ui-scenes.json`. Those were harvested across 16 games and
   * three seats, so they carry scenes this one seat's timeline never produced —
   * notably the ones with selectable cards and candidate targets.
   */
  inject(command: string, payload: unknown): void {
    this.emit(command, payload);
  }

  private emit(command: string, payload: unknown): void {
    for (const h of this.notifyHandlers) h(command as WireCommand, payload);
  }

  /* ---------------------------------------------------- LuaClient surface */

  deliver(message: WireMessage): void { this.delivered.push(message); }

  deliverEnvelope(envelope: Envelope): void {
    for (const m of envelope.messages) this.delivered.push(m);
  }

  onNotifyUI(handler: (command: WireCommand, data: unknown) => void): () => void {
    this.notifyHandlers.add(handler);
    return () => { this.notifyHandlers.delete(handler); };
  }

  onReply(handler: (command: WireCommand, reply: unknown) => void): () => void {
    this.replyHandlers.add(handler);
    return () => { this.replyHandlers.delete(handler); };
  }

  interact(i: SceneInteraction): void {
    // Recorded, not interpreted. A real client VM answers this by running the
    // request handler and pushing back an `UpdateRequestUI` diff; a recording
    // cannot, and inventing the diff here would be inventing the rules. So the
    // room will see no state change from a click here — that absence IS the
    // proof that selection state comes from Lua and from nowhere else.
    this.interactions.push(i);
    for (const fn of this.watchers) fn();
  }

  replyToServer(command: WireCommand, reply: unknown): void {
    // Same contract as `interact`: recorded, not interpreted. A recording has no
    // engine to hand the reply to, so the room sees no state change from it.
    this.replies.push({ command, reply });
    for (const fn of this.replyHandlers) fn(command, reply);
    for (const fn of this.watchers) fn();
  }

  /** Fires whenever the room sends an interaction, so the harness can show it. */
  onInteraction(fn: () => void): () => void {
    this.watchers.add(fn);
    return () => { this.watchers.delete(fn); };
  }

  resolve(ref: unknown): unknown {
    if (ref && typeof ref === 'object' && '__tag' in (ref as object)) {
      const { __tag: tag, value } = ref as { __tag: number; value: unknown };
      if (tag === 33002 && typeof value === 'number') return data.cardById.get(value);
      if (tag === 33005 && typeof value === 'string') return data.generals[value];
      if (tag === 33004 && typeof value === 'string') return data.skillData(value);
      return value;
    }
    return ref;
  }

  call<T = unknown>(fn: string, ...args: unknown[]): T {
    switch (fn) {
      case 'Translate':
        return data.translate(String(args[0] ?? ''), this.language) as T;
      case 'GetCardData': {
        const cid = Number(args[0]);
        return (data.cardById.get(cid) ?? { cid, known: false }) as T;
      }
      case 'GetCardExtensionByName':
        return (data.cardExtensionByName.get(String(args[0])) ?? '') as T;
      case 'GetGeneralData':
        return (data.generals[String(args[0])] ?? data.generals.diaochan) as T;
      case 'GetGeneralDetail':
        // A different shape from `GetGeneralData`, not a synonym for it: the
        // detail call carries `skill`, each entry with its rules text. Answering
        // it with the plain general data left the general-detail popup with an
        // empty skill list in the harness.
        return data.generalDetail(String(args[0]), this.language) as T;
      case 'GetSkillData':
        return data.skillData(String(args[0])) as T;
      case 'CanSortHandcards':
        return true as T;
      case 'GetTargetTip':
        return [] as unknown as T;
      case 'GetSameGenerals':
        return [] as unknown as T;
      case 'RefreshStatusSkills':
      case 'FinishRequestUI':
      case 'RevertSelection':
        return undefined as T;

      /* ------------------------------------------- stand-in engine answers
       *
       * The four dialog predicates below are decided in Lua by
       * `ChooseGeneralRule` / `PoxiMethod` (`client_util.lua:1042-1078`). A
       * recording cannot replay them, so the FAKE ENGINE answers them from the
       * arity the request itself states. This lives here, inside the stand-in
       * client, and never in a component: `DialogHost` always asks, and at
       * integration the real client VM answers instead.
       */
      case 'ChooseGeneralPrompt':
        return '#AskForGeneral' as T;
      case 'ChooseGeneralFilter':
        return true as T;
      case 'ChooseGeneralFeasible': {
        const selected = (args[1] as unknown[]) ?? [];
        const extra = (args[3] ?? {}) as { n?: number };
        return (selected.length === (extra.n ?? 1)) as T;
      }
      case 'PoxiPrompt':
        return '' as T;
      case 'PoxiFilter':
        return true as T;
      case 'PoxiFeasible':
        return (((args[1] as unknown[]) ?? []).length > 0) as T;
      default: {
        const key = `${fn}(${args.length})`;
        const seen = this.unanswered.get(key);
        if (seen) seen.count += 1;
        else this.unanswered.set(key, { fn, args, count: 1 });
        return undefined as T;
      }
    }
  }

  dispose(): void {
    this.notifyHandlers.clear();
    this.replyHandlers.clear();
  }
}
