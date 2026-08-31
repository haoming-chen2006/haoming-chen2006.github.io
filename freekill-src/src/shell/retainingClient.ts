/**
 * Makes "subscribe late" a normal case instead of a lost game.
 *
 * The table is the only consumer of `LuaClient.onNotifyUI`, and the engine's
 * very first flush is not a warm-up — `FKHost.createRoom` emits the join
 * preamble and then runs the room all the way to its first decision, so that
 * one flush carries EnterRoom, every AddPlayer, StartGame, ArrangeSeats, the
 * opening game log and often the 选将 request. `MainThreadLuaClient` pushes
 * those out synchronously as it consumes them, and anything with no handler
 * attached is dropped on the floor (`FKClient.dropUI()`); the client VM's own
 * state moves on regardless, so re-delivering the envelope is not a repair.
 *
 * Ordering the mount before the first flush makes that unlikely. It does not
 * make it impossible: React decides when a component commits, and a slow
 * dynamic import, a busy main thread or a StrictMode remount all reopen the
 * window. So this closes it from the other side. The recorder attaches the
 * instant the VM exists — before any other code holds a reference to it — and
 * every notification is kept, so whenever the table does attach it is handed
 * the whole stream from the beginning and then joins the live one. There is no
 * ordering of mount and flush that can lose the preamble, which is the property
 * that matters; being fast enough is not a property.
 *
 * This is the in-tab twin of `RoomTransport.requestResync`. Same problem —
 * a subscriber that arrives after the sender started — same answer: keep the
 * history and hand it over, rather than hope.
 */
import type { LuaClient } from '../contract/engine';
import type { WireCommand } from '../contract/protocol';

/**
 * A full 8-player game emits 2,286 `notifyUI` calls for one seat
 * (`fixtures/measurements.json`). This is twenty times that: high enough that
 * no real game reaches it, low enough to bound the tab if something loops.
 */
const MAX_RETAINED = 50_000;

export interface RetainedStats {
  /** Notifications held for whoever attaches next. */
  readonly count: number;
  /** True once the cap was hit and the history stopped being complete. */
  readonly truncated: boolean;
}

export interface RetainingClient extends LuaClient {
  retained(): RetainedStats;
  /**
   * Whatever the client VM recorded while it was being fed. The engine's Lua
   * collects these rather than throwing, so without a way to read them a
   * corrupt stream looks exactly like a quiet one. Empty when the underlying
   * client does not keep them.
   */
  vmErrors(): readonly string[];
}

export function retainNotifications(inner: LuaClient): RetainingClient {
  const history: { command: WireCommand; data: unknown }[] = [];
  const handlers = new Set<(command: WireCommand, data: unknown) => void>();
  let truncated = false;
  let disposed = false;

  const stopRecording = inner.onNotifyUI((command, data) => {
    if (disposed) return;
    if (history.length < MAX_RETAINED) {
      history.push({ command, data });
    } else if (!truncated) {
      truncated = true;
      console.warn(
        `[table] retained ${MAX_RETAINED} notifications; no longer keeping history. `
        + 'A table that remounts from here will be incomplete.',
      );
    }
    for (const h of handlers) {
      try { h(command, data); } catch (e) { console.error('[table] notify handler threw', e); }
    }
  });

  return {
    deliver: (message) => inner.deliver(message),
    deliverEnvelope: (envelope) => inner.deliverEnvelope(envelope),
    interact: (i) => inner.interact(i),
    replyToServer: (command, reply) => inner.replyToServer(command, reply),
    onReply: (handler) => inner.onReply(handler),
    call: <T = unknown>(fn: string, ...args: unknown[]): T => inner.call<T>(fn, ...args),
    resolve: (ref) => inner.resolve(ref),

    /** Replay, then subscribe. The two happen with nothing in between. */
    onNotifyUI(handler) {
      for (const e of history) {
        try { handler(e.command, e.data); } catch (err) { console.error('[table] replay threw', err); }
      }
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    retained: () => ({ count: history.length, truncated }),

    vmErrors() {
      const read = (inner as unknown as { errors?: () => string[] }).errors;
      return typeof read === 'function' ? read.call(inner) : [];
    },

    dispose() {
      disposed = true;
      stopRecording();
      handlers.clear();
      history.length = 0;
      inner.dispose();
    },
  };
}
