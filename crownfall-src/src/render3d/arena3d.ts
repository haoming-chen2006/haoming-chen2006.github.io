import * as THREE from 'three';
import { ARENA_H, ARENA_W, BRIDGES, POSSESS, RIVER_BOT, RIVER_TOP, TOWER_LAYOUT, mirrorPos } from '../game/constants.ts';
import { deployZoneAllowed } from '../game/deploy.ts';
import type { Team, Unit } from '../game/types.ts';
import type { World } from '../game/world.ts';
import { bannerTexture, cobbleTexture, dirtTexture, grassTexture, stoneTexture, woodTexture } from './textures.ts';
import { mergeByMaterial } from './model_kit.ts';

const hash = (x: number, y: number, s = 0): number => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

const inLane = (x: number) => BRIDGES.some((b) => Math.abs(x - b.x) < 1.35);
const nearPlinth = (x: number, z: number) => {
  for (const team of [0, 1] as const) for (const spec of TOWER_LAYOUT) {
    const p = team === 0 ? spec.pos : mirrorPos(spec.pos);
    const s = spec.type === 'king' ? 2.6 : 2.0;
    if (Math.abs(x - p.x) < s && Math.abs(z - p.y) < s) return true;
  }
  return false;
};

export class Arena3D {
  readonly group = new THREE.Group();
  private sky: THREE.Mesh;
  private water: THREE.ShaderMaterial;
  private zone = new THREE.Group();
  private zoneKey = '';
  private heroDisc: THREE.Mesh;
  private torches: THREE.Mesh[] = [];
  private clouds: THREE.Group[] = [];
  private flags: THREE.Mesh[] = [];
  private lanterns: THREE.Mesh[] = [];
  private birds: THREE.Group[] = [];
  private windMats: THREE.MeshStandardMaterial[] = [];
  private windTime = { value: 0 };

  private statics = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.group.add(this.statics);
    // sky dome (world-space gradient) + matching fog
    scene.background = new THREE.Color(0xc4dcef);
    scene.fog = new THREE.Fog(0xc4dcef, 60, 150);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(200, 24, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { zenith: { value: new THREE.Color(0x2b62b3) }, mid: { value: new THREE.Color(0x6fa8e0) }, horizon: { value: new THREE.Color(0xc4dcef) }, ground: { value: new THREE.Color(0x8fb4a0) }, sunDir: { value: new THREE.Vector3(0.5, 0.6, 0.35).normalize() } },
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

    // outer ground
    const outerTex = grassTexture(512, [64, 112, 56], true);
    outerTex.repeat.set(30, 30);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ map: outerTex, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(ARENA_W / 2, -0.05, ARENA_H / 2);
    outer.receiveShadow = true;
    this.group.add(outer);

    // arena floor
    const grass = grassTexture(512, [92, 160, 74]);
    grass.repeat.set(ARENA_W / 4.5, ARENA_H / 4.5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_W, ARENA_H), new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ARENA_W / 2, 0, ARENA_H / 2);
    floor.receiveShadow = true;
    this.group.add(floor);

