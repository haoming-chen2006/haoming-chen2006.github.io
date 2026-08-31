/**
 * The property, on its own, in milliseconds.
 *
 * `liveTable.test.ts` proves this against two real Lua VMs and a real game,
 * which is the evidence that matters — but it takes twenty seconds and it
 * proves several things at once. This pins the one invariant everything else
 * leans on: what a subscriber sees must not depend on when it subscribed.
 */
import { describe, expect, it, vi } from 'vitest';
import type { LuaClient } from '../../contract/engine';
import type { WireCommand } from '../../contract/protocol';
import { retainNotifications } from '../retainingClient';

/** A `LuaClient` that emits on demand and records what it was asked to do. */
function fakeClient() {
  const handlers = new Set<(c: WireCommand, d: unknown) => void>();
  const disposed = { yes: false };
  const client = {
    deliver: vi.fn(),
    deliverEnvelope: vi.fn(),
    interact: vi.fn(),
    replyToServer: vi.fn(),
    onReply: vi.fn(() => () => {}),
    call: vi.fn(() => 'called'),
    resolve: vi.fn((r: unknown) => r),
    onNotifyUI(handler: (c: WireCommand, d: unknown) => void) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    dispose() { disposed.yes = true; },
  } as unknown as LuaClient;
  return {
    client,
    disposed,
    emit(command: string, data: unknown) {
      for (const h of handlers) h(command as WireCommand, data);
    },
    get listeners() { return handlers.size; },
  };
}

describe('retaining the notification stream', () => {
  it('gives a subscriber that arrives after the fact everything it missed', () => {
    const inner = fakeClient();
    const client = retainNotifications(inner.client);

    // The opening, with nobody watching. This is the real sequence: the whole
    // preamble and the first request land before any table exists.
    inner.emit('EnterRoom', [8, 30]);
    inner.emit('AddPlayer', [1, '房主']);
    inner.emit('StartGame', null);
    inner.emit('AskForGeneral', [['caocao', 'liubei'], 1]);
    expect(client.retained().count).toBe(4);

    const seen: [string, unknown][] = [];
    client.onNotifyUI((c, d) => seen.push([c as string, d]));
    expect(seen.map(([c]) => c)).toEqual(['EnterRoom', 'AddPlayer', 'StartGame', 'AskForGeneral']);
    expect(seen[3][1]).toEqual([['caocao', 'liubei'], 1]);

    // …and then joins the live stream, exactly once.
    inner.emit('MoveCards', [{ ids: [1, 2] }]);
    expect(seen).toHaveLength(5);
    expect(seen[4][0]).toBe('MoveCards');
  });

  it('replays independently to a table that remounts', () => {
    const inner = fakeClient();
    const client = retainNotifications(inner.client);
    inner.emit('StartGame', null);

    const first: string[] = [];
    const off = client.onNotifyUI((c) => first.push(c as string));
    inner.emit('MoveCards', 1);
    off();

    // A remount — StrictMode, an error boundary reset, a route change — is a
    // brand new store with no memory, and it has to be able to rebuild.
    const second: string[] = [];
    client.onNotifyUI((c) => second.push(c as string));
    expect(second).toEqual(['StartGame', 'MoveCards']);
    expect(first).toEqual(['StartGame', 'MoveCards']);
  });

  it('never drops a notification because nobody was listening yet', () => {
    const inner = fakeClient();
    retainNotifications(inner.client);
    // The recorder is attached at construction — before anything else can hold
    // a reference to the client — so there is no window at all.
    expect(inner.listeners).toBe(1);
  });

  it('keeps one handler from breaking the others, and the stream', () => {
    const inner = fakeClient();
    const client = retainNotifications(inner.client);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const good: string[] = [];
      client.onNotifyUI(() => { throw new Error('boom'); });
      client.onNotifyUI((c) => good.push(c as string));
      inner.emit('StartGame', null);
      expect(good).toEqual(['StartGame']);
      expect(client.retained().count).toBe(1);
    } finally {
      errors.mockRestore();
    }
  });

  it('passes everything else straight through and disposes the real client', () => {
    const inner = fakeClient();
    const client = retainNotifications(inner.client);
    client.replyToServer('ReplyToServer', ['caocao']);
    expect(inner.client.replyToServer).toHaveBeenCalledWith('ReplyToServer', ['caocao']);
    expect(client.call('GetCardData', 7)).toBe('called');

    client.dispose();
    expect(inner.disposed.yes).toBe(true);
    expect(client.retained().count).toBe(0);
  });
});
