import { HEROES, heroDef, pickTeam } from '../game/heroes.ts';
import { BOT_NAMES } from '../game/bot.ts';
import { Rng } from '../engine/rng.ts';
import { MODE_SIZE, seatKey, type MatchMode } from '../game/sim.ts';
import type { Difficulty } from '../game/bot.ts';
import type { MatchConfig } from '../game_screen.ts';
import { cardName, lang, roleName, t, tSim } from '../i18n.ts';
import { ensureUid, loadName, sanitizeName, saveName } from '../net/identity.ts';
import { Lockstep } from '../net/lockstep.ts';
import type { PlayerInfo, StartMsg, StartSeat } from '../net/protocol.ts';
import { Lobby, Room, RoomError, type RoomState } from '../net/room.ts';
import { cardThumbnail } from '../render3d/thumbnails.ts';
import type { Settings } from './menu.ts';

const $ = (id: string): HTMLElement => { const el = document.getElementById(id); if (!el) throw new Error(`missing #${id}`); return el; };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export interface OnlineDeps {
  settings: Settings;
  show: (screen: 'online' | 'menu' | 'game') => void;
  startMatch: (cfg: MatchConfig) => void;
  endMatch: () => void;
  toast: (text: string) => void;
  playUi: () => void;
  /** The game screen's simulation, once a match is running (for the lockstep driver). */
  simulation: () => import('../game/sim.ts').Simulation | null;
}

type View = 'hub' | 'room';

/** The online hub and waiting room, drawn into #onlineCard. */
export class Online {
  private deps: OnlineDeps;
  private room: Room | null = null;
  private lobby = new Lobby();
  private view: View = 'hub';
  private uid = '';
  private busy = false;
  private status = '';
  private chat: { name: string; text: string }[] = [];
  private unsubs: (() => void)[] = [];
  private lockstep: Lockstep | null = null;
  private matchId = 0;
  private pendingJoin: string | null = null;
  active = false;

  constructor(deps: OnlineDeps) { this.deps = deps; }

  /** Open the hub (optionally joining a code straight away, from an invite link). */
  async openHub(join?: string): Promise<void> {
    this.active = true;
    this.view = 'hub';
    this.deps.show('online');
    this.render();
    this.uid = await ensureUid();
    void this.lobby.open().then(() => this.render());
    this.lobby.onRooms(() => { if (this.view === 'hub') this.render(); });
    if (join) { this.pendingJoin = join; await this.joinRoom(join); }
  }

  private name(): string { return sanitizeName(loadName() || this.deps.settings.name || '') || `Player${Math.floor(Math.random() * 900 + 100)}`; }

  private async createRoom(): Promise<void> {
    if (this.busy) return;
    this.busy = true; this.status = '@online.creating'; this.render();
    try {
      const name = this.name(); saveName(name);
      this.room = await Room.create(this.uid, name, this.deps.settings.hero, { mode: this.deps.settings.mode, difficulty: this.deps.settings.difficulty, name });
      await this.lobby.announce({ code: this.room.code, hostName: name, mode: this.deps.settings.mode, players: 1, status: 'open', at: Date.now() });
      this.enterRoom();
    } catch (e) { this.status = e instanceof RoomError ? e.message : '@err.network'; }
    this.busy = false; this.render();
  }

  private async joinRoom(code: string): Promise<void> {
    if (this.busy) return;
    this.busy = true; this.status = '@online.joining'; this.render();
    try {
      const name = this.name(); saveName(name);
      this.room = await Room.join(code, this.uid, name, this.deps.settings.hero);
      this.enterRoom();
    } catch (e) { this.status = e instanceof RoomError ? e.message : '@err.network'; }
    this.busy = false; this.pendingJoin = null; this.render();
  }

  private enterRoom(): void {
    const room = this.room!;
    this.view = 'room'; this.status = ''; this.chat = [];
    this.unsubs.push(room.onState(() => { this.render(); if (room.isHost) void this.lobby.announce({ code: room.code, hostName: room.self.name, mode: room.state.cfg.mode, players: room.state.players.length, status: this.lockstep ? 'playing' : 'open', at: Date.now() }); }));
    this.unsubs.push(room.onEvent((e) => {
      if (e.type === 'chat') { this.chat.push({ name: e.name, text: e.text }); if (this.chat.length > 40) this.chat.shift(); this.render(); }
      if (e.type === 'start') this.onStart(e.start);
    }));
    this.render();
  }

  async leaveRoom(): Promise<void> {
    for (const u of this.unsubs) u(); this.unsubs = [];
    await this.lobby.announce(null);
    await this.room?.leave(); this.room = null;
    this.view = 'hub'; this.render();
  }

  async close(): Promise<void> { await this.leaveRoom(); await this.lobby.close(); this.active = false; }

