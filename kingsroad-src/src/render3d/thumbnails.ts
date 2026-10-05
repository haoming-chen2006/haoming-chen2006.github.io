import * as THREE from 'three';
import type { Role, UnitDef } from '../game/types.ts';
import { buildUnitModel } from './models.ts';

const ROLE_BG: Record<Role, [string, string]> = {
  tank: ['#4f6f8f', '#1f2d3a'], warrior: ['#3f8f6a', '#163a2b'], assassin: ['#6b3fa0', '#241446'], mage: ['#c9412a', '#4a150c'], marksman: ['#b8742a', '#432a0c'], support: ['#8e7fd6', '#2e2a5a'],
};

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
const cache = new Map<string, HTMLCanvasElement>();

function setup(w: number, h: number): void {
  if (renderer) { renderer.setSize(w, h, false); camera!.aspect = w / h; camera!.updateProjectionMatrix(); return; }
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(2);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x445533, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0d2, 2.4);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9fc3ff, 1.0);
  rim.position.set(-4, 3, -3);
  scene.add(rim);
  camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 50);
}

/** Render a hero's 3D model onto a 2D portrait canvas (cached per hero id and size). */
export function cardThumbnail(def: UnitDef, w = 128, h = 170, team: 0 | 1 = 0): HTMLCanvasElement {
  const key = `${def.id}:${team}:${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  setup(w, h);
  const out = document.createElement('canvas');
  out.width = w * 2; out.height = h * 2;
  const ctx = out.getContext('2d')!;
  const [c1, c2] = ROLE_BG[def.role] ?? ROLE_BG.warrior;
  const grad = ctx.createLinearGradient(0, 0, 0, out.height);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, out.width, out.height);
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.arc(out.width / 2, out.height * 0.58, out.width * 0.44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(out.width / 2, out.height * 0.8, out.width * 0.32, out.height * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  try {
    const group = new THREE.Group();
    const model = buildUnitModel(def.look, team);
    model.ring.visible = false;
    model.body.rotation.y = -0.75;
    model.body.position.y = model.hover;
    group.add(model.root);
    group.position.y = -(model.height + model.hover) * 0.5;
    group.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'emissiveIntensity' in m && m.emissiveIntensity > 1.2) m.emissiveIntensity = 1.2; });
    scene!.add(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    group.position.sub(center);
    group.updateMatrixWorld(true);
    const sphere = Math.max(size.x, size.y * 1.15, size.z) * 0.5;
    const fov = (32 / 2) * Math.PI / 180;
    const dist = (sphere / Math.tan(fov)) * 1.12 / Math.min(1, w / h * 1.1);
    camera!.position.set(dist * 0.62, dist * 0.34, dist * 0.72);
    camera!.lookAt(0, -size.y * 0.03, 0);
    renderer!.render(scene!, camera!);
    ctx.drawImage(renderer!.domElement, 0, 0, out.width, out.height);
    scene!.remove(group);
  } catch (err) {
    console.warn('thumbnail failed', def.id, err);
  }
  cache.set(key, out);
  return out;
}
