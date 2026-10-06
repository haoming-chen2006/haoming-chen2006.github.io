import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * CC0 PBR assets fetched by scripts/fetch_assets.mjs (Poly Haven). Textures use the packed `arm` map
 * (R = ambient occlusion, G = roughness, B = metalness), which three.js reads directly.
 */
const BASE = 'assets/ph/';
const loader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const texCache = new Map<string, THREE.Texture>();

function tex(path: string, srgb: boolean, repeat: number, repeatY = repeat): THREE.Texture {
  const key = `${path}|${repeat}|${repeatY}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const t = loader.load(BASE + path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeatY);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export interface PbrOpts { repeat?: number; repeatY?: number; color?: number; roughness?: number; normalScale?: number; metalness?: number; envMapIntensity?: number }

/** A standard material driven by a Poly Haven texture set (diffuse + normal + arm). */
export function pbrMaterial(id: string, opts: PbrOpts = {}): THREE.MeshStandardMaterial {
  const r = opts.repeat ?? 1, ry = opts.repeatY ?? r;
  const m = new THREE.MeshStandardMaterial({
    map: tex(`textures/${id}/Diffuse.jpg`, true, r, ry),
    normalMap: tex(`textures/${id}/nor_gl.jpg`, false, r, ry),
    aoMap: tex(`textures/${id}/arm.jpg`, false, r, ry),
    roughnessMap: tex(`textures/${id}/arm.jpg`, false, r, ry),
    metalnessMap: tex(`textures/${id}/arm.jpg`, false, r, ry),
    color: opts.color ?? 0xffffff, roughness: opts.roughness ?? 1, metalness: opts.metalness ?? 1,
    envMapIntensity: opts.envMapIntensity ?? 0.6,
  });
  m.normalScale.setScalar(opts.normalScale ?? 0.8);
  return m;
}

const modelCache = new Map<string, Promise<THREE.Group>>();

/** Load a CC0 model (gltf + textures) once; callers clone the result. */
export function loadModel(id: string): Promise<THREE.Group> {
  let p = modelCache.get(id);
  if (!p) {
    p = new Promise((resolve, reject) => {
      gltfLoader.load(`${BASE}models/${id}/${id}.gltf`, (g) => {
        g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; const mat = m.material as THREE.MeshStandardMaterial; if (mat && mat.map) mat.map.anisotropy = 8; } });
        resolve(g.scene);
      }, undefined, reject);
    });
    modelCache.set(id, p);
  }
  return p;
}
