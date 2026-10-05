import type { RealtimeChannel } from '@supabase/supabase-js';
import { MODE_SIZE } from '../game/sim.ts';
import { supabase } from './identity.ts';
import { isRoomCode, newRoomCode, type NetMsg, type PlayerInfo, type RoomConfig, type StartMsg } from './protocol.ts';

/**
 * A room is a Realtime channel named after its code. Presence says who sits where; broadcast carries
 * the control messages (start, chat) and, during the match, every player's input frames. There is no
 * database row: the room lives as long as somebody is on the channel.
 */
export interface RoomState { players: PlayerInfo[]; host: PlayerInfo | null; cfg: RoomConfig }

export type RoomEvent =
  | { type: 'start'; start: StartMsg }
  | { type: 'msg'; from: string; msg: NetMsg }
  | { type: 'chat'; from: string; name: string; text: string };

const ROOM_PREFIX = 'kingsroad:room:';
export const LOBBY_CHANNEL = 'kingsroad:lobby';

export class RoomError extends Error {
  readonly code: 'not-found' | 'full' | 'network';
  constructor(code: 'not-found' | 'full' | 'network', message: string) { super(message); this.code = code; }
}

const DEFAULT_CFG: RoomConfig = { mode: '5v5', difficulty: 'normal', name: '' };

export class Room {
  readonly code: string;
  readonly uid: string;
  state: RoomState = { players: [], host: null, cfg: DEFAULT_CFG };
  private channel: RealtimeChannel;
  private me: PlayerInfo;
  private stateListeners = new Set<(s: RoomState) => void>();
  private eventListeners = new Set<(e: RoomEvent) => void>();
  private closed = false;

  private constructor(code: string, me: PlayerInfo, channel: RealtimeChannel) {
    this.code = code; this.uid = me.uid; this.me = me; this.channel = channel;
  }

  static shareLink(code: string): string {
    const u = new URL(location.href);
    u.hash = `#/join/${code}`;
    return u.toString();
  }

  /** Host: open a fresh room. */
  static async create(uid: string, name: string, hero: string, cfg: RoomConfig): Promise<Room> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = newRoomCode();
      const holder: { room: Room | null } = { room: null };
      const ch = await joinChannel(code, (c) => Room.bind(c, holder));
      const present = collect(ch);
      if (present.host) { await ch.unsubscribe(); continue; }
      const me: PlayerInfo = { uid, name, host: true, team: 0, seat: 0, hero, ready: true, at: Date.now(), cfg: { ...cfg, name } };
      const room = new Room(code, me, ch);
      holder.room = room;
      await room.track();
      return room;
    }
    throw new RoomError('network', '@err.noFreeCode');
  }

  /** Guest: join by code and take the first free seat. */
  static async join(codeRaw: string, uid: string, name: string, hero: string): Promise<Room> {
    const code = codeRaw.trim().toUpperCase();
    if (!isRoomCode(code)) throw new RoomError('not-found', '@err.notRoomCode');
    const holder: { room: Room | null } = { room: null };
    const ch = await joinChannel(code, (c) => Room.bind(c, holder));
    let present = collect(ch);
    for (let i = 0; i < 12 && !present.host; i++) { await sleep(250); present = collect(ch); }
    if (!present.host) { await ch.unsubscribe(); throw new RoomError('not-found', '@err.noHost|' + code); }
    const free = freeSeat(present, uid);
    if (!free) { await ch.unsubscribe(); throw new RoomError('full', '@err.roomFull|' + code); }
    const me: PlayerInfo = { uid, name, host: false, team: free.team, seat: free.seat, hero, ready: false, at: Date.now() };
    const room = new Room(code, me, ch);
    holder.room = room;
    await room.track();
    return room;
  }

  private static bind(ch: RealtimeChannel, holder: { room: Room | null }): void {
    const r = () => holder.room;
    ch.on('presence', { event: 'sync' }, () => r()?.refresh());
    ch.on('broadcast', { event: 'start' }, ({ payload }) => r()?.emit({ type: 'start', start: payload.start as StartMsg }));
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => { const room = r(); if (room && payload.from !== room.uid) room.emit({ type: 'msg', from: String(payload.from), msg: payload.msg as NetMsg }); });
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => r()?.emit({ type: 'chat', from: String(payload.from), name: String(payload.name), text: String(payload.text) }));
  }

  private async track(): Promise<void> { await this.channel.track(this.me); this.refresh(); }

  private refresh(): void {
    if (this.closed) return;
    const s = collect(this.channel);
    this.state = s;
    // lost a contested seat: move to a free one
    const mine = s.players.find((p) => p.uid === this.uid);
    if (mine && !this.me.host && (mine.team !== this.me.team || mine.seat !== this.me.seat)) { this.me = { ...this.me, team: mine.team, seat: mine.seat }; }
    for (const fn of this.stateListeners) fn(s);
  }

  private emit(e: RoomEvent): void { for (const fn of this.eventListeners) fn(e); }

  onState(fn: (s: RoomState) => void): () => void { this.stateListeners.add(fn); fn(this.state); return () => this.stateListeners.delete(fn); }
  onEvent(fn: (e: RoomEvent) => void): () => void { this.eventListeners.add(fn); return () => this.eventListeners.delete(fn); }

  get self(): PlayerInfo { return this.me; }
  get isHost(): boolean { return this.me.host; }

  async update(patch: Partial<Pick<PlayerInfo, 'ready' | 'hero' | 'name' | 'team' | 'seat' | 'cfg'>>): Promise<void> {
    this.me = { ...this.me, ...patch, at: patch.team !== undefined || patch.seat !== undefined ? Date.now() : this.me.at };
    if (!this.closed) await this.channel.track(this.me);
  }

  async sendStart(start: StartMsg): Promise<void> { if (!this.closed) await this.channel.send({ type: 'broadcast', event: 'start', payload: { from: this.uid, start } }); }
  async sendMsg(msg: NetMsg): Promise<void> { if (!this.closed) await this.channel.send({ type: 'broadcast', event: 'msg', payload: { from: this.uid, msg } }); }
  async sendChat(text: string): Promise<void> { if (!this.closed) await this.channel.send({ type: 'broadcast', event: 'chat', payload: { from: this.uid, name: this.me.name, text } }); }

  async leave(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try { await this.channel.untrack(); } catch { /* already gone */ }
    try { await this.channel.unsubscribe(); } catch { /* already gone */ }
    this.stateListeners.clear(); this.eventListeners.clear();
  }
}

