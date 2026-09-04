// Character views: load KayKit glTF, drive AnimationMixer from sim `anim` requests, toggle built-in weapon nodes.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { assets } from './assets.ts';
import type { Actor, ModelId, WeaponId, OffhandId } from '../sim/types.ts';
import { dampAngle } from '../core/math.ts';
const clampN = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

const MODEL_SCALE = 1.0; // KayKit characters are ~1.8 m already? (verified at load: we normalise height to 1.8)

/** Built-in weapon node names per model (visible = equipped). */
const BUILTIN: Record<string, Partial<Record<NonNullable<WeaponId> | NonNullable<OffhandId>, string>>> = {
  Knight: { sword_1handed: '1H_Sword', sword_2handed: '2H_Sword', shield_round: 'Round_Shield', shield_square: 'Rectangle_Shield', shield_badge: 'Badge_Shield', shield_spikes: 'Spike_Shield' },
  Mage: { wand: '1H_Wand', staff: '2H_Staff', spellbook_open: 'Spellbook_open' },
  Rogue: { dagger: 'Knife', crossbow_1handed: '1H_Crossbow', crossbow_2handed: '2H_Crossbow' },
  Rogue_Hooded: { dagger: 'Knife', crossbow_1handed: '1H_Crossbow', crossbow_2handed: '2H_Crossbow' },
  Barbarian: { axe_1handed: '1H_Axe', axe_2handed: '2H_Axe', shield_round: 'Barbarian_Round_Shield' },
};
const OFFHAND_BUILTIN: Record<string, Partial<Record<NonNullable<OffhandId>, string>>> = {
  Knight: { shield_round: 'Round_Shield', shield_square: 'Rectangle_Shield', shield_badge: 'Badge_Shield', shield_spikes: 'Spike_Shield' },
  Rogue: { dagger: 'Knife_Offhand' }, Rogue_Hooded: { dagger: 'Knife_Offhand' }, Barbarian: { shield_round: 'Barbarian_Round_Shield' }, Mage: { spellbook_open: 'Spellbook_open' },
};
const ALL_WEAPON_NODES = ['1H_Sword_Offhand', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff',
  'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable', '1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug'];

export const modelFile = (m: ModelId | string) => `models/characters/${m}.glb`;

export class CharacterView {
  root = new THREE.Group();
  model!: THREE.Object3D;
  mixer!: THREE.AnimationMixer;
  clips = new Map<string, THREE.AnimationClip>();
  current: THREE.AnimationAction | null = null;
  lastSeq = -1;
  bones = new Map<string, THREE.Object3D>();
  attached = new Map<string, THREE.Object3D>();
  visualYaw = 0;
  ready = false;
  materials: THREE.MeshStandardMaterial[] = [];
  flash = 0;
  scale = 1;
  /** World-space point the head turns toward (null = animation only). */
  lookTarget: THREE.Vector3 | null = null;
  lookWeight = 0;
  private headBone: THREE.Object3D | null = null;
  private headRest = new THREE.Quaternion();
  private tmpQ = new THREE.Quaternion(); private tmpV = new THREE.Vector3(); private tmpM = new THREE.Matrix4();
  dissolveT = -1; dissolveDuration = 1.6;
  private dissolveUniform = { value: 0 };
  constructor(public actor: Actor) { this.root.name = 'actor:' + actor.id; }

