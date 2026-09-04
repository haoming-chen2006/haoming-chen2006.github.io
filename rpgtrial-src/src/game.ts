// Orchestrator: owns sim, render, ui, audio; runs the loop. (Lead-owned.)
import * as THREE from 'three';
import { World } from './sim/world.ts';
import { emptyIntent, type PlayerIntent, type ClassId } from './sim/types.ts';
import { Input } from './core/input.ts';
import { GameLoop } from './core/loop.ts';
import { bus } from './core/events.ts';
import { ThirdPersonCamera } from './render/camera.ts';
import { Renderer } from './render/renderer.ts';
import { WorldView } from './render/world.ts';
import { CharacterView } from './render/characters.ts';
import { detectQuality, QUALITY, type QualityTier } from './render/quality.ts';
import { LANDMARKS, LAKE, LIGHTS } from './content/level.ts';
import { terrainHeight } from './sim/terrain.ts';
import { createUI, type UI } from './ui/index.ts';
import { AudioSystem } from './audio/audio.ts';
import { VFX } from './render/vfx.ts';
import { Particles, type EmitterKind } from './render/particles.ts';
import { PropsView } from './render/props.ts';
import { CryptView } from './render/crypt.ts';
import { startPrologue, type Prologue } from './content/prologue.ts';

export type GameState = 'menu' | 'playing' | 'ended';
const LIGHT_KIND: Record<string, EmitterKind> = { fire: 'fire', torch: 'torch', candle: 'candle', magic: 'magicBrazier' };

export class Game {
  scene = new THREE.Scene();
  world = new World(12345);
  input: Input;
  cam: ThirdPersonCamera;
  renderer: Renderer;
  worldView: WorldView;
  props: PropsView;
  crypt: CryptView;
  particles: Particles;
  vfx: VFX;
  audio = new AudioSystem();
  ui!: UI;
  prologue: Prologue | null = null;
  views = new Map<string, CharacterView>();
  loop: GameLoop;
  quality: QualityTier;
  intent: PlayerIntent = emptyIntent();
  state: GameState = 'menu';
  paused = false;
  private hitStopLeft = 0;
  private fadeEl: HTMLDivElement;
  menuTime = 0;
  frame = 0;
  private ambient: { follow: THREE.Vector3; emitters: ReturnType<Particles['addEmitter']>[] } | null = null;
  frameHooks: ((dt: number) => void)[] = [];
  stepHooks: ((dt: number) => void)[] = [];

  constructor(public canvas: HTMLCanvasElement) {
    this.quality = detectQuality();
    this.input = new Input(canvas);
    this.cam = new ThirdPersonCamera(innerWidth / innerHeight);
    this.renderer = new Renderer(canvas, this.scene, this.cam.camera, this.quality);
    this.worldView = new WorldView(this.scene);
    this.props = new PropsView(this.scene);
    this.crypt = new CryptView(this.scene);
    this.particles = new Particles(this.scene, QUALITY[this.quality]);
    this.vfx = new VFX(this.scene, (id) => this.views.get(id) ?? undefined, this.cam.camera, this.renderer);
    this.loop = new GameLoop((dt) => this.step(dt), (dt) => this.render(dt));
    this.fadeEl = document.createElement('div');
    Object.assign(this.fadeEl.style, { position: 'fixed', inset: '0', background: '#000', opacity: '1', pointerEvents: 'none', transition: 'opacity 1s ease', zIndex: '90' } as CSSStyleDeclaration);
    document.body.appendChild(this.fadeEl);
    this.wireEvents();
    (window as any).__hm = this;
  }

