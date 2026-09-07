import { music } from './audio/music.ts';
import { sfx } from './audio/sfx.ts';
import { Input } from './engine/input.ts';
import { norm, type Vec } from './engine/math.ts';
import { applyAction, type Action } from './game/actions.ts';
import type { Difficulty } from './game/bot.ts';
import { POSSESS } from './game/constants.ts';
import { canDeploy } from './game/deploy.ts';
import { idleCommand, possessCandidate, type HeroCommand } from './game/hero.ts';
import { Simulation } from './game/sim.ts';
import { restoreSnapshot, takeSnapshot, type SimSnapshot } from './game/snapshot.ts';
import { other, type CardDef, type GameEvent, type Team, type Unit } from './game/types.ts';
import type { World } from './game/world.ts';
import { LockstepDriver, type LockstepLink, type LockstepStats } from './net/lockstep.ts';
import type { ViewMode } from './render3d/camera3d.ts';
import type { GameView } from './render3d/scene.ts';
import { Hud } from './ui/hud.ts';
import type { Tutorial } from './ui/tutorial.ts';

/** An online duel: who this browser is, who the other seat is, and the link between them. */
export interface OnlineConfig {
  me: Team;
  names: [string, string];
  link: LockstepLink;
  delay: number;
  sendEvery: number;
  /** Called when the other seat leaves or the link dies for good; the screen ends the match by forfeit. */
  onLeave?: () => void;
}

export interface MatchConfig { deck: CardDef[]; botDeck: CardDef[]; difficulty: Difficulty; seed?: number; tutorial?: boolean; online?: OnlineConfig }

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

/** Owns one running match: simulation, 3D view, HUD and player input. */
export class GameScreen {
  active = false;
  preferFirst = true;
  onEnd: (winner: Team | -1, me: Team) => void = () => {};
  onViewToggle: (first: boolean) => void = () => {};
  tutorial: Tutorial | null = null;
  /** The team this browser commands. 0 in solo play; the guest of an online duel is 1. */
  me: Team = 0;
  private foe: Team = 1;
  private lastHeroKills = 0;
  private sim: Simulation | null = null;
  private driver: LockstepDriver | null = null;
  private net: LockstepStats | null = null;
  private view: GameView;
  private input: Input;
  private canvas: HTMLCanvasElement;
  private hud: Hud;
  private mode: ViewMode = 'commander';
  private selectedCard: number | null = null;
  private dragging = false;
  private paused = false;
  private menuOpen = false;
  private time = 0;
  private endTimer = -1;
  private resultsShown = false;
  private cfg: MatchConfig | null = null;
  private hitMarkerT = 10;
  private lastHeroHp = -1;
  private stepT = 0;
  private flashT = 0;
  private moving = false;
  private lastElixirFull = false;
  private lastHandKey = '';
  private frameAcc = 0;
  private frameN = 0;
  private slowStreak = 0;
  private wallT = 0;
  private netPillText = '';
  onAutoQuality: (q: 'high' | 'low') => void = () => {};
  private vignette: HTMLElement;
  private damageFlash: HTMLElement;

  constructor(view: GameView, canvas: HTMLCanvasElement) {
    this.view = view;
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.hud = new Hud();
    this.hud.onCardPointerDown = (i) => this.selectCard(i, true);
    this.vignette = $('vignette');
    this.damageFlash = $('damageFlash');
    // Pointer lock must come from a real gesture: grab it on any click while possessed.
    canvas.addEventListener('pointerdown', () => { if (this.active && this.mode !== 'commander' && !this.input.isLocked() && this.selectedCard === null && !this.menuOpen) this.input.requestLock(); });
  }

  get online(): boolean { return !!this.cfg?.online; }

  /** For scripted play-tests: where the lockstep is and what the world hashes to. */
  netDebug(): { tick: number; desynced: boolean; delay: number; hashes: [number, number][]; phase: string; entities: number; heroes: [number, number]; waitMs: number } | null {
    const d = this.driver, w = this.sim?.w;
    if (!d || !w) return null;
    return { tick: d.tick, desynced: d.desynced, delay: d.delay, hashes: [...d.debugHashes], phase: w.phase, entities: w.entities.length, heroes: [w.players[0].heroId, w.players[1].heroId], waitMs: this.net?.waitMs ?? 0 };
  }
  get world(): World | null { return this.sim?.w ?? null; }
  get simulation(): Simulation | null { return this.sim; }