  // ---------------------------------------------------------------- start / match

  /** Host: freeze the seats, fill the rest with bots and broadcast the start. */
  private async hostStart(): Promise<void> {
    const room = this.room; if (!room || !room.isHost) return;
    const s = room.state;
    const size = MODE_SIZE[s.cfg.mode];
    const teams: [StartSeat[], StartSeat[]] = [[], []];
    const taken = new Set<string>();
    for (const team of [0, 1] as const) {
      for (let i = 0; i < size; i++) {
        const p = s.players.find((x) => x.team === team && x.seat === i);
        if (p) { let hero = p.hero; if (taken.has(hero)) hero = HEROES.find((h) => !taken.has(h.id))?.id ?? hero; taken.add(hero); teams[team].push({ heroId: hero, isBot: false, name: p.name, uid: p.uid }); }
        else teams[team].push({ heroId: '', isBot: true, name: '' });
      }
    }
    // bots get heroes nobody picked; the sim's completeTeam picks sensibly from the remaining pool
    const start: StartMsg = { matchId: ++this.matchId, seed: Math.floor(Math.random() * 1e9), mode: s.cfg.mode, difficulty: s.cfg.difficulty, teams, delay: 8, sendEvery: 4 };
    await room.sendStart(start);
    this.onStart(start);
  }

  private onStart(start: StartMsg): void {
    const room = this.room; if (!room) return;
    this.matchId = start.matchId;
    let me: 0 | 1 = 0, mySeat = 0;
    const teams: [import('../game/sim.ts').SeatSetup[], import('../game/sim.ts').SeatSetup[]] = [[], []];
    const humanSeats: string[] = [];
    // bot seats get heroes from the shared seed so every client builds the identical roster
    const rng = new Rng(start.seed ^ 0x51ed27);
    const taken = new Set<string>(start.teams.flat().filter((s) => !s.isBot).map((s) => s.heroId));
    for (const team of [0, 1] as const) {
      const anchor = start.teams[team].find((s) => !s.isBot)?.heroId ?? null;
      const wanted = pickTeam(anchor, rng).filter((id) => !taken.has(id));
      start.teams[team].forEach((s, i) => {
        if (!s.isBot) { humanSeats.push(seatKey(team, i)); if (s.uid === this.uid) { me = team; mySeat = i; } teams[team].push({ heroId: s.heroId, isBot: false, name: s.name }); return; }
        let id = wanted.shift() ?? HEROES.find((h) => !taken.has(h.id))?.id ?? HEROES[0].id;
        while (taken.has(id)) id = HEROES.find((h) => !taken.has(h.id))?.id ?? HEROES[0].id;
        taken.add(id);
        teams[team].push({ heroId: id, isBot: true, name: BOT_NAMES[(team * 7 + i * 3 + Math.floor(rng.next() * 5)) % BOT_NAMES.length] });
      });
    }
    const myKey = seatKey(me, mySeat);
    const online = {
      me, seat: mySeat,
      advance: (dt: number, cmd: import('../game/hero.ts').HeroCommand) => { this.lockstep?.advance(dt, cmd); return null; },
      status: () => { const l = this.lockstep; if (!l) return null; const st = l.advanceStats; if (!st) return null; if (st.waitMs > 400) return { text: t('net.waiting', { s: (st.waitMs / 1000).toFixed(1) }), kind: (st.waitMs > 3000 ? 'bad' : 'warn') as 'bad' | 'warn' }; if (st.desynced) return { text: t('net.outOfSync'), kind: 'bad' as const }; return { text: t('net.rtt', { ms: Math.round(st.rtt) }), kind: 'ok' as const }; },
      concede: () => { void this.lockstep?.leave('conceded'); },
    };
    this.deps.startMatch({ mode: start.mode, difficulty: start.difficulty, teams, seed: start.seed, me, mySeat, online });
    const sim = this.deps.simulation();
    if (!sim) return;
    this.lockstep?.destroy();
    this.lockstep = new Lockstep(sim, room, myKey, humanSeats, start.delay, start.sendEvery);
    this.lockstep.onDesync = () => this.deps.toast(t('net.outOfSync'));
    this.lockstep.onDrop = (seat) => this.deps.toast(t('net.dropped', { seat }));
    this.lockstep.onLeave = (seat) => this.deps.toast(t('net.left', { seat }));
    this.lockstep.onChat = (name, text) => this.deps.toast(`${name}: ${text}`);
    if (room.isHost) void this.lobby.announce({ code: room.code, hostName: room.self.name, mode: start.mode, players: room.state.players.length, status: 'playing', at: Date.now() });
  }

