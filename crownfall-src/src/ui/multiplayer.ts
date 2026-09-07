import { ALL_CARDS, avgCost, cardById, cardsFromIds } from '../game/cards.ts';
import type { Team } from '../game/types.ts';
import type { MatchConfig } from '../game_screen.ts';
import { ensureUid, loadName, sanitizeName, saveName } from '../net/identity.ts';
import { PeerLink } from '../net/peer.ts';
import type { PlayerInfo, StartMsg } from '../net/protocol.ts';
import { Lobby, Room, RoomError, type LobbyRoom, type RoomState } from '../net/room.ts';
import { makeCardEl } from './cards_dom.ts';
import type { Settings } from './menu.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

export interface MultiplayerHooks {
  settings: Settings;
  show: (screen: 'menu' | 'online' | 'room' | 'game' | 'deck') => void;
  /** Start (or restart) the match on this browser with the given online configuration. */
  startMatch: (cfg: MatchConfig) => void;
  /** The local player is leaving the duel from inside a match; the caller tears the game screen down. */
  endMatch: () => void;
  toast: (text: string) => void;
  playUi: () => void;
}

const validDeck = (ids: unknown): ids is string[] => Array.isArray(ids) && ids.length === 8 && ids.every((id) => typeof id === 'string' && ALL_CARDS.some((c) => c.id === id));

/**
 * The online flow, FreeKill-style: name → create a room or join by code/link → waiting room with
 * both seats and a share link → the host starts → lockstep duel → rematch or leave.
 */
export class Multiplayer {
  private hooks: MultiplayerHooks;
  private room: Room | null = null;
  private link: PeerLink | null = null;
  private lobby = new Lobby();
  private unsubs: (() => void)[] = [];
  private inMatch = false;
  private matchId = 0;
  private rematch = { me: false, them: false };
  private opponentSeen = false;
  private stallTimer = 0;
  private busy = false;

  constructor(hooks: MultiplayerHooks) {
    this.hooks = hooks;
    this.wire();
    $('onlineName').setAttribute('value', loadName());
    ($('onlineName') as HTMLInputElement).value = loadName();
  }

  /** Status of the game link for the HUD pill, or null when not in an online match. */
  linkStatus(): { direct: boolean; rtt: number } | null {
    return this.inMatch && this.link ? { direct: this.link.direct, rtt: this.link.rtt } : null;
  }

  get active(): boolean { return this.inMatch; }

  /** For play-tests: what the peer link is doing right now. */
  debugLink(): Record<string, unknown> | null {
    const l = this.link as unknown as { mode: string; rtt: number; pc: RTCPeerConnection | null; dc: RTCDataChannel | null } | null;
    if (!l) return null;
    return { mode: l.mode, rtt: Math.round(l.rtt), pc: l.pc?.connectionState ?? null, ice: l.pc?.iceConnectionState ?? null, gathering: l.pc?.iceGatheringState ?? null, signaling: l.pc?.signalingState ?? null, dc: l.dc?.readyState ?? null };
  }

