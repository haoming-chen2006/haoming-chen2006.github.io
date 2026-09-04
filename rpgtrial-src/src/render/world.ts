// Environment composition: sky + sun, terrain, lake, vegetation, mountains. (Environment agent owns this file.)
import * as THREE from 'three';
import { terrainHeight, terrainNormal } from '../sim/terrain.ts';
import { MAP_HALF } from '../content/level.ts';
import { detectQuality, QUALITY, type QualitySettings } from './quality.ts';
import { Sky } from './sky.ts';
import { Terrain, splatWeights } from './terrain.ts';
import { Water } from './water.ts';
import { Vegetation } from './vegetation.ts';

/** Bake height + splat weights over ±MAP_HALF into an RGBA16F texture: R height, G grass, B forest floor, A blocked. */
function bakeGround(size: number): THREE.DataTexture {
  const data = new Uint16Array(size * size * 4); const w = new Float32Array(6);
  const f16 = THREE.DataUtils.toHalfFloat;
  const t0 = performance.now();
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = ((i + 0.5) / size - 0.5) * 2 * MAP_HALF, z = ((j + 0.5) / size - 0.5) * 2 * MAP_HALF;
    const h = terrainHeight(x, z); const n = terrainNormal(x, z, 0.6);
    splatWeights(x, z, h, n.y, w);
    const k = (j * size + i) * 4;
    data[k] = f16(h); data[k + 1] = f16(w[0]); data[k + 2] = f16(w[1]); data[k + 3] = f16(w[2] + w[3] + w[4] + w[5]);
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = false; t.needsUpdate = true;
  console.info(`ground texture ${size}² baked in ${(performance.now() - t0).toFixed(0)} ms`);
  return t;
}

export class WorldView {
  group = new THREE.Group();
  quality: QualitySettings;
  sky: Sky;
  terrainView: Terrain;
  waterView: Water;
  vegetation: Vegetation;
  sun: THREE.DirectionalLight;
  sunPosition: THREE.Vector3;
  sunSprite: THREE.Mesh;
  fogColor: THREE.Color;
  terrain: THREE.Mesh;
  water: THREE.Mesh;
  colliderMeshes: THREE.Object3D[] = [];
  ground: THREE.DataTexture;
  ready: Promise<void>;
  private lastProxy = new THREE.Vector3(1e9, 0, 0);

  constructor(public scene: THREE.Scene) {
    this.quality = QUALITY[detectQuality()];
    scene.add(this.group);
    this.sky = new Sky(scene, this.quality);
    this.sun = this.sky.sun; this.sunPosition = this.sky.sunPosition; this.sunSprite = this.sky.sunSprite; this.fogColor = this.sky.fogColor;
    this.terrainView = new Terrain(this.quality);
    this.terrain = this.terrainView.mesh;
    this.group.add(this.terrainView.group);
    this.ground = bakeGround(this.quality.tier === 'low' ? 256 : 512);
    this.waterView = new Water(this.quality, this.terrainView.noise);
    this.water = this.waterView.mesh;
    this.group.add(this.waterView.group);
    this.vegetation = new Vegetation(this.quality, this.terrainView.noise, this.ground);
    this.group.add(this.vegetation.group);
    this.colliderMeshes = this.vegetation.colliderProxies;
    this.ready = Promise.all([this.terrainView.ready, this.vegetation.ready]).then(() => undefined);
  }

  heightAt(x: number, z: number) { return terrainHeight(x, z); }

  update(dt: number, camPos: THREE.Vector3, focus: THREE.Vector3) {
    this.sky.update(dt, camPos, focus);
    this.waterView.update(dt);
    this.vegetation.update(dt, camPos, focus);
    if (focus.distanceToSquared(this.lastProxy) > 4) { this.lastProxy.copy(focus); this.vegetation.updateColliderProxies(focus); }
  }
}
