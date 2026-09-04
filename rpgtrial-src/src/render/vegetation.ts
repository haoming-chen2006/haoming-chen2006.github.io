// Vegetation: instanced Poly Haven trees / rocks / ferns / shrubs from content/scatter.ts with 3 LOD levels and
// distance culling, wind + backlight on leaf materials, and a GPU-placed geometry-blade grass carpet that follows
// the player (density from the baked ground texture, wind, colour variation, distance fade).
import * as THREE from 'three';
import { assets, assetUrl } from './assets.ts';
import { trees, rocks, foliage, type Placement, type ScatterKind } from '../content/scatter.ts';
import { MAP_HALF } from '../content/level.ts';
import { applyHeightFog, fogUniforms, SUN_COLOR } from './sky.ts';
import { DETAIL_LAYER } from './water.ts';
import type { QualitySettings } from './quality.ts';

interface KindDef {
  file: string; lods: number; scale: number; y?: number;
  shadow: boolean; detail: boolean;
  /** LOD switch distances (metres), max distance for real geometry, and (trees) max distance for the billboard impostor */
  lod: [number, number]; maxDist: number; impostorDist?: number;
  wind: number; flutter: number; height: number; radius: number;
  colorVar: number;
}
const T = (file: string, scale: number, height: number, radius: number, extra: Partial<KindDef> = {}): KindDef => ({
  file, lods: 2, scale, shadow: true, detail: false, lod: [24, 60], maxDist: 115, impostorDist: 270, wind: 0.22, flutter: 0.02, height, radius, colorVar: 0.12, ...extra,
});
const R = (file: string, scale: number, extra: Partial<KindDef> = {}): KindDef => ({
  file, lods: 0, scale, shadow: true, detail: false, lod: [30, 1e9], maxDist: 90, wind: 0, flutter: 0, height: 1, radius: 1, colorVar: 0.05, ...extra,
});
const F = (file: string, scale: number, height: number, radius: number, extra: Partial<KindDef> = {}): KindDef => ({
  file, lods: 0, scale, shadow: false, detail: true, lod: [18, 1e9], maxDist: 45, wind: 0.08, flutter: 0.015, height, radius, colorVar: 0.15, ...extra,
});
export const KINDS: Record<ScatterKind, KindDef> = {
  pine: T('pine_tree_01', 0.78, 20, 10), fir: T('fir_tree_01', 0.8, 18, 8),
  birch: T('island_tree_01', 2.0, 5, 2.5, { wind: 0.12, flutter: 0.03 }), oak: T('island_tree_02', 2.3, 3.4, 2.2, { wind: 0.12, flutter: 0.03 }),
  smallTree: T('tree_small_02', 1.3, 4.6, 1.6, { maxDist: 90, impostorDist: 180, lod: [20, 50], wind: 0.15, flutter: 0.03 }),
  pineSapling: { ...T('pine_sapling_small', 1.7, 1.3, 1.2), lods: 1, lod: [16, 1e9], maxDist: 60, impostorDist: 0, shadow: false, detail: true, wind: 0.08 },
  firSapling: { ...T('fir_sapling', 1.5, 1.6, 1.4), lods: 1, lod: [16, 1e9], maxDist: 60, impostorDist: 0, shadow: false, detail: true, wind: 0.08 },
  mossRocks1: { ...R('rock_moss_set_01', 0.55), lods: 1 }, mossRocks2: { ...R('rock_moss_set_02', 0.55), lods: 1 }, boulder: { ...R('boulder_01', 1.6), lods: 1, maxDist: 120 },
  rock7: R('rock_07', 5, { maxDist: 45, detail: true, shadow: false }), rock9: R('rock_09', 8, { maxDist: 45, detail: true, shadow: false }), stone: R('stone_01', 6, { maxDist: 45, detail: true, shadow: false }),
  coastRocks1: { ...R('coast_rocks_01', 0.13, { maxDist: 160 }), lods: 1, lod: [50, 1e9] }, coastRocks3: { ...R('coast_rocks_03', 0.26, { maxDist: 160 }), lods: 1, lod: [50, 1e9] },
  fern: { ...F('fern_02', 0.85, 0.4, 1.0), lods: 1, lod: [14, 1e9], maxDist: 48 }, grassTuft1: F('grass_medium_02', 1.1, 0.4, 0.7, { maxDist: 35 }), grassTuft2: F('grass_medium_02', 0.9, 0.4, 0.7, { maxDist: 35 }),
  shrub1: { ...F('shrub_01', 1.0, 0.4, 1.3), lods: 1, lod: [16, 1e9] }, shrub2: { ...F('shrub_02', 0.5, 1.7, 3, { shadow: true, maxDist: 80 }), lods: 1, lod: [24, 1e9] },
  shrub3: F('shrub_03', 1.0, 0.4, 0.7), shrub4: F('shrub_04', 1.6, 0.2, 0.3, { maxDist: 30 }),
  moss: F('moss_01', 4.0, 0.05, 0.1, { wind: 0, flutter: 0, maxDist: 30 }),
  deadTrunk: R('dead_tree_trunk', 1.4, { maxDist: 70 }), stump1: R('tree_stump_01', 1.2, { maxDist: 60 }), stump2: R('tree_stump_02', 1.2, { maxDist: 60 }),
  roots: R('root_cluster_01', 0.9, { maxDist: 60 }), branches: R('dry_branches_medium_01', 1.2, { maxDist: 35, shadow: false, detail: true }),
};

