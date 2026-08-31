import type { LuaClient } from '../contract/engine.ts';
import type { Envelope, WireCommand, WireMessage } from '../contract/protocol.ts';
import type { SceneInteraction } from '../contract/scene.ts';
import type { LuaBundle } from './bundle.ts';
import type { ClientOutbound, UiEvent, WirePayloadMessage } from './types.ts';
import { createLuaVm, type LuaVm, type VmOptions } from './vm.ts';

export interface ClientAttachSpec {
  playerId: number;
  screenName?: string;
  avatar?: string;
  observing?: boolean;
  replaying?: boolean;
}

/**
 * A player's own Lua VM, on the main thread.
 *
 * Construction is async because the wasm module has to load; everything after
 * that is synchronous on purpose. The room calls `call()` from render paths
 * exactly as the QML client calls `Lua.call` today, and moving that into a
 * worker is the single change most likely to wreck the UI.
 */
export class MainThreadLuaClient implements LuaClient {
  readonly playerId: number;
  private vm: LuaVm;
  private uiHandlers = new Set<(command: WireCommand, data: unknown) => void>();
  private replyHandlers = new Set<(command: WireCommand, reply: unknown) => void>();
  private outbound: ClientOutbound[] = [];
  private disposed = false;

  private constructor(vm: LuaVm, playerId: number) {
    this.vm = vm;
    this.playerId = playerId;
  }

  static async create(
    bundle: LuaBundle,
    spec: ClientAttachSpec,
    opts: VmOptions = {},
  ): Promise<MainThreadLuaClient> {
    const vm = await createLuaVm(bundle, opts);
    vm.lua.doStringSync(`dofile('lua/web/client.lua')`);
    if (vm.lua.doStringSync(`return FKClient.boot()`) !== true) {
      throw new Error('FKClient.boot() did not return true');
    }
    vm.lua.global.set('__fk_attach', JSON.stringify({ id: spec.playerId, name: spec.screenName, ...spec }));
    if (vm.lua.doStringSync(`return FKClient.attach(__fk_attach)`) !== true) {
      throw new Error('FKClient.attach() failed');
    }
    return new MainThreadLuaClient(vm, spec.playerId);
  }

  /** Escape hatch for tests. Not part of `LuaClient`. */
  get lua() {
    return this.vm.lua;
  }

  /* ------------------------------------------------------------- contract */

  deliver(message: WireMessage): void {
    this.deliverAll([message]);
  }

  deliverEnvelope(envelope: Envelope): void {
    this.deliverAll(envelope.messages);
  }

  onNotifyUI(handler: (command: WireCommand, data: unknown) => void): () => void {
    this.uiHandlers.add(handler);
    return () => this.uiHandlers.delete(handler);
  }

  /**
   * `UpdateRequestUI(elemType, id, action, data)` — the only way to interact.
   * It is the same entry point `lua/client/client_util.lua:1158` gives the QML
   * client, so selection legality, target validity and the OK button's enabled
   * state all stay inside Lua where they belong.
   */
  interact(i: SceneInteraction): void {
    this.call('UpdateRequestUI', i.elemType, i.id, i.action, i.data ?? null);
    this.pumpUi();
    this.pumpReplies();
  }

  /**
   * Answer a dialog-shaped request: choose general, guanxing, card-chosen,
   * poxi, amazing grace. These do not come through the scene model - each is
   * its own command with its own payload, and the QML client answers them by
   * calling the client object directly, with an empty command name
   * (`RoomLogic.js:142`). The reply is encoded by this VM's own CBOR, so the
   * bytes the host receives are the bytes the QML client would have sent.
   */
  replyToServer(command: WireCommand, reply: unknown): void {
    this.vm.lua.global.set('__fk_reply_cmd', command ?? '');
    this.vm.lua.global.set('__fk_reply_val', JSON.stringify(reply ?? null));
    this.vm.lua.doStringSync(`FKClient.replyToServer(__fk_reply_cmd, __fk_reply_val)`);
    this.pumpUi();
    this.pumpReplies();
  }

  onReply(handler: (command: WireCommand, reply: unknown) => void): () => void {
    this.replyHandlers.add(handler);
    return () => this.replyHandlers.delete(handler);
  }

  call<T = unknown>(fn: string, ...args: unknown[]): T {
    this.vm.lua.global.set('__fk_args', JSON.stringify({ n: args.length, a: args }));
    this.vm.lua.global.set('__fk_fn', fn);
    const raw = String(this.vm.lua.doStringSync(`return FKClient.call(__fk_fn, __fk_args)`));
    const value = raw === '' ? null : JSON.parse(raw);
    if (value && typeof value === 'object' && '__error' in value) {
      throw new Error(`Lua.call(${fn}): ${(value as { __error: string }).__error}`);
    }
    return value as T;
  }