/** First free seat in the room's mode, alternating teams so sides fill evenly. */
export function freeSeat(s: RoomState, uid: string): { team: 0 | 1; seat: number } | null {
  const size = MODE_SIZE[s.cfg.mode];
  const taken = new Set(s.players.filter((p) => p.uid !== uid).map((p) => `${p.team}:${p.seat}`));
  for (let i = 0; i < size; i++) for (const team of [0, 1] as const) if (!taken.has(`${team}:${i}`)) return { team, seat: i };
  return null;
}

async function joinChannel(code: string, bind: (ch: RealtimeChannel) => void): Promise<RealtimeChannel> {
  const ch = supabase().channel(ROOM_PREFIX + code, { config: { presence: { key: crypto.randomUUID() }, broadcast: { self: false, ack: false } } });
  bind(ch);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RoomError('network', '@err.serverSilent')), 12000);
    ch.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new RoomError('network', err?.message ?? status)); }
    });
  });
  await sleep(150);
  return ch;
}

/** Presence → players with seat conflicts resolved (earliest claim keeps the seat; later ones are moved). */
function collect(ch: RealtimeChannel): RoomState {
  const all: PlayerInfo[] = [];
  for (const rows of Object.values(ch.presenceState<PlayerInfo>())) for (const r of rows) if (r && typeof r.uid === 'string') all.push(r);
  const hosts = all.filter((p) => p.host).sort((a, b) => a.at - b.at);
  const host = hosts[0] ?? null;
  const cfg = host?.cfg ?? DEFAULT_CFG;
  const size = MODE_SIZE[cfg.mode];
  const sorted = [...all].sort((a, b) => (a.host ? -1 : b.host ? 1 : a.at - b.at));
  const taken = new Set<string>();
  const players: PlayerInfo[] = [];
  for (const p of sorted) {
    let { team, seat } = p;
    if (seat >= size || taken.has(`${team}:${seat}`)) {
      let found = false;
      for (let i = 0; i < size && !found; i++) for (const tm of [team, (team === 0 ? 1 : 0) as 0 | 1]) if (!taken.has(`${tm}:${i}`)) { team = tm; seat = i; found = true; break; }
      if (!found) continue;
    }
    taken.add(`${team}:${seat}`);
    players.push({ ...p, team, seat });
  }
  return { players, host, cfg };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Open rooms, for the hub's list: hosts announce themselves on one shared channel. */
export interface LobbyRoom { code: string; hostName: string; mode: string; players: number; status: 'open' | 'playing'; at: number }

export class Lobby {
  private channel: RealtimeChannel | null = null;
  private opening: Promise<void> | null = null;
  private listeners = new Set<(rooms: LobbyRoom[]) => void>();
  private mine: LobbyRoom | null = null;

  open(): Promise<void> {
    if (this.channel) return Promise.resolve();
    this.opening ??= (async () => {
      const ch = supabase().channel(LOBBY_CHANNEL, { config: { presence: { key: crypto.randomUUID() } } });
      ch.on('presence', { event: 'sync' }, () => this.push());
      await new Promise<void>((resolve) => { ch.subscribe((status) => { if (status === 'SUBSCRIBED') resolve(); }); setTimeout(resolve, 8000); });
      this.channel = ch;
      this.opening = null;
      if (this.mine) await ch.track(this.mine);
      this.push();
    })();
    return this.opening;
  }

  onRooms(fn: (rooms: LobbyRoom[]) => void): () => void { this.listeners.add(fn); this.push(); return () => this.listeners.delete(fn); }

  rooms(): LobbyRoom[] {
    if (!this.channel) return [];
    const out: LobbyRoom[] = [];
    for (const rows of Object.values(this.channel.presenceState<LobbyRoom>())) for (const r of rows) if (r && typeof r.code === 'string') out.push(r);
    return out.sort((a, b) => b.at - a.at);
  }

  private push(): void { const r = this.rooms(); for (const fn of this.listeners) fn(r); }

  async announce(room: LobbyRoom | null): Promise<void> {
    this.mine = room;
    if (!this.channel) return;
    if (room) await this.channel.track(room); else await this.channel.untrack();
  }

  async close(): Promise<void> {
    const ch = this.channel; this.channel = null;
    if (ch) { try { await ch.untrack(); } catch { /* ignore */ } try { await ch.unsubscribe(); } catch { /* ignore */ } }
  }
}