interface Prim { geometry: THREE.BufferGeometry; matName: string }
interface KindRuntime {
  def: KindDef; placements: Placement[]; matrices: THREE.Matrix4[]; colors: THREE.Color[];
  materials: Map<string, THREE.MeshStandardMaterial>;
  lods: { prims: Prim[]; meshes: THREE.InstancedMesh[] }[];
  colliderRadius: number;
  impostor: THREE.InstancedMesh | null;
}
const IMPOSTOR_VIEWS = 8, IMPOSTOR_RES = 256;

/** De-quantize a (possibly gltfpack-quantized) primitive into float attributes with the node transform baked in. */
function bakePrimitive(mesh: THREE.Mesh): THREE.BufferGeometry {
  const src = mesh.geometry; const out = new THREE.BufferGeometry();
  const m = mesh.matrixWorld; const nm = new THREE.Matrix3().getNormalMatrix(m);
  for (const name of ['position', 'normal', 'uv']) {
    const a = src.getAttribute(name) as THREE.BufferAttribute | undefined; if (!a) continue;
    const size = a.itemSize; const arr = new Float32Array(a.count * size);
    for (let i = 0; i < a.count; i++) { arr[i * size] = a.getX(i); if (size > 1) arr[i * size + 1] = a.getY(i); if (size > 2) arr[i * size + 2] = a.getZ(i); }
    const attr = new THREE.BufferAttribute(arr, size);
    if (name === 'position') attr.applyMatrix4(m); else if (name === 'normal') { attr.applyNormalMatrix(nm); }
    out.setAttribute(name, attr);
  }
  if (src.index) out.setIndex(src.index.clone());
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}

const WIND_VERT = /* glsl */ `
uniform float uTime; uniform vec2 uWindDir; uniform float uWindStrength; uniform float uFlutter; uniform float uModelHeight; uniform float uModelRadius;`;
const WIND_CODE = /* glsl */ `
{
  #ifdef USE_INSTANCING
    vec3 iPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  #else
    vec3 iPos = vec3(0.0);
  #endif
  float phase = dot(iPos.xz, vec2(0.23, 0.17));
  float hgt = clamp(transformed.y / uModelHeight, 0.0, 1.0);
  float radial = clamp(length(transformed.xz) / uModelRadius, 0.0, 1.0);
  float gust = sin(uTime * 0.9 + phase) * 0.5 + sin(uTime * 2.1 + phase * 1.7 + transformed.y * 0.4) * 0.3 + sin(uTime * 4.3 + phase * 2.3 + transformed.x * 0.6 + transformed.z * 0.5) * 0.2;
  float amp = uWindStrength * uModelHeight * (0.15 + 0.85 * hgt * hgt) * (0.35 + 0.65 * radial);
  transformed.xz += uWindDir * gust * amp;
  transformed += objectNormal * sin(uTime * 5.5 + transformed.x * 2.7 + transformed.z * 2.1 + transformed.y * 1.3 + phase) * uFlutter * uModelHeight * (0.2 + 0.8 * hgt);
}`;

