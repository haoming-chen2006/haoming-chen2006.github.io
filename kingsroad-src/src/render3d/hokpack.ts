import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Official 王者荣耀 asset pack (sponsor-provided, dropped in public/assets-hok/ — see PLAN_HOK.md for the layout).
 * Everything is optional: each lookup probes the file once and falls back to the built-in stand-in when it is missing.
 *   heroes/<id>/portrait.png   square portrait for cards and HUD
 *   heroes/<id>/splash.jpg     16:9 splash for the select panel
 *   heroes/<id>/model.glb      rigged or static hero model (Y-up, ~1.8 units tall, faces +Z)
 *   heroes/<id>/voice/pick.ogg hero pick line
 *   textures/<name>.png        ground/wall overrides (grass, stone, path, wall, river, crystal)
 */
const BASE = 'assets-hok/';
const probe = new Map<string, Promise<boolean>>();

/** Does a pack file exist? Cached per path; a 404 is remembered so we never spam the server. */
export function packHas(path: string): Promise<boolean> {
  let p = probe.get(path);
  if (!p) {
    p = fetch(BASE + path, { method: 'HEAD' }).then((r) => r.ok && !(r.headers.get('content-type') ?? '').includes('text/html')).catch(() => false);
    probe.set(path, p);
  }
  return p;
}
export const packUrl = (path: string): string => BASE + path;

const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
/** An official portrait / splash image, or null when the pack does not provide one. */
export function packImage(path: string): Promise<HTMLImageElement | null> {
  let p = imgCache.get(path);
  if (!p) {
    p = packHas(path).then((ok) => ok ? new Promise<HTMLImageElement | null>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = BASE + path; }) : null);
    imgCache.set(path, p);
  }
  return p;
}

const gltf = new GLTFLoader();
const modelCache = new Map<string, Promise<THREE.Group | null>>();
/** An official hero model; callers clone the result. */
export function packModel(heroId: string): Promise<THREE.Group | null> {
  const path = `heroes/${heroId}/model.glb`;
  let p = modelCache.get(path);
  if (!p) {
    p = packHas(path).then((ok) => ok ? new Promise<THREE.Group | null>((resolve) => gltf.load(BASE + path, (g) => {
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      // normalise height to ~1.8 units so pack models line up with the sim's radii
      const box = new THREE.Box3().setFromObject(g.scene); const h = box.max.y - box.min.y;
      if (h > 0) { const k = 1.8 / h; g.scene.scale.setScalar(k); g.scene.position.y = -box.min.y * k; }
      resolve(g.scene);
    }, undefined, () => resolve(null))) : null);
    modelCache.set(path, p);
  }
  return p;
}

const voiceMissing = new Set<string>();
/** Play a hero voice line from the pack if present (pick / kill / death / ult). */
export function packVoice(heroId: string, line: 'pick' | 'kill' | 'death' | 'ult', volume = 0.9): void {
  const path = `heroes/${heroId}/voice/${line}.ogg`;
  if (voiceMissing.has(path)) return;
  void packHas(path).then((ok) => { if (!ok) { voiceMissing.add(path); return; } const a = new Audio(BASE + path); a.volume = volume; a.play().catch(() => voiceMissing.add(path)); });
}

/** A pack texture as a three.js texture, or null. */
export function packTexture(name: string, repeat = 1): Promise<THREE.Texture | null> {
  const path = `textures/${name}.png`;
  return packHas(path).then((ok) => { if (!ok) return null; const t = new THREE.TextureLoader().load(BASE + path); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
}