  start(cfg: MatchConfig): void {
    this.cfg = cfg;
    const on = cfg.online;
    this.me = on ? on.me : 0;
    this.foe = other(this.me);
    this.driver?.destroy();
    this.driver = null;
    this.sim = new Simulation({
      playerDeck: cfg.deck, botDeck: cfg.botDeck, difficulty: cfg.difficulty, seed: cfg.seed ?? (Date.now() % 100000),
      duel: on ? { names: on.names } : undefined,
    });
    if (on) {
      const d = new LockstepDriver(this.sim, on.me, on.link, { delay: on.delay, sendEvery: on.sendEvery });
      d.onRemoteLeft = () => this.forfeit(this.foe, `${this.sim?.w.players[this.foe].name ?? 'Opponent'} left the battle`);
      d.onDesync = () => { this.hud.toast(on.me === 1 ? 'Out of sync — catching up from the host…' : 'Out of sync — sending the guest a fresh copy of the world', 'warn'); };
      d.onSnapshotRequest = () => { if (this.sim) on.link.send({ k: 'snap', t: d.tick, d: takeSnapshot(this.sim) }); };
      d.onSnapshot = (tick, data) => {
        if (!this.sim || on.me !== 1) return;
        try { restoreSnapshot(this.sim, data as SimSnapshot); d.resyncTo(tick); this.sim.w.events.length = 0; this.hud.toast('Back in sync', 'good'); }
        catch { this.hud.toast('Could not resync — the match may drift', 'warn'); }
      };
      d.onChat = (text) => this.hud.feed(`<b>${escapeHtml(this.sim?.w.players[this.foe].name ?? 'Opponent')}:</b> ${escapeHtml(text)}`, '#9fc3ff');
      this.driver = d;
    }
    this.view.setViewTeam(this.me);
    sfx.viewTeam = this.me;
    this.selectedCard = null; this.dragging = false; this.paused = false; this.menuOpen = false; this.endTimer = -1; this.resultsShown = false; this.time = 0;
    this.hitMarkerT = 10; this.lastHeroHp = -1; this.flashT = 0; this.mode = 'commander'; this.net = null; this.netPillText = '';
    this.view.clear();
    this.view.rig.resetToCommander();
    this.view.rig.playIntro(3.2);
    this.hud.reset(this.sim.w, this.me);
    this.hud.hideResults();
    this.hud.setPaused(false);
    this.hud.setPauseMode(!!on);
    this.hud.setNetPill('');
    this.hud.banner('Battle!', on ? `${this.sim.w.players[this.foe].name} awaits · press F on a troop to possess it` : 'Deploy troops, then press F on one to possess it');
    document.body.classList.add('in-game');
    sfx.startAmbience('battle');
    sfx.listener.enabled = false;
    music.setScene('battle');
    music.setIntensity(1);
    this.lastElixirFull = false;
    this.lastHandKey = '';
    this.lastHeroKills = 0;
    this.wallT = 0; this.frameAcc = 0; this.frameN = 0; this.slowStreak = 0;
    this.active = true;
    if (cfg.tutorial && this.tutorial && !on) this.tutorial.start(); else this.tutorial?.dismiss();
  }

  restart(): void { if (this.cfg) this.start(this.cfg); }

  stop(): void {
    this.active = false;
    this.driver?.destroy();
    this.driver = null;
    this.sim = null;
    this.input.releaseLock();
    document.body.classList.remove('in-game');
    this.vignette.classList.remove('on');
    this.damageFlash.classList.remove('low');
    this.damageFlash.style.opacity = '0';
    sfx.stopAmbience();
    sfx.listener.enabled = false;
    sfx.viewTeam = 0;
    music.setIntensity(0);
    this.hud.hideResults();
    this.hud.setNetPill('');
    this.tutorial?.dismiss();
    this.view.clear();
    this.view.setViewTeam(0);
    this.me = 0; this.foe = 1;
  }

  /** End the match now. Used when the other seat leaves an online duel or the player concedes. */
  forfeit(loser: Team, reason: string): void {
    if (!this.sim || this.sim.w.phase === 'ended') return;
    this.sim.forfeit(loser, reason);
    this.processEvents(this.sim.w.events);
    this.sim.w.events.length = 0;
  }

