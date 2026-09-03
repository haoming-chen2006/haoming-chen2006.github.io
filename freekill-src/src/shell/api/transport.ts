/**
 * Game traffic, bound the same way the lobby is.
 *
 * `api/index.ts` globs `src/net` for the lobby; this globs it for the game
 * channel, for the same reason and with the same shape. The shell never imports
 * Agent 2's module directly, so a build with no backplane still compiles and
 * still plays — against `loopbackTransport`, which is one tab talking to itself.
 *
 * `GameTransport` is deliberately the subset of `net/transport.ts`'s
 * `RoomTransport` that the table needs. `RoomTransport` satisfies it
 * structurally; nothing has to be adapted.
 */
import type { ClientReply, Envelope } from '../../contract/protocol';

export interface CommandRow {
  readonly seq?: number;
  readonly playerId: number;
  readonly command: string;
  readonly reply: unknown;
  readonly digest: string;
}

export interface GameTransport {
  publish(env: Envelope): Promise<void>;
  onEnvelope(playerId: number | null, fn: (env: Envelope) => void): () => void;
  sendReply(reply: ClientReply): Promise<void>;
  onReply(fn: (reply: ClientReply) => void): () => void;
  requestResync(playerId: number): Promise<void>;
  onResyncRequest(fn: (playerId: number) => void): () => void;
  appendCommands(rows: readonly CommandRow[]): Promise<void>;
  readSeed(): Promise<number | null>;
  ready(playerIds?: readonly number[]): Promise<void>;
  close(): Promise<void>;
}

const netModules = import.meta.glob<Record<string, unknown>>('../../net/index.ts');

/**
 * One tab, talking to itself.
 *
 * The local API has no seed table, so the seed is derived from the room id:
 * the same room deals the same game, which is the only property a seed has to
 * have when there is exactly one machine in the room. `hostRunner` mixes the
 * round in on top, so a rematch in the same room does not deal it twice.
 */
export function loopbackTransport(roomId: string): GameTransport {
  const envelopeHandlers = new Set<{ playerId: number | null; fn: (e: Envelope) => void }>();
  const replyHandlers = new Set<(r: ClientReply) => void>();
  const resyncHandlers = new Set<(playerId: number) => void>();

  return {
    async publish(env) {
      for (const h of envelopeHandlers) {
        if (env.to === null || env.to === h.playerId) h.fn(env);
      }
    },
    onEnvelope(playerId, fn) {
      const entry = { playerId, fn };
      envelopeHandlers.add(entry);
      return () => envelopeHandlers.delete(entry);
    },
    async sendReply(reply) { for (const h of replyHandlers) h(reply); },
    onReply(fn) { replyHandlers.add(fn); return () => replyHandlers.delete(fn); },
    async requestResync(playerId) { for (const h of resyncHandlers) h(playerId); },
    onResyncRequest(fn) { resyncHandlers.add(fn); return () => resyncHandlers.delete(fn); },
    async appendCommands() { /* no durable log without a backplane */ },
    async readSeed() {
      let h = 2166136261;
      for (let i = 0; i < roomId.length; i++) {
        h ^= roomId.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 1) % 2147483647;
    },
    async ready() { /* already here */ },
    async close() {
      envelopeHandlers.clear();
      replyHandlers.clear();
      resyncHandlers.clear();
    },
  };
}

/**
 * `epoch` is the room's round — 0 for its first game. It reaches the real
 * transport as the suffix on the realtime topics, so two games of one room
 * never share a channel; see `createRoomTransport`. The loopback needs no such
 * separation, because every call already builds its own handler set.
 */
export async function getGameTransport(roomId: string, epoch = 0): Promise<GameTransport> {
  const entry = Object.values(netModules)[0];
  if (entry) {
    try {
      const mod = await entry();
      const make = mod.createRoomTransport as
        ((id: string, sb?: unknown, epoch?: number) => GameTransport) | undefined;
      if (typeof make === 'function') return make(roomId, undefined, epoch);
      console.warn('[table] src/net exports no createRoomTransport; playing on the loopback');
    } catch (e) {
      console.warn('[table] src/net failed to load; playing on the loopback', e);
    }
  }
  return loopbackTransport(roomId);
}