  /**
   * Resolve a `TaggedRef` into renderable data.
   *
   * Tag 33002 means "the Card with this id"; decoding it inside the engine's own
   * VM returns the live object, which reaches the whole engine — the spike
   * measured a 177-byte packet expanding to 10.7 MB. So the wire keeps tags
   * opaque and they come back through here, one at a time, as flat data.
   */
  resolve(ref: unknown): unknown {
    const tagged = ref as { __tag?: number; value?: unknown } | null;
    if (!tagged || typeof tagged !== 'object' || typeof tagged.__tag !== 'number') return ref;
    switch (tagged.__tag) {
      case 33001:
        return this.call('GetPlayerGameData', tagged.value);
      case 33002:
        return this.call('GetCardData', tagged.value);
      case 33004:
        return this.call('GetSkillData', tagged.value);
      case 33005:
        return this.call('GetGeneralDetail', tagged.value);
      default:
        return tagged.value;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.vm.close();
  }

  /* ----------------------------------------------------------- extensions */

  /**
   * Feed a batch of authoritative messages. One boundary crossing per batch.
   *
   * `payload` (raw CBOR, base64) is preferred and is what the production path
   * always carries: it is the bytes the host's engine emitted, handed to the
   * client's engine untouched. `data` is the fallback for a fixture-driven
   * harness, and it re-encodes, which is lossy in the ways `types.ts` describes.
   */
  deliverAll(messages: readonly WireMessage[]): void {
    if (messages.length === 0) return;
    const batch = messages.map((m) => {
      const p = (m as WirePayloadMessage).payload;
      return p
        ? { command: m.command, payload: p, isRequest: m.kind === 'request' }
        : { command: m.command, value: m.data ?? null, isRequest: m.kind === 'request' };
    });
    this.vm.lua.global.set('__fk_batch', JSON.stringify(batch));
    this.vm.lua.doStringSync(`FKClient.feedBatch(__fk_batch)`);
    this.pumpUi();
    this.pumpReplies();
  }

  private pumpUi(): void {
    if (this.uiHandlers.size === 0) {
      this.vm.lua.doStringSync(`FKClient.dropUI()`);
      return;
    }
    for (const e of this.drainUI()) {
      for (const h of this.uiHandlers) h(e.command, e.data);
    }
  }

  private pumpReplies(): void {
    for (const o of this.pullOutbound()) {
      this.outbound.push(o);
      if (o.kind !== 'reply') continue;
      for (const h of this.replyHandlers) h(o.command, this.decodeReply(o.payload));
    }
  }

  private pullOutbound(): ClientOutbound[] {
    return JSON.parse(String(this.vm.lua.doStringSync(`return FKClient.drainOutbound()`)));
  }

  /**
   * `onReply` hands over plain data, because that is what the transport can
   * carry and what `db.ts` stores. The value survives the round trip back into
   * a VM intact - the replay suite forces 476 logged replies through exactly
   * this encoding and reproduces the game digest at every boundary.
   *
   * A host in the same tab should prefer `drainOutbound`, which keeps the raw
   * CBOR and skips the round trip entirely.
   */
  private decodeReply(payloadB64: string): unknown {
    this.vm.lua.global.set('__fk_dec', payloadB64);
    const raw = String(this.vm.lua.doStringSync(`return FKClient.decodeReply(__fk_dec)`));
    return raw === '' ? null : JSON.parse(raw);
  }

  drainUI(): UiEvent[] {
    return JSON.parse(String(this.vm.lua.doStringSync(`return FKClient.drainUI()`)));
  }

  /**
   * Outbound traffic as raw base64 CBOR, ready to hand straight to a host in
   * the same tab. Safe to use alongside `onReply`: both see everything, and
   * this drains a buffer rather than racing the handler for it.
   */
  drainOutbound(): ClientOutbound[] {
    for (const o of this.pullOutbound()) this.outbound.push(o);
    const all = this.outbound;
    this.outbound = [];
    return all;
  }

  errors(): string[] {
    return JSON.parse(String(this.vm.lua.doStringSync(`return FKClient.errors()`)));
  }

  /** The client's own view of the room, as canonical JSON. Tests only. */
  stateJson(): unknown {
    return JSON.parse(String(this.vm.lua.doStringSync(`return FKClient.stateJson()`)));
  }
}
