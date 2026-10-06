import { music } from './audio/music.ts';
import { announcer } from './audio/announcer.ts';
import { sfx } from './audio/sfx.ts';
import { Input } from './engine/input.ts';
import { norm, type Vec } from './engine/math.ts';
import type { Difficulty } from './game/bot.ts';
import { idleCommand, type HeroCommand } from './game/hero.ts';
import { Simulation, seatKey, type MatchMode, type SeatSetup } from './game/sim.ts';
import { other, type GameEvent, type Seat, type Team, type Unit } from './game/types.ts';
import type { World } from './game/world.ts';
import { cardName, t, tSim } from './i18n.ts';
import type { ViewMode } from './render3d/camera3d.ts';
import type { GameView } from './render3d/scene.ts';
import { Hud } from './ui/hud.ts';

export interface OnlineConfig {
  me: Team;
  seat: number;
  /** Called with this frame's command; returns the commands to step with, or null to wait. */
  advance: (dt: number, cmd: HeroCommand) => void;
  onLeave?: () => void;
  concede?: () => void;
  status?: () => { text: string; kind: 'ok' | 'warn' | 'bad' } | null;
}

export interface MatchConfig { mode: MatchMode; difficulty: Difficulty; teams: [SeatSetup[], SeatSetup[]]; seed?: number; me?: Team; mySeat?: number; online?: OnlineConfig }

const $ = (id: string): HTMLElement => { const el = document.getElementById(id); if (!el) throw new Error(`missing #${id}`); return el; };

/** Owns one running match: simulation, 3D view, HUD and player input. */
export class GameScreen {
  active = false;
  preferFirst = true;
  onEnd: (winner: Team | -1, me: Team) => void = () => {};
  onViewToggle: (first: boolean) => void = () => {};
  onAutoQuality: (q: 'high' | 'low') => void = () => {};
  me: Team = 0;
  mySeat = 0;
  private foe: Team = 1;
  private sim: Simulation | null = null;
  private view: GameView;
  private input: Input;
  private canvas: HTMLCanvasElement;
  private hud: Hud;
  private mode: ViewMode = 'commander';
  private paused = false;
  private menuOpen = false;
  private shopOpen = false;
  private bigMap = false;
  private time = 0;
  private endTimer = -1;
  private resultsShown = false;
  private cfg: MatchConfig | null = null;
  private hitMarkerT = 10;
  private lastHeroHp = -1;
  private stepT = 0;
  private flashT = 0;
  private moving = false;
  private frameAcc = 0;
  private frameN = 0;
  private slowStreak = 0;
  private wallT = 0;
  private pendingBuy: string | null = null;
  private vignette: HTMLElement;
  private damageFlash: HTMLElement;
  private lastLevel = 0;
  private tipT = 0;
  private aimRange = 0;

  constructor(view: GameView, canvas: HTMLCanvasElement) {
    this.view = view;
    this.canvas = canvas;
    this.input = new Input(canvas);
    this.hud = new Hud();
    this.hud.onBuy = (id) => { this.pendingBuy = id; };
    this.hud.onAutoBuy = (on) => { const s = this.seat(); if (s) s.autoBuy = on; const h = this.hero(); if (h) h.autoBuy = on; };
    this.hud.onShopToggle = (open) => this.setShop(open);
    this.vignette = $('vignette');
    this.damageFlash = $('damageFlash');
    canvas.addEventListener('pointerdown', () => { if (this.active && this.mode !== 'commander' && !this.input.isLocked() && !this.menuOpen && !this.shopOpen) this.input.requestLock(); });
  }

  get online(): boolean { return !!this.cfg?.online; }
  get world(): World | null { return this.sim?.w ?? null; }
  get simulation(): Simulation | null { return this.sim; }
  seat(): Seat | undefined { return this.sim?.w.players[this.me].seats[this.mySeat]; }
  hero(): Unit | undefined { const s = this.seat(); return s && s.heroId >= 0 ? this.sim?.w.getUnit(s.heroId) : undefined; }