    // cobbled lanes with worn dirt edges
    const cobble = cobbleTexture();
    cobble.repeat.set(1, 13);
    const dirt = dirtTexture();
    dirt.repeat.set(1, 6);
    for (const b of BRIDGES) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(3.0, ARENA_H - 5), new THREE.MeshStandardMaterial({ map: dirt, transparent: true, opacity: 0.4, roughness: 1, depthWrite: false }));
      edge.rotation.x = -Math.PI / 2; edge.position.set(b.x, 0.011, ARENA_H / 2); edge.receiveShadow = true; this.group.add(edge);
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, ARENA_H - 5), new THREE.MeshStandardMaterial({ map: cobble, roughness: 0.9 }));
      lane.rotation.x = -Math.PI / 2; lane.position.set(b.x, 0.013, ARENA_H / 2); lane.receiveShadow = true; this.group.add(lane);
    }
    // centre-line stones across the field
    const stone = stoneTexture(256, [160, 160, 165]);
    const stoneM = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.95 });

    // river bed + water
    const bed = new THREE.Mesh(new THREE.BoxGeometry(ARENA_W + 4, 0.6, RIVER_BOT - RIVER_TOP + 0.4), new THREE.MeshStandardMaterial({ color: 0x2c4a6b, roughness: 1 }));
    bed.position.set(ARENA_W / 2, -0.45, (RIVER_TOP + RIVER_BOT) / 2);
    this.group.add(bed);
    for (let i = 0; i < 26; i++) { // river pebbles
      const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + hash(i, 90) * 0.12, 0), new THREE.MeshStandardMaterial({ color: 0x8a95a3, roughness: 1, flatShading: true }));
      peb.position.set(hash(i, 91) * ARENA_W, -0.16, RIVER_TOP + 0.2 + hash(i, 92) * 1.6);
      this.statics.add(peb);
    }
    this.water = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      transparent: true,
      vertexShader: `varying vec2 vUv; uniform float time; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x*2.5+time*2.2)*0.035 + cos(p.y*5.0-time*1.7)*0.03; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader: `uniform float time; varying vec2 vUv;
        void main(){
          float w = sin(vUv.x*70.0 + time*2.0 + sin(vUv.y*14.0+time)*2.0)*0.5+0.5;
          float w2 = sin(vUv.x*45.0 - time*1.3 + vUv.y*22.0)*0.5+0.5;
          vec3 deep = vec3(0.10,0.36,0.64); vec3 light = vec3(0.34,0.66,0.92);
          vec3 c = mix(deep, light, w*0.45+w2*0.35);
          float foam = smoothstep(0.82, 1.0, w*w2*1.7);
          float edge = smoothstep(0.0,0.12,vUv.y)*smoothstep(1.0,0.88,vUv.y);
          c = mix(c, vec3(0.92,0.97,1.0), foam*0.55 + (1.0-edge)*0.35);
          gl_FragColor = vec4(c, 0.9);
        }`,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_W + 4, RIVER_BOT - RIVER_TOP + 0.3, 40, 6), this.water);
    water.rotation.x = -Math.PI / 2;
    water.position.set(ARENA_W / 2, -0.12, (RIVER_TOP + RIVER_BOT) / 2);
    this.group.add(water);
    // banks
    const sand = new THREE.MeshStandardMaterial({ color: 0xcdb27a, roughness: 1 });
    for (const z of [RIVER_TOP - 0.15, RIVER_BOT + 0.15]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(ARENA_W + 4, 0.12, 0.3), sand);
      bank.position.set(ARENA_W / 2, 0.0, z);
      bank.receiveShadow = true;
      this.group.add(bank);
    }
    for (let i = 0; i < 10; i++) { // reeds along the banks
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.9, 4), new THREE.MeshStandardMaterial({ color: 0x5e8a3a, roughness: 1 }));
      const z = hash(i, 93) > 0.5 ? RIVER_TOP - 0.35 : RIVER_BOT + 0.35;
      reed.position.set(0.5 + hash(i, 94) * (ARENA_W - 1), 0.45, z);
      if (!inLane(reed.position.x)) this.statics.add(reed);
    }
    // bridges with arches and lantern posts
    const wood = woodTexture();
    const woodM = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 });
    const railM = new THREE.MeshStandardMaterial({ color: 0x5a3f26, roughness: 0.9 });
    for (const b of BRIDGES) {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(b.halfW * 2 + 0.4, 0.22, RIVER_BOT - RIVER_TOP + 0.9), woodM);
      deck.position.set(b.x, 0.08, (RIVER_TOP + RIVER_BOT) / 2);
      deck.castShadow = true; deck.receiveShadow = true;
      this.statics.add(deck);
      for (const z of [RIVER_TOP - 0.05, RIVER_BOT + 0.05]) {
        const abutment = new THREE.Mesh(new THREE.BoxGeometry(b.halfW * 2 + 0.7, 0.5, 0.5), stoneM);
        abutment.position.set(b.x, -0.2, z); abutment.castShadow = true;
        this.statics.add(abutment);
      }
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, RIVER_BOT - RIVER_TOP + 0.9), railM);
        rail.position.set(b.x + side * (b.halfW + 0.15), 0.4, (RIVER_TOP + RIVER_BOT) / 2);
        rail.castShadow = true;
        this.statics.add(rail);
        for (const dz of [-1.35, 0, 1.35]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), railM);
          post.position.set(b.x + side * (b.halfW + 0.15), 0.42, (RIVER_TOP + RIVER_BOT) / 2 + dz);
          this.statics.add(post);
        }
        for (const dz of [-1.35, 1.35]) this.lantern(b.x + side * (b.halfW + 0.15), 0.82, (RIVER_TOP + RIVER_BOT) / 2 + dz, 0.5);
      }
    }
    // tower plinths (cobbled) with stone edging
    const plinthTex = cobbleTexture();
    plinthTex.repeat.set(2, 2);
    const plinthM = new THREE.MeshStandardMaterial({ map: plinthTex, roughness: 0.95 });
    for (const team of [0, 1] as const) for (const spec of TOWER_LAYOUT) {
      const p = team === 0 ? spec.pos : mirrorPos(spec.pos);
      const s = spec.type === 'king' ? 4.8 : 3.5;
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(s, 0.16, s), plinthM);
      plinth.position.set(p.x, 0.06, p.y);
      plinth.receiveShadow = true; plinth.castShadow = true;
      this.statics.add(plinth);
      const edging = new THREE.Mesh(new THREE.BoxGeometry(s + 0.3, 0.1, s + 0.3), stoneM);
      edging.position.set(p.x, 0.02, p.y);
      this.statics.add(edging);
    }
    // perimeter wall with team banners and torches
    const wallM = new THREE.MeshStandardMaterial({ map: stoneTexture(256, [130, 132, 140]), roughness: 0.95 });
    const wallH = 0.9, wallT = 0.6;
    const walls: [number, number, number, number][] = [
      [ARENA_W / 2, -wallT / 2, ARENA_W + wallT * 2, wallT], [ARENA_W / 2, ARENA_H + wallT / 2, ARENA_W + wallT * 2, wallT],
      [-wallT / 2, ARENA_H / 2, wallT, ARENA_H], [ARENA_W + wallT / 2, ARENA_H / 2, wallT, ARENA_H],
    ];
    for (const [x, z, w, d] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallM);
      m.position.set(x, wallH / 2, z);
      m.castShadow = true; m.receiveShadow = true;
      this.statics.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, d + 0.1), stoneM);
      cap.position.set(x, wallH + 0.06, z);
      this.statics.add(cap);
    }
    const innerEdge = new THREE.MeshStandardMaterial({ color: 0x8b8f96, roughness: 1 });
    for (const [x, z, w, d] of [[ARENA_W / 2, 0.15, ARENA_W, 0.3], [ARENA_W / 2, ARENA_H - 0.15, ARENA_W, 0.3], [0.15, ARENA_H / 2, 0.3, ARENA_H], [ARENA_W - 0.15, ARENA_H / 2, 0.3, ARENA_H]] as [number, number, number, number][]) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), innerEdge);
      e.position.set(x, 0.03, z); e.receiveShadow = true; this.statics.add(e);
    }
    const torchM = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff7a1a, emissiveIntensity: 3.5 });
    const bowlM = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.5 });
    for (const [x, z] of [[-wallT / 2, -wallT / 2], [ARENA_W + wallT / 2, -wallT / 2], [-wallT / 2, ARENA_H + wallT / 2], [ARENA_W + wallT / 2, ARENA_H + wallT / 2], [-wallT / 2, 16], [ARENA_W + wallT / 2, 16]]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.1), wallM);
      pillar.position.set(x, 1.1, z); pillar.castShadow = true;
      this.statics.add(pillar);
      const capP = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 1.3), stoneM);
      capP.position.set(x, 2.25, z); this.statics.add(capP);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.3, 8), bowlM);
      bowl.position.set(x, 2.45, z); this.statics.add(bowl);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 6), torchM);
      flame.position.set(x, 2.85, z);
      this.group.add(flame);
      this.torches.push(flame);
    }
    // team banners along the side walls
    const bannerTex: Record<0 | 1, THREE.Texture> = { 0: bannerTexture('#2f7fd6'), 1: bannerTexture('#d63b3b') };
    for (const side of [-1, 1]) for (const z of [5, 11, 21, 27]) {
      const team: 0 | 1 = z > 16 ? 0 : 1;
      const x = side < 0 ? -wallT - 0.05 : ARENA_W + wallT + 0.05;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), railM);
      pole.position.set(x, 1.3, z); this.statics.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.3, 6, 1), new THREE.MeshStandardMaterial({ map: bannerTex[team], side: THREE.DoubleSide, roughness: 0.9 }));
      flag.position.set(x, 1.9, z + 0.5); flag.rotation.y = Math.PI / 2; flag.castShadow = true;
      this.group.add(flag); this.flags.push(flag);
    }
    // flower / tuft scatter inside the arena (instanced)
    const tuftGeo = new THREE.ConeGeometry(0.11, 0.22, 4);
    const tuftM = new THREE.MeshStandardMaterial({ color: 0x7cc35c, roughness: 1, flatShading: true });
    const flowerGeo = new THREE.SphereGeometry(0.07, 5, 4);
    const flowerCols = [0xfff2a8, 0xffffff, 0xff9ac4, 0xb9d9ff];
    const tufts: THREE.Matrix4[] = [], flowers: { m: THREE.Matrix4; c: number }[] = [];
    for (let i = 0; i < 420; i++) {
      const x = 0.6 + hash(i, 100) * (ARENA_W - 1.2), z = 0.6 + hash(i, 101) * (ARENA_H - 1.2);
      if (inLane(x) || nearPlinth(x, z) || (z > RIVER_TOP - 0.6 && z < RIVER_BOT + 0.6)) continue;
      const m = new THREE.Matrix4();
      if (hash(i, 102) < 0.62) { m.makeRotationY(hash(i, 103) * 6).setPosition(x, 0.1, z); m.scale(new THREE.Vector3(0.8 + hash(i, 106) * 0.6, 0.6 + hash(i, 104) * 0.7, 0.8 + hash(i, 106) * 0.6)); tufts.push(m); }
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
    // birds circling far above the arena
    const birdM = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 1 });
    for (let f = 0; f < 3; f++) {
      const flock = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const bird = new THREE.Group();
        for (const side of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.14), birdM); w.position.x = side * 0.26; bird.add(w); bird.userData[side < 0 ? 'wl' : 'wr'] = w; }
        bird.position.set((i - 2) * 1.4 + hash(f, i) * 0.5, Math.abs(i - 2) * -0.3, Math.abs(i - 2) * 1.1);
        flock.add(bird);
      }
      flock.userData.r = 26 + f * 9; flock.userData.h = 30 + f * 4; flock.userData.a = f * 2.1; flock.userData.spd = 0.05 + f * 0.012;
      this.birds.push(flock);
      this.group.add(flock);
    }
    // lanterns along the lanes
    for (const b of BRIDGES) for (const z of [7.5, 24.5]) for (const side of [-1, 1]) this.lantern(b.x + side * 1.45, 1.1, z, 0.9);

    // distant mountains and drifting clouds for a living skyline
    const decor = new THREE.Group();
    this.group.add(decor);
    const mtnM = new THREE.MeshStandardMaterial({ color: 0x5f7a93, roughness: 1, flatShading: true });
    const snowM = new THREE.MeshStandardMaterial({ color: 0xe8f0f8, roughness: 1, flatShading: true });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + hash(i, 40) * 0.2;
      const d = 120 + hash(i, 41) * 30;
      const h = 16 + hash(i, 42) * 26, r = 10 + hash(i, 43) * 14;
      const x = ARENA_W / 2 + Math.cos(a) * d, z = ARENA_H / 2 + Math.sin(a) * d;
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mtnM);
      m.position.set(x, h / 2 - 1, z); m.rotation.y = hash(i, 44) * 3;
      decor.add(m);
      if (h > 28) { const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 6), snowM); cap.position.set(x, h - h * 0.16 - 1, z); cap.rotation.y = m.rotation.y; decor.add(cap); }
    }
    const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const n = 3 + Math.floor(hash(i, 50) * 3);
      for (let k = 0; k < n; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 + hash(i, 51 + k) * 2.5, 7, 5), cloudM);
        puff.position.set((k - n / 2) * 3 + hash(i, 60 + k) * 2, hash(i, 70 + k) * 1.2, (hash(i, 80 + k) - 0.5) * 3);
        puff.scale.y = 0.55;
        g.add(puff);
      }
      g.position.set((hash(i, 52) - 0.5) * 200 + ARENA_W / 2, 24 + hash(i, 53) * 12, (hash(i, 54) - 0.5) * 200 + ARENA_H / 2);
      g.userData.speed = 0.5 + hash(i, 55) * 0.6;
      mergeByMaterial(g);
      this.clouds.push(g);
      this.group.add(g);
    }
    // forest, bushes and rocks outside the walls
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
    const leafM = [new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0x3f9448, roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0x5aa04a, roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0x8fb04a, roughness: 1, flatShading: true })];
    const rockM = new THREE.MeshStandardMaterial({ color: 0x7d838c, roughness: 1, flatShading: true });
    let placed = 0;
    for (let i = 0; i < 500 && placed < 120; i++) {
      const x = (hash(i, 1) - 0.5) * 120 + ARENA_W / 2, z = (hash(i, 2) - 0.5) * 140 + ARENA_H / 2;
      if (x > -4 && x < ARENA_W + 4 && z > -6 && z < ARENA_H + 6) continue;
      if (z > ARENA_H + 4 && z < ARENA_H + 18 && x > 1 && x < ARENA_W - 1) continue; // keep the camera's view clear
      placed++;
      const kind = hash(i, 3);
      if (kind < 0.6) {
        const h = 2.5 + hash(i, 4) * 3.5;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, h * 0.45, 6), trunkM);
        trunk.position.set(x, h * 0.22, z); trunk.castShadow = true;
        decor.add(trunk);
        const tiers = 2 + Math.floor(hash(i, 5) * 2);
        for (let t = 0; t < tiers; t++) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5 - t * 0.35 + hash(i, 6) * 0.4, 2.1, 7), leafM[Math.floor(hash(i, 7) * 3)]);
          cone.position.set(x, h * 0.4 + t * 1.25 + 0.8, z); cone.castShadow = true;
          decor.add(cone);
        }
      } else if (kind < 0.8) {
        // round deciduous tree
        const h = 2 + hash(i, 4) * 2;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, h, 6), trunkM);
        trunk.position.set(x, h / 2, z); trunk.castShadow = true; decor.add(trunk);
        const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4 + hash(i, 8) * 0.8, 0), leafM[3 - Math.floor(hash(i, 9) * 2)]);
        crown.position.set(x, h + 0.8, z); crown.castShadow = true; decor.add(crown);
      } else if (kind < 0.9) {
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + hash(i, 8) * 0.6, 0), leafM[1]);
        bush.position.set(x, 0.4, z); bush.scale.y = 0.7; bush.castShadow = true; decor.add(bush);
      } else {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + hash(i, 8) * 1.2, 0), rockM);
        rock.position.set(x, 0.3, z); rock.rotation.set(hash(i, 9) * 3, hash(i, 10) * 3, 0); rock.castShadow = true;
        decor.add(rock);
      }
    }
    mergeByMaterial(decor);
    mergeByMaterial(this.statics);
    // deploy zone overlay + hero disc
    this.group.add(this.zone);
    this.heroDisc = new THREE.Mesh(new THREE.CircleGeometry(POSSESS.summonRadius, 40), new THREE.MeshBasicMaterial({ color: 0xffd86b, transparent: true, opacity: 0.16, depthWrite: false }));
    this.heroDisc.rotation.x = -Math.PI / 2;
    this.heroDisc.visible = false;
    this.group.add(this.heroDisc);
  }

  /** Inject a gentle wind sway into an instanced material's vertex shader (tips move, roots stay). */
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
    for (const c of this.clouds) {
      c.position.x += (c.userData.speed as number) * 0.016;
      if (c.position.x > ARENA_W / 2 + 110) c.position.x = ARENA_W / 2 - 110;
    }
    for (let i = 0; i < this.torches.length; i++) {
      const t = this.torches[i];
      const f = 0.85 + Math.sin(time * 13 + i * 1.7) * 0.15 + Math.sin(time * 31 + i) * 0.08;
      t.scale.set(f, 0.9 + Math.sin(time * 17 + i * 2.1) * 0.25, f);
    }
    this.lanternMats.glow.emissiveIntensity = 2.6 + Math.sin(time * 5) * 0.5;
    // waving banners: displace plane vertices
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

  /** Show/hide the deployable-tile overlay for a team. */
  showDeployZone(w: World | null, team: Team, hero: Unit | undefined, isSpell: boolean): void {
    const key = w && !isSpell ? `${team}:${w.towers(0).length}:${w.towers(1).length}` : '';
    if (key !== this.zoneKey) {
      this.zoneKey = key;
      this.zone.clear();
      if (w && key) {
        const tiles: number[] = [];
        for (let y = 0; y < ARENA_H; y++) for (let x = 0; x < ARENA_W; x++) if (deployZoneAllowed(w, team, { x: x + 0.5, y: y + 0.5 })) tiles.push(x, y);
        const geo = new THREE.PlaneGeometry(0.92, 0.92);
        const m = new THREE.MeshBasicMaterial({ color: 0x5eff9a, transparent: true, opacity: 0.16, depthWrite: false });
        const inst = new THREE.InstancedMesh(geo, m, tiles.length / 2);
        const mtx = new THREE.Matrix4();
        const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
        for (let i = 0; i < tiles.length / 2; i++) {
          mtx.makeTranslation(tiles[i * 2] + 0.5, 0.02, tiles[i * 2 + 1] + 0.5).multiply(rot);
          inst.setMatrixAt(i, mtx);
        }
        this.zone.add(inst);
      }
    }
    this.zone.visible = !!key;
    this.heroDisc.visible = !!(w && !isSpell && hero);
    if (hero) this.heroDisc.position.set(hero.pos.x, 0.03, hero.pos.y);
  }
}
