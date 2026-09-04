import { music } from './audio/music.ts';
import { sfx } from './audio/sfx.ts';
import { Input } from './engine/input.ts';
import { norm, type Vec } from './engine/math.ts';
import type { Difficulty } from './game/bot.ts';
import { POSSESS } from './game/constants.ts';
import { canDeploy, deployCard } from './game/deploy.ts';
import { idleCommand, possess, possessCandidate, type HeroCommand } from './game/hero.ts';
import { Simulation } from './game/sim.ts';
import type { CardDef, GameEvent, Team, Unit } from './game/types.ts';
import type { World } from './game/world.ts';
import type { ViewMode } from './render3d/camera3d.ts';
import type { GameView } from './render3d/scene.ts';
import { Hud } from './ui/hud.ts';
import type { Tutorial } from './ui/tutorial.ts';

export interface MatchConfig { deck: CardDef[]; botDeck: CardDef[]; difficulty: Difficulty; seed?: number; tutorial?: boolean }

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

/** Owns one running match: simulation, 3D view, HUD and player input. */
export class GameScreen {
  active = false;
  preferFirst = true;
  onEnd: (winner: Team | -1) => void = () => {};
  onViewToggle: (first: boolean) => void = () => {};
  tutorial: Tutorial | null = null;
  private lastHeroKills = 0;
  private sim: Simulation | null = null;
  private view: GameView;
  private input: Input;
  private canvas: HTMLCanvasElement;
  private hud: Hud;
  private mode: ViewMode = 'commander';
  private selectedCard: number | null = null;
  private dragging = false;
  private paused = false;
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
    canvas.addEventListener('pointerdown', () => { if (this.active && this.mode !== 'commander' && !this.input.isLocked() && this.selectedCard === null) this.input.requestLock(); });
  }

  start(cfg: MatchConfig): void {
    this.cfg = cfg;
    this.sim = new Simulation({ playerDeck: cfg.deck, botDeck: cfg.botDeck, difficulty: cfg.difficulty, seed: cfg.seed ?? (Date.now() % 100000) });
    this.selectedCard = null; this.dragging = false; this.paused = false; this.endTimer = -1; this.resultsShown = false; this.time = 0;
    this.hitMarkerT = 10; this.lastHeroHp = -1; this.flashT = 0; this.mode = 'commander';
    this.view.clear();
    this.view.rig.resetToCommander();
    this.view.rig.playIntro(3.2);
    this.hud.reset(this.sim.w);
    this.hud.hideResults();
    this.hud.setPaused(false);
    this.hud.banner('Battle!', 'Deploy troops, then press F on one to possess it');
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
    if (cfg.tutorial && this.tutorial) this.tutorial.start(); else this.tutorial?.dismiss();
  }

  restart(): void { if (this.cfg) this.start(this.cfg); }

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
    music.setIntensity(0);
    this.hud.hideResults();
    this.tutorial?.dismiss();
    this.view.clear();
  }

  /** Settings modal closed while playing: resume the mouse capture if we were possessed. */
  onSettingsClosed(): void {
    if (this.active && this.mode !== 'commander' && !this.paused) this.input.requestLock();
  }

  setPaused(on: boolean): void {
    if (!this.sim || this.sim.w.phase === 'ended') return;
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

  /** One frame: `dt` in seconds. Called by the main loop while active. */
  frame(dt: number, rawDt: number = dt): void {
    const sim = this.sim;
    if (!sim) return;
    this.watchPerformance(rawDt);
    const w = sim.w;
    const inp = this.input;
    const rig = this.view.rig;
    if (w.phase !== 'ended' && (inp.wasPressed('KeyP') || (this.paused && inp.wasPressed('Escape')))) this.setPaused(!this.paused);
    let cursor: Vec | null = null;
    let hero = w.hero(0);
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
      if (inp.wasPressed('KeyV') && hero && w.phase !== 'ended') { this.preferFirst = !this.preferFirst; this.onViewToggle(this.preferFirst); sfx.play('ui'); }
      // any input skips the intro flyover
      if (rig.inCinematic && w.phase !== 'ended' && (inp.clicked() || inp.wasPressed('Space') || inp.wasPressed('KeyF') || inp.moveAxis().x !== 0 || inp.moveAxis().y !== 0)) rig.stopCinematic();
      // look + cursor
      if (this.mode === 'commander') {
        if (inp.mouseInCanvas || this.dragging) cursor = rig.groundPoint(this.ndc().x, this.ndc().y);
        if (inp.wheel !== 0) rig.zoom = Math.max(0.8, Math.min(1.7, rig.zoom - inp.wheel * 0.08));
      } else if (hero) {
        if (inp.isLocked()) { rig.applyLook(inp.lookDx, inp.lookDy); this.tutorial?.notify('locked'); }
        else if (inp.mouseInCanvas) { const n = this.ndc(); rig.steer(n.x, -n.y, dt); }
        const selected = this.selectedCard !== null ? w.players[0].hand[this.selectedCard] : undefined;
        const reach = selected ? (selected.kind === 'spell' ? 9 : POSSESS.summonRadius) : Math.max(6, hero.def.range + 1.5, hero.def.ability.range ?? 0);
        cursor = rig.aimPoint(hero.pos, reach);
        sfx.listener.x = hero.pos.x; sfx.listener.y = hero.pos.y; sfx.listener.yaw = rig.yaw;
      }
      rig.obstacles = [...w.alive()].filter((e) => e.kind !== 'unit').map((e) => [e.pos.x, e.pos.y, e.radius, e.kind === 'tower' ? (e.towerType === 'king' ? 5.5 : 4.2) : 2.5]);
      const cmd = this.handleInput(w, hero, cursor, dt);
      sim.advance(dt, cmd);
      this.processEvents(w.events);
      w.events.length = 0;
      hero = w.hero(0);
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
      const full = w.players[0].elixir >= 9.99;
      if (full && !this.lastElixirFull) sfx.play('elixirFull');
      this.lastElixirFull = full;
      const handKey = w.players[0].hand.map((c) => c.id).join();
      if (this.lastHandKey && handKey !== this.lastHandKey) sfx.play('cardCycle');
      this.lastHandKey = handKey;
      const hk = w.players[0].stats.heroKills;
      if (hk > this.lastHeroKills) { this.hud.chip(`+${POSSESS.elixirPerKill} Soul Harvest`, '#d97bff'); this.tutorial?.notify('attacked'); }
      this.lastHeroKills = hk;
      if (w.phase === 'ended' && this.endTimer < 0) this.endTimer = 2.2;
      if (this.endTimer > 0) { this.endTimer -= dt; if (this.endTimer <= 0 && !this.resultsShown) this.showResults(); }
      this.hitMarkerT += dt;
    }
    inp.endFrame();

    const p = w.players[0];
    const selected = this.selectedCard !== null ? p.hand[this.selectedCard] ?? null : null;
    let reticle: { pos: Vec; ok: boolean; radius: number } | null = null;
    if (selected && cursor) {
      const radius = selected.kind === 'spell' ? selected.radius : Math.max(0.8, selected.radius + 0.5 + (selected.kind === 'troop' && selected.count > 3 ? 0.8 : 0));
      reticle = { pos: cursor, ok: canDeploy(w, 0, selected, cursor).ok, radius };
    }
    const hover = this.mode === 'commander' && !selected && cursor && p.possessCd <= 0 && !hero ? possessCandidate(w, 0, cursor, 1.6) ?? null : null;
    this.view.fx.firstPersonAt = this.mode === 'first' && hero ? hero.pos : null;
    this.view.render(w, {
      mode: this.mode, heroId: p.heroId, hover, selectedCard: selected, reticle, hitMarkerT: this.hitMarkerT, paused: this.paused,
      locked: inp.isLocked(), deployTeam: selected && selected.kind !== 'spell' ? 0 : null, moving: this.moving,
    }, this.paused ? 0 : dt, this.time);
    this.hud.update(w, { selectedCard: this.selectedCard, mode: hero ? 'possess' : 'command', hero, possessCd: p.possessCd, hoverPossess: hover, firstPerson: this.mode === 'first' }, dt);
    this.canvas.style.cursor = this.mode !== 'commander' ? (inp.isLocked() ? 'none' : 'crosshair') : hover ? 'pointer' : selected ? 'crosshair' : 'default';
  }

  private handleInput(w: World, hero: Unit | undefined, cursor: Vec | null, dt: number): HeroCommand {
    const inp = this.input;
    const rig = this.view.rig;
    const cmd = idleCommand();
    const p = w.players[0];
    this.moving = false;
    if (w.phase === 'ended') return cmd;
    for (let i = 0; i < 4; i++) if (inp.wasPressed(`Digit${i + 1}`)) this.selectCard(i);
    if (inp.wasPressed('Escape')) { if (this.selectedCard !== null) this.selectCard(null); else if (!inp.isLocked() && this.mode === 'commander') this.setPaused(true); }
    if (inp.rightClick()) this.selectCard(null);
    const inCanvas = inp.mouseInCanvas || inp.isLocked();
    const wantsDeploy = this.selectedCard !== null && !!cursor && ((inp.clicked() && inCanvas) || (inp.released() && this.dragging && inCanvas));
    if (inp.released()) this.dragging = false;
    if (wantsDeploy && cursor) {
      if (deployCard(w, 0, this.selectedCard!, cursor)) this.selectedCard = null;
    } else if (inp.clicked() && this.selectedCard === null && !hero && cursor && this.mode === 'commander') {
      const cand = possessCandidate(w, 0, cursor, 1.6);
      if (cand && possess(w, 0, cand.id)) inp.requestLock();
    }
    if (inp.wasPressed('KeyF') && !hero) {
      const cand = cursor ? possessCandidate(w, 0, cursor, POSSESS.possessRange) : undefined;
      const fallback = w.getUnit(p.lastDeployId);
      const target = cand ?? (fallback && fallback.def.possessable ? fallback : undefined);
      if (target) { if (possess(w, 0, target.id)) inp.requestLock(); else if (p.possessCd > 0) this.hud.toast(`Soul returning… ${Math.ceil(p.possessCd)}s`); }
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
    void dt;
    return cmd;
  }

  private processEvents(events: GameEvent[]): void {
    const rig = this.view.rig;
    const w = this.sim!.w;
    for (const ev of events) {
      sfx.handle(ev);
      switch (ev.type) {
        case 'hit': if (ev.hero && ev.team === 0) { this.hitMarkerT = 0; if (ev.pos) this.view.fx.hitSparks(ev.pos.x, 1.0, ev.pos.y); this.tutorial?.notify('attacked'); } break;
        case 'deploy': if (ev.team === 0) { this.tutorial?.notify(w.hero(0) ? 'summoned' : 'deployed'); } break;
        case 'death': if (ev.team === 1 && ev.pos && w.hero(0) && Math.hypot(ev.pos.x - w.hero(0)!.pos.x, ev.pos.y - w.hero(0)!.pos.y) < 6) this.hud.feed('Enemy troop slain', '#ffd166'); break;
        case 'ranged': {
          const h = w.hero(0);
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
          this.hud.feed(ev.team === 1 ? `You destroyed ${ev.big ? 'the King Tower' : 'a tower'}` : `${w.players[1].name} destroyed your ${ev.big ? 'King Tower' : 'tower'}`, ev.team === 1 ? '#ffd166' : '#ff6b6b');
          if (ev.team === 1) this.hud.banner(ev.big ? 'King Tower Destroyed!' : 'Tower Destroyed!', ev.big ? '' : 'Crown taken · new territory unlocked');
          else this.hud.banner(ev.big ? 'Your King has fallen' : 'Your tower fell!', '', '#ff6b6b');
          break;
        case 'towerHit': if (ev.team === 0 && this.mode === 'commander') rig.addShake(0.08); break;
        case 'kingActivated': this.hud.toast(ev.team === 0 ? 'Your King Tower awakens' : 'Enemy King Tower awakens'); music.stinger('kingAwake'); break;
        case 'doubleElixir': this.hud.banner('Double Elixir!', 'Elixir now regenerates twice as fast'); music.stinger('doubleElixir'); break;
        case 'overtime': this.hud.banner('OVERTIME', 'Next tower wins · triple elixir', '#ff9f5a'); music.stinger('overtime'); break;
        case 'possess': if (ev.team === 0) { music.stinger('possess'); this.tutorial?.notify('possessed'); const h = w.hero(0); this.hud.banner(`You are the ${h?.def.name ?? 'champion'}`, `Space: ${h?.def.ability.name ?? 'ability'} · Shift: dash · E: return · V: view`); this.selectedCard = null; } break;
        case 'heroDeath': if (ev.team === 0) { rig.addShake(0.6); this.flashT = 0.6; music.stinger('heroDeath'); this.tutorial?.notify('heroDeath'); this.hud.banner('Your soul returns', 'Back to the throne. Possess again soon.', '#bfe6ff'); } break;
        case 'release': if (ev.team === 0) { this.hud.toast('Returned to the throne', 'info'); this.tutorial?.notify('released'); } break;
        case 'invalid': if (ev.team === 0 && ev.text) this.hud.toast(ev.text); break;
        case 'spell': if (ev.big) rig.addShake(0.7); break;
        case 'ability': if (ev.team === 0) { rig.addShake(0.2); this.tutorial?.notify('ability'); } break;
        case 'dash': if (ev.team === 0) { rig.addShake(0.12); rig.kickFov(9); } break;
        case 'lowHp': if (ev.team === 0) this.hud.toast('Champion in danger! Press E to retreat to the throne'); break;
        case 'countdown': if (ev.big) rig.addShake(0.2); sfx.play(ev.big ? 'battleStart' : 'countdown'); break;
        case 'streak': if (ev.team === 0) { this.hud.streak(ev.text ?? '', '#ff9f5a'); rig.addShake(ev.big ? 0.4 : 0.2); } else this.hud.feed(`Enemy champion: ${ev.text ?? ''}`, '#ff6b6b'); break;
        case 'botPossess': this.hud.feed(`${w.players[1].name} possesses the ${ev.text ?? 'champion'}!`, '#ff6b6b'); this.hud.toast(`Enemy champion: ${ev.text ?? 'unknown'} — watch for the red aura`, 'warn'); break;
        case 'botRelease': this.hud.feed(`${w.players[1].name}'s champion returned to its throne`, '#ff9f9f'); break;
        case 'end': {
          const winner = ev.team === undefined ? -1 : ev.team;
          this.tutorial?.dismiss();
          music.stinger(winner === 0 ? 'victory' : winner === 1 ? 'defeat' : 'crown');
          sfx.play(winner === 0 ? 'victory' : winner === 1 ? 'defeat' : 'fanfare');
          this.hud.banner(winner === 0 ? 'VICTORY' : winner === 1 ? 'DEFEAT' : 'DRAW', ev.text ?? '', winner === 1 ? '#ff6b6b' : '');
          this.input.releaseLock();
          const kingOf = winner === 0 ? 1 : 0;
          const fallen = [...w.alive()].filter((e) => e.kind === 'tower' && e.team === kingOf);
          const focus = ev.pos ?? (fallen.length ? fallen[0].pos : { x: 9, y: 16 });
          rig.playOutro(focus, 2.5);
          this.onEnd(winner);
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
    this.hud.showResults(w, w.result.winner, w.result.reason);
  }
}