  private wireEvents() {
    bus.on('hitStop', ({ seconds }) => { this.hitStopLeft = Math.max(this.hitStopLeft, seconds); this.renderer.hitStop(seconds); });
    bus.on('screenShake', ({ amount }) => this.cam.addShake(amount));
    bus.on('damage', (e) => {
      if (e.targetId === this.world.playerId) { this.renderer.damageVignette(Math.min(0.9, 0.35 + e.amount * 0.04)); this.cam.addShake(e.crit ? 0.6 : 0.3); }
      else if (e.sourceId === this.world.playerId) this.cam.addShake(e.crit ? 0.35 : 0.12);
    });
    bus.on('teleport', ({ area }) => { this.audio.setArea(area === 'crypt' ? 'crypt' : 'shore'); });
    bus.on('encounterStart', () => this.audio.setMood('combat'));
    bus.on('encounterEnd', () => { if (this.state === 'playing') this.audio.setMood(this.world.area === 'crypt' ? 'tension' : 'explore'); });
    bus.on('bossStart', () => this.audio.setMood('boss'));
    bus.on('bossEnd', () => this.audio.setMood('victory'));
    bus.on('dialogueStart', () => this.renderer.setCinematic(true, 2.5));
    bus.on('dialogueEnd', () => this.renderer.setCinematic(false));
    bus.on('cinematic', ({ on }) => this.renderer.setCinematic(on));
    bus.on('rest', () => { this.audio.setMood('camp'); setTimeout(() => { if (this.state === 'playing') this.audio.setMood('explore'); }, 12000); });
    bus.on('areaEnter', ({ id }) => { if (id === 'camp' || id === 'pilgrimsRest') this.audio.setMood('camp'); });
    bus.on('gameOver', ({ victory }) => { if (!victory) this.audio.setMood('death'); });
    bus.on('prologueComplete', () => { this.state = 'ended'; this.audio.setMood('ending'); });
    bus.on('lockOn' as any, (e: any) => { const v = e?.targetId ? this.views.get(e.targetId) ?? null : null; this.vfx.setLockTarget(v); this.cam.lockTarget = e?.targetId ? this.world.actors.get(e.targetId) ?? null : null; });
  }

