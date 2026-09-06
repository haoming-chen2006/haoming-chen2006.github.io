// env-dressing: standalone dev scene for PropsView / CryptView (dev-props.html). Not part of the game.
// URL params: cam=x,y,z look=x,y,z crypt=1 (dark local lighting) inspect=1 (dump model node names) sun=intensity
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { terrainHeight } from '../sim/terrain.ts';
import { MAP_HALF, LAKE, LANDMARKS } from '../content/level.ts';
import { PropsView } from './props.ts';
import { CryptView } from './crypt.ts';
import { loadTemplate, propPath } from './structures.ts';

const q = new URLSearchParams(location.search);
// other agents write into public/ while this page is up; Vite would full-reload on every change — refuse (dev page only)
if (import.meta.hot) import.meta.hot.on('vite:beforeFullReload', () => { throw '(dev-props: skipping full reload)'; });
const vec = (s: string | null, d: [number, number, number]) => { const p = (s ?? '').split(',').map(Number); return p.length === 3 && p.every((n) => !isNaN(n)) ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(...d); };
const canvas = document.getElementById('gl') as HTMLCanvasElement;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1500);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = q.get('noshadow') !== '1'; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera, new BloomEffect({ intensity: 0.55, luminanceThreshold: 0.85, luminanceSmoothing: 0.2, mipmapBlur: true, radius: 0.7 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new SMAAEffect()));

const inCrypt = q.get('crypt') === '1';
const sunI = q.has('sun') ? Number(q.get('sun')) : inCrypt ? 0 : 3.2;
const sun = new THREE.DirectionalLight(0xffd9a8, sunI); sun.castShadow = sunI > 0;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
const sc = sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 300;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0x8fb3ff, 0x3b3a2a, inCrypt ? 0.02 : 0.55); scene.add(hemi);
scene.background = new THREE.Color(inCrypt ? 0x000000 : 0x2b3a55);
scene.fog = inCrypt ? new THREE.FogExp2(0x05070a, 0.03) : new THREE.FogExp2(0x3c4a63, 0.012);

// stand-in terrain + water (the real ones live in world.ts)
if (!inCrypt) {
  const seg = 220, size = MAP_HALF * 2; const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute; const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const h = terrainHeight(x, z); pos.setY(i, h); const g = h < 1.3 ? [0.5, 0.45, 0.33] : h < 12 ? [0.2, 0.3, 0.12] : [0.35, 0.33, 0.3]; colors.set(g, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); terrain.receiveShadow = true; scene.add(terrain);
  const wgeo = new THREE.CircleGeometry(LAKE.r + 30, 64); wgeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: 0x1b3a52, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.9 })); water.position.set(LAKE.x, LAKE.level, LAKE.z); scene.add(water);
} else {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1 })); floor.position.set(0, -0.05, -500); floor.receiveShadow = true; scene.add(floor);
}

// 1.8 m reference capsules (player-sized) at key spots
if (q.get('ref') !== '0') {
  const capMat = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.6 });
  const spots = [[0, 22], [4, 24], [28, 32.5], [33, 29], [55.8, 1.8], [64, -9], [66, -3], [73, -27], [45, 17], [-5, 19], [0, -480], [0, -504], [0, -540], [0, -524]];
  for (const [x, z] of spots) { const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.2, 4, 10), capMat); c.position.set(x, terrainHeight(x, z) + 0.9, z); c.castShadow = true; scene.add(c); }
}
const props = new PropsView(scene); const crypt = new CryptView(scene);
(window as any).__dev = { scene, camera, props, crypt, THREE, renderer, sun, hemi };
const hud = document.getElementById('hud')!;

async function inspect() {
  const ids = ['dutch_ship_medium', 'treasure_chest', 'large_iron_gate', 'modular_wooden_pier', 'modular_fort_01', 'wooden_barrels_01', 'rock_moss_set_01', 'rock_moss_set_02', 'brass_candleholders'];
  for (const id of ids) {
    const t = await loadTemplate(propPath(id)); const lines: string[] = [];
    t.traverse((o) => { if (o === t) return; const b = new THREE.Box3().setFromObject(o); const f = (v: THREE.Vector3) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; lines.push(`${'  '.repeat(depth(o, t))}${o.type} "${o.name}" min ${f(b.min)} max ${f(b.max)}`); });
    console.log(`[inspect] ${id}\n` + lines.join('\n'));
  }
}
const depth = (o: THREE.Object3D, root: THREE.Object3D) => { let d = 0; while (o.parent && o.parent !== root) { o = o.parent; d++; } return d; };

(async () => {
  const t0 = performance.now();
  if (q.get('inspect') === '1') await inspect();
  await Promise.all([props.load(), crypt.load()]);
  console.log('props loaded in', Math.round(performance.now() - t0), 'ms');
  document.getElementById('loading')!.classList.add('hide');
  const camPos = vec(q.get('cam'), [LANDMARKS.start.x + 4, terrainHeight(LANDMARKS.start.x, LANDMARKS.start.z) + 3, LANDMARKS.start.z + 6]);
  const look = vec(q.get('look'), [LANDMARKS.wreck.x, terrainHeight(LANDMARKS.wreck.x, LANDMARKS.wreck.z) + 1, LANDMARKS.wreck.z]);
  camera.position.copy(camPos); camera.lookAt(look);
  (window as any).__dev.setCam = (p: number[], l: number[]) => { camera.position.set(p[0], p[1], p[2]); camera.lookAt(new THREE.Vector3(l[0], l[1], l[2])); };
  let last = performance.now();
  const frame = () => {
    const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
    sun.position.set(look.x - 60, 45, look.z - 80); sun.target.position.copy(look); sun.target.updateMatrixWorld();
    props.update(dt, camera.position); crypt.update(dt, camera.position);
    composer.render(dt);
    hud.textContent = `cam ${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}  draws ${renderer.info.render.calls} tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k`;
    requestAnimationFrame(frame);
  };
  frame();
})().catch((e) => { console.error(e); document.getElementById('loading')!.textContent = 'failed: ' + e.message; });
