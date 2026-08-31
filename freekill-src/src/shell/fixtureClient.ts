/**
 * A `LuaClient` with no Lua in it.
 *
 * Agent 1's engine is the real one. This exists so the room has something to
 * render before the engine is wired in, and so a reviewer can see the actual
 * recorded command stream flowing through the actual interface rather than a
 * mock of a shape. It replays `fixtures/ui-notify-stream.json` — 2,286 real
 * `notifyUI` calls from one seat of a full 8-player game — at a readable pace.
 *
 * Everything it cannot answer throws with its own name in the message, so a
 * missing engine never looks like a rules bug.
 */
import type { LuaClient } from '../contract/engine';
import type { WireCommand } from '../contract/protocol';
import type { SceneInteraction } from '../contract/scene';
import type { OverviewData } from './boot';

const streamModule = import.meta.glob<{ default: { command: string; data: unknown; seq: number }[] }>(
  '../../fixtures/ui-notify-stream.json',
);

export interface FixtureClientOptions {
  readonly overview: OverviewData;
  /** ms between replayed notifications. 0 replays as fast as the event loop. */
  readonly intervalMs?: number;
}

export function createFixtureClient(opts: FixtureClientOptions): LuaClient {
  const notifyHandlers = new Set<(command: WireCommand, data: unknown) => void>();
  const replyHandlers = new Set<(command: WireCommand, reply: unknown) => void>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const entry = Object.values(streamModule)[0];
  if (entry) {
    void entry().then((mod) => {
      if (disposed) return;
      const stream = mod.default;
      let i = 0;
      timer = setInterval(() => {
        if (i >= stream.length) { if (timer) clearInterval(timer); return; }
        const m = stream[i++];
        for (const h of notifyHandlers) h(m.command as WireCommand, m.data);
      }, opts.intervalMs ?? 60);
    }).catch((e) => console.warn('[fixture-client] no recorded stream', e));
  }

  // A missing engine must degrade to "no data", never to a thrown exception in
  // a render path: the room lane calls into `call()` while drawing.
  const warned = new Set<string>();
  const unsupported = (fn: string): null => {
    if (!warned.has(fn)) {
      warned.add(fn);
      console.info(`[fixture-client] ${fn}() has no answer without the engine; returning null`);
    }
    return null;
  };

  return {
    deliver() { /* the fixture stream is the only input */ },
    deliverEnvelope() { /* ditto */ },
    onNotifyUI(handler) {
      notifyHandlers.add(handler);
      return () => notifyHandlers.delete(handler);
    },
    interact(i: SceneInteraction) {
      console.info('[fixture-client] interaction dropped', i);
    },
    replyToServer(command, reply) {
      console.info('[fixture-client] reply dropped', command, reply);
    },
    onReply(handler) {
      replyHandlers.add(handler);
      return () => replyHandlers.delete(handler);
    },
    call<T = unknown>(fn: string, ...args: unknown[]): T {
      switch (fn) {
        case 'Translate': {
          const key = String(args[0] ?? '');
          return (opts.overview.translations[key] ?? key) as T;
        }
        case 'GetGeneralData':
        case 'GetGeneralDetail': {
          const name = String(args[0] ?? '');
          return (opts.overview.generals.find((g) => g.name === name) ?? null) as T;
        }
        case 'GetAllGeneralPack':
          return opts.overview.packs.general as T;
        case 'GetGenerals':
          return opts.overview.generals.map((g) => g.name) as T;
        default:
          return unsupported(fn) as T;
      }
    },
    resolve(ref: unknown) { return ref; },
    dispose() {
      disposed = true;
      if (timer) clearInterval(timer);
      notifyHandlers.clear();
      replyHandlers.clear();
    },
  };
}
