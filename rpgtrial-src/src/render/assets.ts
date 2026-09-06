import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const assetUrl = (p: string) => BASE + 'assets/' + p.replace(/^\/?assets\//, '').replace(/^\//, '');

class Assets {
  private gltfLoader = new GLTFLoader();
  private texLoader = new THREE.TextureLoader();
  private hdrLoader = new RGBELoader();
  private cache = new Map<string, Promise<any>>();
  loaded = 0; total = 0; onProgress: ((loaded: number, total: number, label: string) => void) | null = null;
  constructor() {
    this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    const draco = new DRACOLoader(); draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    this.gltfLoader.setDRACOLoader(draco);
  }
  private track<T>(key: string, p: Promise<T>): Promise<T> {
    this.total++;
    return p.then((v) => { this.loaded++; this.onProgress?.(this.loaded, this.total, key); return v; }, (e) => { this.loaded++; console.error('asset failed', key, e); throw e; });
  }
  gltf(path: string): Promise<GLTF> {
    const url = assetUrl(path);
    if (!this.cache.has(url)) this.cache.set(url, this.track(path, this.gltfLoader.loadAsync(url)));
    return this.cache.get(url)!;
  }
  texture(path: string, opts: { srgb?: boolean; repeat?: number; aniso?: number } = {}): Promise<THREE.Texture> {
    const url = assetUrl(path); const key = url + JSON.stringify(opts);
    if (!this.cache.has(key)) this.cache.set(key, this.track(path, this.texLoader.loadAsync(url).then((t) => {
      if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; if (opts.repeat) t.repeat.set(opts.repeat, opts.repeat);
      t.anisotropy = opts.aniso ?? 8; return t;
    })));
    return this.cache.get(key)!;
  }
  hdr(path: string): Promise<THREE.DataTexture> {
    const url = assetUrl(path);
    if (!this.cache.has(url)) this.cache.set(url, this.track(path, this.hdrLoader.loadAsync(url).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; return t; })));
    return this.cache.get(url)!;
  }
  audio(path: string): Promise<ArrayBuffer> {
    const url = assetUrl(path);
    if (!this.cache.has(url)) this.cache.set(url, this.track(path, fetch(url).then((r) => r.arrayBuffer())));
    return this.cache.get(url)!;
  }
}
export const assets = new Assets();
