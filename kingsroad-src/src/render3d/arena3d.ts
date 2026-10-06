import * as THREE from 'three';
import { ARENA_H, ARENA_W, CAMPS, LANE_PATHS, OBJECTIVES, RIVER_HALF, SPAWN_POINT, TOWER_LAYOUT, mirrorPos } from '../game/constants.ts';
import { BUSHES, WALLS, inWall } from '../game/map.ts';
import type { Team, Unit } from '../game/types.ts';
import type { World } from '../game/world.ts';
import { bannerTexture } from './textures.ts';
import { mergeByMaterial } from './model_kit.ts';
import { loadModel, pbrMaterial } from './pbr.ts';
import { packTexture } from './hokpack.ts';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { grassBladeTexture } from './textures.ts';
import { isMine } from './perspective.ts';

const hash = (x: number, y: number, s = 0): number => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

/** Distance from a point to the nearest lane centre line. */
function laneDist(x: number, z: number): number {
  let best = Infinity;
  for (const path of LANE_PATHS) {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const abx = b.x - a.x, aby = b.y - a.y, l2 = abx * abx + aby * aby;
      let t = ((x - a.x) * abx + (z - a.y) * aby) / l2; t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(x - (a.x + abx * t), z - (a.y + aby * t));
      if (d < best) best = d;
    }
  }
  return best;
}
const nearStructure = (x: number, z: number, r = 2.6): boolean => {
  for (const team of [0, 1] as const) {
    for (const spec of TOWER_LAYOUT) { const p = team === 0 ? spec.pos : mirrorPos(spec.pos); if (Math.hypot(x - p.x, z - p.y) < r) return true; }
    const s = team === 0 ? SPAWN_POINT : mirrorPos(SPAWN_POINT); if (Math.hypot(x - s.x, z - s.y) < 6) return true;
    for (const c of CAMPS) { const p = team === 0 ? c.pos : mirrorPos(c.pos); if (Math.hypot(x - p.x, z - p.y) < 2.2) return true; }
  }
  for (const o of OBJECTIVES) if (Math.hypot(x - o.pos.x, z - o.pos.y) < 3.5) return true;
  return false;
};
const inRiver = (x: number, z: number): boolean => Math.abs(x - z) < RIVER_HALF + 0.3 && x > 7 && x < ARENA_W - 7;