  /** Load the world and the starting cast, then show the main menu over the live scene. */
  async init(onProgress?: (label: string) => void) {
    const w = this.world;
    const p = w.spawn({ id: 'player', kind: 'player', name: 'Tav', model: 'Knight', faction: 'party', pos: LANDMARKS.start, yaw: LANDMARKS.start.yaw, classId: 'fighter',
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 }, maxHp: 18, ac: 16, weapon: 'sword_1handed', offhand: 'shield_round' });
    w.spawn({ id: 'ilyra', kind: 'companion', name: 'Ilyra', model: 'Rogue_Hooded', faction: 'party', pos: LANDMARKS.ilyraStart, yaw: LANDMARKS.ilyraStart.yaw, weapon: 'staff', abilities: { str: 10, dex: 14, con: 12, int: 12, wis: 17, cha: 14 }, maxHp: 17, ac: 15 });
    onProgress?.('Raising the ruins…');
    await Promise.all([
      this.props.load().catch((e) => console.error('props failed', e)),
      this.crypt.load().catch((e) => console.error('crypt failed', e)),
      ...['player', 'ilyra'].map((id) => this.addView(id)),
    ]);
    onProgress?.('Lighting the fires…');
    this.renderer.setSun(this.worldView.sunSprite);
    for (const l of LIGHTS) { const k = LIGHT_KIND[l.kind]; if (k) this.particles.addEmitter(k, { x: l.x, y: l.y, z: l.z }, { intensity: l.kind === 'fire' ? 1.2 : 0.8 }); }
    const follow = new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z);
    this.ambient = { follow, emitters: [
      this.particles.addEmitter('fireflies', { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, { follow, scale: 1.0 }),
      this.particles.addEmitter('dust', { x: p.pos.x, y: p.pos.y + 2, z: p.pos.z }, { follow, intensity: 0.6 }),
      this.particles.addEmitter('leaves', { x: p.pos.x, y: p.pos.y + 6, z: p.pos.z }, { follow, rate: 0.6 }),
    ] };
    this.particles.addEmitter('mist', { x: LAKE.x, y: LAKE.level + 0.3, z: LAKE.z + LAKE.r * 0.6 }, { scale: 2.5 });
    this.ui = createUI({ world: w, game: this });
    this.audio.init().catch((e) => console.warn('audio init', e));
    this.audio.setMood('menu');
    this.cam.snapBehind(p);
    this.ui.showScreen('menu');
    this.fade(false, 1.5);
  }
  async addView(id: string) {
    const a = this.world.actors.get(id); if (!a) return undefined;
    const v = new CharacterView(a); this.views.set(id, v); this.scene.add(v.root); await v.load(); return v;
  }
  removeView(id: string) { const v = this.views.get(id); if (v) { v.dispose(); } this.views.delete(id); }
  /** Make sure every actor has a view (actors spawned by the sim/prologue). */
  syncViews() {
    for (const a of this.world.actors.values()) if (!this.views.has(a.id)) { this.views.set(a.id, null as any); this.addView(a.id); }
    for (const [id, v] of this.views) if (!this.world.actors.has(id) && v) { this.removeView(id); }
  }

  // ---- flow ----
  fade(out: boolean, seconds = 0.8): Promise<void> {
    this.fadeEl.style.transition = `opacity ${seconds}s ease`; this.fadeEl.style.opacity = out ? '1' : '0';
    return new Promise((r) => setTimeout(r, seconds * 1000));
  }
  setTimeScale(s: number) { this.loop.timeScale = s; }
  pause(on: boolean) { this.paused = on; this.world.paused = on; if (on) this.input.releaseLock(); }
  setQuality(t: QualityTier) {
    if (t === this.quality) return; this.quality = t; try { localStorage.setItem('hm.quality', t); } catch {}
    location.reload();
  }
  startGame(classId: ClassId, name: string) {
    if (this.state === 'playing') return;
    const w = this.world;
    w.setPlayerClass(classId);
    w.player.name = name || 'Tav';
    this.removeView('player');
    this.state = 'playing'; this.input.uiCapture = false;
    this.addView('player').then(() => { this.cam.snapBehind(this.world.player); });
    this.audio.setMood('explore');
    this.prologue = startPrologue({
      world: w, ui: this.ui,
      cam: {
        playShot: (s) => this.cam.playShot({ pos: new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z), look: new THREE.Vector3(s.look.x, s.look.y, s.look.z), fov: s.fov, duration: s.duration, ease: s.ease }),
        endShot: () => this.cam.endShot(), snapBehind: (a) => this.cam.snapBehind(a),
      },
      props: {
        openChest: () => { this.props.openChest(); this.audio.play('chest_open', { pos: LANDMARKS.chest }); },
        pushBoulder: () => { this.props.pushBoulder(); this.removeColliders(/boulder/i); this.audio.play('boulder', { pos: LANDMARKS.boulder }); this.cam.addShake(0.5); },
        openGate: () => { this.props.openGate(); this.removeColliders(/^(gate|ironGate|gateDoor)$/i); this.audio.play('gate_open', { pos: LANDMARKS.gate }); },
        openCryptExit: () => { this.crypt.openCryptExit(); this.removeColliders(/cryptDoor|cryptExit/i); this.audio.play('gate_open', { pos: LANDMARKS.cryptExit }); },
      },
      fade: (out, s) => this.fade(out, s), setTimeScale: (s) => this.setTimeScale(s),
    });
    this.input.requestLock();
    bus.emit('ui', { screen: null });
  }
  removeColliders(re: RegExp) { this.world.colliders = this.world.colliders.filter((c) => !(c.tag && re.test(c.tag))); }
  restart() { location.reload(); }

  buildIntent(): PlayerIntent {
    const i = this.input; const it = emptyIntent(this.cam.moveYaw);
    if (this.state !== 'playing' || i.uiCapture) return it;
    let x = 0, z = 0; if (i.isDown('forward')) z += 1; if (i.isDown('back')) z -= 1; if (i.isDown('right')) x += 1; if (i.isDown('left')) x -= 1;
    const l = Math.hypot(x, z) || 1; it.move = { x: x / l, z: z / l };
    it.sprint = i.isDown('sprint'); it.walk = i.isDown('walk'); it.dodge = i.wasPressed('dodge'); it.jump = i.wasPressed('jump');
    it.lightAttack = i.lmbPressed; it.heavyAttack = i.rmbPressed; it.heavyHold = i.rmbDown; it.heavyRelease = i.rmbReleased; it.heavyHeldFor = i.rmbHeldFor;
    it.block = i.isDown('block'); it.lockOn = i.wasPressed('lockOn') || i.mmbPressed; it.interact = i.wasPressed('interact');
    for (let k = 0; k < 6; k++) if (i.wasPressed(('ability' + (k + 1)) as any)) it.ability = k;
    it.useItem = i.wasPressed('potion');
    if (this.world.player?.targetId && this.pendingWheel) { it.lockTargetHint = this.pendingWheel > 0 ? 'next' : 'prev'; this.pendingWheel = 0; }
    return it;
  }
  private pendingWheel = 0;
  step(dt: number) {
    this.intent = this.buildIntent();
    if (!this.paused) {
      if (this.hitStopLeft > 0) { this.hitStopLeft -= dt; dt *= 0.08; }
      this.world.step(dt, this.intent);
      this.prologue?.update(dt);
      for (const h of this.stepHooks) h(dt);
    }
    this.input.endStep(dt);
  }
  render(dt: number) {
    const p = this.world.player;
    const blocked = this.ui?.isBlocking() ?? false;
    if (this.state === 'menu') {
      this.menuTime += dt; const t = this.menuTime * 0.05;
      const cx = LAKE.x + Math.cos(t) * 30, cz = LAKE.z + 40 + Math.sin(t) * 10;
      const cy = terrainHeight(cx, cz) + 6 + Math.sin(t * 2) * 1.5;
      this.cam.camera.position.set(cx, Math.max(cy, LAKE.level + 4), cz);
      this.cam.camera.lookAt(LAKE.x - 10, LAKE.level + 2, LAKE.z - 20);
      this.cam.camera.fov = 48; this.cam.camera.updateProjectionMatrix(); this.cam.initialised = false;
    } else {
      const m = this.input.takeMouse();
      if (!blocked && !this.paused) { this.cam.applyMouse(m.dx, m.dy, p?.targetId ? 0 : m.wheel); if (p?.targetId && m.wheel) this.pendingWheel = m.wheel; }
      if (p) {
        this.cam.lockTarget = p.targetId ? this.world.actors.get(p.targetId) ?? null : null;
        this.cam.colliders = [...this.props.colliderMeshes, ...this.crypt.colliderMeshes, ...this.worldView.colliderMeshes];
        this.cam.update(p, this.paused ? 0 : dt, this.intent.sprint && (this.intent.move.x !== 0 || this.intent.move.z !== 0));
      }
    }
    const sdt = this.paused ? 0 : dt;
    if ((this.frame++ & 15) === 0) this.syncViews();
    this.updateHeadLooks();
    for (const v of this.views.values()) v?.update(sdt);
    const camPos = this.cam.camera.position;
    const focus = p ? new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z) : camPos;
    this.worldView.update(sdt, camPos, focus);
    this.props.update(sdt, camPos); this.crypt.update(sdt, camPos);
    if (this.ambient && p) this.ambient.follow.set(p.pos.x, p.pos.y + 1, p.pos.z);
    this.particles.update(sdt, camPos, this.world.time);
    this.vfx.update(sdt, camPos);
    if (p) {
      const fi = this.world.focusInteractable; this.vfx.setInteractableHighlight(fi ? { x: fi.x, y: fi.y || terrainHeight(fi.x, fi.z) + 0.8, z: fi.z } : null);
      const hp01 = p.maxHp > 0 ? p.hp / p.maxHp : 1; this.renderer.setLowHealth(p.dead ? 0 : hp01 < 0.35 ? 1 - hp01 / 0.35 : 0);
      this.audio.update(dt, { pos: p.pos, yaw: this.state === 'menu' ? 0 : this.cam.yaw + Math.PI, camPos: { x: camPos.x, y: camPos.y, z: camPos.z }, hp01 });
    }
    this.ui?.update(dt);
    for (const h of this.frameHooks) h(sdt);
    this.renderer.render(dt);
  }
  private updateHeadLooks() {
    const w = this.world; const p = w.player; if (!p) return;
    for (const v of this.views.values()) {
      if (!v || !v.ready) continue;
      const a = v.actor; let t: { x: number; y: number; z: number } | null = null;
      const tid = a.targetId ?? a.ai?.targetId ?? null;
      if (tid && w.actors.has(tid)) { const o = w.actors.get(tid)!; if (!o.dead) t = { x: o.pos.x, y: o.pos.y + 1.5, z: o.pos.z }; }
      else if (a.kind === 'companion' && Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) < 9) t = { x: p.pos.x, y: p.pos.y + 1.5, z: p.pos.z };
      else if (a.id === p.id && this.state === 'playing') { const d = this.cam.lookDir; t = { x: a.pos.x + d.x * 6, y: a.pos.y + 1.5 + d.y * 6, z: a.pos.z + d.z * 6 }; }
      if (t) { if (!v.lookTarget) v.lookTarget = new THREE.Vector3(); v.lookTarget.set(t.x, t.y, t.z); } else v.lookTarget = null;
    }
  }
  start() { this.loop.start(); }
}
