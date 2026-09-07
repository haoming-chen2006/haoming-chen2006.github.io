import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './identity.ts';
import { isRoomCode, newRoomCode, type PlayerInfo, type Signal, type StartMsg } from './protocol.ts';

/**
 * A room is a Realtime channel named after its code. Presence says who is seated; broadcast carries
 * the handful of control messages (WebRTC signalling, start, chat, relayed game traffic). There is no
 * database row: the room exists exactly as long as its host is on the channel, which is the right
 * lifetime for an invite link to a five-minute duel.
 */
export interface RoomState { host: PlayerInfo | null; guest: PlayerInfo | null; others: number }

export type RoomEvent =
  | { type: 'signal'; from: string; signal: Signal }
  | { type: 'start'; start: StartMsg }
  | { type: 'relay'; from: string; payload: unknown }
  | { type: 'chat'; from: string; name: string; text: string }
  | { type: 'rematch'; from: string; want: boolean };

const ROOM_PREFIX = 'crownfall:room:';
export const LOBBY_CHANNEL = 'crownfall:lobby';

export class RoomError extends Error {
  readonly code: 'not-found' | 'full' | 'network';
  constructor(code: 'not-found' | 'full' | 'network', message: string) { super(message); this.code = code; }
}

export class Room {
  readonly code: string;
  readonly role: 'host' | 'guest';
  readonly uid: string;
  state: RoomState = { host: null, guest: null, others: 0 };
  private channel: RealtimeChannel;
  private me: PlayerInfo;
  private stateListeners = new Set<(s: RoomState) => void>();
  private eventListeners = new Set<(e: RoomEvent) => void>();
  private closed = false;

  private constructor(code: string, role: 'host' | 'guest', me: PlayerInfo, channel: RealtimeChannel) {
    this.code = code; this.role = role; this.uid = me.uid; this.me = me; this.channel = channel;
  }

  static shareLink(code: string): string {
    const u = new URL(location.href);
    u.hash = `#/join/${code}`;
    return u.toString();
  }