export class Vegetation {
  group = new THREE.Group();
  kinds = new Map<ScatterKind, KindRuntime>();
  grass: THREE.Mesh[] = [];
  ready: Promise<void>;
  private lastRefresh = new THREE.Vector3(1e9, 0, 0);
  private windDir = new THREE.Vector2(0.8, 0.6).normalize();
  private time = 0;
  private windUniforms = { uTime: fogUniforms.uTime, uWindDir: { value: this.windDir } };
  private alphaManifest: Record<string, string> = {};
  colliderProxies: THREE.Mesh[] = [];
  private proxyGroup = new THREE.Group();

  constructor(private quality: QualitySettings, private noise: THREE.Texture, private ground: THREE.DataTexture) {
    this.group.add(this.proxyGroup); this.proxyGroup.visible = false;
    for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 30, 8), new THREE.MeshBasicMaterial()); m.visible = false; this.proxyGroup.add(m); this.colliderProxies.push(m); }
    this.ready = this.load();
    this.buildGrass();
  }

  private async load() {
    try { this.alphaManifest = await (await fetch(assetUrl('models/nature/alphas.json'))).json(); } catch { this.alphaManifest = {}; }
    const byKind = new Map<ScatterKind, Placement[]>();
    for (const p of [...trees(), ...rocks(), ...foliage()]) { if (!byKind.has(p.kind)) byKind.set(p.kind, []); byKind.get(p.kind)!.push(p); }
    const tasks: Promise<void>[] = [];
    for (const [kind, def] of Object.entries(KINDS) as [ScatterKind, KindDef][]) {
      const placements = byKind.get(kind); if (!placements?.length) continue;
      tasks.push(this.loadKind(kind, def, placements).catch((e) => console.warn('vegetation kind failed', kind, e)));
    }
    await Promise.all(tasks);
    this.refresh(new THREE.Vector3(0, 0, 0), true);
  }

  private async loadKind(kind: ScatterKind, def: KindDef, placements: Placement[]) {
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    const windU = { ...this.windUniforms, uWindStrength: { value: def.wind }, uFlutter: { value: def.flutter }, uModelHeight: { value: def.height }, uModelRadius: { value: def.radius } };
    const loadLod = async (i: number): Promise<Prim[]> => {
      const gltf = await assets.gltf(`models/nature/${def.file}${i === 0 ? '' : '_lod' + i}.glb`);
      gltf.scene.updateMatrixWorld(true);
      const prims: Prim[] = [];
      gltf.scene.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        const mesh = o as THREE.Mesh; const mat = mesh.material as THREE.MeshStandardMaterial;
        const name = mat.name || def.file;
        // Poly Haven "dead_branches" are alpha cards whose alpha map we don't ship: without it they render as opaque
        // dark quads (black clumps in every crown). Skip them entirely.
        if (/dead_branches/i.test(name) && !this.alphaManifest[name]) return;
        if (i === 0 && !materials.has(name)) materials.set(name, this.prepareMaterial(mat, name, def, windU));
        prims.push({ geometry: bakePrimitive(mesh), matName: name });
      });
      return prims;
    };
    const lodPrims: Prim[][] = [await loadLod(0)];
    for (let i = 1; i <= def.lods; i++) lodPrims.push(await loadLod(i));
    // instance transforms
    const matrices: THREE.Matrix4[] = [], colors: THREE.Color[] = [];
    const o = new THREE.Object3D(); const c = new THREE.Color();
    for (const p of placements) {
      o.position.set(p.x, p.y + (def.y ?? 0), p.z);
      o.rotation.set(0, 0, 0);
      o.quaternion.setFromAxisAngle(new THREE.Vector3(Math.cos(p.tiltDir), 0, -Math.sin(p.tiltDir)), p.tilt);
      o.rotateY(p.yaw);
      const s = def.scale * p.scale; o.scale.set(s, s, s); o.updateMatrix();
      matrices.push(o.matrix.clone());
      const v = (p.v - 0.5) * 2 * def.colorVar;
      c.setRGB(1 + v * 0.6, 1 + v, 1 + v * 0.4); colors.push(c.clone());
    }
    const rt: KindRuntime = { def, placements, matrices, colors, materials, lods: [], colliderRadius: 0, impostor: null };
    for (let li = 0; li < lodPrims.length; li++) {
      const meshes: THREE.InstancedMesh[] = [];
      for (const prim of lodPrims[li]) {
        const mat = materials.get(prim.matName) ?? materials.values().next().value!;
        const im = new THREE.InstancedMesh(prim.geometry, mat, placements.length);
        im.count = 0; im.frustumCulled = false; im.name = `${kind}:${prim.matName}:lod${li}`;
        im.castShadow = def.shadow && li <= 1; im.receiveShadow = true;
        if (def.detail) im.layers.enable(DETAIL_LAYER);
        im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(placements.length * 3), 3);
        this.group.add(im); meshes.push(im);
      }
      rt.lods.push({ prims: lodPrims[li], meshes });
    }
    if ((def.impostorDist ?? 0) > 0) {
      try { rt.impostor = this.buildImpostor(kind, def, lodPrims[0], materials, placements.length); this.group.add(rt.impostor); }
      catch (e) { console.warn('impostor bake failed', kind, e); }
    }
    this.kinds.set(kind, rt);
  }

  // ------------------------------------------------------------------------------------------ impostors
  private bakeRenderer: THREE.WebGLRenderer | null = null;
  private bakeRT: THREE.WebGLRenderTarget | null = null;
  /** Render the lod0 tree from IMPOSTOR_VIEWS azimuths into an atlas (offscreen context, neutral lighting) and
   *  build a cylindrical-billboard InstancedMesh that picks the nearest view per instance. */
  private buildImpostor(kind: ScatterKind, def: KindDef, prims: Prim[], materials: Map<string, THREE.MeshStandardMaterial>, count: number): THREE.InstancedMesh {
    if (!this.bakeRenderer) {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
      this.bakeRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
      this.bakeRenderer.outputColorSpace = THREE.SRGBColorSpace; this.bakeRenderer.toneMapping = THREE.NoToneMapping; this.bakeRenderer.shadowMap.enabled = false;
      this.bakeRT = new THREE.WebGLRenderTarget(IMPOSTOR_VIEWS * IMPOSTOR_RES, IMPOSTOR_RES, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
    }
    const renderer = this.bakeRenderer, rt = this.bakeRT!;
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.35), new THREE.HemisphereLight(new THREE.Color(0.85, 0.9, 1.0), new THREE.Color(0.45, 0.4, 0.35), 1.1));
    const key = new THREE.DirectionalLight(0xfff2e0, 0.9); key.position.set(0.4, 1, 0.6); scene.add(key);
    const box = new THREE.Box3();
    const group = new THREE.Group();
    for (const p of prims) {
      const mat = (materials.get(p.matName) ?? materials.values().next().value!).clone();
      mat.onBeforeCompile = () => {}; mat.customProgramCacheKey = () => 'bake'; // plain shading, no fog/wind in the bake
      const m = new THREE.Mesh(p.geometry, mat); group.add(m); box.expandByObject(m);
    }
    scene.add(group);
    const size = new THREE.Vector3(); box.getSize(size); const center = new THREE.Vector3(); box.getCenter(center);
    const r = Math.max(size.x, size.z, size.y) * 0.5 * 1.02;
    const cam = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, r * 6);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.setScissorTest(true);
    for (let i = 0; i < IMPOSTOR_VIEWS; i++) {
      const a = (i / IMPOSTOR_VIEWS) * Math.PI * 2;
      cam.position.set(center.x + Math.sin(a) * r * 3, center.y + r * 0.35, center.z + Math.cos(a) * r * 3); cam.lookAt(center); cam.updateProjectionMatrix();
      renderer.setViewport(i * IMPOSTOR_RES, 0, IMPOSTOR_RES, IMPOSTOR_RES); renderer.setScissor(i * IMPOSTOR_RES, 0, IMPOSTOR_RES, IMPOSTOR_RES);
      renderer.render(scene, cam);
    }
    renderer.setScissorTest(false);
    const px = new Uint8Array(rt.width * rt.height * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, px);
    renderer.setRenderTarget(null);
    for (const m of group.children) ((m as THREE.Mesh).material as THREE.Material).dispose();
    const tex = new THREE.DataTexture(px, rt.width, rt.height, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true;
    // billboard quad: x in [-0.5,0.5], y in [0,1]; oriented + scaled in the vertex shader
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide, color: 0xffffff });
    const u = { uViews: { value: IMPOSTOR_VIEWS }, uSize: { value: r * 2 }, uCenterY: { value: center.y - r }, uSunDir: fogUniforms.uSunDir, uSunColorV: { value: SUN_COLOR }, uCenterXZ: { value: new THREE.Vector2(center.x, center.z) } };
    applyHeightFog(mat, (shader) => {
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
uniform float uViews; uniform float uSize; uniform float uCenterY; uniform vec2 uCenterXZ; uniform vec3 uSunDir;
varying float vView; varying float vLit;`)
        .replace('#include <begin_vertex>', `
vec3 iPos = instanceMatrix[3].xyz; float iScale = length(instanceMatrix[0].xyz);
float iYaw = atan(-instanceMatrix[0].z, instanceMatrix[0].x);
vec3 base = iPos + vec3(0.0, uCenterY * iScale, 0.0);
vec3 toCam = cameraPosition - base; toCam.y = 0.0; float dCam = max(length(toCam), 0.001); toCam /= dCam;
float phi = atan(toCam.x, toCam.z) - iYaw;
float viewF = phi / (6.2831853 / uViews); vView = mod(floor(viewF + 0.5), uViews);
vec3 rightV = vec3(toCam.z, 0.0, -toCam.x);
vec3 transformed = base + rightV * (position.x * uSize * iScale) + vec3(0.0, position.y * uSize * iScale, 0.0);
vLit = 0.45 + 0.55 * max(dot(toCam, uSunDir), 0.0);`)
        .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;')
        .replace('#include <worldpos_vertex>', 'vec4 worldPosition = vec4(transformed, 1.0);')
        .replace('vHFWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;', 'vHFWorldPos = transformed;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uViews; uniform vec3 uSunColorV; varying float vView; varying float vLit;')
        .replace('#include <map_fragment>', `
vec4 sampledDiffuseColor = texture2D(map, vec2((vMapUv.x + vView) / uViews, vMapUv.y));
diffuseColor *= sampledDiffuseColor;
diffuseColor.rgb *= mix(vec3(0.42, 0.47, 0.6), vec3(1.0, 0.92, 0.8), vLit) * 0.95;`);
    });
    mat.customProgramCacheKey = () => 'impostor';
    const im = new THREE.InstancedMesh(geo, mat, count); im.count = 0; im.frustumCulled = false; im.name = kind + ':impostor';
    im.castShadow = false; im.receiveShadow = false;
    return im;
  }

  private prepareMaterial(src: THREE.MeshStandardMaterial, name: string, def: KindDef, windU: Record<string, THREE.IUniform>): THREE.MeshStandardMaterial {
    const mat = src.clone();
    // alpha-tested foliage only when we actually have an alpha map (or the source material is already cut-out);
    // '*_branches' meshes on the island trees / saplings are solid geometry and must stay opaque.
    const leaf = !!this.alphaManifest[name] || src.alphaTest > 0 || src.transparent || (/twig|leaves|leaf|needle|fern|grass|shrub|moss/i.test(name) && !/branches/i.test(name));
    const alphaFile = this.alphaManifest[name];
    if (alphaFile) assets.texture(`models/nature/${alphaFile}`).then((t) => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; mat.alphaMap = t; mat.needsUpdate = true; });
    if (leaf) {
      mat.alphaTest = 0.42; mat.side = THREE.DoubleSide; mat.transparent = false; mat.depthWrite = true; mat.roughness = Math.max(mat.roughness, 0.7);
      // cheap translucency: back-lit leaves glow with their own texel colour instead of going black
      if (mat.map) { mat.emissiveMap = mat.map; mat.emissive = new THREE.Color(0.30, 0.30, 0.22); }
    }
    else { mat.side = THREE.FrontSide; }
    mat.metalness = 0; mat.envMapIntensity = leaf ? 0.35 : 0.6;
    if (mat.map) { mat.map.anisotropy = 8; mat.map.colorSpace = THREE.SRGBColorSpace; }
    (mat as any).ior = 1.45;
    applyHeightFog(mat, (shader) => {
      Object.assign(shader.uniforms, windU, { uSunColorV: { value: SUN_COLOR }, uTranslucency: { value: leaf ? 0.35 : 0 } });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\n' + WIND_VERT)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (def.wind > 0 ? WIND_CODE : ''));
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uSunColorV; uniform float uTranslucency;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (uTranslucency > 0.0) {
  vec3 sdV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
  float back = pow(max(dot(normalize(-vViewPosition), sdV), 0.0), 4.0);
  totalEmissiveRadiance += diffuseColor.rgb * uSunColorV * back * uTranslucency;
}`);
    });
    mat.customProgramCacheKey = () => `veg:${leaf ? 'leaf' : 'solid'}:${def.wind > 0 ? 'wind' : 'still'}`;
    return mat;
  }

  /** Re-bucket instances into LODs around the camera. Cheap enough to run whenever the camera moved a few metres. */
  refresh(camPos: THREE.Vector3, force = false) {
    if (!force && camPos.distanceToSquared(this.lastRefresh) < 2.5 * 2.5) return;
    this.lastRefresh.copy(camPos);
    const detailScale = this.quality.treeDetail;
    for (const rt of this.kinds.values()) {
      const lists: number[][] = rt.lods.map(() => []); const far: number[] = [];
      const maxD = rt.def.maxDist * (0.7 + 0.3 * detailScale) * (rt.def.detail ? (0.6 + 0.4 * this.quality.grassDensity) : 1);
      const impD = rt.impostor ? (rt.def.impostorDist ?? 0) : 0;
      const l0 = rt.def.lod[0] * (0.6 + 0.4 * detailScale), l1 = rt.def.lod[1] * (0.7 + 0.3 * detailScale);
      for (let i = 0; i < rt.placements.length; i++) {
        const p = rt.placements[i];
        const dx = p.x - camPos.x, dz = p.z - camPos.z; const d = Math.sqrt(dx * dx + dz * dz);
        if (d > maxD) { if (d < impD) far.push(i); continue; }
        const lod = d < l0 ? 0 : d < l1 ? 1 : 2; const li = Math.min(lod, rt.lods.length - 1);
        lists[li].push(i);
      }
      if (rt.impostor) {
        const im = rt.impostor; im.count = far.length;
        for (let k = 0; k < far.length; k++) im.setMatrixAt(k, rt.matrices[far[k]]);
        im.instanceMatrix.needsUpdate = true;
      }
      for (let li = 0; li < rt.lods.length; li++) {
        const list = lists[li];
        for (const im of rt.lods[li].meshes) {
          im.count = list.length;
          for (let k = 0; k < list.length; k++) { im.setMatrixAt(k, rt.matrices[list[k]]); im.setColorAt(k, rt.colors[list[k]]); }
          im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        }
      }
    }
  }

  /** Nearest solid trunks/rocks as invisible cylinders for camera collision. */
  updateColliderProxies(focus: THREE.Vector3) {
    const near: { d: number; p: Placement; s: number }[] = [];
    for (const rt of this.kinds.values()) {
      for (const p of rt.placements) {
        if (p.r <= 0) continue;
        const d = Math.hypot(p.x - focus.x, p.z - focus.z); if (d < 14) near.push({ d, p, s: p.r });
      }
    }
    near.sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.colliderProxies.length; i++) {
      const m = this.colliderProxies[i]; const n = near[i];
      if (!n) { m.visible = false; m.position.set(0, -1000, 0); continue; }
      m.visible = true; m.position.set(n.p.x, n.p.y + 15, n.p.z); m.scale.set(n.s, 1, n.s); m.updateMatrixWorld();
    }
  }

  // ------------------------------------------------------------------------------------------ grass
  private buildGrass() {
    const dens = this.quality.grassDensity;
    if (dens <= 0) return;
    const make = (gridN: number, cell: number, perCell: number, bladeScale: number, fade: [number, number], inner: number, hi: boolean) => {
      // blade: 3 segments + tip, mirrored around x
      const segs = hi ? 4 : 2; const pos: number[] = [], uvs: number[] = [], idx: number[] = [];
      for (let s = 0; s <= segs; s++) { const t = s / segs; const w = (1 - t * t) * 0.5; if (s < segs) { pos.push(-w, t, 0, w, t, 0); uvs.push(0, t, 1, t); } else { pos.push(0, 1, 0); uvs.push(0.5, 1); } }
      for (let s = 0; s < segs; s++) { const a = s * 2; if (s < segs - 1) idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); else idx.push(a, a + 1, a + 2); }
      const geo = new THREE.InstancedBufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      const nrm = new Float32Array(pos.length); for (let i = 0; i < pos.length / 3; i++) nrm[i * 3 + 2] = 1; geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      geo.setIndex(idx);
      const total = gridN * gridN * perCell; geo.instanceCount = Math.max(1, Math.floor(total * dens));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
      const u = {
        uAnchor: { value: new THREE.Vector2() }, uCell: { value: cell }, uGridN: { value: gridN }, uPerCell: { value: perCell }, uTotal: { value: total },
        uBladeScale: { value: bladeScale }, uFade: { value: new THREE.Vector2(fade[0], fade[1]) }, uInner: { value: inner },
        uGround: { value: this.ground }, uNoise: { value: this.noise }, uTime: fogUniforms.uTime, uWindDir: { value: this.windDir }, uMapHalf: { value: MAP_HALF },
        uSunColorV: { value: SUN_COLOR },
      };
      applyHeightFog(mat, (shader) => {
        Object.assign(shader.uniforms, u);
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
uniform vec2 uAnchor; uniform float uCell; uniform float uGridN; uniform float uPerCell; uniform float uTotal; uniform float uBladeScale; uniform vec2 uFade; uniform float uInner;
uniform sampler2D uGround; uniform sampler2D uNoise; uniform float uTime; uniform vec2 uWindDir; uniform float uMapHalf;
varying vec3 vGrassCol; varying float vGrassAO;
float gh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
          .replace('#include <beginnormal_vertex>', `
vec3 transformed; vec3 objectNormal;
{
  float id = float(gl_InstanceID);
  float cellIdx = mod(id * 337.0, uTotal);
  float sub = mod(cellIdx, uPerCell); float ci = floor(cellIdx / uPerCell);
  float gx = mod(ci, uGridN), gz = floor(ci / uGridN);
  vec2 base = floor(uAnchor / uCell) - uGridN * 0.5;
  vec2 cellXZ = base + vec2(gx, gz);
  vec2 seed = cellXZ * 1.7 + sub * 13.1;
  vec2 jitter = vec2(gh(seed), gh(seed + 7.3));
  vec2 wxz = (cellXZ + jitter) * uCell;
  // ground data: R height, G grass weight, B forest weight, A blocked (path/sand/rock/cobble/water)
  vec2 guv = (wxz / uMapHalf) * 0.5 + 0.5;
  vec4 g = texture2D(uGround, guv);
  float dist = length(wxz - uAnchor);
  float grassW = g.g + g.b * 0.85;
  float ok = step(uInner, dist) * step(0.001, grassW) * step(0.5, 1.0 - g.a) * step(gh(seed + 3.3), grassW * 1.15);
  float fade = 1.0 - smoothstep(uFade.x, uFade.y, dist);
  float hv = 0.6 + 0.8 * gh(seed + 1.1);
  float macro = texture2D(uNoise, wxz * 0.02).r;
  float height = uBladeScale * hv * (0.75 + 0.5 * macro) * (0.85 + 0.3 * g.b) * fade * ok;
  float width = uBladeScale * 0.16 * (0.7 + 0.6 * gh(seed + 2.2)) * (1.0 + dist * 0.03);
  float yaw = gh(seed + 4.4) * 6.2832;
  vec2 fwd = vec2(cos(yaw), sin(yaw));
  float t = position.y;
  // wind: gusts scroll over the field, blades bend along the wind with a per-blade phase
  float gust = texture2D(uNoise, wxz * 0.035 + uTime * 0.07 * uWindDir).g * 2.0 - 1.0;
  float sway = sin(uTime * 2.3 + gh(seed + 5.5) * 6.28 + wxz.x * 0.3 + wxz.y * 0.2) * 0.35;
  vec2 bend = uWindDir * (0.35 + 0.65 * gust) * 0.9 + fwd * (0.25 * (gh(seed + 6.6) - 0.5)) + uWindDir * sway * 0.5;
  float bt = t * t;
  vec3 p = vec3(wxz.x, g.r - 0.04, wxz.y);
  p.x += fwd.y * position.x * width + bend.x * bt * height;
  p.z += -fwd.x * position.x * width + bend.y * bt * height;
  p.y += t * height * (1.0 - 0.35 * length(bend) * bt);
  transformed = p;
  objectNormal = normalize(vec3(fwd.x, 1.6, fwd.y));
  // colour: dark olive root → warm yellow-green tip, forest floor makes it mossier, macro noise dries patches
  vec3 root = vec3(0.09, 0.13, 0.05); vec3 tip = mix(vec3(0.34, 0.44, 0.15), vec3(0.50, 0.46, 0.20), macro);
  vec3 col = mix(root, tip, pow(t, 0.9) * 0.85 + 0.15);
  col = mix(col, col * vec3(0.72, 0.85, 0.66), g.b * 0.6);
  col *= 0.8 + 0.4 * gh(seed + 8.8);
  vGrassCol = col; vGrassAO = 0.55 + 0.45 * t;
}`)
          .replace('#include <begin_vertex>', '')
          .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;')
          .replace('#include <worldpos_vertex>', 'vec4 worldPosition = vec4(transformed, 1.0);')
          .replace('vHFWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;', 'vHFWorldPos = transformed;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vGrassCol; varying float vGrassAO; uniform vec3 uSunColorV;')
          .replace('#include <color_fragment>', 'diffuseColor.rgb *= vGrassCol;')
          .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= vGrassAO;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  vec3 sdV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
  float back = pow(max(dot(normalize(-vViewPosition), sdV), 0.0), 3.0);
  totalEmissiveRadiance += diffuseColor.rgb * uSunColorV * back * 0.3 * vGrassAO;
}`);
      });
      mat.customProgramCacheKey = () => 'grass:' + (hi ? 'hi' : 'lo');
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false; mesh.layers.enable(DETAIL_LAYER); mesh.name = 'grass';
      (mesh as any).grassUniforms = u;
      this.group.add(mesh); this.grass.push(mesh);
    };
    // near carpet: 0.2 m cells, 2 blades/cell over a 32 m square (~51k blades at density 1)
    make(160, 0.2, 2, 0.38, [12, 17], 0, true);
    // far ring: 0.55 m cells, wider blades over a 88 m square, starts where the near carpet fades
    make(160, 0.55, 1, 0.5, [40, 52], 11, false);
  }

  update(dt: number, camPos: THREE.Vector3, focus: THREE.Vector3) {
    this.time += dt;
    this.refresh(camPos);
    for (const g of this.grass) (g as any).grassUniforms.uAnchor.value.set(focus.x, focus.z);
  }
}
