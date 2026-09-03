/**
 * The backplane. `src/shell/api/index.ts` globs this file and calls
 * `createLobbyApi`, so the shell switches off the localStorage fallback the
 * moment this module exists — no edit on their side.
 *
 * Same contract as `shell/api/local.ts`, different physics underneath:
 * localStorage becomes Postgres, BroadcastChannel becomes Realtime, and the
 * identity is a real anonymous Supabase user rather than a uuid in a string.
 * Everything the shell can observe is deliberately identical, including the
 * Chinese error strings the waiting room renders.
 *
 * What is NOT here, and must never be: the seed. `fk_room_secrets` is host-only
 * by RLS and the shell has no reason to hold it — the host's engine worker reads
 * it through `createRoomTransport().readSeed()`.
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateRoomInput, Identity, LobbyApi, RoomDetail, RoomMember, RoomSummary,
} from '../shell/api/types';
import type { ChatLine } from '../contract/views';
import type { ConnectionState, RoomStatus } from '../contract/db';
import { createFkClient, fkClient, type FkClientOptions } from './client';
import { getLanguage, t } from '../i18n';
import type { UiKey } from '../i18n';

const tr = (key: UiKey, vars?: Record<string, string | number>) => t(key, getLanguage(), vars);

export { createFkClient, fkClient } from './client';
export {
  createRoomTransport, promoteHost, heartbeat,
  type RoomTransport, type CommandRecord,
} from './transport';

interface RoomRowLite {
  id: string; code: string; name: string; status: RoomStatus;
  host_id: string; host_name: string; seated: number; capacity: number;
  settings: Record<string, unknown>; bundle_sha: string; updated_at: string;
}

const ROOM_COLS =
  'id, code, name, status, host_id, host_name, seated, capacity, settings, bundle_sha, updated_at';

function summarise(r: RoomRowLite): RoomSummary {
  return {
    id: r.id, code: r.code, name: r.name, status: r.status, hostName: r.host_name,
    seated: r.seated, capacity: r.capacity, settings: r.settings ?? {}, updatedAt: r.updated_at,
  };
}

export interface LobbyApiOptions extends FkClientOptions {
  /** Share one client (and therefore one session and one socket) with the game
   *  transport. The shell never passes this; tests and the room do. */
  readonly client?: SupabaseClient;
}