  /** The game screen finished (results shown, user left): back to the room. */
  matchEnded(): void { this.lockstep?.destroy(); this.lockstep = null; }
  backToRoom(): void { this.matchEnded(); this.view = this.room ? 'room' : 'hub'; this.deps.show('online'); this.render(); }

  // ---------------------------------------------------------------- rendering

  private render(): void {
    const card = $('onlineCard');
    if (this.view === 'hub') card.innerHTML = this.hubHtml(); else card.innerHTML = this.roomHtml();
    this.bind();
  }

  private hubHtml(): string {
    const rooms = this.lobby.rooms();
    const list = rooms.length ? rooms.map((r) => `<button class="room-row" data-join="${r.code}" ${r.status === 'playing' ? 'disabled' : ''}><b>${esc(r.hostName)}</b><span>${r.mode} · ${r.players}/${MODE_SIZE[r.mode as MatchMode] * 2}</span><i>${r.status === 'playing' ? t('online.playing') : t('online.join')}</i></button>`).join('') : `<p class="muted">${t('online.noRooms')}</p>`;
    return `<h2 class="heading">${t('online.title')}</h2>
      <label class="field"><span>${t('online.name')}</span><input id="onlineName" maxlength="18" value="${esc(loadName() || this.deps.settings.name || '')}" placeholder="${t('online.namePh')}" /></label>
      <div class="online-actions"><button id="btnCreateRoom" class="btn primary" ${this.busy ? 'disabled' : ''}>${t('online.create')}</button>
      <div class="join-row"><input id="joinCode" maxlength="8" placeholder="${t('online.codePh')}" value="${esc(this.pendingJoin ?? '')}" /><button id="btnJoinRoom" class="btn" ${this.busy ? 'disabled' : ''}>${t('online.join')}</button></div></div>
      <p class="muted small">${t('online.hubHint', { mode: this.deps.settings.mode })}</p>
      <div class="open-rooms"><h4>${t('online.openRooms')}</h4>${list}</div>
      <p class="status">${this.status ? esc(tSim(this.status)) : ''}</p>
      <button id="btnOnlineBack" class="btn ghost">${t('common.back')}</button>`;
  }

  private roomHtml(): string {
    const room = this.room!; const s = room.state; const size = MODE_SIZE[s.cfg.mode];
    const seat = (team: 0 | 1, i: number) => {
      const p = s.players.find((x) => x.team === team && x.seat === i);
      const mine = p?.uid === this.uid;
      if (!p) return `<button class="seat empty" data-seat="${team}:${i}"><span class="seat-role">${t('common.bot')}</span><span class="seat-name muted">${t('online.emptySeat')}</span></button>`;
      return `<div class="seat ${mine ? 'mine' : ''} ${p.host ? 'host' : ''}"><div class="seat-port" data-hero="${p.hero}" data-team="${team}"></div><span class="seat-name">${esc(p.name)}${p.host ? ' ♛' : ''}</span><span class="seat-hero">${cardName(heroDef(p.hero))} · ${roleName(heroDef(p.hero).role)}</span><span class="seat-state ${p.ready ? 'ready' : ''}">${p.ready ? t('online.ready') : t('online.notReady')}</span></div>`;
    };
    const team = (tm: 0 | 1) => `<div class="team-col t${tm}"><h4>${tm === 0 ? t('team.blue') : t('team.red')}</h4>${Array.from({ length: size }, (_, i) => seat(tm, i)).join('')}</div>`;
    const heroes = HEROES.map((h) => `<button class="hero-pick ${h.id === room.self.hero ? 'selected' : ''}" data-hero="${h.id}" title="${cardName(h)}"></button>`).join('');
    const link = Room.shareLink(room.code);
    const everyoneReady = s.players.every((p) => p.ready || p.host);
    const hostCtl = room.isHost ? `<div class="room-cfg"><div class="seg small" id="roomMode">${(['5v5', '3v3', '1v1'] as MatchMode[]).map((m) => `<button data-mode="${m}" class="${s.cfg.mode === m ? 'active' : ''}">${m}</button>`).join('')}</div><div class="seg small" id="roomDiff">${(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => `<button data-diff="${d}" class="${s.cfg.difficulty === d ? 'active' : ''}">${t(`diff.${d}`)}</button>`).join('')}</div></div>` : `<p class="muted small">${s.cfg.mode} · ${t(`diff.${s.cfg.difficulty}`)}</p>`;
    return `<div class="room-head"><h2 class="heading">${t('online.room')} <span class="room-code">${room.code}</span></h2><div class="sharebar"><code>${esc(link)}</code><button id="btnCopyLink" class="btn small">${t('online.copy')}</button></div></div>
      ${hostCtl}
      <div class="teams">${team(0)}<div class="tp-vs">VS</div>${team(1)}</div>
      <div class="pick-row"><span class="muted small">${t('online.pickHero')}</span><div class="hero-picks">${heroes}</div></div>
      <div class="room-chat"><div class="chat-log" id="chatLog">${this.chat.map((c) => `<div class="chat-line"><b>${esc(c.name)}:</b> ${esc(c.text)}</div>`).join('')}</div><form class="chat-form" id="chatForm"><input id="chatInput" maxlength="120" placeholder="${t('online.chatPh')}" /><button class="btn small">${t('online.send')}</button></form></div>
      <div class="room-foot"><button id="btnRoomLeave" class="btn ghost">${t('online.leave')}</button>
        ${room.isHost ? `<button id="btnRoomStart" class="btn primary big" ${everyoneReady ? '' : 'disabled'}>${t('online.start')}</button>` : `<button id="btnRoomReady" class="btn primary">${room.self.ready ? t('online.unready') : t('online.readyUp')}</button>`}</div>
      <p class="status">${this.status ? esc(tSim(this.status)) : ''}</p>`;
  }

