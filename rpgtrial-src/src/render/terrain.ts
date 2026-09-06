// Terrain rendering: rectilinear heightfield mesh (0.5 m in the play area, coarser outside), 6-layer splat material
// on texture arrays (grass / forest floor / dirt path / sand / mossy rock / cobbles) with macro variation and
// triplanar rock, plus a far mountain ring so the horizon is never empty.
import * as THREE from 'three';
import { terrainHeight, distToPath, MAIN_PATH, PLAZAS, fbm, noise2 } from '../sim/terrain.ts';
import { LAKE, MAP_HALF, CRYPT_ORIGIN } from '../content/level.ts';
import { forestDensity } from '../content/scatter.ts';
import { smoothstep, clamp } from '../core/math.ts';
import { assets } from './assets.ts';
import { applyHeightFog } from './sky.ts';
import type { QualitySettings } from './quality.ts';

export const LAYERS = ['rocky_terrain_02', 'forest_leaves_02', 'forest_ground_04', 'coast_sand_01', 'aerial_rocks_02', 'cobblestone_floor_08'] as const;
const LAYER_RES: Record<string, string> = { rocky_terrain_02: '2k', forest_leaves_02: '2k' };
export const L_GRASS = 0, L_FOREST = 1, L_PATH = 2, L_SAND = 3, L_ROCK = 4, L_COBBLE = 5;
const TILE = [3.6, 3.2, 2.8, 2.6, 5.0, 2.4];
const ARRAY_RES = 1024;

/** Mountain relief added beyond the playable map (metres). */
export function mountainRelief(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const t = smoothstep(175, 460, r);
  if (t <= 0) return 0;
  const ridge = 1 - Math.abs(fbm(x * 0.0035 + 2.2, z * 0.0035 - 1.3, 4, 2.1, 0.5));
  const broad = fbm(x * 0.0012, z * 0.0012 + 8.0, 3) * 0.5 + 0.5;
  const detail = fbm(x * 0.02, z * 0.02, 3) * 6;
  return t * (35 + 150 * ridge * (0.55 + 0.45 * broad) + 70 * broad) + t * detail;
}
export function farHeight(x: number, z: number): number { return terrainHeight(x, z) + mountainRelief(x, z); }

/** Splat weights (6 layers, sum to 1) mirroring sim/terrain.ts: surfaceAt. */
export function splatWeights(x: number, z: number, h: number, ny: number, out: Float32Array, o = 0) {
  const nz = fbm(x * 0.09 + 5.1, z * 0.09 + 9.7, 2);           // -1..1 edge irregularity
  const nz2 = fbm(x * 0.021 - 3.3, z * 0.021 + 1.9, 3);
  const dp = distToPath(x, z, MAIN_PATH);
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  const forest = smoothstep(0.28, 0.8, forestDensity(x, z)) * (0.7 + 0.3 * smoothstep(-0.3, 0.4, nz2));
  let grass = 1 - forest, fo = forest;
  const w = [grass, fo, 0, 0, 0, 0];
  const overlay = (i: number, m: number) => { m = clamp(m, 0, 1); for (let k = 0; k < 6; k++) w[k] *= 1 - m; w[i] += m; };
  // beach sand + everything under water
  const beach = 1 - smoothstep(LAKE.r + 2 + nz * 2.5, LAKE.r + 10 + nz * 2.5, dl);
  const wet = 1 - smoothstep(-0.4, 1.0, h - LAKE.level);
  overlay(L_SAND, Math.max(beach, wet));
  // chapel courtyard cobbles (plaza 1), broken up by noise
  const cp = PLAZAS[1]; const dc = Math.hypot(x - cp.x, z - cp.z);
  overlay(L_COBBLE, (1 - smoothstep(cp.r - 4 + nz * 3, cp.r - 0.5 + nz * 3, dc)) * smoothstep(-0.55, 0.15, nz2 + nz * 0.5));
  // dirt path (surfaceAt: dirt < 2.6 m), plaza floors for camp/gate are packed dirt too
  overlay(L_PATH, 1 - smoothstep(1.6 + nz * 0.7, 3.4 + nz * 0.7, dp));
  for (const i of [0, 2]) { const p = PLAZAS[i]; const d = Math.hypot(x - p.x, z - p.z); overlay(L_PATH, (1 - smoothstep(p.r - 3 + nz * 2, p.r + 1 + nz * 2, d)) * 0.8); }
  // rock on steep slopes and high up
  overlay(L_ROCK, Math.max(smoothstep(0.88, 0.66, ny), smoothstep(26 + nz2 * 6, 44 + nz2 * 6, h) * 0.9));
  let s = 0; for (let k = 0; k < 6; k++) s += w[k];
  for (let k = 0; k < 6; k++) out[o + k] = w[k] / s;
}

