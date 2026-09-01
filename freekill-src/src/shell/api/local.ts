/**
 * A LobbyApi that needs no network.
 *
 * It exists so the shell is demonstrable and testable before Agent 2's Supabase
 * module lands, and so a reviewer with no Supabase credentials can still walk
 * the whole URL-to-seated journey. State lives in localStorage and changes are
 * announced over a BroadcastChannel, so two tabs on one machine genuinely see
 * each other's rooms — enough to exercise join-by-link and host controls for
 * real, rather than staging a screenshot.
 *
 * It is not a fallback anyone should ship against: `kind` is 'local' and the UI
 * says so out loud.
 */
import type {
  CreateRoomInput, Identity, LobbyApi, RoomDetail, RoomMember, RoomSummary,
} from './types';
import type { ChatLine } from '../../contract/views';
import { getLanguage, t } from '../../i18n';

const KEY = 'fk-local-state-v1';
const ID_KEY = 'fk-identity-v1';
const CHANNEL = 'fk-local-bus';

type MutableMember = { -readonly [K in keyof RoomMember]: RoomMember[K] };

interface StoredRoom {
  id: string;
  code: string;
  name: string;
  status: RoomDetail['summary']['status'];
  hostId: string;
  capacity: number;
  settings: Record<string, unknown>;
  bundleSha: string;
  updatedAt: string;
  members: MutableMember[];
  chat: ChatLine[];
}

interface Stored { rooms: Record<string, StoredRoom>; }

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch { /* private mode, cleared storage — start empty */ }
  return { rooms: {} };
}

function write(s: Stored, bus: BroadcastChannel | null): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  bus?.postMessage('changed');
}

