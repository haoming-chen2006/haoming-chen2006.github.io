// Renderer + post-processing pipeline (post-FX agent owns this file).
//
// Pipeline: RenderPass → N8AO → FxPass (layer-1 particles/VFX, soft depth) → [DoF, cinematic only]
//           → EffectPass(HitFX → GodRays → Bloom → ACES tone map → colour grade) → EffectPass(SMAA → film grain)
// Frame buffers are HalfFloat; the WebGLRenderer itself does NoToneMapping and sRGB output (the last EffectPass encodes).
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode,
  GodRaysEffect, DepthOfFieldEffect, KernelSize, type Effect, type Pass,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { QUALITY, type QualitySettings, type QualityTier } from './quality.ts';
import { HitFXEffect, GradeEffect, FilmGrainEffect } from './fx/effects.ts';
import { FxPass } from './fx/fxPass.ts';
import { damp } from '../core/math.ts';

/** Art-direction knobs in one place (see NOTES-postfx.md). */
export const LOOK = {
  exposure: 0.92,
  bloom: { threshold: 1.35, smoothing: 0.32, intensity: 0.62, radius: 0.72 },
  godRays: { density: 0.96, decay: 0.93, weight: 0.32, exposure: 0.42, clampMax: 0.9, samples: 60 },
  ao: { radius: 1.2, intensity: 2.5, falloff: 0.8, color: 0x0a1220 },
  dof: { bokehScale: 3.2, focusRange: 1.4 },
  chromaticAberration: 0.0018,
  grain: 0.05,
  sunDisc: { color: 0xffd9a0, brightness: 2.6, angularRadius: 0.022 },
};

export class Renderer {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  settings: QualitySettings;
  tier: QualityTier;
  // effects (present depending on tier)
  hitFX = new HitFXEffect();
  grade = new GradeEffect();
  grain = new FilmGrainEffect(LOOK.grain);
  tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  bloom: BloomEffect | null = null;
  godRays: GodRaysEffect | null = null;
  dof: DepthOfFieldEffect | null = null;
  ao: N8AOPostPass | null = null;
  fxPass!: FxPass;
  private dofPass: EffectPass | null = null;
  private ownedPasses: Pass[] = [];
  // dynamic state
  time = 0;
  private flashV = 0; private flashColor = new THREE.Color(1, 1, 1);
  private damageV = 0; private lowHealth = 0; private radial = 0; private caSpike = 0;
  cinematic = false; private cinMix = 0;
  /** Focus distance (m) used by the cinematic DoF; smoothly pulled toward `focusTarget`. */
  focusTarget = 3; private focusCur = 3;
  /** Optional: object/point to keep in focus while cinematic (overrides focusTarget each frame). */
  focusObject: THREE.Object3D | THREE.Vector3 | null = null;
  /** Called by hitStop(); the lead scales GameLoop.timeScale here. */
  onHitStop?: (seconds: number) => void;
  // sun for god rays
  private ownSun: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private externalSun: THREE.Mesh | null = null;
  private sunDir = new THREE.Vector3(-0.55, 0.32, -0.75).normalize();
  private sunDirOverride: THREE.Vector3 | null = null;
  private dirLight: THREE.DirectionalLight | null = null;
  private lightSearchT = 0;
  fogColor = new THREE.Color(0x3c4a63);
  private tmp = new THREE.Vector3(); private tmp2 = new THREE.Vector3();