  /** The local player walks out of an online duel: tell the other side, then finish as a loss. */
  concede(): void {
    if (!this.online || !this.sim) return;
    this.driver?.sendLeave('conceded');
    this.forfeit(this.me, 'You left the battle');
  }

  toast(text: string, kind: 'warn' | 'info' | 'good' = 'info'): void { this.hud.toast(text, kind); }

  sendChat(text: string): void {
    if (!this.driver || !this.sim) return;
    this.driver.sendChat(text);
    this.hud.feed(`<b>You:</b> ${escapeHtml(text)}`, '#ffe27a');
  }

  /** Settings modal closed while playing: resume the mouse capture if we were possessed. */
  onSettingsClosed(): void {
    if (this.active && this.mode !== 'commander' && !this.paused && !this.menuOpen) this.input.requestLock();
  }

  /**
   * Solo: pause the world. Online: the world cannot wait for one player, so the same overlay is a
   * menu that floats over a battle that keeps going.
   */
  setPaused(on: boolean): void {
    if (!this.sim || this.sim.w.phase === 'ended') return;
    if (this.online) { this.menuOpen = on; this.hud.setPaused(on); if (on) this.input.releaseLock(); sfx.play('ui'); return; }
    this.paused = on;
    this.hud.setPaused(on);
    if (on) this.input.releaseLock();
    sfx.play('ui');
  }

  private selectCard(i: number | null, fromPointer = false): void {
    if (!this.sim) return;
    if (i !== null && this.selectedCard === i && !fromPointer) { this.selectedCard = null; return; }
    this.selectedCard = i;
    this.dragging = fromPointer && i !== null;
    if (i !== null) sfx.play('select');
  }