/** The whole static map: terrain, lanes, river, jungle walls, bushes, bases, skyline. */
export class Arena3D {
  readonly group = new THREE.Group();
  private sky: THREE.Mesh;
  private water: THREE.ShaderMaterial;
  private torches: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];
  private flags: THREE.Mesh[] = [];
  private wallBanners: { flag: THREE.Mesh; team: Team }[] = [];
  private bannerTex!: { mine: THREE.Texture; foe: THREE.Texture };
  private lanterns: THREE.Mesh[] = [];
  private birds: THREE.Group[] = [];
  private windMats: THREE.MeshStandardMaterial[] = [];
  private windTime = { value: 0 };
  private crystalGlows: THREE.Mesh[] = [];
  private objGlows: THREE.Mesh[] = [];
  private bushMeshes: THREE.Mesh[] = [];
  private statics = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.group.add(this.statics);
    scene.background = new THREE.Color(0xd7e6ea);
    scene.fog = new THREE.Fog(0xd7e6ea, 60, 170);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(260, 24, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { zenith: { value: new THREE.Color(0x3f78b8) }, mid: { value: new THREE.Color(0x8fc0e6) }, horizon: { value: new THREE.Color(0xf1e3c8) }, ground: { value: new THREE.Color(0x9fb89a) }, sunDir: { value: new THREE.Vector3(0.5, 0.45, 0.35).normalize() } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 zenith; uniform vec3 mid; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; varying vec3 vDir;
        void main(){
          float y = vDir.y;
          vec3 c = y < 0.0 ? mix(horizon, ground, clamp(-y * 6.0, 0.0, 1.0)) : mix(horizon, mix(mid, zenith, smoothstep(0.15, 0.8, y)), smoothstep(0.0, 0.25, y));
          float sun = pow(max(dot(normalize(vDir), sunDir), 0.0), 220.0);
          float glow = pow(max(dot(normalize(vDir), sunDir), 0.0), 6.0) * 0.25;
          c += vec3(1.0, 0.95, 0.8) * sun * 1.5 + vec3(1.0, 0.9, 0.7) * glow;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    this.sky.renderOrder = -1000;
    scene.add(this.sky);

    // outer ground + map floor
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), pbrMaterial('forest_floor', { repeat: 48, color: 0xb9c9a0 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(ARENA_W / 2, -0.06, ARENA_H / 2); outer.receiveShadow = true;
    this.group.add(outer);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_W, ARENA_H), pbrMaterial('leafy_grass', { repeat: ARENA_W / 5.5, color: 0xcfe3b4 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(ARENA_W / 2, 0, ARENA_H / 2); floor.receiveShadow = true;
    this.group.add(floor);

    // lanes: cobbled ribbons with dirt edges along each polyline
    const dirtM = pbrMaterial('dirt', { repeat: 6, repeatY: 1 }); dirtM.transparent = true; dirtM.opacity = 0.55; dirtM.depthWrite = false;
    for (const path of LANE_PATHS) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y) + 2.2;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const mk = (w: number, m: THREE.Material, y: number) => {
          const g = new THREE.PlaneGeometry(len, w, Math.ceil(len), 1);
          const mesh = new THREE.Mesh(g, m);
          mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = -ang;
          mesh.position.set((a.x + b.x) / 2, y, (a.y + b.y) / 2);
          mesh.receiveShadow = true;
          this.group.add(mesh);
        };
        mk(3.8, dirtM, 0.011);
        mk(2.8, pbrMaterial('patterned_paving', { repeat: len / 2.8, repeatY: 1, color: 0xe8dcc4 }), 0.013);
      }
    }

    // river along the main diagonal: bed, water, sand banks
    const riverLen = Math.hypot(ARENA_W, ARENA_H) * 0.74;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(riverLen, 0.6, RIVER_HALF * 2 + 0.5), pbrMaterial('river_small_rocks', { repeat: riverLen / 4, repeatY: 1, color: 0x8fb0b8 }));
    bed.position.set(ARENA_W / 2, -0.45, ARENA_H / 2); bed.rotation.y = -Math.PI / 4;
    this.group.add(bed);
    this.water = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } }, transparent: true,
      vertexShader: `varying vec2 vUv; uniform float time; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x*2.5+time*2.2)*0.035 + cos(p.y*5.0-time*1.7)*0.03; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader: `uniform float time; varying vec2 vUv;
        void main(){
          float w = sin(vUv.x*90.0 + time*2.0 + sin(vUv.y*14.0+time)*2.0)*0.5+0.5;
          float w2 = sin(vUv.x*60.0 - time*1.3 + vUv.y*22.0)*0.5+0.5;
          vec3 deep = vec3(0.09,0.42,0.50); vec3 light = vec3(0.40,0.80,0.80);
          vec3 c = mix(deep, light, w*0.45+w2*0.35);
          float foam = smoothstep(0.82, 1.0, w*w2*1.7);
          float edge = smoothstep(0.0,0.12,vUv.y)*smoothstep(1.0,0.88,vUv.y);
          c = mix(c, vec3(0.92,0.97,1.0), foam*0.55 + (1.0-edge)*0.35);
          gl_FragColor = vec4(c, 0.88);
        }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(riverLen, RIVER_HALF * 2 + 0.3, 60, 6), this.water);
    water.rotation.x = -Math.PI / 2; water.rotation.z = -Math.PI / 4; water.position.set(ARENA_W / 2, -0.1, ARENA_H / 2);
    this.group.add(water);
    const sand = pbrMaterial('coast_sand_01', { repeat: riverLen / 3, repeatY: 0.2 });
    for (const s of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(riverLen, 0.1, 0.35), sand);
      bank.rotation.y = -Math.PI / 4;
      const off = (RIVER_HALF + 0.2) * s;
      bank.position.set(ARENA_W / 2 + off * Math.SQRT1_2, 0.0, ARENA_H / 2 - off * Math.SQRT1_2);
      bank.receiveShadow = true; this.group.add(bank);
    }
    for (let i = 0; i < 30; i++) { // pebbles + reeds
      const t = 0.08 + hash(i, 90) * 0.84;
      const px = 6 + t * (ARENA_W - 12), pz = px + (hash(i, 91) - 0.5) * RIVER_HALF * 2;
      if (laneDist(px, pz) < 2) continue;
      const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + hash(i, 92) * 0.12, 0), new THREE.MeshStandardMaterial({ color: 0x8a95a3, roughness: 1, flatShading: true }));
      peb.position.set(px, -0.14, pz); this.statics.add(peb);
      if (hash(i, 95) > 0.5) { const reed = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x5e8a3a, roughness: 1 })); const sgn = hash(i, 93) > 0.5 ? 1 : -1; reed.position.set(px + sgn * (RIVER_HALF + 0.35), 0.45, pz - sgn * (RIVER_HALF + 0.35)); this.statics.add(reed); }
    }

    // jungle walls: layered cliff rock with mossy tops, blossom trees and bamboo growing from them
    const rockM = pbrMaterial('mossy_rock', { repeat: 2, repeatY: 1 });
    const mossM = pbrMaterial('leafy_grass', { repeat: 1.5, color: 0x9fd08a });
    const capM = pbrMaterial('rock_face', { repeat: 2, repeatY: 1, color: 0xb8c4a8 });
    const blossomM = [new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: 0xff9ec6, roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: 0xffd1e3, roughness: 0.85 })];
    const bambooM = pbrMaterial('bamboo_wall', { repeat: 1, repeatY: 3, color: 0xb9e0a0 });
    const bambooLeafM = new THREE.MeshStandardMaterial({ color: 0x5fa842, roughness: 0.9, side: THREE.DoubleSide });
    const trunkM0 = pbrMaterial('sakura_bark', { repeat: 1, repeatY: 2 });
    WALLS.forEach((b, i) => {
      const h = 1.9 + hash(i, 10) * 0.7;
      // stacked boulders instead of one box: three slabs with jitter
      for (let k = 0; k < 3; k++) {
        const sh = h / 3, y = sh * k;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(b.w + (k === 1 ? 0.25 : 0) + hash(i, 50 + k) * 0.2, sh + 0.05, b.h + (k === 1 ? 0.25 : 0) + hash(i, 60 + k) * 0.2), rockM);
        slab.position.set(b.x + b.w / 2 + (hash(i, 70 + k) - 0.5) * 0.15, y + sh / 2, b.y + b.h / 2 + (hash(i, 80 + k) - 0.5) * 0.15);
        slab.rotation.y = (hash(i, 90 + k) - 0.5) * 0.08;
        slab.castShadow = true; slab.receiveShadow = true;
        this.statics.add(slab);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.3, 0.2, b.h + 0.3), capM);
      cap.position.set(b.x + b.w / 2, h + 0.05, b.y + b.h / 2); this.statics.add(cap);
      const n = Math.max(2, Math.round((b.w + b.h) / 1.6));
      for (let k = 0; k < n; k++) {
        const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.45 + hash(i, 20 + k) * 0.35, 14, 10), mossM);
        shrub.position.set(b.x + 0.4 + hash(i, 30 + k) * (b.w - 0.8), h + 0.3, b.y + 0.4 + hash(i, 40 + k) * (b.h - 0.8));
        shrub.scale.y = 0.7; shrub.castShadow = true; this.statics.add(shrub);
      }
      // a blossom tree or a bamboo clump on every wall
      const tx = b.x + 0.5 + hash(i, 101) * (b.w - 1), tz = b.y + 0.5 + hash(i, 102) * (b.h - 1);
      if (hash(i, 103) > 0.45) {
        const th = 1.6 + hash(i, 104) * 1.2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, th, 6), trunkM0);
        trunk.position.set(tx, h + th / 2, tz); trunk.rotation.z = (hash(i, 105) - 0.5) * 0.3; trunk.castShadow = true; this.statics.add(trunk);
        for (let k = 0; k < 3; k++) {
          const crown = new THREE.Mesh(new THREE.SphereGeometry(0.8 + hash(i, 110 + k) * 0.5, 16, 12), blossomM[k % 3]);
          crown.position.set(tx + (hash(i, 120 + k) - 0.5) * 1.4, h + th + 0.2 + hash(i, 130 + k) * 0.5, tz + (hash(i, 140 + k) - 0.5) * 1.4);
          crown.castShadow = true; this.statics.add(crown);
        }
      } else {
        for (let k = 0; k < 5; k++) {
          const bh = 2.2 + hash(i, 150 + k) * 1.6;
          const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, bh, 5), bambooM);
          cane.position.set(tx + (hash(i, 160 + k) - 0.5) * 0.9, h + bh / 2, tz + (hash(i, 170 + k) - 0.5) * 0.9); cane.rotation.z = (hash(i, 180 + k) - 0.5) * 0.12;
          this.statics.add(cane);
          for (let l = 0; l < 3; l++) { const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), bambooLeafM); leaf.position.set(cane.position.x + (hash(i, 190 + l + k) - 0.5) * 0.4, h + bh * (0.55 + l * 0.15), cane.position.z); leaf.rotation.set(hash(i, 200 + l) * 1.2, hash(i, 210 + l) * 6, 0.3); this.statics.add(leaf); }
        }
      }
    });

    // bushes: clusters of tall grass, translucent so hiding reads from outside
    const bushM = new THREE.MeshStandardMaterial({ color: 0x6fc24f, roughness: 0.9, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
    this.windify(bushM, 0.12);
    for (const b of BUSHES) {
      // the hiding disc; the tall grass itself is CC0 clumps placed in placeModels()
      const disc = new THREE.Mesh(new THREE.CircleGeometry(b.r, 24), new THREE.MeshStandardMaterial({ color: 0x3f8f32, roughness: 1, transparent: true, opacity: 0.5, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(b.pos.x, 0.02, b.pos.y);
      this.group.add(disc);
      this.bushMeshes.push(disc);
    }
    void bushM;

    // tower plinths, base platforms, fountain pools and crystal pedestals
    const plinthM = pbrMaterial('stone_pathway_02', { repeat: 2 });
    const stoneM = pbrMaterial('marble_tiles', { repeat: 3 });
    for (const team of [0, 1] as const) {
      for (const spec of TOWER_LAYOUT) {
        const p = team === 0 ? spec.pos : mirrorPos(spec.pos);
        const s = spec.tier === 'crystal' ? 4.6 : 3.4;
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(s / 2, s / 2 + 0.2, 0.18, 10), plinthM);
        plinth.position.set(p.x, 0.07, p.y); plinth.receiveShadow = true; plinth.castShadow = true;
        this.statics.add(plinth);
      }
      const sp = team === 0 ? SPAWN_POINT : mirrorPos(SPAWN_POINT);
      const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.3, 24), stoneM);
      platform.position.set(sp.x, 0.1, sp.y); platform.receiveShadow = true; this.statics.add(platform);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 20), new THREE.MeshStandardMaterial({ color: isMine(team) ? 0x5fb8ff : 0xff8a7a, emissive: isMine(team) ? 0x2a6fd6 : 0xd63b3b, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }));
      pool.position.set(sp.x, 0.28, sp.y); this.group.add(pool); this.crystalGlows.push(pool);
      // 泉水: a two-tier pagoda pavilion on lacquered pillars, team banners hung between them
      this.bannerTex = this.bannerTex ?? { mine: bannerTexture('#2f7fd6'), foe: bannerTexture('#d63b3b') };
      const lacquerM = new THREE.MeshStandardMaterial({ color: 0x9b2323, roughness: 0.45 });
      const goldM = new THREE.MeshStandardMaterial({ color: 0xffd54a, metalness: 0.7, roughness: 0.3 });
      const roofTile = pbrMaterial('grey_roof_tiles', { repeat: 6, repeatY: 2, color: isMine(team) ? 0x7f9fcf : 0xc26a5a });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        const x = sp.x + Math.cos(a) * 4.8, z = sp.y + Math.sin(a) * 4.8;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 5.6, 10), lacquerM);
        pillar.position.set(x, 2.8, z); pillar.castShadow = true; this.statics.add(pillar);
        const capP = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.2, 10), goldM); capP.position.set(x, 5.7, z); this.statics.add(capP);
        if (k % 2 === 0) {
          const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6, 6, 1), new THREE.MeshStandardMaterial({ map: isMine(team) ? this.bannerTex.mine : this.bannerTex.foe, side: THREE.DoubleSide, roughness: 0.9 }));
          flag.position.set(x, 4.2, z); flag.rotation.y = -a + Math.PI / 2; flag.castShadow = true;
          this.group.add(flag); this.flags.push(flag); this.wallBanners.push({ flag, team });
        }
        this.lantern(x + Math.cos(a) * 0.6, 1.4, z + Math.sin(a) * 0.6, 1.2);
      }
      for (let t = 0; t < 2; t++) {
        const r = 6.2 - t * 1.8, y = 5.8 + t * 1.4;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(r, 1.1, 8), roofTile); roof.position.set(sp.x, y + 0.55, sp.y); roof.castShadow = true; this.statics.add(roof);
        const edge = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.07, 8, 32), goldM); edge.rotation.x = Math.PI / 2; edge.position.set(sp.x, y, sp.y); this.statics.add(edge);
        if (t === 0) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(r - 1.8 + 0.1, r - 1.8 + 0.1, 1.3, 8), lacquerM); ring.position.set(sp.x, y + 1.15, sp.y); this.statics.add(ring); }
      }
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), goldM); finial.position.set(sp.x, 8.9, sp.y); this.statics.add(finial);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 6), goldM); spire.position.set(sp.x, 9.4, sp.y); this.statics.add(spire);
    }
    // objective pits: dark stone rings
    for (const o of OBJECTIVES) {
      const tyrant = o.id === 'tyrant';
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 24), new THREE.MeshStandardMaterial({ color: 0x4a4440, roughness: 1 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(o.pos.x, 0.015, o.pos.y); this.group.add(ring);
      const glow = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.6, 24), new THREE.MeshStandardMaterial({ color: tyrant ? 0xff6a3c : 0x9b6bff, emissive: tyrant ? 0xff3a10 : 0x6a30ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.6 }));
      glow.rotation.x = -Math.PI / 2; glow.position.set(o.pos.x, 0.02, o.pos.y); this.group.add(glow); this.objGlows.push(glow);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4 + hash(k, 3) * 0.8, 9), rockM); spike.position.set(o.pos.x + Math.cos(a) * 3.2, 0.6, o.pos.y + Math.sin(a) * 3.2); spike.rotation.z = (hash(k, 4) - 0.5) * 0.5; this.statics.add(spike); }
    }
    // camp markers: a few stones
    for (const team of [0, 1] as const) for (const c of CAMPS) {
      const p = team === 0 ? c.pos : mirrorPos(c.pos);
      for (let k = 0; k < 3; k++) { const rock = new THREE.Mesh(new THREE.SphereGeometry(0.25 + hash(k, p.x) * 0.3, 10, 8), rockM); const a = hash(k, p.y) * Math.PI * 2; rock.position.set(p.x + Math.cos(a) * 1.8, 0.15, p.y + Math.sin(a) * 1.8); this.statics.add(rock); }
    }
    // perimeter wall
    const wallM = pbrMaterial('japanese_stone_wall', { repeat: 12, repeatY: 1 });
    const wallH = 1.6, wallT = 0.8;
    const walls: [number, number, number, number][] = [
      [ARENA_W / 2, -wallT / 2, ARENA_W + wallT * 2, wallT], [ARENA_W / 2, ARENA_H + wallT / 2, ARENA_W + wallT * 2, wallT],
      [-wallT / 2, ARENA_H / 2, wallT, ARENA_H], [ARENA_W + wallT / 2, ARENA_H / 2, wallT, ARENA_H],
    ];
    for (const [x, z, w, d] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallM);
      m.position.set(x, wallH / 2, z); m.castShadow = true; m.receiveShadow = true; this.statics.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.14, d + 0.1), stoneM);
      cap.position.set(x, wallH + 0.07, z); this.statics.add(cap);
    }
    const torchM = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff7a1a, emissiveIntensity: 3.5 });
    const bowlM = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.5 });
    for (const [x, z] of [[-wallT / 2, -wallT / 2], [ARENA_W + wallT / 2, -wallT / 2], [-wallT / 2, ARENA_H + wallT / 2], [ARENA_W + wallT / 2, ARENA_H + wallT / 2], [-wallT / 2, 28], [ARENA_W + wallT / 2, 28], [28, -wallT / 2], [28, ARENA_H + wallT / 2]]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 1.2), wallM);
      pillar.position.set(x, 1.3, z); pillar.castShadow = true; this.statics.add(pillar);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.3, 8), bowlM);
      bowl.position.set(x, 2.8, z); this.statics.add(bowl);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 6), torchM);
      flame.position.set(x, 3.2, z); this.group.add(flame); this.torches.push(flame);
    }
    // lanterns along lanes near towers
    for (const team of [0, 1] as const) for (const spec of TOWER_LAYOUT) {
      if (spec.tier === 'crystal') continue;
      const p = team === 0 ? spec.pos : mirrorPos(spec.pos);
      void p; // wooden lanterns (CC0 model) are placed in placeModels()
    }

    // scatter: tufts and flowers off the lanes
    const tuftGeo = new THREE.ConeGeometry(0.11, 0.22, 4);
    const tuftM = new THREE.MeshStandardMaterial({ color: 0x7cc35c, roughness: 0.95 });
    const flowerGeo = new THREE.SphereGeometry(0.07, 5, 4);
    const flowerCols = [0xfff2a8, 0xffffff, 0xff9ac4, 0xb9d9ff];
    const tufts: THREE.Matrix4[] = [], flowers: { m: THREE.Matrix4; c: number }[] = [];
    for (let i = 0; i < 1600; i++) {
      const x = 0.6 + hash(i, 100) * (ARENA_W - 1.2), z = 0.6 + hash(i, 101) * (ARENA_H - 1.2);
      if (laneDist(x, z) < 2.1 || nearStructure(x, z) || inRiver(x, z) || inWall({ x, y: z }, 0.3)) continue;
      const m = new THREE.Matrix4();
      if (hash(i, 102) < 0.66) { continue; }
      else { m.makeTranslation(x, 0.12, z); flowers.push({ m, c: flowerCols[Math.floor(hash(i, 105) * flowerCols.length)] }); }
    }
    this.windify(tuftM, 0.09);
    const tuftInst = new THREE.InstancedMesh(tuftGeo, tuftM, tufts.length);
    tufts.forEach((m, i) => tuftInst.setMatrixAt(i, m));
    tuftInst.castShadow = true; this.group.add(tuftInst);
    const flowerM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    this.windify(flowerM, 0.05);
    const flowerInst = new THREE.InstancedMesh(flowerGeo, flowerM, flowers.length);
    flowers.forEach((f, i) => { flowerInst.setMatrixAt(i, f.m); flowerInst.setColorAt(i, new THREE.Color(f.c)); });
    this.group.add(flowerInst);
    // trees inside the jungle (off lanes, off camps) for a sense of place
    const trunkM = pbrMaterial('sakura_bark', { repeat: 1, repeatY: 2 });
    const leafM = [new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x3f9448, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x5aa04a, roughness: 0.9 })];
    let trees = 0;
    for (let i = 0; i < 900 && trees < 60; i++) {
      const x = 2 + hash(i, 200) * (ARENA_W - 4), z = 2 + hash(i, 201) * (ARENA_H - 4);
      if (laneDist(x, z) < 3.2 || nearStructure(x, z, 3.4) || inRiver(x, z) || !inWall({ x, y: z }, -0.6)) continue;
      trees++;
      const h = 2.6 + hash(i, 202) * 2.2;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, h * 0.5, 6), trunkM);
      trunk.position.set(x, 1.5 + h * 0.25, z); trunk.castShadow = true; this.statics.add(trunk);
      const blossom = hash(i, 205) > 0.55;
      const crownM = blossom ? new THREE.MeshStandardMaterial({ color: [0xffb7d5, 0xff9ec6, 0xffd1e3][Math.floor(hash(i, 206) * 3)], roughness: 0.85 }) : leafM[Math.floor(hash(i, 204) * 3)];
      const cy = 1.5 + h * 0.5 + 0.5;
      for (let k = 0; k < 6; k++) {
        const rr = 0.55 + hash(i, 220 + k) * 0.5;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(rr, 14, 10), crownM);
        crown.position.set(x + (hash(i, 230 + k) - 0.5) * 1.6, cy + (hash(i, 240 + k) - 0.3) * 1.2, z + (hash(i, 250 + k) - 0.5) * 1.6);
        crown.scale.y = 0.8; crown.castShadow = true; this.statics.add(crown);
      }
    }
    // birds, mountains, clouds, forest outside
    const birdM = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 1 });
    for (let f = 0; f < 3; f++) {
      const flock = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const bird = new THREE.Group();
        for (const side of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.14), birdM); w.position.x = side * 0.26; bird.add(w); bird.userData[side < 0 ? 'wl' : 'wr'] = w; }
        bird.position.set((i - 2) * 1.4 + hash(f, i) * 0.5, Math.abs(i - 2) * -0.3, Math.abs(i - 2) * 1.1);
        flock.add(bird);
      }
      flock.userData.r = 34 + f * 9; flock.userData.h = 30 + f * 4; flock.userData.a = f * 2.1; flock.userData.spd = 0.05 + f * 0.012;
      this.birds.push(flock); this.group.add(flock);
    }
    const decor = new THREE.Group();
    this.group.add(decor);
    const mtnM = new THREE.MeshStandardMaterial({ color: 0x6f8aa3, roughness: 1 });
    const snowM = new THREE.MeshStandardMaterial({ color: 0xe8f0f8, roughness: 1 });
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + hash(i, 40) * 0.2;
      const d = 150 + hash(i, 41) * 40;
      const h = 18 + hash(i, 42) * 30, r = 12 + hash(i, 43) * 16;
      const x = ARENA_W / 2 + Math.cos(a) * d, z = ARENA_H / 2 + Math.sin(a) * d;
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mtnM);
      m.position.set(x, h / 2 - 1, z); m.rotation.y = hash(i, 44) * 3; decor.add(m);
      if (h > 32) { const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 6), snowM); cap.position.set(x, h - h * 0.16 - 1, z); cap.rotation.y = m.rotation.y; decor.add(cap); }
    }
    const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(hash(i, 50) * 3);
      for (let k = 0; k < n; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 + hash(i, 51 + k) * 2.5, 7, 5), cloudM);
        puff.position.set((k - n / 2) * 3 + hash(i, 60 + k) * 2, hash(i, 70 + k) * 1.2, (hash(i, 80 + k) - 0.5) * 3);
        puff.scale.y = 0.55; g.add(puff);
      }
      g.position.set((hash(i, 52) - 0.5) * 240 + ARENA_W / 2, 26 + hash(i, 53) * 12, (hash(i, 54) - 0.5) * 240 + ARENA_H / 2);
      g.userData.speed = 0.5 + hash(i, 55) * 0.6;
      mergeByMaterial(g); this.clouds.push(g); this.group.add(g);
    }
    const rockOutM = pbrMaterial('rock_face', { repeat: 1 });
    let placed = 0;
    for (let i = 0; i < 700 && placed < 160; i++) {
      const x = (hash(i, 1) - 0.5) * 180 + ARENA_W / 2, z = (hash(i, 2) - 0.5) * 180 + ARENA_H / 2;
      if (x > -4 && x < ARENA_W + 4 && z > -4 && z < ARENA_H + 4) continue;
      placed++;
      const kind = hash(i, 3);
      if (kind < 0.65) {
        const h = 2.5 + hash(i, 4) * 3.5;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, h * 0.45, 6), trunkM);
        trunk.position.set(x, h * 0.22, z); trunk.castShadow = true; decor.add(trunk);
        const tiers = 2 + Math.floor(hash(i, 5) * 2);
        for (let t = 0; t < tiers; t++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5 - t * 0.35 + hash(i, 6) * 0.4, 2.1, 7), leafM[Math.floor(hash(i, 7) * 3)]); cone.position.set(x, h * 0.4 + t * 1.25 + 0.8, z); cone.castShadow = true; decor.add(cone); }
      } else if (kind < 0.85) {
        const h = 2 + hash(i, 4) * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, h, 6), trunkM);
        trunk.position.set(x, h / 2, z); decor.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.4 + hash(i, 8) * 0.8, 14, 10), leafM[1 + Math.floor(hash(i, 9) * 2)]);
        crown.position.set(x, h + 0.8, z); crown.castShadow = true; decor.add(crown);
      } else {
        const rock = new THREE.Mesh(new THREE.SphereGeometry(0.6 + hash(i, 8) * 1.2, 10, 8), rockOutM);
        rock.position.set(x, 0.3, z); rock.rotation.set(hash(i, 9) * 3, hash(i, 10) * 3, 0); decor.add(rock);
      }
    }
    mergeByMaterial(decor);
    mergeByMaterial(this.statics);
    void this.placeModels();
    void this.applyPack(floor, outer);
  }

  /** Sponsor pack ground textures replace the CC0 set when present. */
  private async applyPack(floor: THREE.Mesh, outer: THREE.Mesh): Promise<void> {
    const g = await packTexture('grass', ARENA_W / 5.5);
    if (g) { for (const m of [floor, outer]) { const mat = m.material as THREE.MeshStandardMaterial; mat.map = g; mat.normalMap = null; mat.aoMap = null; mat.roughnessMap = null; mat.metalnessMap = null; mat.metalness = 0; mat.color.set(0xffffff); mat.needsUpdate = true; } }
  }

  /** CC0 props (Poly Haven): mossy boulders in the jungle, ferns at the cliff feet, wooden lanterns by the lanes. */
  private async placeModels(): Promise<void> {
    const spots = (seed: number, n: number, minLane: number, inside: boolean) => {
      const out: { x: number; z: number; r: number }[] = [];
      for (let i = 0; i < 1500 && out.length < n; i++) {
        const x = 2 + hash(i, seed) * (ARENA_W - 4), z = 2 + hash(i, seed + 1) * (ARENA_H - 4);
        if (laneDist(x, z) < minLane || nearStructure(x, z, 3.2) || inRiver(x, z)) continue;
        if (inside ? !inWall({ x, y: z }, -0.5) : inWall({ x, y: z }, 0.9)) continue;
        if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 2.5)) continue;
        out.push({ x, z, r: hash(i, seed + 2) });
      }
      return out;
    };
    try {
      // photogrammetry rocks are heavy (~65k tris): a handful, never clones of the 25k-tri grass
      const [boulder, mossRocks, fern, lantern] = await Promise.all([loadModel('boulder_01'), loadModel('rock_moss_set_01'), loadModel('fern_02'), loadModel('wooden_lantern_01')]);
      const g = new THREE.Group();
      for (const s of spots(300, 8, 3.4, false)) { const m = (s.r > 0.5 ? boulder : mossRocks).clone(); const sc = 0.7 + s.r * 0.9; m.scale.setScalar(sc); m.position.set(s.x, -0.05, s.z); m.rotation.y = s.r * 6; g.add(m); }
      for (const s of spots(320, 24, 2.6, false)) { const m = fern.clone(); m.scale.setScalar(0.7 + s.r * 0.6); m.position.set(s.x, 0, s.z); m.rotation.y = s.r * 6; g.add(m); }
      // grass: crossed alpha-cut blades (4 tris a clump) instanced — scattered tufts and the dense 草丛
      const bladeTex = grassBladeTexture();
      const bladeM = new THREE.MeshStandardMaterial({ map: bladeTex, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, color: 0xa8d87a });
      this.windify(bladeM, 0.08);
      const bladeGeo = (() => { const a = new THREE.PlaneGeometry(1, 1); a.translate(0, 0.5, 0); const b = a.clone(); b.rotateY(Math.PI / 2); const c = a.clone(); c.rotateY(Math.PI / 4); const d = a.clone(); d.rotateY(-Math.PI / 4); return mergeGeometries([a, b, c, d], false)!; })();
      const placements: THREE.Matrix4[] = [];
      const put = (x: number, z: number, w: number, h: number, rot: number) => { const m = new THREE.Matrix4(); m.makeRotationY(rot).setPosition(x, 0, z); m.scale(new THREE.Vector3(w, h, w)); placements.push(m); };
      for (const s of spots(340, 260, 2.2, false)) put(s.x, s.z, 0.7 + s.r * 0.5, 0.5 + s.r * 0.4, s.r * 6);
      for (const b of BUSHES) for (let k = 0; k < Math.round(b.r * 12); k++) { const a = hash(k, b.pos.x) * Math.PI * 2, rr = Math.sqrt(hash(k, b.pos.y)) * b.r * 0.92; put(b.pos.x + Math.cos(a) * rr, b.pos.y + Math.sin(a) * rr, 1.1 + hash(k, 3) * 0.5, 1.5 + hash(k, 7) * 0.6, hash(k, 8) * 6); }
      const inst = new THREE.InstancedMesh(bladeGeo, bladeM, placements.length);
      placements.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.castShadow = false; inst.receiveShadow = true; g.add(inst);
      for (const team of [0, 1] as const) for (const spec of TOWER_LAYOUT) {
        if (spec.tier === 'crystal') continue;
        const p = team === 0 ? spec.pos : mirrorPos(spec.pos);
        for (const [dx, dz] of [[2.6, 0], [-2.6, 0], [0, 2.6], [0, -2.6]]) if (laneDist(p.x + dx, p.y + dz) > 1.6) { const m = lantern.clone(); m.scale.setScalar(1.6); m.position.set(p.x + dx, 0, p.y + dz); g.add(m); }
      }
      this.group.add(g);
    } catch (e) { console.warn('props failed to load', e); }
  }

  /** Inject a gentle wind sway into a material's vertex shader (tips move, roots stay). */
  private windify(m: THREE.MeshStandardMaterial, amp: number): void {
    const wt = this.windTime;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = wt;
      shader.uniforms.uWindAmp = { value: amp };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uWind; uniform float uWindAmp;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vec3 wpos = (instanceMatrix * vec4(position, 1.0)).xyz;
          #else
            vec3 wpos = position;
          #endif
          float sway = sin(uWind * 1.9 + wpos.x * 0.55 + wpos.z * 0.35) + 0.5 * sin(uWind * 3.1 + wpos.z * 0.9);
          float tip = clamp(position.y / 0.22 + 0.5, 0.0, 1.5);
          transformed.x += sway * uWindAmp * tip;
          transformed.z += sway * uWindAmp * 0.4 * tip;`);
    };
    m.customProgramCacheKey = () => `wind${amp}`;
    this.windMats.push(m);
  }

  private lanternMats = { post: new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 }), cage: new THREE.MeshStandardMaterial({ color: 0x2b2f36, metalness: 0.5, roughness: 0.5 }), glow: new THREE.MeshStandardMaterial({ color: 0xffe3a0, emissive: 0xffb347, emissiveIntensity: 3 }) };

  private lantern(x: number, y: number, z: number, postH: number): void {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, postH, 6), this.lanternMats.post);
    post.position.set(x, y - postH / 2 + 0.2, z); post.castShadow = true; this.statics.add(post);
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.22), this.lanternMats.cage);
    cage.position.set(x, y + 0.3, z); this.statics.add(cage);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), this.lanternMats.glow);
    glow.position.set(x, y + 0.3, z); this.statics.add(glow); this.lanterns.push(glow);
  }

  update(time: number, cameraPos?: THREE.Vector3): void {
    if (cameraPos) this.sky.position.copy(cameraPos);
    this.water.uniforms.time.value = time;
    this.windTime.value = time;
    for (const flock of this.birds) {
      const a = (flock.userData.a as number) + time * (flock.userData.spd as number);
      const r = flock.userData.r as number;
      flock.position.set(ARENA_W / 2 + Math.cos(a) * r, (flock.userData.h as number) + Math.sin(time * 0.4) * 1.5, ARENA_H / 2 + Math.sin(a) * r);
      flock.rotation.y = -a - Math.PI / 2;
      flock.children.forEach((b, i) => { const f = Math.sin(time * 7 + i * 1.1) * 0.6; (b.userData.wl as THREE.Object3D).rotation.z = f; (b.userData.wr as THREE.Object3D).rotation.z = -f; });
    }
    for (const c of this.clouds) { c.position.x += (c.userData.speed as number) * 0.016; if (c.position.x > ARENA_W / 2 + 130) c.position.x = ARENA_W / 2 - 130; }
    for (let i = 0; i < this.torches.length; i++) {
      const t = this.torches[i];
      const f = 0.85 + Math.sin(time * 13 + i * 1.7) * 0.15 + Math.sin(time * 31 + i) * 0.08;
      t.scale.set(f, 0.9 + Math.sin(time * 17 + i * 2.1) * 0.25, f);
    }
    this.lanternMats.glow.emissiveIntensity = 2.6 + Math.sin(time * 5) * 0.5;
    for (const g of this.crystalGlows) (g.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(time * 2.5) * 0.4;
    for (const g of this.objGlows) (g.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9 + Math.sin(time * 1.8) * 0.5;
    for (let i = 0; i < this.flags.length; i++) {
      const f = this.flags[i];
      const pos = f.geometry.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), y = pos.getY(v);
        pos.setZ(v, Math.sin(time * 3 + x * 3 + i) * 0.08 * (x + 0.45) + Math.sin(time * 5 + y * 4) * 0.02);
      }
      pos.needsUpdate = true;
    }
  }

  /** The viewer changed sides: banners and fountain glows follow the blue-is-mine rule. */
  refreshTeamColours(): void {
    for (const b of this.wallBanners) { const m = b.flag.material as THREE.MeshStandardMaterial; m.map = isMine(b.team) ? this.bannerTex.mine : this.bannerTex.foe; m.needsUpdate = true; }
    this.crystalGlows.forEach((g, i) => { const m = g.material as THREE.MeshStandardMaterial; const mine = isMine(i as Team); m.color.set(mine ? 0x5fb8ff : 0xff8a7a); m.emissive.set(mine ? 0x2a6fd6 : 0xd63b3b); });
  }

  /** Kept for API compatibility with the old arena (no deploy zones in this game). */
  showDeployZone(_w: World | null, _team: Team, _hero: Unit | undefined, _isSpell: boolean): void { /* nothing */ }
}