  constructor(public canvas: HTMLCanvasElement, public scene: THREE.Scene, public camera: THREE.PerspectiveCamera, tier: QualityTier) {
    this.tier = tier; this.settings = QUALITY[tier];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true, alpha: false });
    this.renderer.setPixelRatio(this.settings.pixelRatio);
    this.renderer.shadowMap.enabled = this.settings.shadows; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the composer
    this.renderer.toneMappingExposure = LOOK.exposure; // read by ToneMappingEffect
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    // our own sun disc (used for god rays until the environment provides one via setSun)
    const sunMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(LOOK.sunDisc.color).multiplyScalar(LOOK.sunDisc.brightness), fog: false, depthWrite: false, transparent: true, toneMapped: false });
    this.ownSun = new THREE.Mesh(new THREE.CircleGeometry(1, 48), sunMat); this.ownSun.name = 'fx:sun'; this.ownSun.frustumCulled = false; this.ownSun.renderOrder = -10;
    scene.add(this.ownSun);
    this.buildPipeline();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private buildPipeline() {
    const s = this.settings, cam = this.camera, scene = this.scene;
    for (const p of this.ownedPasses) { try { (p as any).dispose?.(); } catch { /* ignore */ } }
    this.composer.removeAllPasses(); this.ownedPasses = [];
    const add = (p: Pass) => { this.composer.addPass(p); this.ownedPasses.push(p); return p; };
    add(new RenderPass(scene, cam));
    if (s.ao) {
      const ao = new N8AOPostPass(scene, cam, innerWidth, innerHeight);
      ao.configuration.aoRadius = LOOK.ao.radius; ao.configuration.distanceFalloff = LOOK.ao.falloff; ao.configuration.intensity = LOOK.ao.intensity;
      ao.configuration.color = new THREE.Color(LOOK.ao.color); ao.configuration.screenSpaceRadius = false; ao.configuration.gammaCorrection = false;
      ao.setQualityMode(this.tier === 'ultra' ? 'High' : 'Medium');
      ao.configuration.halfRes = this.tier !== 'ultra';
      this.ao = ao; add(ao);
    } else this.ao = null;
    this.fxPass = new FxPass(scene, cam, this.composer); add(this.fxPass);
    if (s.dof) {
      this.dof = new DepthOfFieldEffect(cam, { focusDistance: this.focusCur, focusRange: LOOK.dof.focusRange, bokehScale: 0, resolutionScale: 0.75 });
      this.dofPass = new EffectPass(cam, this.dof); this.dofPass.enabled = false; add(this.dofPass);
    } else { this.dof = null; this.dofPass = null; }
    const main: Effect[] = [this.hitFX];
    if (s.godRays) {
      const g = LOOK.godRays;
      this.godRays = new GodRaysEffect(cam, this.externalSun ?? this.ownSun, { resolutionScale: 0.5, density: g.density, decay: g.decay, weight: g.weight, exposure: g.exposure, clampMax: g.clampMax, samples: g.samples, kernelSize: KernelSize.SMALL, blur: true });
      main.push(this.godRays);
    } else this.godRays = null;
    if (s.bloom) {
      const b = LOOK.bloom;
      this.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: b.threshold, luminanceSmoothing: b.smoothing, intensity: b.intensity, radius: b.radius, levels: 8 });
      main.push(this.bloom);
    } else this.bloom = null;
    main.push(this.tone, this.grade);
    add(new EffectPass(cam, ...main));
    const last: Effect[] = [];
    if (s.smaa) last.push(new SMAAEffect({ preset: this.tier === 'ultra' ? SMAAPreset.ULTRA : SMAAPreset.HIGH }));
    last.push(this.grain);
    add(new EffectPass(cam, ...last));
    this.hitFX.u('uCA').value = LOOK.chromaticAberration;
  }

  /** Rebuild the pipeline for a new quality tier (the environment reacts to `settings` separately). */
  setQuality(tier: QualityTier) {
    if (tier === this.tier) return;
    this.tier = tier; this.settings = QUALITY[tier];
    this.renderer.setPixelRatio(this.settings.pixelRatio); this.renderer.shadowMap.enabled = this.settings.shadows;
    this.buildPipeline(); this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ---------------- contract API ----------------
  /** Dialogue/cinematic look: depth of field with a smooth focus pull (+ slightly heavier vignette). */
  setCinematic(on: boolean, focusDistance?: number) { this.cinematic = on; if (focusDistance !== undefined) this.focusTarget = focusDistance; }
  /** Full-screen additive flash (HDR: strength ~0.3 subtle, 1 = hard white). Decays automatically. */
  flash(color: THREE.ColorRepresentation = 0xffffff, strength = 0.5) { this.flashColor.set(color); this.flashV = Math.max(this.flashV, strength); }
  /** Red pulsing edge vignette (0..1). Decays automatically. */
  damageVignette(strength = 0.6) { this.damageV = Math.min(1, Math.max(this.damageV, strength)); }
  /** Hit-stop: the lead freezes the loop via `onHitStop`; we add a radial-blur/CA punch. */
  hitStop(seconds: number) { this.onHitStop?.(seconds); this.impact(Math.min(1, seconds * 8)); }
  /** Impact punch only (radial blur + chromatic spike), no time freeze. */
  impact(strength = 0.5, screenPos?: { x: number; y: number }) {
    this.radial = Math.max(this.radial, strength); this.caSpike = Math.max(this.caSpike, strength * 0.02);
    (this.hitFX.u('uRadialCenter').value as THREE.Vector2).set(screenPos?.x ?? 0.5, screenPos?.y ?? 0.5);
  }
  /** 0 = healthy, 1 = near death: desaturation + pulsing vignette. */
  setLowHealth(t: number) { this.lowHealth = Math.max(0, Math.min(1, t)); }
  setFogColor(c: THREE.ColorRepresentation) { this.fogColor.set(c); const f = this.scene.fog; if (f) f.color.copy(this.fogColor); }
  /** Use the environment's emissive sun disc as the god-rays light source (hides our fallback disc). */
  setSun(mesh: THREE.Mesh | null) {
    this.externalSun = mesh; this.ownSun.visible = !mesh;
    if (this.godRays) this.godRays.lightSource = mesh ?? this.ownSun;
  }
  /** Direction *toward* the sun for the fallback disc (otherwise auto-detected from the scene's DirectionalLight). */
  setSunDirection(dir: THREE.Vector3 | null) { this.sunDirOverride = dir ? dir.clone().normalize() : null; }

  private updateSun(dt: number) {
    if (this.externalSun) return;
    if (this.sunDirOverride) this.sunDir.copy(this.sunDirOverride);
    else {
      this.lightSearchT -= dt;
      if (!this.dirLight || this.lightSearchT <= 0) { this.lightSearchT = 2; this.dirLight = null; this.scene.traverse((o) => { if (!this.dirLight && (o as THREE.DirectionalLight).isDirectionalLight) this.dirLight = o as THREE.DirectionalLight; }); }
      const l = this.dirLight;
      if (l) { l.getWorldPosition(this.tmp); l.target.getWorldPosition(this.tmp2); this.tmp.sub(this.tmp2); if (this.tmp.lengthSq() > 1e-6) this.sunDir.copy(this.tmp.normalize()); }
    }
    const dist = this.camera.far * 0.75;
    this.ownSun.position.copy(this.camera.position).addScaledVector(this.sunDir, dist);
    this.ownSun.scale.setScalar(dist * LOOK.sunDisc.angularRadius);
    this.ownSun.lookAt(this.camera.position);
  }

  render(dt: number) {
    this.time += dt;
    // decays
    this.flashV = damp(this.flashV, 0, 9, dt); this.damageV = damp(this.damageV, 0, 2.0, dt);
    this.radial = damp(this.radial, 0, 9, dt); this.caSpike = damp(this.caSpike, 0, 8, dt);
    const h = this.hitFX;
    h.u('uTime').value = this.time; h.u('uFlash').value = this.flashV; (h.u('uFlashColor').value as THREE.Color).copy(this.flashColor);
    h.u('uDamage').value = this.damageV; h.u('uRadial').value = this.radial; h.u('uCA').value = LOOK.chromaticAberration + this.caSpike;
    const g = this.grade;
    g.u('uTime').value = this.time; g.u('uLowHealth').value = this.lowHealth;
    this.grain.u('uTime').value = this.time;
    // cinematic DoF with focus pull
    const want = this.cinematic ? 1 : 0;
    this.cinMix = damp(this.cinMix, want, 3.5, dt);
    if (Math.abs(this.cinMix - want) < 0.01) this.cinMix = want;
    g.u('uCinematic').value = this.cinMix;
    if (this.dof && this.dofPass) {
      if (this.focusObject) {
        const p = (this.focusObject as THREE.Object3D).isObject3D ? (this.focusObject as THREE.Object3D).getWorldPosition(this.tmp) : (this.focusObject as THREE.Vector3);
        this.focusTarget = Math.max(0.3, p.distanceTo(this.camera.position));
      }
      this.focusCur = damp(this.focusCur, this.focusTarget, 5, dt);
      const on = this.cinMix > 0.005;
      this.dofPass.enabled = on;
      if (on) { this.dof.bokehScale = LOOK.dof.bokehScale * this.cinMix; this.dof.cocMaterial.focusDistance = this.focusCur; this.dof.cocMaterial.focusRange = LOOK.dof.focusRange; }
    }
    this.updateSun(dt);
    this.composer.render(dt);
  }
}
