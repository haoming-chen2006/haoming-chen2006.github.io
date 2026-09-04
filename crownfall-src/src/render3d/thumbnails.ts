import * as THREE from 'three';
import type { CardDef } from '../game/types.ts';
import { buildBuildingModel, buildUnitModel, mat } from './models.ts';

const RARITY_BG: Record<CardDef['rarity'], [string, string]> = {
  common: ['#5d6b7a', '#2a3440'], rare: ['#e08a2e', '#6d3a0c'], epic: ['#9b4dff', '#38176a'], legendary: ['#31d3c8', '#0c4d49'],
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

function spellModel(card: Extract<CardDef, { kind: 'spell' }>): THREE.Group {
  const g = new THREE.Group();
  const c = parseInt(card.look.color.slice(1), 16), a = parseInt(card.look.accent.slice(1), 16);
  switch (card.effect) {
    case 'meteor': {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), mat(0x5a3a2a, { emissive: 0xff5a1a, emissiveIntensity: 0.9 }));
      rock.rotation.set(0.4, 0.6, 0.2); g.add(rock);
      for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 5), mat(i % 2 ? c : a, { emissive: c, emissiveIntensity: 1.5 })); f.position.set(-0.3 - i * 0.18, 0.35 + i * 0.22, 0.1 * i); f.rotation.z = -0.9; g.add(f); }
      break;
    }
    case 'volley': {
      const m = mat(0xd9c8a0);
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 5), m); s.position.set((i - 2) * 0.28, (i % 2) * 0.2, (i % 3) * 0.1); s.rotation.z = 0.25; g.add(s); const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 5), mat(0xe8e8e8)); h.position.set((i - 2) * 0.28 + 0.18, -0.7 + (i % 2) * 0.2, (i % 3) * 0.1); h.rotation.z = Math.PI + 0.25; g.add(h); }
      break;
    }
    case 'shock': {
      const pts = [new THREE.Vector3(0.2, 0.9, 0), new THREE.Vector3(-0.2, 0.2, 0), new THREE.Vector3(0.15, 0.1, 0), new THREE.Vector3(-0.25, -0.9, 0)];
      for (let i = 0; i < pts.length - 1; i++) {
        const a2 = pts[i], b = pts[i + 1];
        const len = a2.distanceTo(b);
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 6), mat(c, { emissive: c, emissiveIntensity: 2.5 }));
        seg.position.copy(a2).lerp(b, 0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a2).normalize());
        g.add(seg);
      }
      break;
    }
    case 'frenzy': {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat(c, { emissive: c, emissiveIntensity: 1.2, transparent: true, opacity: 0.85, flat: false }));
      g.add(orb);
      for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 4), mat(a, { emissive: a, emissiveIntensity: 1 })); const ang = (i / 3) * Math.PI * 2; w.position.set(Math.cos(ang) * 0.75, Math.sin(ang) * 0.75, 0); w.rotation.z = ang - Math.PI / 2; g.add(w); }
      break;
    }
    case 'frost': {
      for (let i = 0; i < 6; i++) { const cr = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.0 + (i % 3) * 0.3, 5), mat(0xe8fbff, { emissive: 0x9fd9ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 })); const ang = (i / 6) * Math.PI * 2; cr.position.set(Math.cos(ang) * 0.35, 0.2, Math.sin(ang) * 0.35); cr.rotation.set(Math.sin(ang) * 0.5, 0, -Math.cos(ang) * 0.5); g.add(cr); }
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.2, 8), mat(0xbfefff, { transparent: true, opacity: 0.7 })); base.position.y = -0.4; g.add(base);
      break;
    }
  }
  return g;
}

/** Render a card's 3D model onto a 2D canvas (cached per card id). */
export function cardThumbnail(card: CardDef, w = 128, h = 170): HTMLCanvasElement {
  const key = `${card.id}:${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  setup(w, h);
  const out = document.createElement('canvas');
  out.width = w * 2; out.height = h * 2;
  const ctx = out.getContext('2d')!;
  const [c1, c2] = RARITY_BG[card.rarity];
  const grad = ctx.createLinearGradient(0, 0, 0, out.height);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, out.width, out.height);
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.arc(out.width / 2, out.height * 0.58, out.width * 0.44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(out.width / 2, out.height * 0.8, out.width * 0.32, out.height * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  try {
    const group = new THREE.Group();
    let radius = 1;
    if (card.kind === 'troop') {
      const model = buildUnitModel(card.look, 0);
      model.ring.visible = false;
      const size = card.look.size;
      if (card.count > 1) {
        const m2 = buildUnitModel(card.look, 0); m2.ring.visible = false; m2.root.position.set(-size * 2.2, 0, size * 1.6); m2.body.rotation.y = -(0.75 + 0.5); group.add(m2.root);
        if (card.count > 2) { const m3 = buildUnitModel(card.look, 0); m3.ring.visible = false; m3.root.position.set(size * 2.2, 0, size * 1.6); m3.body.rotation.y = -(0.75 - 0.5); group.add(m3.root); }
      }
      model.body.rotation.y = -0.75;
      model.body.position.y = model.hover;
      group.add(model.root);
      radius = Math.max(model.height + model.hover, size * 3.2) * 0.62;
      group.position.y = -(model.height + model.hover) * 0.5;
    } else if (card.kind === 'building') {
      const model = buildBuildingModel(card, 0);
      model.turret.rotation.y = -0.6;
      group.add(model.root);
      radius = Math.max(model.height, card.radius * 2.2) * 0.62;
      group.position.y = -model.height * 0.45;
    } else {
      group.add(spellModel(card));
      radius = 1.1;
    }
    // no bloom in thumbnails: clamp emissive so glowing parts don't saturate to white
    group.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && 'emissiveIntensity' in m && m.emissiveIntensity > 1.2) m.emissiveIntensity = 1.2; });
    scene!.add(group);
    // frame from the real bounding box: centre it and back the camera off by the bounding sphere
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
    void radius;
    renderer!.render(scene!, camera!);
    ctx.drawImage(renderer!.domElement, 0, 0, out.width, out.height);
    scene!.remove(group);
  } catch (err) {
    console.warn('thumbnail failed', card.id, err);
  }
  cache.set(key, out);
  return out;
}