// ------------------------------------------------------------------------------------------ material
const SPLAT_PARS_VERT = /* glsl */ `
attribute vec3 splatA; attribute vec3 splatB;
varying vec3 vSplatA; varying vec3 vSplatB; varying vec3 vWPos; varying vec3 vWNormal;`;
const SPLAT_VERT = /* glsl */ `
vSplatA = splatA; vSplatB = splatB;
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWNormal = normalize(mat3(modelMatrix) * objectNormal);`;

const SPLAT_PARS_FRAG = /* glsl */ `
precision highp sampler2DArray;
uniform sampler2DArray uDiff; uniform sampler2DArray uNorm; uniform sampler2DArray uArm;
uniform sampler2D uNoise; uniform float uTile[6]; uniform float uNormalScale; uniform vec3 uTint[6]; uniform float uWaterLevel;
varying vec3 vSplatA; varying vec3 vSplatB; varying vec3 vWPos; varying vec3 vWNormal;
vec3 gSplatDiffuse; vec3 gSplatNormalTS; float gSplatRough; float gSplatAO;

vec4 splatSample(sampler2DArray s, vec2 uv, float layer, float macro, vec2 dx, vec2 dy) {
  // two-scale sampling kills visible tiling: blend the layer with a 0.27x rotated copy of itself.
  // Explicit gradients: these fetches sit inside per-pixel branches where implicit derivatives are undefined.
  vec4 a = textureGrad(s, vec3(uv, layer), dx, dy);
  vec4 b = textureGrad(s, vec3(vec2(uv.y, -uv.x) * 0.27 + 0.31, layer), vec2(dx.y, -dx.x) * 0.27, vec2(dy.y, -dy.x) * 0.27);
  return mix(a, b, macro);
}
vec4 triSample(sampler2DArray s, vec3 wp, float layer, float tile, vec3 tw, vec3 dpx, vec3 dpy) {
  vec2 uvx = wp.zy / tile, uvy = wp.xz / tile, uvz = wp.xy / tile;
  return textureGrad(s, vec3(uvx, layer), dpx.zy / tile, dpy.zy / tile) * tw.x
       + textureGrad(s, vec3(uvy, layer), dpx.xz / tile, dpy.xz / tile) * tw.y
       + textureGrad(s, vec3(uvz, layer), dpx.xy / tile, dpy.xy / tile) * tw.z;
}
void splatCompute() {
  float w[6]; w[0] = vSplatA.x; w[1] = vSplatA.y; w[2] = vSplatA.z; w[3] = vSplatB.x; w[4] = vSplatB.y; w[5] = vSplatB.z;
  vec2 p = vWPos.xz;
  float macroN = texture(uNoise, p * 0.011).r;
  float macroN2 = texture(uNoise, p * 0.0023 + 0.5).r;
  float macro = smoothstep(0.3, 0.7, macroN);
  // weight sharpening with a bit of noise so borders are irregular rather than soft gradients
  float n = texture(uNoise, p * 0.09).r - 0.5;
  float sum = 0.0;
  for (int i = 0; i < 6; i++) { w[i] = pow(max(w[i] + n * 0.18, 0.0), 2.2); sum += w[i]; }
  vec3 col = vec3(0.0); vec3 nrm = vec3(0.0); vec3 arm = vec3(0.0); float tot = 0.0;
  vec3 an = abs(vWNormal); vec3 tw = an * an * an * an; tw /= (tw.x + tw.y + tw.z);
  vec3 dpx = dFdx(vWPos), dpy = dFdy(vWPos);
  for (int i = 0; i < 6; i++) {
    float wi = w[i] / sum;
    if (wi < 0.012) continue;
    float layer = float(i); float tile = uTile[i];
    vec3 c; vec3 nn; vec3 a;
    if (i == 4) {
      // triplanar mossy rock for cliffs
      c = triSample(uDiff, vWPos, layer, tile, tw, dpx, dpy).rgb;
      nn = triSample(uNorm, vWPos, layer, tile, tw, dpx, dpy).rgb * 2.0 - 1.0;
      a = triSample(uArm, vWPos, layer, tile, tw, dpx, dpy).rgb;
    } else {
      vec2 uv = p / tile; vec2 dx = dpx.xz / tile, dy = dpy.xz / tile;
      c = splatSample(uDiff, uv, layer, macro, dx, dy).rgb;
      nn = splatSample(uNorm, uv, layer, macro, dx, dy).rgb * 2.0 - 1.0;
      a = splatSample(uArm, uv, layer, macro, dx, dy).rgb;
    }
    c *= uTint[i];
    // fake height blend: brighter texels win on borders
    float hb = wi * (0.55 + dot(c, vec3(0.33)));
    col += c * hb; nrm += nn * hb; arm += a * hb; tot += hb;
  }
  col /= max(tot, 1e-4); nrm /= max(tot, 1e-4); arm /= max(tot, 1e-4);
  // large-scale colour variation: patches of drier / lusher ground
  col *= mix(vec3(0.86, 0.84, 0.78), vec3(1.10, 1.07, 0.98), macroN2);
  // wet, darker ground at the waterline
  float wet = 1.0 - smoothstep(uWaterLevel - 0.25, uWaterLevel + 0.45, vWPos.y);
  col *= mix(1.0, 0.5, wet); arm.g = mix(arm.g, 0.35, wet);
  gSplatDiffuse = col; gSplatNormalTS = nrm; gSplatRough = clamp(arm.g, 0.35, 1.0); gSplatAO = mix(1.0, arm.r, 0.8);
}`;