  start(cfg: MatchConfig): void {
    this.cfg = cfg;
    this.me = cfg.me ?? 0; this.mySeat = cfg.mySeat ?? 0;
    this.foe = other(this.me);
    this.sim = new Simulation({ mode: cfg.mode, difficulty: cfg.difficulty, seed: cfg.seed ?? (Date.now() % 100000), teams: cfg.teams });
    this.view.setViewTeam(this.me);
    sfx.viewTeam = this.me;
    this.paused = false; this.menuOpen = false; this.shopOpen = false; this.bigMap = false; this.endTimer = -1; this.resultsShown = false; this.time = 0;
    this.hitMarkerT = 10; this.lastHeroHp = -1; this.flashT = 0; this.mode = 'commander'; this.pendingBuy = null; this.lastLevel = 1; this.tipT = 0;
    this.view.clear();
    this.view.rig.resetToCommander();
    this.view.rig.playIntro(3.0);
    this.hud.reset(this.sim.w, this.me);
    this.hud.hideResults();
    this.hud.setPaused(false);
    this.hud.setPauseMode(this.online);
    this.hud.setNetPill('');
    const h = this.hero();
    this.hud.banner(h ? cardName(h.def) : 'Kingsroad', t('hud.tipStart'));
    this.hud.hint(t('hud.controls'));
    setTimeout(() => { if (this.active && this.time < 40) this.hud.hint(''); }, 25000);
    document.body.classList.add('in-game');
    sfx.startAmbience('battle');
    sfx.listener.enabled = false;
    music.setScene('battle');
    music.setIntensity(1);
    this.wallT = 0; this.frameAcc = 0; this.frameN = 0; this.slowStreak = 0;
    this.active = true;
  }

  restart(): void { if (this.cfg) this.start({ ...this.cfg, seed: Date.now() % 100000 }); }

  stop(): void {
    this.active = false;
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
    this.view.clear();
    this.view.setViewTeam(0);
    this.me = 0; this.foe = 1;
  }

  forfeit(loser: Team, reason: string): void {
    if (!this.sim || this.sim.w.phase === 'ended') return;
    this.sim.forfeit(loser, reason);
    this.processEvents(this.sim.w.events);
    this.sim.w.events.length = 0;
  }

  /** Surrender from the pause menu. */
  surrender(): void { if (this.cfg?.online?.concede) this.cfg.online.concede(); this.forfeit(this.me, '@result.surrender'); }

  toast(text: string, kind: 'warn' | 'info' | 'good' = 'info'): void { this.hud.toast(text, kind); }

  onSettingsClosed(): void { if (this.active && this.mode !== 'commander' && !this.paused && !this.menuOpen && !this.shopOpen) this.input.requestLock(); }

  setPaused(on: boolean): void {
    if (!this.sim || this.sim.w.phase === 'ended') return;
    if (this.online) { this.menuOpen = on; this.hud.setPaused(on); if (on) this.input.releaseLock(); sfx.play('ui'); return; }
    this.paused = on;
    this.hud.setPaused(on);
    if (on) this.input.releaseLock();
    sfx.play('ui');
  }

  private setShop(open: boolean): void {
    this.shopOpen = open;
    if (open) this.input.releaseLock(); else if (this.mode !== 'commander' && !this.menuOpen) this.input.requestLock();
    sfx.play('ui');
  }

