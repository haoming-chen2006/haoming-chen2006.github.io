/**
 * Game traffic. Two lanes, on purpose.
 *
 * Live play rides Realtime *broadcast*: the host publishes one `Envelope` per
 * engine flush to the public channel or to one seat's channel, and that is the
 * only unit of send there is. `contract/protocol.ts` exports no single-message
 * type and this file adds none — a full 8-human game is 64,680 messages but only
 * 2,696 flushes, and the difference between those two numbers is the difference
 * between fitting in a free tier and not. Batching is structural here, not a
 * convention someone has to remember.
 *
 * Durability rides `fk_commands`: the host appends every accepted reply, dense
 * from seq 1. That table plus the seed is the whole replay/host-migration story,
 * which is exactly why RLS gates both on being the *current* host and returns
 * zero rows to everyone else, seated members included.
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { channels, type ClientReply, type Envelope } from '../contract/protocol';
import { fkClient } from './client';

export interface CommandRecord {
  readonly seq?: number;
  readonly playerId: number;
  readonly command: string;
  readonly reply: unknown;
  readonly digest: string;
}

export interface RoomTransport {
  /** Host -> everyone / one seat. `env.to === null` is the public channel. */
  publish(env: Envelope): Promise<void>;
  /** Player/observer -> the envelopes addressed to them and to the room. */
  onEnvelope(playerId: number | null, fn: (env: Envelope) => void): () => void;
  /** Player -> host. Replies are small and latency-critical; they are not batched. */
  sendReply(reply: ClientReply): Promise<void>;
  /** Host only. */
  onReply(fn: (reply: ClientReply) => void): () => void;

  /**
   * "I just arrived — catch me up." A tab that reloads mid-game, or one that
   * subscribed after the host had already flushed, has no way to reconstruct
   * the stream it missed: envelopes are broadcast, and broadcast has no
   * history. So the newcomer asks, and the host answers with the engine's own
   * resync (join preamble + one `Observe` snapshot for that seat), which is
   * exactly what `RoomSession.resyncMessages` produces.
   *
   * Without this the room is a race: whoever subscribes late gets an empty
   * table and no error, which is precisely the failure this whole lane exists
   * to make impossible.
   */
  requestResync(playerId: number): Promise<void>;
  /** Host only. */
  onResyncRequest(fn: (playerId: number) => void): () => void;

  /** Host only: append accepted decisions. Rejected with 42501 for anyone else. */
  appendCommands(rows: readonly CommandRecord[]): Promise<void>;
  /** Host only: read the log back. Returns [] — not an error — for a non-host. */
  readLog(fromSeq?: number): Promise<readonly Required<CommandRecord>[]>;
  /** Host only. Zero rows for everyone else, which is the whole point. */
  readSeed(): Promise<number | null>;

  /**
   * Resolves once the room's public channel — and each named seat's private
   * channel — has actually joined. The host warms every seat up front so the
   * first flush is not a burst of one-off HTTP posts.
   */
  ready(playerIds?: readonly number[]): Promise<void>;

  close(): Promise<void>;
}

