import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ARENA_H, ARENA_W } from '../game/constants.ts';
import type { CardDef, Team, Unit } from '../game/types.ts';
import type { World } from '../game/world.ts';
import { Arena3D } from './arena3d.ts';
import { CameraRig, type ViewMode } from './camera3d.ts';
import { Effects3D } from './effects3d.ts';
import { Entities3D } from './entities3d.ts';
import { buildViewmodel, type Viewmodel } from './viewmodel.ts';
import { Overlay } from './overlay.ts';

export interface ViewState {
  mode: ViewMode;
  heroId: number;
  hover: Unit | null;
  selectedCard: CardDef | null;
  reticle: { pos: { x: number; y: number }; ok: boolean; radius: number } | null;
  hitMarkerT: number;
  paused: boolean;
  locked: boolean;
  deployTeam: Team | null;
  moving: boolean;
}

/** The whole 3D presentation: renderer, post-processing, environment, entities, effects, overlay. */
export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  readonly arena: Arena3D;
  readonly ents: Entities3D;
  readonly fx: Effects3D;
  readonly overlay: Overlay;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private sun: THREE.DirectionalLight;
  private viewmodel = new THREE.Group();
  private viewmodelKey = '';
  private vm: Viewmodel | null = null;
  private width = 1;
  private height = 1;
  quality: 'high' | 'low' = 'high';

  constructor(canvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.rig = new CameraRig(1);
    this.arena = new Arena3D(this.scene);
    this.ents = new Entities3D(this.scene);
    this.fx = new Effects3D(this.scene);
    this.overlay = new Overlay(overlayCanvas);

    const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x55703c, 0.85);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d2, 1.9);
    this.sun.position.set(ARENA_W / 2 + 22, 42, ARENA_H / 2 + 14);
    this.sun.target.position.set(ARENA_W / 2, 0, ARENA_H / 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    const sc = this.sun.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 30; sc.bottom = -30; sc.near = 5; sc.far = 120;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    const fill = new THREE.DirectionalLight(0x9fc3ff, 0.35);
    fill.position.set(-20, 20, -10);
    this.scene.add(fill);

    const target = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.rig.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.45, 2.2);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.rig.camera.add(this.viewmodel);
    this.scene.add(this.rig.camera);
  }

  resize(w: number, h: number): void {
    this.width = Math.max(1, w); this.height = Math.max(1, h);
    const dpr = Math.min(this.quality === 'high' ? 1.25 : 1, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(this.width, this.height);
    this.bloom.setSize(this.width * dpr * 0.5, this.height * dpr * 0.5);
    this.rig.setAspect(this.width / this.height);
    this.overlay.resize(this.width, this.height, dpr);
    this.fx.setViewHeight(this.height * dpr);
  }

  setQuality(q: 'high' | 'low'): void {
    this.quality = q;
    this.bloom.enabled = q === 'high';
    this.renderer.shadowMap.enabled = q === 'high';
    this.sun.castShadow = q === 'high';
    this.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material && ((o as THREE.Mesh).material as THREE.Material).needsUpdate === false; });
    this.resize(this.width, this.height);
  }

  /** Drop all match objects so a new match starts clean. */
  clear(): void { this.ents.clear(); }

  private updateViewmodel(hero: Unit | undefined, st: ViewState, dt: number, time: number): void {
    const show = st.mode === 'first' && !!hero;
    this.viewmodel.visible = show;
    if (!show || !hero) return;
    const key = `${hero.def.id}:${hero.team}`;
    if (key !== this.viewmodelKey) {
      this.viewmodelKey = key;
      this.vm?.dispose();
      this.viewmodel.clear();
      this.vm = buildViewmodel(hero.def.look, hero.team);
      this.vm.group.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = false; o.receiveShadow = false; } });
      this.viewmodel.add(this.vm.group);
    }
    this.vm?.animate({ dt, time, moving: st.moving, attackAnim: hero.attackAnim, abilityT: hero.abilityT, dashing: !!hero.dashVel });
  }

  render(world: World, st: ViewState, dt: number, time: number): void {
    const hero = st.heroId >= 0 ? world.getUnit(st.heroId) : undefined;
    const heroModel = hero ? this.ents.unitModel(hero.id) : undefined;
    this.rig.update(dt, {
      mode: st.mode, heroPos: hero?.pos, heroEye: heroModel?.eyeHeight ?? 1.2, heroHover: heroModel?.hover ?? 0, heroFacing: hero?.facing,
    });
    this.arena.update(time, this.rig.camera.position);
    this.arena.showDeployZone(st.deployTeam !== null ? world : null, st.deployTeam ?? 0, st.deployTeam !== null ? world.hero(st.deployTeam) : undefined, st.selectedCard?.kind === 'spell');
    this.ents.sync(world, dt, time, st.heroId, st.mode === 'first');
    this.fx.sync(world, dt, time);
    this.updateViewmodel(hero, st, dt, time);
    this.composer.render(dt);
    this.overlay.draw(world, this.rig, this.ents, st, time);
  }

  /** Render only the environment + entities (menu background). */
  renderIdle(world: World | null, dt: number, time: number): void {
    this.rig.orbit(time);
    this.arena.update(time, this.rig.camera.position);
    this.arena.showDeployZone(null, 0, undefined, false);
    if (world) { this.ents.sync(world, dt, time, -1, false); this.fx.sync(world, dt, time); }
    this.viewmodel.visible = false;
    this.composer.render(dt);
    this.overlay.clear();
  }
}