  private ndc(): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: (this.input.mouse.x / Math.max(1, r.width)) * 2 - 1, y: -(this.input.mouse.y / Math.max(1, r.height)) * 2 + 1 };
  }

  private watchPerformance(rawDt: number): void {
    this.wallT += rawDt;
    if (this.view.quality !== 'high' || this.wallT < 6) return;
    this.frameAcc += rawDt; this.frameN++;
    if (this.frameAcc < 2) return;
    const avg = this.frameAcc / this.frameN;
    this.frameAcc = 0; this.frameN = 0;
    this.slowStreak = avg > 0.04 ? this.slowStreak + 1 : 0;
    if (this.slowStreak >= 3) { this.view.setQuality('low'); this.hud.toast('Graphics set to Low for a smoother frame rate', 'info'); this.onAutoQuality('low'); }
  }

  /** One frame: `dt` in seconds. Called by the main loop while active. */
  frame(dt: number, rawDt: number = dt): void {
    const sim = this.sim;
    if (!sim) return;
    this.watchPerformance(rawDt);
    const w = sim.w;
    const inp = this.input;
    const rig = this.view.rig;
    if (w.phase !== 'ended' && (inp.wasPressed('KeyP') || inp.wasPressed('Escape'))) {
      if (this.shopOpen) this.setShop(false);
      else if (this.bigMap) this.bigMap = false;
      else this.setPaused(!(this.paused || this.menuOpen));
    }
    let cursor: Vec | null = null;
    let hero = this.hero();
    if (!this.paused) {
      this.time += dt;
      const desired: ViewMode = hero && w.phase !== 'ended' ? (this.preferFirst ? 'first' : 'third') : 'commander';
      if (desired !== this.mode) {
        rig.setMode(desired, hero?.facing);
        this.mode = desired;
        if (desired === 'commander') inp.releaseLock();
        sfx.listener.enabled = desired !== 'commander';
      }
      if (inp.wasPressed('KeyV') && hero && w.phase !== 'ended' && !this.menuOpen) { this.preferFirst = !this.preferFirst; this.onViewToggle(this.preferFirst); sfx.play('ui'); }
      if (inp.wasPressed('KeyI') && hero && w.phase !== 'ended') this.setShop(!this.shopOpen);
      if (inp.wasPressed('KeyM') && w.phase !== 'ended') this.bigMap = !this.bigMap;
      if (rig.inCinematic && w.phase !== 'ended' && (inp.clicked() || inp.moveAxis().x !== 0 || inp.moveAxis().y !== 0)) rig.stopCinematic();
      if (this.mode === 'commander') {
        // dead: spectate the team from above (follow the closest living ally)
        const ally = [...w.heroes(this.me)][0];
        if (ally) rig.followCommander(ally.pos);
        if (inp.wheel !== 0) rig.zoom = Math.max(0.8, Math.min(1.7, rig.zoom - inp.wheel * 0.08));
      } else if (hero) {
        if (inp.isLocked()) rig.applyLook(inp.lookDx, inp.lookDy);
        else if (inp.mouseInCanvas && inp.hasMouse && !this.menuOpen && !this.shopOpen) { const n = this.ndc(); rig.steer(n.x, -n.y, dt); }
        const held = this.heldSkill();
        this.aimRange = held >= 0 ? (hero.def.skills[held].range ?? hero.def.skills[held].radius ?? 0) : 0;
        const reach = Math.max(7, hero.def.range + 2, ...hero.def.skills.map((s) => s.range ?? 0));
        cursor = rig.aimPoint(hero.pos, reach);
        sfx.listener.x = hero.pos.x; sfx.listener.y = hero.pos.y; sfx.listener.yaw = rig.yaw;
      }
      rig.obstacles = [...w.alive()].filter((e) => e.kind === 'tower').map((e) => [e.pos.x, e.pos.y, e.radius, e.tier === 'crystal' ? 5.5 : 4.2]);
      const cmd = this.menuOpen || this.shopOpen ? this.quietCommand(hero) : this.handleInput(w, hero, cursor);
      if (this.pendingBuy) { cmd.buy = this.pendingBuy; this.pendingBuy = null; }
      if (this.cfg?.online) {
        this.cfg.online.advance(dt, cmd); // the lockstep driver steps the simulation itself
        const st = this.cfg.online.status?.(); if (st) this.hud.setNetPill(st.text, st.kind);
      } else {
        const map = new Map<string, HeroCommand>([[seatKey(this.me, this.mySeat), cmd]]);
        sim.advance(dt, map);
      }
      this.processEvents(w.events);
      w.events.length = 0;
      hero = this.hero();
      if (hero) {
        if (this.lastHeroHp >= 0 && hero.hp < this.lastHeroHp - 0.5) { this.flashT = 0.4; sfx.play('hurt'); rig.addShake(0.2); }
        this.lastHeroHp = hero.hp;
        if (this.moving && !hero.dashVel) { this.stepT += dt; if (this.stepT > 0.34) { this.stepT = 0; sfx.play('step'); } }
        if (hero.level > this.lastLevel) { this.lastLevel = hero.level; this.hud.toast(t('toast.levelup', { l: hero.level }), 'good'); }
      } else this.lastHeroHp = -1;
      this.flashT = Math.max(0, this.flashT - dt);
      const low = !!hero && hero.hp / hero.maxHp < 0.25;
      if (!low) this.damageFlash.style.opacity = String(Math.min(0.9, this.flashT / 0.4)); else this.damageFlash.style.opacity = '';
      this.vignette.classList.toggle('on', this.mode !== 'commander');
      this.vignette.classList.toggle('gold', this.mode !== 'commander');
      const fighting = hero ? [...w.heroes(this.foe)].some((e) => Math.hypot(e.pos.x - hero!.pos.x, e.pos.y - hero!.pos.y) < 12) : false;
      music.setIntensity(w.time > 600 ? 3 : fighting ? 2 : 1);
      this.tipT += dt;
      if (this.tipT > 20 && hero && hero.hp / hero.maxHp < 0.35 && !hero.recallT) { this.tipT = 0; this.hud.hint(t('hud.tipRecall')); setTimeout(() => this.hud.hint(''), 4000); }
      if (w.phase === 'ended' && this.endTimer < 0) this.endTimer = 2.4;
      if (this.endTimer > 0) { this.endTimer -= dt; if (this.endTimer <= 0 && !this.resultsShown) this.showResults(); }
      this.hitMarkerT += dt;
    }
    inp.endFrame();
    const seat = this.seat();
    this.view.fx.firstPersonAt = this.mode === 'first' && hero ? hero.pos : null;
    this.view.render(w, {
      mode: this.mode, heroId: hero?.id ?? -1, hover: null, selectedCard: null, reticle: null, hitMarkerT: this.hitMarkerT, paused: this.paused,
      locked: inp.isLocked(), deployTeam: null, moving: this.moving, bigMap: this.bigMap, aim: cursor, aimRange: this.aimRange,
    }, this.paused ? 0 : dt, this.time);
    this.hud.update(w, { me: this.me, hero, seat, mode: this.mode, locked: inp.isLocked(), scoreboard: inp.isDown('Tab') || (w.phase === 'ended' && !this.resultsShown), shop: this.shopOpen, online: this.online }, dt);
    this.canvas.style.cursor = this.mode !== 'commander' ? (inp.isLocked() ? 'none' : 'crosshair') : 'default';
  }

  private heldSkill(): number {
    const inp = this.input;
    if (inp.isDown('Digit1') || inp.isDown('KeyQ')) return 0;
    if (inp.isDown('Digit2') || inp.isDown('KeyE')) return 1;
    if (inp.isDown('Digit3') || inp.isDown('KeyR')) return 2;
    return -1;
  }

  /** Menus open: keep the hero still but let the sim run. */
  private quietCommand(hero: Unit | undefined): HeroCommand {
    const cmd = idleCommand();
    if (hero) cmd.aim = { x: hero.pos.x + Math.cos(hero.facing) * 4, y: hero.pos.y + Math.sin(hero.facing) * 4 };
    this.moving = false;
    return cmd;
  }

  private handleInput(w: World, hero: Unit | undefined, cursor: Vec | null): HeroCommand {
    const inp = this.input;
    const rig = this.view.rig;
    const cmd = idleCommand();
    this.moving = false;
    if (w.phase === 'ended' || !hero) return cmd;
    const axis = inp.moveAxis();
    const f = rig.forward(), r = rig.right();
    // W/S along the view, A/D strafe. (W is movement, so skills use 1/2/3 or Q/E/R.)
    const mv = norm({ x: f.x * -axis.y + r.x * axis.x, y: f.y * -axis.y + r.y * axis.x });
    cmd.move = mv;
    this.moving = mv.x !== 0 || mv.y !== 0;
    cmd.aim = cursor ?? { x: hero.pos.x + f.x * 4, y: hero.pos.y + f.y * 4 };
    const inCanvas = inp.mouseInCanvas || inp.isLocked();
    cmd.attack = inp.mouseDown && inCanvas;
    if (inp.wasPressed('Digit1') || inp.wasPressed('KeyQ')) cmd.skill = 0;
    else if (inp.wasPressed('Digit2') || inp.wasPressed('KeyE')) cmd.skill = 1;
    else if (inp.wasPressed('Digit3') || inp.wasPressed('KeyR')) cmd.skill = 2;
    cmd.dash = inp.wasPressed('Space') || inp.wasPressed('ShiftLeft');
    cmd.flash = inp.wasPressed('KeyF');
    cmd.recall = inp.wasPressed('KeyB');
    return cmd;
  }

  private processEvents(events: GameEvent[]): void {
    const rig = this.view.rig;
    const w = this.sim!.w;
    const me = this.me, foe = this.foe;
    const myHero = this.hero();
    const teamName = (tm: number | undefined) => tm === me ? t('team.blue') : t('team.red');
    for (const ev of events) {
      sfx.handle(ev);
      switch (ev.type) {
        case 'hit': if (ev.hero && ev.team === me && myHero && ev.pos) { if (Math.hypot(ev.pos.x - myHero.pos.x, ev.pos.y - myHero.pos.y) < Math.max(3, myHero.def.range + 2)) { this.hitMarkerT = 0; this.view.fx.hitSparks(ev.pos.x, 1.0, ev.pos.y); } } break;
        case 'ranged': {
          if (myHero && ev.pos && ev.pos.x === myHero.pos.x && ev.pos.y === myHero.pos.y) {
            const f = rig.forward(); const m = this.view.ents.unitModel(myHero.id); const eye = (m?.eyeHeight ?? 1.2) + (m?.hover ?? 0); const r = rig.right(); const fp = this.mode === 'first';
            this.view.fx.muzzleFlash(myHero.pos.x + f.x * (fp ? 0.6 : 0.2) + r.x * (fp ? 0.32 : 0), eye - (fp ? 0.3 : 0.2), myHero.pos.y + f.y * (fp ? 0.6 : 0.2) + r.y * (fp ? 0.32 : 0), f.x, f.y);
            rig.addShake(0.06);
          }
          break;
        }
        case 'towerDestroyed': {
          rig.addShake(ev.big ? 1.0 : 0.5);
          if (ev.text !== 'crystal') announcer.say(ev.team === me ? 'tower_mine' : 'tower_foe');
          music.stinger('crown');
          const tier = t(`tier.${ev.text ?? 'outer'}`);
          this.hud.feed(ev.text === 'crystal' ? t('feed.crystal', { team: teamName(ev.team === me ? foe : me) }) : t('feed.tower', { team: teamName(ev.team === me ? foe : me), tier }), ev.team === foe ? '#ffd166' : '#ff6b6b');
          if (ev.big) this.hud.banner(ev.team === foe ? t('feed.tower', { team: t('team.blue'), tier }) : t('feed.tower', { team: t('team.red'), tier }), '', ev.team === foe ? '' : '#ff6b6b');
          break;
        }
        case 'kill': {
          const mine = ev.killerTeam === me;
          this.hud.feed(t('feed.kill', { killer: `<b>${escapeHtml(tSim(ev.killer ?? ''))}</b>`, victim: `<b>${escapeHtml(tSim(ev.victim ?? ''))}</b>` }), mine ? '#ffd166' : '#ff6b6b');
          break;
        }
        case 'heroDeath': if (ev.team === me) { rig.addShake(0.6); this.flashT = 0.6; music.stinger('heroDeath'); } break;
        case 'respawn': if (ev.seat && !ev.seat.isBot && ev.team === me) { this.hud.banner(cardName(this.hero()?.def ?? { name: '' } as never), ''); } break;
        case 'firstBlood': case 'ace': this.hud.streak(ev.text ?? '', ev.team === me ? '#ffd166' : '#ff6b6b'); rig.addShake(0.3); announcer.say(ev.text ?? ''); break;
        case 'streak': announcer.say(ev.text ?? ''); if (ev.team === me) { this.hud.streak(ev.text ?? '', '#ff9f5a'); rig.addShake(ev.big ? 0.4 : 0.2); } else this.hud.feed(`${escapeHtml(tSim(ev.killer ?? ''))}: ${tSim(ev.text ?? '')}`, '#ff6b6b'); break;
        case 'objective': announcer.say(ev.text ?? ''); if (ev.big) { this.hud.banner(ev.text ?? '', '', ev.team === me ? '' : '#ff6b6b'); music.stinger('kingAwake'); this.hud.feed(t('feed.objective', { team: teamName(ev.team), obj: tSim(ev.text ?? '') }), ev.team === me ? '#ffd166' : '#ff6b6b'); } else this.hud.toast(ev.text ?? '', 'info'); break;
        case 'buff': if (ev.team === me) this.hud.toast(ev.text ?? '', 'good'); break;
        case 'crown': if (ev.hero && ev.team === me) { this.hud.toast('@toast.crowned', 'good'); rig.kickFov(6); } break;
        case 'invalid': if (ev.team === me && ev.text) this.hud.toast(tSim(ev.text)); break;
        case 'spell': if (ev.text === 'meteor') rig.addShake(0.5); break;
        case 'ability': if (ev.team === me && myHero && ev.pos && ev.pos.x === myHero.pos.x) rig.addShake(0.15); break;
        case 'dash': if (ev.team === me && ev.hero) { rig.addShake(0.12); rig.kickFov(9); } break;
        case 'flash': if (ev.team === me && ev.hero) rig.kickFov(14); break;
        case 'recall': if (ev.team === me && ev.hero && ev.big) rig.kickFov(10); break;
        case 'lowHp': if (ev.team === me) this.hud.toast(t('hud.tipRecall')); break;
        case 'countdown': if (ev.big) rig.addShake(0.2); this.hud.countdown(ev.text ?? ''); sfx.play(ev.big ? 'battleStart' : 'countdown'); break;
        case 'wave': if (ev.text === '1') this.hud.hint(''); break;
        case 'end': {
          const winner = ev.team === undefined ? -1 : (ev.team as Team);
          this.menuOpen = false; this.shopOpen = false;
          this.hud.setPaused(false);
          music.stinger(winner === me ? 'victory' : winner === foe ? 'defeat' : 'crown');
          announcer.say(winner === me ? 'victory' : 'defeat');
          sfx.play(winner === me ? 'victory' : winner === foe ? 'defeat' : 'fanfare');
          this.hud.banner(winner === me ? t('results.victory') : winner === foe ? t('results.defeat') : t('results.draw'), tSim(ev.text ?? ''), winner === foe ? '#ff6b6b' : '');
          this.input.releaseLock();
          const focus = w.crystalPos(winner === me ? foe : me);
          rig.playOutro(focus, 3);
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
    this.hud.showResults(w, this.me, w.result.winner, w.result.reason);
  }
}

const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