export function buildSplatMaterial(diff: THREE.DataArrayTexture, norm: THREE.DataArrayTexture, arm: THREE.DataArrayTexture, noise: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, color: 0xffffff });
  const uniforms = {
    uDiff: { value: diff }, uNorm: { value: norm }, uArm: { value: arm }, uNoise: { value: noise },
    uTile: { value: TILE }, uNormalScale: { value: 1.1 }, uWaterLevel: { value: LAKE.level },
    uTint: { value: [new THREE.Color(0.92, 1.0, 0.82), new THREE.Color(1.0, 0.98, 0.9), new THREE.Color(1.0, 0.95, 0.88), new THREE.Color(0.82, 0.78, 0.7), new THREE.Color(0.95, 1.0, 0.95), new THREE.Color(0.95, 0.95, 0.95)] },
  };
  applyHeightFog(mat, (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + SPLAT_PARS_VERT)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + SPLAT_VERT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SPLAT_PARS_FRAG)
      .replace('#include <map_fragment>', 'splatCompute();\ndiffuseColor.rgb *= gSplatDiffuse;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * gSplatRough;')
      .replace('#include <normal_fragment_maps>', `{
  vec3 gn = normalize(vWNormal);
  vec3 tn = gSplatNormalTS;
  // UDN blend in world space (uv = world xz, so tangent = +x, bitangent = +z)
  vec3 pn = normalize(vec3(gn.x + tn.x * uNormalScale, gn.y + max(tn.z, 0.2) * 0.35, gn.z + tn.y * uNormalScale));
  pn = normalize(mix(gn, pn, 0.85));
  normal = normalize((viewMatrix * vec4(pn, 0.0)).xyz);
}`)
      .replace('#include <aomap_fragment>', `{
  float ambientOcclusion = gSplatAO;
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
  #endif
}`);
  });
  mat.customProgramCacheKey = () => 'splat-terrain';
  return mat;
}

/** Tileable value-noise texture shared by terrain / water / grass. */
export function makeNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // tileable by sampling on a torus of 4 periods
    const u = (x / size) * 8, v = (y / size) * 8;
    const a = fbm(u, v, 4) * 0.5 + 0.5;
    const b = fbm(u + 31.7, v + 17.3, 3) * 0.5 + 0.5;
    const c = noise2(u * 2 + 5, v * 2 + 9);
    const i = (y * size + x) * 4;
    data[i] = clamp(a * 255, 0, 255); data[i + 1] = clamp(b * 255, 0, 255); data[i + 2] = clamp(c * 255, 0, 255); data[i + 3] = 255;
  }
  // blend the seams (fbm on a plane is not periodic): mirror-average the borders
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