  async load() {
    const gltf = await assets.gltf(modelFile(this.actor.model));
    const scene = SkeletonUtils.clone(gltf.scene);
    // normalise height to 1.8 m
    // normalise height to 1.8 m using body meshes only (weapon nodes and IK helpers would skew the box)
    const box = new THREE.Box3();
    scene.updateMatrixWorld(true);
    scene.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh && /_(Body|Head|Leg|Arm)|PrototypePete/.test(o.name) && !ALL_WEAPON_NODES.includes(o.name)) box.expandByObject(o); });
    const h = box.isEmpty() ? 2.2 : Math.max(1.2, box.max.y - Math.min(box.min.y, 0));
    const s = (1.8 / h) * MODEL_SCALE * (this.actor.model.startsWith('Skeleton_Minion') ? 0.88 : 1); scene.scale.setScalar(s);
    this.scale = s;
    scene.traverse((o: THREE.Object3D) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && (mat as any).isMeshStandardMaterial) { mat.roughness = 0.62; mat.metalness = 0.0; this.materials.push(mat); }
      }
      if (o.name) { this.bones.set(o.name, o); this.bones.set(o.name.replace(/[.:]/g, ''), o); }
    });
    this.model = scene; this.root.add(scene);
    this.headBone = this.bones.get('head') ?? null;
    this.injectDissolve();
    this.mixer = new THREE.AnimationMixer(scene);
    for (const c of gltf.animations) this.clips.set(c.name, c);
    this.updateEquipment();
    this.ready = true;
    this.syncTransform(true);
    this.applyAnim(true);
  }
  updateEquipment() {
    for (const n of ALL_WEAPON_NODES) { const o = this.bones.get(n); if (o) o.visible = false; }
    const bw = BUILTIN[this.actor.model]; const bo = OFFHAND_BUILTIN[this.actor.model];
    if (this.actor.weapon && bw?.[this.actor.weapon]) { const o = this.bones.get(bw[this.actor.weapon]!); if (o) o.visible = true; }
    if (this.actor.offhand && bo?.[this.actor.offhand]) { const o = this.bones.get(bo[this.actor.offhand]!); if (o) o.visible = true; }
    // external weapons (skeleton packs, or adventurer weapons the model has no built-in node for)
    const hasBuiltin = (id: string | null, tbl: Record<string, string> | undefined) => !!(id && tbl && tbl[id] && this.bones.get(tbl[id]));
    for (const [slot, id, tbl] of [['handslot.r', this.actor.weapon, bw as any], ['handslot.l', this.actor.offhand, bo as any]] as const) {
      const prev = this.attached.get(slot); if (prev) { prev.parent?.remove(prev); this.attached.delete(slot); }
      if (id && !hasBuiltin(id, tbl)) this.attachExternal(slot, id);
    }
  }
  private async attachExternal(slot: string, id: string) {
    let g; try { g = await assets.gltf(`models/weapons/${id}.gltf`); } catch { return; }
    const bone = this.bones.get(slot) ?? this.bones.get(slot.replace(/[.:]/g, '')); if (!bone) return;
    if (this.attached.has(slot)) return; // equipment changed meanwhile
    const m = g.scene.clone(); m.traverse((o: THREE.Object3D) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial; if (mat?.isMeshStandardMaterial) { mat.roughness = 0.55; this.materials.push(mat); } } });
    bone.add(m); this.attached.set(slot, m);
  }
  play(name: string, loop: boolean, fade = 0.15, speed = 1) {
    const clip = this.clips.get(name) ?? this.clips.get('Idle');
    if (!clip) return;
    const action = this.mixer.clipAction(clip);
    if (this.current === action && loop) { action.timeScale = speed; return; }
    action.reset(); action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); action.clampWhenFinished = !loop; action.timeScale = speed; action.enabled = true;
    if (this.current && this.current !== action) { action.crossFadeFrom(this.current, fade, true); } 
    action.play();
    this.current = action;
  }
  applyAnim(force = false) {
    const a = this.actor.anim;
    if (a.seq === this.lastSeq && !force) return;
    this.lastSeq = a.seq; this.play(a.name, a.loop, a.fade, a.speed);
  }
  syncTransform(snap = false, dt = 0) {
    const a = this.actor;
    this.root.position.set(a.pos.x, a.pos.y, a.pos.z);
    this.visualYaw = snap ? a.yaw : dampAngle(this.visualYaw, a.yaw, 22, dt);
    this.root.rotation.y = this.visualYaw;
    const as = (a as any).scale ?? 1; if (this.root.scale.x !== as) this.root.scale.setScalar(as);
    this.root.visible = !a.hidden && !a.invisible;
  }
  update(dt: number) {
    if (!this.ready) return;
    this.applyAnim(); this.syncTransform(false, dt); this.mixer.update(dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 6); for (const m of this.materials) m.emissive.setRGB(this.flash, this.flash * 0.3, this.flash * 0.2); }
    this.applyHeadLook(dt);
    if (this.dissolveT >= 0) { this.dissolveT += dt; this.dissolveUniform.value = Math.min(1, this.dissolveT / this.dissolveDuration); if (this.dissolveUniform.value >= 1) this.root.visible = false; }
  }
  hitFlash() { this.flash = 1; }
  /** Crumble/dissolve the character (used on death). */
  startDissolve(duration = 1.6) { this.dissolveT = 0; this.dissolveDuration = duration; }
  private injectDissolve() {
    for (const m of this.materials) {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uDissolve = this.dissolveUniform;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uDissolve; varying vec3 vWp;\nfloat hm_hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }\nfloat hm_noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f); return mix(mix(mix(hm_hash(i),hm_hash(i+vec3(1,0,0)),f.x),mix(hm_hash(i+vec3(0,1,0)),hm_hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hm_hash(i+vec3(0,0,1)),hm_hash(i+vec3(1,0,1)),f.x),mix(hm_hash(i+vec3(0,1,1)),hm_hash(i+vec3(1,1,1)),f.x),f.y),f.z); }')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (uDissolve > 0.0) { float n = hm_noise(vWp * 9.0) * 0.7 + (vWp.y - floor(vWp.y)) * 0.0; float edge = uDissolve * 1.15 - 0.05; if (n < edge - 0.08) discard; if (n < edge) gl_FragColor.rgb += vec3(1.2, 0.6, 0.25) * 2.0; }');
      };
      m.customProgramCacheKey = () => 'hm-dissolve';
      m.needsUpdate = true;
    }
  }
  private applyHeadLook(dt: number) {
    const head = this.headBone; if (!head) return;
    const want = this.lookTarget && !this.actor.dead && this.actor.state !== 'dodge' && this.actor.state !== 'attack' ? 1 : 0;
    this.lookWeight += (want - this.lookWeight) * Math.min(1, dt * 5);
    if (this.lookWeight < 0.01 || !this.lookTarget) return;
    head.updateWorldMatrix(true, false);
    // direction to target in head's parent space
    const parent = head.parent!; this.tmpM.copy(parent.matrixWorld).invert();
    const localTarget = this.tmpV.copy(this.lookTarget).applyMatrix4(this.tmpM);
    const headPos = head.position;
    const dir = localTarget.sub(headPos).normalize();
    // KayKit heads: +Y up, facing +Z in model space (model rotated by root yaw)
    const yaw = Math.atan2(dir.x, dir.z), pitch = Math.asin(clampN(dir.y, -1, 1));
    const maxYaw = 1.1, maxPitch = 0.5;
    if (Math.abs(yaw) > 1.9) return; // behind: don't twist the neck
    const cy = clampN(yaw, -maxYaw, maxYaw), cp = clampN(-pitch, -maxPitch, maxPitch);
    this.tmpQ.setFromEuler(new THREE.Euler(cp * 0.6, cy * 0.7, 0, 'YXZ'));
    this.headRest.copy(head.quaternion);
    head.quaternion.copy(this.headRest).multiply(this.tmpQ);
    head.quaternion.slerp(this.headRest, 1 - this.lookWeight);
  }
  dispose() { this.root.parent?.remove(this.root); }
}