function code(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/L/O/0/1
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function summarise(r: StoredRoom, hostName: string): RoomSummary {
  return {
    id: r.id, code: r.code, name: r.name, status: r.status, hostName,
    seated: r.members.length, capacity: r.capacity, settings: r.settings, updatedAt: r.updatedAt,
  };
}

function detail(r: StoredRoom): RoomDetail {
  const host = r.members.find((m) => m.userId === r.hostId);
  return {
    summary: summarise(r, host?.displayName ?? '?'),
    hostId: r.hostId,
    members: [...r.members].sort((a, b) => a.seat - b.seat),
    chat: r.chat,
    bundleSha: r.bundleSha,
  };
}

export function createLocalApi(): LobbyApi {
  let bus: BroadcastChannel | null = null;
  try { bus = new BroadcastChannel(CHANNEL); } catch { bus = null; }
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());
  if (bus) bus.onmessage = notify;
  window.addEventListener('storage', (e) => { if (e.key === KEY) notify(); });

  const identity = (): Identity | null => {
    try {
      const raw = localStorage.getItem(ID_KEY);
      return raw ? (JSON.parse(raw) as Identity) : null;
    } catch { return null; }
  };

  const mutate = (roomId: string, fn: (r: StoredRoom) => void): void => {
    const s = read();
    const r = s.rooms[roomId];
    if (!r) return;
    fn(r);
    r.updatedAt = new Date().toISOString();
    write(s, bus);
    notify();
  };

  const seatFor = (r: StoredRoom): number => {
    for (let i = 1; i <= r.capacity; i++) if (!r.members.some((m) => m.seat === i)) return i;
    throw new Error(t('api.error.roomFull', getLanguage()));
  };

  const me = (): Identity => {
    const i = identity();
    if (!i) throw new Error('not signed in');
    return i;
  };

  const join = (r: StoredRoom, who: Identity): void => {
    if (r.members.some((m) => m.userId === who.userId)) return;
    r.members.push({
      userId: who.userId, seat: seatFor(r), displayName: who.displayName,
      avatar: who.avatar, connection: 'online', isBot: false, ready: false,
    });
  };

  return {
    kind: 'local',

    async currentIdentity() { return identity(); },

    async signIn(displayName, avatar) {
      const existing = identity();
      const id: Identity = {
        userId: existing?.userId ?? `local-${crypto.randomUUID()}`,
        displayName, avatar,
      };
      localStorage.setItem(ID_KEY, JSON.stringify(id));
      // A rename must follow the player into every room they are sitting in.
      const s = read();
      for (const r of Object.values(s.rooms)) {
        for (const m of r.members) {
          if (m.userId === id.userId) { m.displayName = displayName; m.avatar = avatar; }
        }
      }
      write(s, bus);
      notify();
      return id;
    },

    async signOut() { localStorage.removeItem(ID_KEY); notify(); },

    async listRooms() {
      const s = read();
      return Object.values(s.rooms)
        .filter((r) => r.status !== 'abandoned')
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .map((r) => summarise(r, r.members.find((m) => m.userId === r.hostId)?.displayName ?? '?'));
    },

    async createRoom(input: CreateRoomInput) {
      const who = me();
      const s = read();
      const id = crypto.randomUUID();
      const room: StoredRoom = {
        id, code: code(), name: input.name, status: 'waiting', hostId: who.userId,
        capacity: input.capacity, settings: input.settings, bundleSha: input.bundleSha,
        updatedAt: new Date().toISOString(), members: [], chat: [],
      };
      join(room, who);
      s.rooms[id] = room;
      write(s, bus);
      notify();
      return detail(room);
    },

    async joinByCode(c) {
      const who = me();
      const s = read();
      const room = Object.values(s.rooms).find((r) => r.code === c.toUpperCase());
      if (!room) throw new Error(t('api.error.roomNotFound', getLanguage(), { code: c }));
      join(room, who);
      room.updatedAt = new Date().toISOString();
      write(s, bus);
      notify();
      return detail(room);
    },

    async getRoom(roomId) {
      const r = read().rooms[roomId];
      return r ? detail(r) : null;
    },

    watchRoom(roomId, onChange) {
      const emit = () => {
        const r = read().rooms[roomId];
        onChange(r ? detail(r) : null);
      };
      listeners.add(emit);
      emit();
      return () => listeners.delete(emit);
    },

    watchLobby(onChange) {
      const emit = () => {
        const s = read();
        onChange(Object.values(s.rooms)
          .filter((r) => r.status !== 'abandoned')
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
          .map((r) => summarise(r, r.members.find((m) => m.userId === r.hostId)?.displayName ?? '?')));
      };
      listeners.add(emit);
      emit();
      return () => listeners.delete(emit);
    },

    async setReady(roomId, ready) {
      const who = me();
      mutate(roomId, (r) => {
        const m = r.members.find((x) => x.userId === who.userId);
        if (m) m.ready = ready;
      });
    },

    async addBot(roomId, seat) {
      mutate(roomId, (r) => {
        if (r.members.some((m) => m.seat === seat)) return;
        r.members.push({
          userId: `bot-${seat}-${r.id}`, seat, displayName: t('api.botName', getLanguage(), { seat }),
          avatar: 'guojia', connection: 'online', isBot: true, ready: true,
        });
      });
    },

    async removeSeat(roomId, seat) {
      mutate(roomId, (r) => { r.members = r.members.filter((m) => m.seat !== seat); });
    },

    async updateSettings(roomId, patch) {
      mutate(roomId, (r) => { r.settings = { ...r.settings, ...patch }; });
    },

    async startGame(roomId) {
      mutate(roomId, (r) => { r.status = 'playing'; });
    },

    async leaveRoom(roomId) {
      const who = me();
      mutate(roomId, (r) => {
        r.members = r.members.filter((m) => m.userId !== who.userId);
        if (r.members.every((m) => m.isBot)) r.status = 'abandoned';
        else if (r.hostId === who.userId) r.hostId = r.members.find((m) => !m.isBot)?.userId ?? r.hostId;
      });
    },

    async sendChat(roomId, text, playerId = null) {
      const who = me();
      mutate(roomId, (r) => {
        r.chat = [...r.chat.slice(-80), {
          id: crypto.randomUUID(), playerId: playerId ?? null, displayName: who.displayName,
          text, at: Date.now(),
        }];
      });
    },
  };
}