async function imageToRGBA(tex: THREE.Texture, size: number): Promise<Uint8Array> {
  const img = tex.image as HTMLImageElement | ImageBitmap;
  const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img as any, 0, 0, size, size);
  return new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer);
}
export async function loadSplatArrays(): Promise<{ diff: THREE.DataArrayTexture; norm: THREE.DataArrayTexture; arm: THREE.DataArrayTexture }> {
  const n = LAYERS.length, size = ARRAY_RES;
  const make = (srgb: boolean) => {
    const t = new THREE.DataArrayTexture(new Uint8Array(size * size * 4 * n), size, size, n);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const diff = make(true), norm = make(false), arm = make(false);
  await Promise.all(LAYERS.map(async (id, i) => {
    const res = LAYER_RES[id] ?? '1k';
    const [d, nm, a] = await Promise.all(['diff', 'nor_gl', 'arm'].map((k) => assets.texture(`textures/${id}/${id}_${k}_${res}.jpg`)));
    for (const [tex, arr] of [[d, diff], [nm, norm], [a, arm]] as const) {
      const px = await imageToRGBA(tex, size);
      (arr.image.data as Uint8Array).set(px, i * size * size * 4);
      tex.dispose();
    }
  }));
  diff.needsUpdate = norm.needsUpdate = arm.needsUpdate = true;
  return { diff, norm, arm };
}

// ------------------------------------------------------------------------------------------ geometry
function axisSamples(lo: number, hi: number, fineLo: number, fineHi: number, fine: number, coarse: number): number[] {
  const out: number[] = [];
  for (let v = lo; v < fineLo; v += coarse) out.push(v);
  for (let v = fineLo; v < fineHi; v += fine) out.push(v);
  for (let v = fineHi; v <= hi + 1e-6; v += coarse) out.push(v);
  return out;
}
/** Rectilinear grid → BufferGeometry with heights, normals from finite differences and splat weights. */
function buildGrid(xs: number[], zs: number[], height: (x: number, z: number) => number, skip?: (x: number, z: number) => boolean): THREE.BufferGeometry {
  const nx = xs.length, nz = zs.length;
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) H[j * nx + i] = height(xs[i], zs[j]);
  const pos = new Float32Array(nx * nz * 3), nrm = new Float32Array(nx * nz * 3), sa = new Float32Array(nx * nz * 3), sb = new Float32Array(nx * nz * 3);
  const w = new Float32Array(6);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; const x = xs[i], z = zs[j], h = H[k];
    const i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, nx - 1), j0 = Math.max(j - 1, 0), j1 = Math.min(j + 1, nz - 1);
    const dhdx = (H[j * nx + i1] - H[j * nx + i0]) / (xs[i1] - xs[i0]);
    const dhdz = (H[j1 * nx + i] - H[j0 * nx + i]) / (zs[j1] - zs[j0]);
    let nxv = -dhdx, nyv = 1, nzv = -dhdz; const l = Math.hypot(nxv, nyv, nzv); nxv /= l; nyv /= l; nzv /= l;
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    nrm[k * 3] = nxv; nrm[k * 3 + 1] = nyv; nrm[k * 3 + 2] = nzv;
    splatWeights(x, z, h, nyv, w);
    sa[k * 3] = w[0]; sa[k * 3 + 1] = w[1]; sa[k * 3 + 2] = w[2]; sb[k * 3] = w[3]; sb[k * 3 + 1] = w[4]; sb[k * 3 + 2] = w[5];
  }
  const idx: number[] = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (skip && skip((xs[i] + xs[i + 1]) * 0.5, (zs[j] + zs[j + 1]) * 0.5)) continue;
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    // split along the diagonal that follows the terrain better
    const hd1 = Math.abs(H[a] - H[d]), hd2 = Math.abs(H[b] - H[c]);
    if (hd1 < hd2) idx.push(a, c, d, a, d, b); else idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('splatA', new THREE.BufferAttribute(sa, 3));
  geo.setAttribute('splatB', new THREE.BufferAttribute(sb, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}

const inCryptBox = (x: number, z: number) => Math.abs(z - CRYPT_ORIGIN.z) < 160 && Math.abs(x - CRYPT_ORIGIN.x) < 160;

export class Terrain {
  group = new THREE.Group();
  mesh: THREE.Mesh;
  far: THREE.Mesh;
  mountains = new THREE.Group();
  material: THREE.MeshStandardMaterial;
  noise: THREE.Texture;
  ready: Promise<void>;

  constructor(private quality: QualitySettings) {
    this.noise = makeNoiseTexture();
    // placeholder material until the texture arrays are in (a flat vertex-lit look so nothing is black while loading)
    const placeholder = new THREE.MeshStandardMaterial({ color: 0x4a5a35, roughness: 1 });
    const fine = quality.tier === 'low' ? 0.8 : 0.5;
    const t0 = performance.now();
    const xs = axisSamples(-MAP_HALF, MAP_HALF, -56, 112, fine, 2.0);
    const zs = axisSamples(-MAP_HALF, MAP_HALF, -76, 64, fine, 2.0);
    const geo = buildGrid(xs, zs, terrainHeight);
    this.mesh = new THREE.Mesh(geo, placeholder); this.mesh.receiveShadow = true; this.mesh.castShadow = false; this.mesh.name = 'terrain';
    // far ring: ±900 m at 10 m, without the playable square or the crypt box
    const farX = axisSamples(-900, 900, -MAP_HALF - 10, MAP_HALF + 10, 10, 10);
    const farGeo = buildGrid(farX, farX, farHeight, (x, z) => (Math.abs(x) < MAP_HALF - 12 && Math.abs(z) < MAP_HALF - 12) || inCryptBox(x, z));
    farGeo.translate(0, -0.35, 0);
    this.far = new THREE.Mesh(farGeo, placeholder); this.far.receiveShadow = false; this.far.castShadow = false; this.far.name = 'terrain-far';
    console.info(`terrain built in ${(performance.now() - t0).toFixed(0)} ms: ${geo.index!.count / 3 + farGeo.index!.count / 3} tris`);
    this.group.add(this.mesh, this.far, this.mountains);
    this.material = placeholder;
    this.ready = this.load();
  }
  private async load() {
    const { diff, norm, arm } = await loadSplatArrays();
    const mat = buildSplatMaterial(diff, norm, arm, this.noise);
    this.mesh.material = mat; this.far.material = mat; this.material = mat;
    this.buildMountains().catch((e) => console.warn('mountains failed', e));
  }
  /** Rocky crags on the far ridge: instanced Poly Haven `mountainside` scaled up, sitting in the fog. */
  private async buildMountains() {
    const gltf = await assets.gltf('models/nature/mountainside.glb');
    let src: THREE.Mesh | null = null; gltf.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !src) src = o as THREE.Mesh; });
    if (!src) return;
    const mesh = src as THREE.Mesh;
    const m = (mesh.material as THREE.MeshStandardMaterial).clone(); m.roughness = 0.95; applyHeightFog(m);
    const placements: THREE.Matrix4[] = [];
    const tmp = new THREE.Object3D();
    const count = 26;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + fbm(i * 0.7, 3.1, 2) * 0.25;
      const r = 250 + (fbm(i * 1.3, 7.7, 2) * 0.5 + 0.5) * 170;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (inCryptBox(x, z)) continue;
      const s = 14 + (fbm(i * 2.1, 1.1, 2) * 0.5 + 0.5) * 12;
      tmp.position.set(x, farHeight(x, z) - 8 * (s / 14), z);
      tmp.rotation.set(0, Math.atan2(x, z) + Math.PI + (fbm(i, 9, 1)) * 0.8, 0);
      tmp.scale.set(s * (1.1 + fbm(i, 4, 1) * 0.4), s, s);
      tmp.updateMatrix(); placements.push(tmp.matrix.clone());
    }
    const inst = new THREE.InstancedMesh(mesh.geometry, m, placements.length);
    placements.forEach((mm, i) => inst.setMatrixAt(i, mm));
    inst.instanceMatrix.needsUpdate = true; inst.frustumCulled = false; inst.castShadow = false; inst.receiveShadow = false;
    this.mountains.add(inst);
  }
}