  private ndc(): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: (this.input.mouse.x / Math.max(1, r.width)) * 2 - 1, y: -(this.input.mouse.y / Math.max(1, r.height)) * 2 + 1 };
  }

  /** Adaptive quality: after the intro settles, drop to Low if frames stay slow for a while. */
  private watchPerformance(rawDt: number): void {
    this.wallT += rawDt;
    if (this.view.quality !== 'high' || this.wallT < 6) return;
    this.frameAcc += rawDt; this.frameN++;
    if (this.frameAcc < 2) return;
    const avg = this.frameAcc / this.frameN;
    this.frameAcc = 0; this.frameN = 0;
    this.slowStreak = avg > 0.033 ? this.slowStreak + 1 : 0;
    if (this.slowStreak >= 3) {
      this.view.setQuality('low');
      this.hud.toast('Graphics set to Low to keep the battle smooth (change in Settings)', 'info');
      this.onAutoQuality('low');
    }
  }

  private updateNetPill(link: { direct: boolean; rtt: number } | null): void {
    const n = this.net;
    if (!n || !this.sim || this.sim.w.phase === 'ended') { if (this.netPillText) { this.netPillText = ''; this.hud.setNetPill(''); } return; }
    let text: string, kind: 'ok' | 'warn' | 'bad' = 'ok';
    if (n.waitMs > 350) { text = `Waiting for ${this.sim.w.players[this.foe].name}… ${(n.waitMs / 1000).toFixed(1)}s`; kind = n.waitMs > 3000 ? 'bad' : 'warn'; }
    else if (n.desynced) { text = 'Out of sync'; kind = 'bad'; }
    else if (link) { const rtt = Math.round(link.rtt); text = link.direct ? `Direct · ${rtt ? `${rtt} ms` : '…'}` : `Relayed · ${rtt ? `${rtt} ms` : '…'}`; kind = link.direct ? 'ok' : 'warn'; }
    else text = '';
    if (text !== this.netPillText) { this.netPillText = text; this.hud.setNetPill(text, kind); }
  }

  /** One frame: `dt` in seconds. Called by the main loop while active. */
  frame(dt: number, rawDt: number = dt, link: { direct: boolean; rtt: number } | null = null): void {
    const sim = this.sim;
    if (!sim) return;
    this.watchPerformance(rawDt);
    const w = sim.w;
    const inp = this.input;
    const rig = this.view.rig;
    const me = this.me;
    if (w.phase !== 'ended' && (inp.wasPressed('KeyP') || ((this.paused || this.menuOpen) && inp.wasPressed('Escape')))) this.setPaused(!(this.paused || this.menuOpen));
    let cursor: Vec | null = null;
    let hero = w.hero(me);
    if (!this.paused) {
      this.time += dt;
      // view mode
      const desired: ViewMode = hero && w.phase !== 'ended' ? (this.preferFirst ? 'first' : 'third') : 'commander';
      if (desired !== this.mode) {
        rig.setMode(desired, hero?.facing);
        this.mode = desired;
        if (desired === 'commander') inp.releaseLock();
        sfx.listener.enabled = desired !== 'commander';
      }
      if (inp.wasPressed('KeyV') && hero && w.phase !== 'ended' && !this.menuOpen) { this.preferFirst = !this.preferFirst; this.onViewToggle(this.preferFirst); sfx.play('ui'); }
      // any input skips the intro flyover
      if (rig.inCinematic && w.phase !== 'ended' && (inp.clicked() || inp.wasPressed('Space') || inp.wasPressed('KeyF') || inp.moveAxis().x !== 0 || inp.moveAxis().y !== 0)) rig.stopCinematic();
      // look + cursor
      if (this.mode === 'commander') {
        if (inp.mouseInCanvas || this.dragging) cursor = rig.groundPoint(this.ndc().x, this.ndc().y);
        if (inp.wheel !== 0) rig.zoom = Math.max(0.8, Math.min(1.7, rig.zoom - inp.wheel * 0.08));
      } else if (hero) {
        if (inp.isLocked()) { rig.applyLook(inp.lookDx, inp.lookDy); this.tutorial?.notify('locked'); }
        else if (inp.mouseInCanvas && !this.menuOpen) { const n = this.ndc(); rig.steer(n.x, -n.y, dt); }
        const selected = this.selectedCard !== null ? w.players[me].hand[this.selectedCard] : undefined;
        const reach = selected ? (selected.kind === 'spell' ? 9 : POSSESS.summonRadius) : Math.max(6, hero.def.range + 1.5, hero.def.ability.range ?? 0);
        cursor = rig.aimPoint(hero.pos, reach);
        sfx.listener.x = hero.pos.x; sfx.listener.y = hero.pos.y; sfx.listener.yaw = rig.yaw;
      }
      rig.obstacles = [...w.alive()].filter((e) => e.kind !== 'unit').map((e) => [e.pos.x, e.pos.y, e.radius, e.kind === 'tower' ? (e.towerType === 'king' ? 5.5 : 4.2) : 2.5]);
      const { cmd, acts } = this.menuOpen ? { cmd: idleCommand(), acts: [] as Action[] } : this.handleInput(w, hero, cursor);
      if (this.driver) {
        this.net = this.driver.advance(dt, { cmd, acts });
      } else {
        for (const a of acts) applyAction(w, me, a);
        sim.advance(dt, cmd);
      }
      this.processEvents(w.events);
      w.events.length = 0;
      hero = w.hero(me);
      // hero damage feedback
      if (hero) {
        if (this.lastHeroHp >= 0 && hero.hp < this.lastHeroHp - 0.5) { this.flashT = 0.4; sfx.play('hurt'); rig.addShake(0.25); }
        this.lastHeroHp = hero.hp;
        if (this.moving && !hero.flying && !hero.dashVel) { this.stepT += dt; if (this.stepT > 0.34) { this.stepT = 0; sfx.play('step'); } }
      } else this.lastHeroHp = -1;
      this.flashT = Math.max(0, this.flashT - dt);
      const low = !!hero && hero.hp / hero.maxHp < 0.25;
      this.damageFlash.classList.toggle('low', low);
      if (!low) this.damageFlash.style.opacity = String(Math.min(0.9, this.flashT / 0.4));
      else this.damageFlash.style.opacity = '';
      this.vignette.classList.toggle('on', this.mode !== 'commander');
      this.vignette.classList.toggle('gold', this.mode !== 'commander');
      music.setIntensity(w.phase === 'overtime' ? 3 : w.elixirRate > 1 ? 2 : 1);
      const full = w.players[me].elixir >= 9.99;
      if (full && !this.lastElixirFull) sfx.play('elixirFull');
      this.lastElixirFull = full;
      const handKey = w.players[me].hand.map((c) => c.id).join();
      if (this.lastHandKey && handKey !== this.lastHandKey) sfx.play('cardCycle');
      this.lastHandKey = handKey;
      const hk = w.players[me].stats.heroKills;
      if (hk > this.lastHeroKills) { this.hud.chip(`+${POSSESS.elixirPerKill} Soul Harvest`, '#d97bff'); this.tutorial?.notify('attacked'); }
      this.lastHeroKills = hk;
      if (w.phase === 'ended' && this.endTimer < 0) this.endTimer = 2.2;
      if (this.endTimer > 0) { this.endTimer -= dt; if (this.endTimer <= 0 && !this.resultsShown) this.showResults(); }
      this.hitMarkerT += dt;
      this.updateNetPill(link);
    }
    inp.endFrame();

    const p = w.players[me];
    const selected = this.selectedCard !== null ? p.hand[this.selectedCard] ?? null : null;
    let reticle: { pos: Vec; ok: boolean; radius: number } | null = null;
    if (selected && cursor) {
      const radius = selected.kind === 'spell' ? selected.radius : Math.max(0.8, selected.radius + 0.5 + (selected.kind === 'troop' && selected.count > 3 ? 0.8 : 0));
      reticle = { pos: cursor, ok: canDeploy(w, me, selected, cursor).ok, radius };
    }
    const hover = this.mode === 'commander' && !selected && cursor && p.possessCd <= 0 && !hero && !this.menuOpen ? possessCandidate(w, me, cursor, 1.6) ?? null : null;
    this.view.fx.firstPersonAt = this.mode === 'first' && hero ? hero.pos : null;
    this.view.render(w, {
      mode: this.mode, heroId: p.heroId, hover, selectedCard: selected, reticle, hitMarkerT: this.hitMarkerT, paused: this.paused,
      locked: inp.isLocked(), deployTeam: selected && selected.kind !== 'spell' ? me : null, moving: this.moving,
    }, this.paused ? 0 : dt, this.time);
    this.hud.update(w, { selectedCard: this.selectedCard, mode: hero ? 'possess' : 'command', hero, possessCd: p.possessCd, hoverPossess: hover, firstPerson: this.mode === 'first' }, dt);
    this.canvas.style.cursor = this.mode !== 'commander' ? (inp.isLocked() ? 'none' : 'crosshair') : hover ? 'pointer' : selected ? 'crosshair' : 'default';
  }

  /**
   * Turn this frame's raw input into a hero command plus the discrete actions it asked for.
   * Nothing here touches the world: solo play applies the actions at once, an online duel
   * schedules them for a later tick so both sides apply them together.
   */
  private handleInput(w: World, hero: Unit | undefined, cursor: Vec | null): { cmd: HeroCommand; acts: Action[] } {
    const inp = this.input;
    const rig = this.view.rig;
    const cmd = idleCommand();
    const acts: Action[] = [];
    const me = this.me;
    const p = w.players[me];
    this.moving = false;
    if (w.phase === 'ended') return { cmd, acts };
    for (let i = 0; i < 4; i++) if (inp.wasPressed(`Digit${i + 1}`)) this.selectCard(i);
    if (inp.wasPressed('Escape')) { if (this.selectedCard !== null) this.selectCard(null); else if (!inp.isLocked() && this.mode === 'commander') this.setPaused(true); }
    if (inp.rightClick()) this.selectCard(null);
    const inCanvas = inp.mouseInCanvas || inp.isLocked();
    const wantsDeploy = this.selectedCard !== null && !!cursor && ((inp.clicked() && inCanvas) || (inp.released() && this.dragging && inCanvas));
    if (inp.released()) this.dragging = false;
    if (wantsDeploy && cursor) {
      const card = p.hand[this.selectedCard!];
      const check = card ? canDeploy(w, me, card, cursor) : { ok: false };
      // Validate now for instant feedback; the world validates again when the action lands.
      if (check.ok) { acts.push({ k: 'deploy', h: this.selectedCard!, x: cursor.x, y: cursor.y }); this.selectedCard = null; }
      else if (check.reason) this.hud.toast(check.reason);
    } else if (inp.clicked() && this.selectedCard === null && !hero && cursor && this.mode === 'commander') {
      const cand = possessCandidate(w, me, cursor, 1.6);
      if (cand && p.possessCd <= 0) acts.push({ k: 'possess', id: cand.id });
    }
    if (inp.wasPressed('KeyF') && !hero) {
      const cand = cursor ? possessCandidate(w, me, cursor, POSSESS.possessRange) : undefined;
      const fallback = w.getUnit(p.lastDeployId);
      const target = cand ?? (fallback && fallback.def.possessable ? fallback : undefined);
      if (target) { if (p.possessCd <= 0) acts.push({ k: 'possess', id: target.id }); else this.hud.toast(`Soul returning… ${Math.ceil(p.possessCd)}s`); }
      else this.hud.toast('No troop to possess. Deploy one first.');
    }
    if (hero) {
      const axis = inp.moveAxis();
      const f = rig.forward(), r = rig.right();
      const mv = norm({ x: f.x * -axis.y + r.x * axis.x, y: f.y * -axis.y + r.y * axis.x });
      cmd.move = mv;
      this.moving = mv.x !== 0 || mv.y !== 0;
      cmd.aim = cursor ?? { x: hero.pos.x + f.x * 4, y: hero.pos.y + f.y * 4 };
      cmd.attack = inp.mouseDown && this.selectedCard === null && inCanvas;
      cmd.ability = inp.isDown('Space');
      cmd.dash = inp.wasPressed('ShiftLeft') || inp.wasPressed('ShiftRight');
      cmd.release = inp.wasPressed('KeyE');
    }
    return { cmd, acts };
  }

  private processEvents(events: GameEvent[]): void {
    const rig = this.view.rig;
    const w = this.sim!.w;
    const me = this.me, foe = this.foe;
    const foeName = w.players[foe].name;
    for (const ev of events) {
      sfx.handle(ev);
      switch (ev.type) {
        case 'hit': if (ev.hero && ev.team === me) { this.hitMarkerT = 0; if (ev.pos) this.view.fx.hitSparks(ev.pos.x, 1.0, ev.pos.y); this.tutorial?.notify('attacked'); } break;
        case 'deploy': if (ev.team === me) { this.tutorial?.notify(w.hero(me) ? 'summoned' : 'deployed'); } break;
        case 'death': if (ev.team === foe && ev.pos && w.hero(me) && Math.hypot(ev.pos.x - w.hero(me)!.pos.x, ev.pos.y - w.hero(me)!.pos.y) < 6) this.hud.feed('Enemy troop slain', '#ffd166'); break;
        case 'ranged': {
          const h = w.hero(me);
          if (h && ev.pos && ev.pos.x === h.pos.x && ev.pos.y === h.pos.y) {
            const f = rig.forward();
            const m = this.view.ents.unitModel(h.id);
            const eye = (m?.eyeHeight ?? 1.2) + (m?.hover ?? 0);
            const r = rig.right();
            const fp = this.mode === 'first';
            this.view.fx.muzzleFlash(h.pos.x + f.x * (fp ? 0.6 : 0.2) + r.x * (fp ? 0.32 : 0), eye - (fp ? 0.3 : 0.2), h.pos.y + f.y * (fp ? 0.6 : 0.2) + r.y * (fp ? 0.32 : 0), f.x, f.y);
            rig.addShake(0.08);
          }
          break;
        }
        case 'towerDestroyed':
          rig.addShake(ev.big ? 1.2 : 0.8);
          music.stinger('crown');
          this.hud.feed(ev.team === foe ? `You destroyed ${ev.big ? 'the King Tower' : 'a tower'}` : `${foeName} destroyed your ${ev.big ? 'King Tower' : 'tower'}`, ev.team === foe ? '#ffd166' : '#ff6b6b');
          if (ev.team === foe) this.hud.banner(ev.big ? 'King Tower Destroyed!' : 'Tower Destroyed!', ev.big ? '' : 'Crown taken · new territory unlocked');
          else this.hud.banner(ev.big ? 'Your King has fallen' : 'Your tower fell!', '', '#ff6b6b');
          break;
        case 'towerHit': if (ev.team === me && this.mode === 'commander') rig.addShake(0.08); break;
        case 'kingActivated': this.hud.toast(ev.team === me ? 'Your King Tower awakens' : 'Enemy King Tower awakens'); music.stinger('kingAwake'); break;
        case 'doubleElixir': this.hud.banner('Double Elixir!', 'Elixir now regenerates twice as fast'); music.stinger('doubleElixir'); break;
        case 'overtime': this.hud.banner('OVERTIME', 'Next tower wins · triple elixir', '#ff9f5a'); music.stinger('overtime'); break;
        case 'possess':
          if (ev.team === me) {
            music.stinger('possess'); this.tutorial?.notify('possessed');
            const h = w.hero(me);
            this.hud.banner(`You are the ${h?.def.name ?? 'champion'}`, `Space: ${h?.def.ability.name ?? 'ability'} · Shift: dash · E: return · V: view`);
            this.selectedCard = null;
            if (!this.menuOpen) this.input.requestLock();
          } else if (this.online) {
            const h = w.hero(foe);
            this.hud.feed(`${escapeHtml(foeName)} possesses the ${h?.def.name ?? 'champion'}!`, '#ff6b6b');
            this.hud.toast(`Enemy champion: ${h?.def.name ?? 'unknown'} — watch for the red aura`, 'warn');
          }
          break;
        case 'heroDeath': if (ev.team === me) { rig.addShake(0.6); this.flashT = 0.6; music.stinger('heroDeath'); this.tutorial?.notify('heroDeath'); this.hud.banner('Your soul returns', 'Back to the throne. Possess again soon.', '#bfe6ff'); } else if (this.online) this.hud.feed(`${escapeHtml(foeName)}'s champion has fallen`, '#ffd166'); break;
        case 'release': if (ev.team === me) { this.hud.toast('Returned to the throne', 'info'); this.tutorial?.notify('released'); } else if (this.online) this.hud.feed(`${escapeHtml(foeName)}'s champion returned to its throne`, '#ff9f9f'); break;
        case 'invalid': if (ev.team === me && ev.text) this.hud.toast(ev.text); break;
        case 'spell': if (ev.big) rig.addShake(0.7); break;
        case 'ability': if (ev.team === me) { rig.addShake(0.2); this.tutorial?.notify('ability'); } break;
        case 'dash': if (ev.team === me) { rig.addShake(0.12); rig.kickFov(9); } break;
        case 'lowHp': if (ev.team === me) this.hud.toast('Champion in danger! Press E to retreat to the throne'); break;
        case 'countdown': if (ev.big) rig.addShake(0.2); sfx.play(ev.big ? 'battleStart' : 'countdown'); break;
        case 'streak': if (ev.team === me) { this.hud.streak(ev.text ?? '', '#ff9f5a'); rig.addShake(ev.big ? 0.4 : 0.2); } else this.hud.feed(`Enemy champion: ${ev.text ?? ''}`, '#ff6b6b'); break;
        case 'botPossess': this.hud.feed(`${foeName} possesses the ${ev.text ?? 'champion'}!`, '#ff6b6b'); this.hud.toast(`Enemy champion: ${ev.text ?? 'unknown'} — watch for the red aura`, 'warn'); break;
        case 'botRelease': this.hud.feed(`${foeName}'s champion returned to its throne`, '#ff9f9f'); break;
        case 'end': {
          const winner = ev.team === undefined ? -1 : ev.team;
          this.tutorial?.dismiss();
          this.menuOpen = false;
          this.hud.setPaused(false);
          music.stinger(winner === me ? 'victory' : winner === foe ? 'defeat' : 'crown');
          sfx.play(winner === me ? 'victory' : winner === foe ? 'defeat' : 'fanfare');
          this.hud.banner(winner === me ? 'VICTORY' : winner === foe ? 'DEFEAT' : 'DRAW', ev.text ?? '', winner === foe ? '#ff6b6b' : '');
          this.input.releaseLock();
          const kingOf = winner === me ? foe : me;
          const fallen = [...w.alive()].filter((e) => e.kind === 'tower' && e.team === kingOf);
          const focus = ev.pos ?? (fallen.length ? fallen[0].pos : { x: 9, y: 16 });
          rig.playOutro(focus, 2.5);
          this.onEnd(winner, me);
          break;
        }
        default: break;
      }
    }
  }

  private showResults(): void {
    const w = this.sim?.w;
    if (!w || !w.result) return;
    this.resultsShown = true;
    this.hud.showResults(w, w.result.winner, w.result.reason, { online: this.online });
  }
}

const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
