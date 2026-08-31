/**
 * The adapter at the meeting point.
 *
 * `contract/engine.ts` says a `LuaClient` is push-shaped — `deliverEnvelope`
 * in, `onNotifyUI` out, `interact` back. The engine lane's
 * `MainThreadLuaClient` is pull-shaped — `receive`, then `drainUI` and
 * `drainOutbound`. Both are reasonable; they are not the same object. Rather
 * than have either lane bend, the shell owns the two-line pump between them,
 * which is exactly what an integration seam is for.
 *
 * If the engine module is absent, or the VM fails to boot, this returns null and
 * the caller falls back to the recorded fixture stream. A missing engine must
 * degrade to "the table has no data yet", never to a blank page.
 */
import type { LuaClient } from '../contract/engine';
import type { Envelope, WireCommand, WireMessage } from '../contract/protocol';
import type { SceneInteraction } from '../contract/scene';

const engineModules = import.meta.glob<Record<string, unknown>>('../engine/index.ts');

interface PullClient {
  call<T>(fn: string, ...args: unknown[]): T;
  receive(messages: readonly unknown[]): void;
  drainUI(): { seq: number; command: WireCommand; data: unknown }[];
  drainOutbound(): { seq: number; kind: string; command: WireCommand; payload: unknown }[];
  dispose(): void;
}

export interface EngineClientSpec {
  readonly bundle: Record<string, string>;
  readonly seat: number;
  readonly name: string;
  readonly avatar: string;
  readonly observing?: boolean;
}

export async function createEngineClient(spec: EngineClientSpec): Promise<LuaClient | null> {
  const entry = Object.values(engineModules)[0];
  if (!entry) return null;

  let inner: PullClient;
  try {
    const mod = await entry();
    const Klass = mod.MainThreadLuaClient as
      | { create(b: unknown, s: unknown, o?: unknown): Promise<PullClient> }
      | undefined;
    if (!Klass?.create) return null;
    inner = await Klass.create(spec.bundle, {
      id: spec.seat, name: spec.name, avatar: spec.avatar, observing: spec.observing ?? false,
    }, { wasmUri: `${import.meta.env.BASE_URL}glue.wasm` });
    // The engine lane converged on the contract's own push shape. When the
    // object already satisfies it, adapting would only add a layer to debug.
    const maybe = inner as unknown as Partial<LuaClient>;
    if (typeof maybe.onNotifyUI === 'function' && typeof maybe.deliverEnvelope === 'function') {
      return maybe as LuaClient;
    }
  } catch (e) {
    console.warn('[engine] client VM failed to boot; falling back to fixtures', e);
    return null;
  }

  /**
   * `lua/web/client.lua:feedBatch` takes `{ command, value, isRequest }`, or
   * `payload` when the bytes came straight from a host VM. `WireMessage` is
   * `{ command, kind, data }`. One rename and one boolean; doing it here keeps
   * both sides honest to their own documented shape.
   */
  const toInbound = (m: WireMessage) => {
    const payload = (m as WireMessage & { payload?: string }).payload;
    return payload !== undefined
      ? { command: m.command, payload, isRequest: m.kind === 'request' }
      : { command: m.command, value: m.data, isRequest: m.kind === 'request' };
  };

  const notifyHandlers = new Set<(command: WireCommand, data: unknown) => void>();
  const replyHandlers = new Set<(command: WireCommand, reply: unknown) => void>();

  /** One boundary crossing per pump, not one per message. */
  const pump = () => {
    try {
      for (const e of inner.drainUI()) {
        for (const h of notifyHandlers) h(e.command, e.data);
      }
      for (const o of inner.drainOutbound()) {
        if (o.kind !== 'reply') continue;
        for (const h of replyHandlers) h(o.command, o.payload);
      }
    } catch (e) {
      console.error('[engine] pump failed', e);
    }
  };

  return {
    deliver(message) { inner.receive([toInbound(message)]); pump(); },
    deliverEnvelope(envelope: Envelope) { inner.receive(envelope.messages.map(toInbound)); pump(); },
    onNotifyUI(handler) {
      notifyHandlers.add(handler);
      return () => notifyHandlers.delete(handler);
    },
    interact(i: SceneInteraction) {
      inner.call('UpdateRequestUI', i.elemType, i.id, i.action, i.data);
      pump();
    },
    replyToServer(command, reply) {
      inner.call('ReplyToServer', command, reply);
      pump();
    },
    onReply(handler) {
      replyHandlers.add(handler);
      return () => replyHandlers.delete(handler);
    },
    call<T = unknown>(fn: string, ...args: unknown[]): T { return inner.call<T>(fn, ...args); },
    resolve(ref) { return ref; },
    dispose() { inner.dispose(); },
  };
}