  /** Host: open a fresh room. Retries the code if a room with it is already occupied. */
  static async create(uid: string, name: string, deck: string[]): Promise<Room> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = newRoomCode();
      const holder: { room: Room | null } = { room: null };
      const ch = await joinChannel(code, (c) => Room.bind(c, holder));
      const present = collect(ch);
      if (present.host) { await ch.unsubscribe(); continue; }
      const me: PlayerInfo = { uid, name, role: 'host', deck, ready: true, at: Date.now() };
      const room = new Room(code, 'host', me, ch);
      holder.room = room;
      await room.track();
      return room;
    }
    throw new RoomError('network', 'Could not find a free room code');
  }

  /** Guest: join by code. Fails if nobody is hosting it or the seat is taken. */
  static async join(codeRaw: string, uid: string, name: string, deck: string[]): Promise<Room> {
    const code = codeRaw.trim().toUpperCase();
    if (!isRoomCode(code)) throw new RoomError('not-found', 'That is not a room code');
    const holder: { room: Room | null } = { room: null };
    const ch = await joinChannel(code, (c) => Room.bind(c, holder));
    // Presence can take a moment to sync after subscribing; give the host a few beats to show up.
    let present = collect(ch);
    for (let i = 0; i < 12 && !present.host; i++) { await sleep(250); present = collect(ch); }
    if (!present.host) { await ch.unsubscribe(); throw new RoomError('not-found', `No one is hosting room ${code}`); }
    if (present.guest && present.guest.uid !== uid) { await ch.unsubscribe(); throw new RoomError('full', `Room ${code} already has two players`); }
    const me: PlayerInfo = { uid, name, role: 'guest', deck, ready: false, at: Date.now() };
    const room = new Room(code, 'guest', me, ch);
    holder.room = room;
    await room.track();
    return room;
  }

  /**
   * supabase-js only accepts presence/broadcast handlers before `subscribe()`, and the Room does not
   * exist until after we have looked at who is present — so the handlers forward to whichever Room
   * ends up owning the channel.
   */
  private static bind(ch: RealtimeChannel, holder: { room: Room | null }): void {
    const r = () => holder.room;
    ch.on('presence', { event: 'sync' }, () => r()?.refresh());
    ch.on('broadcast', { event: 'signal' }, ({ payload }) => r()?.emit({ type: 'signal', from: String(payload.from), signal: payload.signal as Signal }));
    ch.on('broadcast', { event: 'start' }, ({ payload }) => r()?.emit({ type: 'start', start: payload as StartMsg }));
    ch.on('broadcast', { event: 'relay' }, ({ payload }) => { const room = r(); if (room && payload.from !== room.uid) room.emit({ type: 'relay', from: String(payload.from), payload: payload.payload }); });
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => r()?.emit({ type: 'chat', from: String(payload.from), name: String(payload.name), text: String(payload.text) }));
    ch.on('broadcast', { event: 'rematch' }, ({ payload }) => r()?.emit({ type: 'rematch', from: String(payload.from), want: !!payload.want }));
  }

  private async track(): Promise<void> {
    await this.channel.track(this.me);
    this.refresh();
  }

  private refresh(): void {
    if (this.closed) return;
    const s = collect(this.channel);
    // A guest that lost the race for the seat is "others": the waiting room tells them so.
    this.state = s;
    for (const fn of this.stateListeners) fn(s);
  }

  private emit(e: RoomEvent): void { for (const fn of this.eventListeners) fn(e); }

  onState(fn: (s: RoomState) => void): () => void { this.stateListeners.add(fn); fn(this.state); return () => this.stateListeners.delete(fn); }
  onEvent(fn: (e: RoomEvent) => void): () => void { this.eventListeners.add(fn); return () => this.eventListeners.delete(fn); }

  get self(): PlayerInfo { return this.me; }
  get opponent(): PlayerInfo | null { return this.role === 'host' ? this.state.guest : this.state.host; }
  /** True while this seat is actually the one presence recognises (a second guest can be squeezed out). */
  get seated(): boolean { return (this.role === 'host' ? this.state.host?.uid : this.state.guest?.uid) === this.uid; }

  async update(patch: Partial<Pick<PlayerInfo, 'ready' | 'deck' | 'name'>>): Promise<void> {
    this.me = { ...this.me, ...patch };
    if (!this.closed) await this.channel.track(this.me);
  }

  async send(event: 'signal' | 'start' | 'relay' | 'chat' | 'rematch', payload: object): Promise<void> {
    if (this.closed) return;
    await this.channel.send({ type: 'broadcast', event, payload: { from: this.uid, ...payload } });
  }

  async leave(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try { await this.channel.untrack(); } catch { /* already gone */ }
    try { await this.channel.unsubscribe(); } catch { /* already gone */ }
    this.stateListeners.clear(); this.eventListeners.clear();
  }
}

async function joinChannel(code: string, bind: (ch: RealtimeChannel) => void): Promise<RealtimeChannel> {
  const ch = supabase().channel(ROOM_PREFIX + code, { config: { presence: { key: crypto.randomUUID() }, broadcast: { self: false, ack: false } } });
  bind(ch);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new RoomError('network', 'The room server did not answer')), 12000);
    ch.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new RoomError('network', err?.message ?? status)); }
    });
  });
  // presence state arrives on the first sync, which follows the subscribe by a beat
  await sleep(150);
  return ch;
}

function collect(ch: RealtimeChannel): RoomState {
  const all: PlayerInfo[] = [];
  for (const rows of Object.values(ch.presenceState<PlayerInfo>())) for (const r of rows) if (r && typeof r.uid === 'string') all.push(r);
  const hosts = all.filter((p) => p.role === 'host').sort((a, b) => a.at - b.at);
  const guests = all.filter((p) => p.role === 'guest').sort((a, b) => a.at - b.at);
  return { host: hosts[0] ?? null, guest: guests[0] ?? null, others: Math.max(0, hosts.length - 1) + Math.max(0, guests.length - 1) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Open rooms, for the hub's "join a friend" list: hosts announce themselves on one shared channel. */
export interface LobbyRoom { code: string; hostName: string; status: 'open' | 'full' | 'playing'; at: number }

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

  /** Host: advertise (or update) my room. `null` withdraws it. */
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