export function createLobbyApi(opts: LobbyApiOptions = {}): LobbyApi {
  const sb: SupabaseClient = opts.client
    ?? (opts.storage || opts.storageKey ? createFkClient(opts) : fkClient());

  // The display name lives in user_metadata so a returning session keeps it
  // without a round trip to any table.
  const identityOf = (user: { id: string; user_metadata?: Record<string, unknown> } | null | undefined): Identity | null => {
    const name = user?.user_metadata?.display_name;
    if (!user || typeof name !== 'string' || name.length === 0) return null;
    return {
      userId: user.id,
      displayName: name,
      avatar: typeof user.user_metadata?.avatar === 'string' ? user.user_metadata.avatar : '',
    };
  };

  const uid = async (): Promise<string> => {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error('not signed in');
    return data.user.id;
  };

  const fetchDetail = async (roomId: string): Promise<RoomDetail | null> => {
    const { data: room, error } = await sb.from('fk_rooms')
      .select(ROOM_COLS).eq('id', roomId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!room) return null;
    const r = room as unknown as RoomRowLite;

    // Both of these return zero rows to a non-member by RLS, which is why the
    // lobby summary carries `seated`/`host_name` instead of counting seats.
    const [{ data: players }, { data: chat }] = await Promise.all([
      sb.from('fk_room_players')
        .select('user_id, seat, display_name, avatar, connection, is_bot, ready')
        .eq('room_id', roomId).order('seat'),
      sb.from('fk_chat')
        .select('id, player_id, display_name, text, created_at')
        .eq('room_id', roomId).order('created_at', { ascending: false }).limit(80),
    ]);

    const members: RoomMember[] = (players ?? []).map((p) => ({
      userId: p.user_id as string,
      seat: p.seat as number,
      displayName: p.display_name as string,
      avatar: (p.avatar as string) ?? '',
      connection: p.connection as ConnectionState,
      isBot: p.is_bot as boolean,
      ready: p.ready as boolean,
    }));

    const lines: ChatLine[] = (chat ?? []).map((c) => ({
      id: c.id as string,
      playerId: (c.player_id as number | null) ?? null,
      displayName: c.display_name as string,
      text: c.text as string,
      at: Date.parse(c.created_at as string),
    })).reverse();

    return { summary: summarise(r), hostId: r.host_id, members, chat: lines, bundleSha: r.bundle_sha };
  };

  const listSummaries = async (): Promise<readonly RoomSummary[]> => {
    const { data, error } = await sb.from('fk_rooms')
      .select(ROOM_COLS).neq('status', 'abandoned')
      .order('updated_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => summarise(r as unknown as RoomRowLite));
  };

  /**
   * Postgres changes arrive one row at a time and a single join touches three
   * tables, so every subscription coalesces a burst into one refetch. Without
   * this the waiting room would re-render four times per join.
   */
  const debounced = (fn: () => void): (() => void) => {
    let t: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (t) return;
      t = setTimeout(() => { t = null; fn(); }, 40);
    };
  };

  return {
    kind: 'supabase',

    async currentIdentity() {
      const { data } = await sb.auth.getUser();
      return identityOf(data.user);
    },

    async signIn(displayName, avatar) {
      let { data: got } = await sb.auth.getUser();
      if (!got.user) {
        const { data, error } = await sb.auth.signInAnonymously();
        if (error) throw new Error(`sign-in failed: ${error.message}`);
        got = { user: data.user };
      }
      const { data: updated, error: upErr } = await sb.auth.updateUser({
        data: { display_name: displayName, avatar },
      });
      if (upErr) throw new Error(`sign-in failed: ${upErr.message}`);

      // A rename must follow the player into every room they are sitting in.
      const id = updated.user!.id;
      await sb.from('fk_room_players')
        .update({ display_name: displayName, avatar })
        .eq('user_id', id);

      return { userId: id, displayName, avatar };
    },

    async signOut() { await sb.auth.signOut(); },

    listRooms: listSummaries,

    async createRoom(input: CreateRoomInput) {
      const { data: me } = await sb.auth.getUser();
      const who = identityOf(me.user);
      if (!who) throw new Error('not signed in');
      const { data, error } = await sb.rpc('fk_create_room', {
        p_name: input.name,
        p_capacity: input.capacity,
        p_settings: input.settings,
        p_bundle_sha: input.bundleSha,
        p_display_name: who.displayName,
        p_avatar: who.avatar,
      });
      if (error) throw new Error(error.message);
      const detail = await fetchDetail(data as string);
      if (!detail) throw new Error(tr('api.error.createFailed'));
      return detail;
    },

    async joinByCode(code) {
      const { data: me } = await sb.auth.getUser();
      const who = identityOf(me.user);
      if (!who) throw new Error('not signed in');
      const { data, error } = await sb.rpc('fk_join_room', {
        p_code: code.toUpperCase(),
        p_display_name: who.displayName,
        p_avatar: who.avatar,
      });
      if (error) {
        if (error.message.includes('no such room')) throw new Error(tr('api.error.roomNotFound', { code }));
        if (error.message.includes('room is full')) throw new Error(tr('api.error.roomFull'));
        throw new Error(error.message);
      }
      const detail = await fetchDetail(data as string);
      if (!detail) throw new Error(tr('api.error.roomNotFound', { code }));
      return detail;
    },

    getRoom: fetchDetail,

    watchRoom(roomId, onChange) {
      let closed = false;
      const emit = debounced(() => {
        void fetchDetail(roomId).then((d) => { if (!closed) onChange(d); }).catch(() => {});
      });
      const ch: RealtimeChannel = sb.channel(`watch:room:${roomId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'fk_rooms', filter: `id=eq.${roomId}` }, emit)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'fk_room_players', filter: `room_id=eq.${roomId}` }, emit)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'fk_chat', filter: `room_id=eq.${roomId}` }, emit)
        // Joining a channel takes a round trip, and anything that changes during
        // it produces no event. Refetching once the join lands closes that
        // window — otherwise a room that goes quiet right after you open it
        // stays stale on your screen forever.
        .subscribe((status) => { if (status === 'SUBSCRIBED') emit(); });
      emit();
      return () => { closed = true; void sb.removeChannel(ch); };
    },

    watchLobby(onChange) {
      let closed = false;
      const emit = debounced(() => {
        void listSummaries().then((r) => { if (!closed) onChange(r); }).catch(() => {});
      });
      const ch: RealtimeChannel = sb.channel('watch:lobby')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fk_rooms' }, emit)
        .subscribe((status) => { if (status === 'SUBSCRIBED') emit(); });
      emit();
      return () => { closed = true; void sb.removeChannel(ch); };
    },

    async setReady(roomId, ready) {
      const id = await uid();
      const { error } = await sb.from('fk_room_players')
        .update({ ready, last_seen_at: new Date().toISOString() })
        .eq('room_id', roomId).eq('user_id', id);
      if (error) throw new Error(error.message);
    },

    async addBot(roomId, seat) {
      const { error } = await sb.from('fk_room_players').insert({
        room_id: roomId, user_id: `bot:${roomId}:${seat}`, seat,
        display_name: tr('api.botName', { seat }), avatar: 'guojia', is_bot: true, ready: true,
      });
      // A race for the same seat is not an error worth surfacing; the seat is taken.
      if (error && !error.message.includes('duplicate key')) throw new Error(error.message);
    },

    async removeSeat(roomId, seat) {
      const { error } = await sb.from('fk_room_players')
        .delete().eq('room_id', roomId).eq('seat', seat);
      if (error) throw new Error(error.message);
    },

    async updateSettings(roomId, patch) {
      const { error } = await sb.rpc('fk_update_settings', { p_room: roomId, p_patch: patch });
      if (error) throw new Error(error.message);
    },

    async startGame(roomId) {
      const { error } = await sb.from('fk_rooms').update({ status: 'playing' }).eq('id', roomId);
      if (error) throw new Error(error.message);
    },

    async leaveRoom(roomId) {
      const { error } = await sb.rpc('fk_leave_room', { p_room: roomId });
      if (error) throw new Error(error.message);
    },

    async sendChat(roomId, text, playerId = null) {
      const { data: me } = await sb.auth.getUser();
      const who = identityOf(me.user);
      if (!who) throw new Error('not signed in');
      const { error } = await sb.from('fk_chat').insert({
        room_id: roomId, user_id: who.userId, display_name: who.displayName, text,
        player_id: playerId ?? null,
      });
      if (error) throw new Error(error.message);
    },
  };
}