  private wire(): void {
    $('btnCreateRoom').addEventListener('click', () => void this.create());
    $('btnJoinRoom').addEventListener('click', () => void this.join(($('joinCode') as HTMLInputElement).value));
    $('joinCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') void this.join(($('joinCode') as HTMLInputElement).value); });
    $('joinCode').addEventListener('input', () => { const el = $('joinCode') as HTMLInputElement; el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); });
    $('onlineName').addEventListener('change', () => saveName(this.name()));
    $('btnOnlineBack').addEventListener('click', () => { void this.lobby.close(); this.hooks.show('menu'); });
    $('btnOnlineDeck').addEventListener('click', () => this.hooks.show('deck'));
    $('btnCopyLink').addEventListener('click', () => void this.copyLink());
    $('btnRoomReady').addEventListener('click', () => void this.toggleReady());
    $('btnRoomStart').addEventListener('click', () => void this.hostStart());
    $('btnRoomLeave').addEventListener('click', () => void this.leaveRoom());
    $('roomChatForm').addEventListener('submit', (e) => { e.preventDefault(); void this.sendChat(); });
    $('openRooms').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-code]');
      if (b?.dataset.code) void this.join(b.dataset.code);
    });
  }

  private name(): string { return sanitizeName(($('onlineName') as HTMLInputElement).value) || 'Commander'; }
  private deck(): string[] { return [...this.hooks.settings.deck]; }

  private status(text: string, kind: 'info' | 'error' | 'ok' = 'info'): void {
    const el = $('onlineStatus'); el.textContent = text; el.className = `status ${kind}`;
  }
  private roomStatus(text: string, kind: 'info' | 'error' | 'ok' = 'info'): void {
    const el = $('roomStatus'); el.textContent = text; el.className = `status ${kind}`;
  }

  /** Open the hub. `joinCode` comes from an invite link and joins straight away when a name is known. */
  async openHub(joinCode?: string): Promise<void> {
    this.hooks.show('online');
    this.refreshDeckInfo();
    this.status('');
    if (joinCode) ($('joinCode') as HTMLInputElement).value = joinCode.toUpperCase();
    void this.lobby.open().then(() => { this.unsubs.push(this.lobby.onRooms((rooms) => this.renderRooms(rooms))); });
    if (joinCode && loadName()) await this.join(joinCode);
    else if (joinCode) { this.status(`Enter your name to join room ${joinCode.toUpperCase()}`); $('onlineName').focus(); }
  }

  refreshDeckInfo(): void {
    const deck = cardsFromIds(this.hooks.settings.deck);
    $('onlineDeckInfo').textContent = deck.length === 8 ? `${deck.map((c) => c.name).slice(0, 3).join(', ')}… · avg ${avgCost(deck).toFixed(1)}` : `${deck.length}/8 cards — finish your deck first`;
    const ok = deck.length === 8;
    ($('btnCreateRoom') as HTMLButtonElement).disabled = !ok;
    ($('btnJoinRoom') as HTMLButtonElement).disabled = !ok;
  }

  private renderRooms(rooms: LobbyRoom[]): void {
    const el = $('openRooms');
    const open = rooms.filter((r) => r.status === 'open');
    if (!open.length) { el.innerHTML = '<span class="muted">Nobody is hosting right now — create a room and share the link.</span>'; return; }
    el.innerHTML = open.map((r) => `<button class="room-row" data-code="${r.code}"><span class="room-row-code">${r.code}</span><span class="room-row-host">${escape(r.hostName)}</span><span class="room-row-join">Join ›</span></button>`).join('');
  }

  private async create(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.hooks.playUi();
    saveName(this.name());
    this.status('Opening a room…');
    try {
      const uid = await ensureUid();
      const room = await Room.create(uid, this.name(), this.deck());
      this.enterRoom(room);
      await this.lobby.announce({ code: room.code, hostName: room.self.name, status: 'open', at: Date.now() });
    } catch (e) {
      this.status(e instanceof Error ? e.message : 'Could not open a room', 'error');
    } finally { this.busy = false; }
  }

  private async join(code: string): Promise<void> {
    if (this.busy) return;
    const c = code.trim().toUpperCase();
    if (!c) { this.status('Enter a room code', 'error'); return; }
    this.busy = true;
    this.hooks.playUi();
    saveName(this.name());
    this.status(`Joining ${c}…`);
    try {
      const uid = await ensureUid();
      const room = await Room.join(c, uid, this.name(), this.deck());
      this.enterRoom(room);
    } catch (e) {
      this.status(e instanceof RoomError ? e.message : 'Could not join that room', 'error');
    } finally { this.busy = false; }
  }

  private enterRoom(room: Room): void {
    this.room = room;
    this.opponentSeen = false;
    this.rematch = { me: false, them: false };
    this.link = new PeerLink(room);
    history.replaceState(null, '', `${location.pathname}${location.search}#/room/${room.code}`);
    $('roomCode').textContent = room.code;
    $('roomLink').textContent = Room.shareLink(room.code);
    $('roomChatLog').innerHTML = '';
    $('btnRoomReady').classList.toggle('hidden', room.role === 'host');
    $('btnRoomStart').classList.toggle('hidden', room.role !== 'host');
    this.roomStatus(room.role === 'host' ? 'Share the link or code with a friend. They appear here the moment they join.' : 'Press Ready when you are set — the host starts the battle.');
    this.hooks.show('room');
    this.unsubs.push(room.onState((s) => this.onRoomState(s)));
    this.unsubs.push(room.onEvent((e) => {
      if (e.type === 'start') void this.onStart(e.start);
      else if (e.type === 'chat') this.chatLine(e.name, e.text, false);
      else if (e.type === 'rematch' && e.from !== room.uid) { this.rematch.them = e.want; void this.maybeRematch(); }
    }));
    this.unsubs.push(this.link.onMode((m) => this.renderLinkMode(m)));
    // The guest listens for the host's offer right away; the host offers once a guest is seated.
    if (room.role === 'guest') this.link.connect();
  }

  private renderLinkMode(mode: 'connecting' | 'p2p' | 'relay'): void {
    const el = $('roomLink2');
    el.textContent = mode === 'p2p' ? 'Direct connection' : mode === 'relay' ? 'Relayed through the server' : 'Connecting…';
    el.className = `link-mode ${mode}`;
  }

  private onRoomState(s: RoomState): void {
    const room = this.room;
    if (!room) return;
    this.renderSeat('seatHost', s.host, 'Host', 'blue');
    this.renderSeat('seatGuest', s.guest, 'Guest', 'red');
    const opp = room.opponent;
    if (opp && !this.opponentSeen) {
      this.opponentSeen = true;
      this.chatLine('', `${opp.name} joined the room`, true);
      if (room.role === 'host') { this.link?.connect(); void this.lobby.announce({ code: room.code, hostName: room.self.name, status: 'full', at: Date.now() }); }
    }
    if (!opp && this.opponentSeen) {
      this.opponentSeen = false;
      if (this.inMatch) { this.onOpponentGone('disconnected'); }
      else {
        this.chatLine('', room.role === 'host' ? 'Your opponent left the room' : 'The host closed the room', true);
        if (room.role === 'guest') { this.roomStatus('The host left. Create your own room or join another.', 'error'); }
        else { void this.lobby.announce({ code: room.code, hostName: room.self.name, status: 'open', at: Date.now() }); this.link?.close(); this.link = new PeerLink(room); this.unsubs.push(this.link.onMode((m) => this.renderLinkMode(m))); }
      }
    }
    if (!room.seated && room.role === 'guest') this.roomStatus('Someone else took the seat in this room.', 'error');
    const start = $('btnRoomStart') as HTMLButtonElement;
    start.disabled = !(room.role === 'host' && s.guest && s.guest.ready);
    start.textContent = !s.guest ? 'Waiting for a challenger…' : !s.guest.ready ? `Waiting for ${s.guest.name} to be ready` : 'Start Battle';
    const ready = $('btnRoomReady') as HTMLButtonElement;
    ready.textContent = room.self.ready ? '✓ Ready' : 'Ready';
    ready.classList.toggle('primary', !room.self.ready);
  }

  private renderSeat(id: string, p: PlayerInfo | null, role: string, color: string): void {
    const el = $(id);
    el.classList.toggle('empty', !p);
    el.classList.toggle('ready', !!p?.ready);
    el.querySelector('.seat-role')!.textContent = `${role} · ${color === 'blue' ? 'Blue' : 'Red'}`;
    el.querySelector('.seat-name')!.textContent = p ? p.name : (role === 'Host' ? 'No host' : 'Waiting for a challenger…');
    const deckEl = el.querySelector<HTMLElement>('.seat-deck')!;
    deckEl.innerHTML = '';
    if (p && validDeck(p.deck)) {
      for (const id of p.deck) deckEl.appendChild(makeCardEl(cardById(id), 44));
      el.querySelector('.seat-state')!.textContent = `avg ${avgCost(cardsFromIds(p.deck)).toFixed(1)} · ${p.ready ? 'Ready' : 'Not ready'}`;
    } else el.querySelector('.seat-state')!.textContent = p ? 'Deck not shared' : '';
  }

  private async toggleReady(): Promise<void> {
    if (!this.room) return;
    this.hooks.playUi();
    await this.room.update({ ready: !this.room.self.ready, deck: this.deck() });
    this.onRoomState(this.room.state);
  }

  private async copyLink(): Promise<void> {
    const link = $('roomLink').textContent ?? '';
    try { await navigator.clipboard.writeText(link); $('btnCopyLink').textContent = 'Copied!'; }
    catch { $('btnCopyLink').textContent = 'Select & copy'; const r = document.createRange(); r.selectNodeContents($('roomLink')); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); }
    setTimeout(() => { $('btnCopyLink').textContent = 'Copy link'; }, 1600);
  }

  private async sendChat(): Promise<void> {
    const input = $('roomChatInput') as HTMLInputElement;
    const text = input.value.trim().slice(0, 140);
    if (!text || !this.room) return;
    input.value = '';
    await this.room.send('chat', { name: this.room.self.name, text });
    this.chatLine(this.room.self.name, text, false);
  }

  private chatLine(name: string, text: string, system: boolean): void {
    const log = $('roomChatLog');
    const line = document.createElement('div');
    line.className = system ? 'chat-line system' : 'chat-line';
    line.innerHTML = system ? escape(text) : `<b>${escape(name)}</b> ${escape(text)}`;
    log.appendChild(line);
    while (log.children.length > 40) log.firstElementChild?.remove();
    log.scrollTop = log.scrollHeight;
  }

  private inputDelay(): { delay: number; sendEvery: number } {
    const link = this.link;
    const direct = !!link?.direct;
    const rtt = link && link.rtt > 0 ? link.rtt : direct ? 60 : 260;
    const oneWay = rtt / 2 + 25;
    const delay = Math.min(30, Math.max(direct ? 3 : 8, Math.ceil(oneWay / (1000 / 60)) + 1));
    return { delay, sendEvery: direct ? 1 : 3 };
  }

  private async hostStart(): Promise<void> {
    const room = this.room;
    if (!room || room.role !== 'host') return;
    const guest = room.state.guest;
    if (!guest || !guest.ready) return;
    if (!validDeck(guest.deck)) { this.roomStatus('Your opponent has not shared a valid deck yet.', 'error'); return; }
    this.hooks.playUi();
    const seedBuf = new Uint32Array(1); crypto.getRandomValues(seedBuf);
    const { delay, sendEvery } = this.inputDelay();
    const msg: StartMsg = {
      matchId: ++this.matchId, seed: seedBuf[0] % 2147483647, delay, sendEvery,
      host: { uid: room.uid, name: room.self.name, deck: this.deck() },
      guest: { uid: guest.uid, name: guest.name, deck: guest.deck },
    };
    await room.send('start', msg);
    void this.lobby.announce({ code: room.code, hostName: room.self.name, status: 'playing', at: Date.now() });
    await this.onStart(msg);
  }

  private async onStart(msg: StartMsg): Promise<void> {
    const room = this.room, link = this.link;
    if (!room || !link) return;
    if (!validDeck(msg.host.deck) || !validDeck(msg.guest.deck)) { this.roomStatus('Bad start message from the host.', 'error'); return; }
    this.matchId = msg.matchId;
    this.rematch = { me: false, them: false };
    const me: Team = room.role === 'host' ? 0 : 1;
    this.inMatch = true;
    this.hooks.startMatch({
      deck: cardsFromIds(msg.host.deck), botDeck: cardsFromIds(msg.guest.deck), difficulty: 'normal', seed: msg.seed,
      online: { me, names: [msg.host.name, msg.guest.name], link, delay: msg.delay, sendEvery: msg.sendEvery },
    });
    this.watchStalls();
  }

  /** A seat whose inputs stop arriving for a long time has effectively left. */
  private watchStalls(): void {
    window.clearInterval(this.stallTimer);
    let stalledSince = 0;
    this.stallTimer = window.setInterval(() => {
      if (!this.inMatch) { window.clearInterval(this.stallTimer); return; }
      const pill = $('netPill');
      const stalled = pill.classList.contains('bad') || pill.classList.contains('warn');
      if (stalled && pill.textContent?.startsWith('Waiting')) { stalledSince ||= Date.now(); if (Date.now() - stalledSince > 25000) this.onOpponentGone('stopped responding'); }
      else stalledSince = 0;
    }, 1000);
  }

  private onOpponentGone(how: string): void {
    if (!this.inMatch) return;
    this.hooks.toast(`Your opponent ${how} — victory by forfeit`);
    // The game screen ends the match when its driver reports the other side gone; nudge it the same way.
    window.dispatchEvent(new CustomEvent('crownfall:opponent-gone', { detail: how }));
  }

  /** Results screen: both players must ask; the host then deals a new seed. */
  async requestRematch(): Promise<void> {
    const room = this.room;
    if (!room) return;
    this.rematch.me = true;
    await room.send('rematch', { want: true });
    this.hooks.toast(this.rematch.them ? 'Rematch!' : 'Rematch requested — waiting for your opponent');
    await this.maybeRematch();
  }

  private async maybeRematch(): Promise<void> {
    const room = this.room;
    if (!room || !this.rematch.me || !this.rematch.them) return;
    if (room.role !== 'host') return;
    if (!room.opponent) return;
    this.inMatch = false;
    const guest = room.state.guest;
    if (!guest || !validDeck(guest.deck)) return;
    const seedBuf = new Uint32Array(1); crypto.getRandomValues(seedBuf);
    const { delay, sendEvery } = this.inputDelay();
    const msg: StartMsg = {
      matchId: ++this.matchId, seed: seedBuf[0] % 2147483647, delay, sendEvery,
      host: { uid: room.uid, name: room.self.name, deck: this.deck() }, guest: { uid: guest.uid, name: guest.name, deck: guest.deck },
    };
    await room.send('start', msg);
    await this.onStart(msg);
  }

  /** Leaving a finished (or conceded) match: back to the waiting room, keeping the room open. */
  backToRoom(): void {
    this.inMatch = false;
    window.clearInterval(this.stallTimer);
    if (!this.room) { this.hooks.show('menu'); return; }
    this.rematch = { me: false, them: false };
    this.hooks.show('room');
    this.onRoomState(this.room.state);
    if (this.room.role === 'host') void this.lobby.announce({ code: this.room.code, hostName: this.room.self.name, status: this.room.state.guest ? 'full' : 'open', at: Date.now() });
  }

  /** Tear everything down: the match, the link, the room. */
  async leaveRoom(): Promise<void> {
    this.hooks.playUi();
    if (this.inMatch) this.hooks.endMatch();
    this.inMatch = false;
    window.clearInterval(this.stallTimer);
    for (const u of this.unsubs.splice(0)) u();
    this.link?.close(); this.link = null;
    const room = this.room; this.room = null;
    if (room?.role === 'host') void this.lobby.announce(null);
    await room?.leave();
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    await this.openHub();
  }

  /** Called by the main loop when the game screen wants to end an online match (opponent left). */
  matchEnded(): void { this.inMatch = false; window.clearInterval(this.stallTimer); }
}

const escape = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