export function createRoomTransport(roomId: string, sb: SupabaseClient = fkClient()): RoomTransport {
  const open = new Map<string, RealtimeChannel>();
  const joined = new Map<string, Promise<void>>();

  const channel = (name: string): RealtimeChannel => {
    let ch = open.get(name);
    if (!ch) {
      ch = sb.channel(name, { config: { broadcast: { self: false, ack: false } } });
      open.set(name, ch);
      // A channel that never joins is the quietest possible failure: every
      // `send` would fall back to HTTP and every `on` would simply never fire.
      // Keeping the join as a promise lets the host wait for it and lets a
      // failed join be reported rather than waited on forever.
      joined.set(name, new Promise<void>((resolve, reject) => {
        ch!.subscribe((status, err) => {
          if (status === 'SUBSCRIBED') resolve();
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(new Error(`realtime channel ${name}: ${status}${err ? ` (${err.message})` : ''}`));
          }
        });
      }));
    }
    return ch;
  };

  /**
   * `send()` on a channel that has not joined yet silently falls back to one
   * HTTP POST per message. That is correct but it is a request per envelope,
   * and a game is hundreds of envelopes. Waiting for the join once turns all of
   * them back into socket frames.
   */
  const joinedChannel = async (name: string): Promise<RealtimeChannel> => {
    const ch = channel(name);
    await joined.get(name)?.catch(() => undefined);
    return ch;
  };

  return {
    async publish(env) {
      const name = env.to === null ? channels.public(roomId) : channels.player(roomId, env.to);
      const ch = await joinedChannel(name);
      await ch.send({ type: 'broadcast', event: 'envelope', payload: env });
    },

    onEnvelope(playerId, fn) {
      const names = playerId === null
        ? [channels.public(roomId)]
        : [channels.public(roomId), channels.player(roomId, playerId)];
      const subs = names.map((n) =>
        channel(n).on('broadcast', { event: 'envelope' }, (m) => fn(m.payload as Envelope)));
      return () => { for (const s of subs) void s.unsubscribe(); };
    },

    async sendReply(reply) {
      const ch = await joinedChannel(channels.public(roomId));
      await ch.send({ type: 'broadcast', event: 'reply', payload: reply });
    },

    onReply(fn) {
      const s = channel(channels.public(roomId))
        .on('broadcast', { event: 'reply' }, (m) => fn(m.payload as ClientReply));
      return () => { void s.unsubscribe(); };
    },

    async requestResync(playerId) {
      const ch = await joinedChannel(channels.public(roomId));
      await ch.send({ type: 'broadcast', event: 'resync', payload: { roomId, playerId } });
    },

    onResyncRequest(fn) {
      const s = channel(channels.public(roomId))
        .on('broadcast', { event: 'resync' }, (m) => {
          const pid = (m.payload as { playerId?: unknown })?.playerId;
          if (typeof pid === 'number') fn(pid);
        });
      return () => { void s.unsubscribe(); };
    },

    async appendCommands(rows) {
      if (rows.length === 0) return;
      // The dense-seq trigger assigns `seq` when it is absent and rejects a gap
      // when it is present, so a batch inserted in order is safe either way.
      const { error } = await sb.from('fk_commands').insert(rows.map((r) => ({
        room_id: roomId,
        seq: r.seq,
        player_id: r.playerId,
        command: r.command,
        reply: r.reply as never,
        digest: r.digest,
      })));
      if (error) throw new Error(`appendCommands: ${error.message}`);
    },

    async readLog(fromSeq = 1) {
      const { data, error } = await sb.from('fk_commands')
        .select('seq, player_id, command, reply, digest')
        .eq('room_id', roomId).gte('seq', fromSeq).order('seq');
      if (error) throw new Error(`readLog: ${error.message}`);
      return (data ?? []).map((r) => ({
        seq: r.seq as number,
        playerId: r.player_id as number,
        command: r.command as string,
        reply: r.reply,
        digest: r.digest as string,
      }));
    },

    async readSeed() {
      const { data, error } = await sb.from('fk_room_secrets')
        .select('seed').eq('room_id', roomId).maybeSingle();
      if (error) throw new Error(`readSeed: ${error.message}`);
      return (data?.seed as number | undefined) ?? null;
    },

    async ready(playerIds = []) {
      channel(channels.public(roomId));
      for (const id of playerIds) channel(channels.player(roomId, id));
      await Promise.all([...joined.values()]);
    },

    async close() {
      for (const ch of open.values()) await sb.removeChannel(ch);
      open.clear();
      joined.clear();
    },
  };
}

export interface PromoteHostResult {
  readonly ok: boolean;
  readonly host_id: string;
  readonly seed: number | null;
  readonly last_seq: number;
}

/**
 * Atomic handover. The compare-and-swap lives in the SQL function, so two
 * survivors racing to claim an abandoned room cannot both win — the loser gets
 * `ok: false` carrying the winner's id, and `seed: null`.
 */
export async function promoteHost(
  roomId: string, previousHostId: string, sb: SupabaseClient = fkClient(),
): Promise<PromoteHostResult> {
  const { data, error } = await sb.rpc('fk_promote_host', {
    p_room: roomId, p_previous_host_id: previousHostId,
  });
  if (error) throw new Error(`promoteHost: ${error.message}`);
  return data as PromoteHostResult;
}

export async function heartbeat(
  roomId: string, state: 'online' | 'offline' | 'left' = 'online',
  sb: SupabaseClient = fkClient(),
): Promise<void> {
  await sb.rpc('fk_heartbeat', { p_room: roomId, p_state: state });
}