  private bind(): void {
    const card = $('onlineCard');
    const on = (id: string, fn: () => void) => { const el = card.querySelector<HTMLElement>(`#${id}`); if (el) el.addEventListener('click', () => { this.deps.playUi(); fn(); }); };
    on('btnOnlineBack', () => { void this.close(); this.deps.show('menu'); });
    on('btnCreateRoom', () => { const n = (card.querySelector('#onlineName') as HTMLInputElement | null)?.value ?? ''; saveName(sanitizeName(n)); this.deps.settings.name = sanitizeName(n); void this.createRoom(); });
    on('btnJoinRoom', () => { const n = (card.querySelector('#onlineName') as HTMLInputElement | null)?.value ?? ''; saveName(sanitizeName(n)); const code = (card.querySelector('#joinCode') as HTMLInputElement | null)?.value ?? ''; void this.joinRoom(code); });
    card.querySelectorAll<HTMLButtonElement>('[data-join]').forEach((b) => b.addEventListener('click', () => { const n = (card.querySelector('#onlineName') as HTMLInputElement | null)?.value ?? ''; saveName(sanitizeName(n)); void this.joinRoom(b.dataset.join!); }));
    on('btnRoomLeave', () => { void this.leaveRoom(); });
    on('btnRoomReady', () => { void this.room?.update({ ready: !this.room.self.ready }).then(() => this.render()); });
    on('btnRoomStart', () => { void this.hostStart(); });
    on('btnCopyLink', () => { if (this.room) void navigator.clipboard?.writeText(Room.shareLink(this.room.code)).then(() => this.deps.toast(t('online.copied'))); });
    card.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach((b) => b.addEventListener('click', () => { const [tm, i] = b.dataset.seat!.split(':').map(Number); void this.room?.update({ team: tm as 0 | 1, seat: i, ready: false }).then(() => this.render()); }));
    card.querySelectorAll<HTMLButtonElement>('.hero-pick').forEach((b) => { b.appendChild(cardThumbnail(heroDef(b.dataset.hero!), 44, 50)); b.addEventListener('click', () => { this.deps.settings.hero = b.dataset.hero!; void this.room?.update({ hero: b.dataset.hero!, ready: false }).then(() => this.render()); }); });
    card.querySelectorAll<HTMLElement>('.seat-port').forEach((p) => p.appendChild(cardThumbnail(heroDef(p.dataset.hero!), 48, 54, Number(p.dataset.team) as 0 | 1)));
    card.querySelectorAll<HTMLButtonElement>('#roomMode button').forEach((b) => b.addEventListener('click', () => { const r = this.room; if (!r) return; void r.update({ cfg: { ...r.state.cfg, mode: b.dataset.mode as MatchMode } }).then(() => this.render()); }));
    card.querySelectorAll<HTMLButtonElement>('#roomDiff button').forEach((b) => b.addEventListener('click', () => { const r = this.room; if (!r) return; void r.update({ cfg: { ...r.state.cfg, difficulty: b.dataset.diff as Difficulty } }).then(() => this.render()); }));
    const form = card.querySelector<HTMLFormElement>('#chatForm');
    form?.addEventListener('submit', (e) => { e.preventDefault(); const inp = card.querySelector('#chatInput') as HTMLInputElement; const text = inp.value.trim().slice(0, 120); if (!text || !this.room) return; inp.value = ''; this.chat.push({ name: this.room.self.name, text }); void this.room.sendChat(text); this.render(); });
    const log = card.querySelector('#chatLog'); if (log) log.scrollTop = log.scrollHeight;
    void lang;
  }

  /** Lockstep stats for the HUD pill. */
  get stats(): ReturnType<Lockstep['advance']> | null { return this.lockstep?.advanceStats ?? null; }
  playersFor(s: RoomState): PlayerInfo[] { return s.players; }
}
