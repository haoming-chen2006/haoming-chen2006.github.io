#!/usr/bin/env node
// Poly Haven (CC0) asset pipeline for the Hollowmere environment.
//   node scripts/fetch-assets.mjs                 fetch everything in the manifest (skips existing outputs)
//   node scripts/fetch-assets.mjs models fern_02  fetch + pack only the listed model ids
//   node scripts/fetch-assets.mjs --force ...     re-download / re-pack
//   node scripts/fetch-assets.mjs --report        print triangle counts + sizes of public/assets/models/nature/*.glb
// Raw downloads are cached in node_modules/.cache/polyhaven (huge tree .bin files live there, never in public/).
// Textures are re-encoded with macOS `sips` (falls back to a plain copy elsewhere), models are decimated with gltfpack.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'polyhaven');
const OUT = path.join(ROOT, 'public', 'assets');
const API = 'https://api.polyhaven.com/files/';

// ---------------------------------------------------------------------------------------------- manifest
/** Ground splat set + misc surfaces. res 2k only for the layers that cover most of the screen. */
const TEXTURES = [
  { id: 'rocky_terrain_02', res: '2k' },     // grass meadow (green, small stones)
  { id: 'forest_leaves_02', res: '2k' },     // mossy forest floor with leaves
  { id: 'forest_ground_04', res: '1k' },     // dirt path (pine forest collection)
  { id: 'coast_sand_01', res: '1k' },        // lake shore sand
  { id: 'aerial_rocks_02', res: '1k' },      // mossy cliff rock (triplanar on slopes)
  { id: 'cobblestone_floor_08', res: '1k' }, // chapel courtyard
  { id: 'mossy_rock', res: '1k' },           // distant mountains / boulders
];
const HDRIS = [
  { id: 'kloppenheim_06_puresky', res: '2k' }, // low warm sun, blue-hour sky
];
/**
 * lods[0] is the textured base glb, lods[1..] are untextured <id>_lodN.glb that reuse lod0's materials at runtime.
 *   ratio: gltfpack -si target for solid geometry (trunks, rocks), se: simplification error limit,
 *   keep/grow: fraction of leaf cards kept and how much each surviving card is scaled up (see thinLeafCards),
 *   sloppy: -sa (only for non-card geometry). tex = max texture size for [diffuse, normal, arm].
 */
const TREE = (id, tex, lods) => ({ id, tex, cardTris: 60, lods });
const MODELS = [
  // conifers: ~6k real sprig cards + 400k-1.3M needle cards. lod0 keeps every sprig and a pinch of needles.
  TREE('pine_tree_01', [1024, 512, 512], [
    { ratio: 0.02, se: 0.02, keep: 0.005, grow: 2.6, sprigs: 1.0, growSprig: 1.25 },
    { ratio: 0.004, se: 0.05, keep: 0, sprigs: 0.25, growSprig: 2.3 },
    { ratio: 0.0015, se: 0.1, keep: 0, sprigs: 0.06, growSprig: 4.5 }]),
  TREE('fir_tree_01', [1024, 512, 512], [
    { ratio: 0.02, se: 0.02, keep: 0.0025, grow: 2.6, sprigs: 1.0, growSprig: 1.25 },
    { ratio: 0.004, se: 0.05, keep: 0, sprigs: 0.25, growSprig: 2.3 },
    { ratio: 0.0015, se: 0.1, keep: 0, sprigs: 0.06, growSprig: 4.5 }]),
  // broadleaf: 30-44k individual leaf cards (5 cm) + heavy branch geometry
  TREE('island_tree_01', [1024, 512, 512], [
    { ratio: 0.008, se: 0.03, keep: 0.08, grow: 2.8, sprigs: 0.08, growSprig: 2.8 },
    { ratio: 0.0015, se: 0.08, keep: 0.018, grow: 5.5, sprigs: 0.018, growSprig: 5.5 },
    { ratio: 0.0005, se: 0.15, keep: 0.005, grow: 10.0, sprigs: 0.005, growSprig: 10.0 }]),
  TREE('island_tree_02', [1024, 512, 512], [
    { ratio: 0.01, se: 0.03, keep: 0.09, grow: 2.8, sprigs: 0.09, growSprig: 2.8 },
    { ratio: 0.002, se: 0.08, keep: 0.02, grow: 5.5, sprigs: 0.02, growSprig: 5.5 },
    { ratio: 0.0006, se: 0.15, keep: 0.006, grow: 10.0, sprigs: 0.006, growSprig: 10.0 }]),
  TREE('tree_small_02', [1024, 512, 512], [
    { ratio: 0.01, se: 0.03, keep: 0.06, grow: 2.8, sprigs: 0.002, growSprig: 1.3 },
    { ratio: 0.002, se: 0.08, keep: 0.015, grow: 5.5, sprigs: 0.0006, growSprig: 2.0 },
    { ratio: 0.0006, se: 0.15, keep: 0.004, grow: 10.0, sprigs: 0, growSprig: 3.0 }]),
  TREE('pine_sapling_small', [1024, 512, 512], [{ ratio: 0.2, keep: 0.03, grow: 2.8, sprigs: 1.0, growSprig: 1.2 }, { ratio: 0.08, se: 0.03, keep: 0.008, grow: 4.5, sprigs: 0.3, growSprig: 2.0 }]),
  TREE('fir_sapling', [1024, 512, 512], [{ ratio: 0.2, keep: 0.025, grow: 2.8, sprigs: 1.0, growSprig: 1.2 }, { ratio: 0.08, se: 0.03, keep: 0.006, grow: 4.5, sprigs: 0.3, growSprig: 2.0 }]),
  // rocks (budget ≤ ~3k tris each; small pebbles ≤ 1k)
  { id: 'rock_moss_set_01', tex: [1024, 1024, 512], lods: [{ ratio: 0.1, se: 0.05 }, { ratio: 0.02, se: 0.1 }] },
  { id: 'rock_moss_set_02', tex: [1024, 1024, 512], lods: [{ ratio: 0.1, se: 0.05 }, { ratio: 0.02, se: 0.1 }] },
  { id: 'boulder_01', tex: [1024, 1024, 512], lods: [{ ratio: 0.15, se: 0.05 }, { ratio: 0.03, se: 0.1 }] },
  { id: 'rock_07', tex: [1024, 1024, 512], lods: [{ ratio: 0.12, se: 0.05 }] },
  { id: 'rock_09', tex: [1024, 1024, 512], lods: [{ ratio: 0.12, se: 0.05 }] },
  { id: 'stone_01', tex: [1024, 1024, 512], lods: [{ ratio: 0.05, se: 0.05 }] },
  { id: 'coast_rocks_01', tex: [1024, 1024, 512], lods: [{ ratio: 0.008, se: 0.05 }, { ratio: 0.002, se: 0.1 }] },
  { id: 'coast_rocks_03', tex: [1024, 1024, 512], lods: [{ ratio: 0.008, se: 0.05 }, { ratio: 0.002, se: 0.1 }] },
  { id: 'mountainside', tex: [1024, 1024, 512], lods: [{ ratio: 0.05, se: 0.05 }] },
  // foliage + forest floor props (≤ ~2.5k tris each)
  { id: 'fern_02', tex: [1024, 512, 512], lods: [{ ratio: 0.4, se: 0.05 }, { ratio: 0.1, se: 0.1, sloppy: true }] },
  { id: 'grass_medium_01', tex: [1024, 512, 512], lods: [{ ratio: 0.2, se: 0.05 }] },
  { id: 'grass_medium_02', tex: [1024, 512, 512], lods: [{ ratio: 0.3, se: 0.05 }] },
  { id: 'shrub_01', tex: [1024, 512, 512], lods: [{ ratio: 0.08, se: 0.1, sloppy: true }, { ratio: 0.02, se: 0.2, sloppy: true }] },
  { id: 'shrub_02', tex: [1024, 512, 512], lods: [{ ratio: 0.15, se: 0.05 }, { ratio: 0.04, se: 0.1, sloppy: true }] },
  { id: 'shrub_03', tex: [1024, 512, 512], lods: [{ ratio: 0.3, se: 0.05 }] },
  { id: 'shrub_04', tex: [1024, 512, 512], lods: [{ ratio: 0.15, se: 0.05 }] },
  { id: 'moss_01', tex: [1024, 512, 512], lods: [{ ratio: 1 }] },
  { id: 'dead_tree_trunk', tex: [1024, 512, 512], lods: [{ ratio: 0.08, se: 0.05 }] },
  { id: 'tree_stump_01', tex: [1024, 512, 512], lods: [{ ratio: 0.1, se: 0.05 }] },
  { id: 'tree_stump_02', tex: [1024, 512, 512], lods: [{ ratio: 0.1, se: 0.05 }] },
  { id: 'root_cluster_01', tex: [1024, 512, 512], lods: [{ ratio: 0.06, se: 0.05 }] },
  { id: 'dry_branches_medium_01', tex: [1024, 512, 512], lods: [{ ratio: 0.25, se: 0.05 }] },
];

// ---------------------------------------------------------------------------------------------- helpers
const args = process.argv.slice(2);
const force = args.includes('--force');
const report = args.includes('--report');
const positional = args.filter((a) => !a.startsWith('--'));
const section = ['textures', 'hdri', 'models'].includes(positional[0]) ? positional.shift() : null;
const only = new Set(positional);
const want = (sec, id) => (!section || section === sec) && (only.size === 0 || only.has(id));

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const mb = (n) => (n / 1e6).toFixed(2) + ' MB';
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const hasSips = process.platform === 'darwin' && fs.existsSync('/usr/bin/sips');

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}
async function download(url, dest, size) {
  if (!force && fs.existsSync(dest) && (size == null || fs.statSync(dest).size === size)) return false;
  ensureDir(path.dirname(dest));
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`${url}: HTTP ${r.status}`);
  const tmp = dest + '.part';
  const ws = fs.createWriteStream(tmp);
  const reader = r.body.getReader();
  let got = 0, lastLog = Date.now();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    got += value.length; ws.write(value);
    if (size > 20e6 && Date.now() - lastLog > 5000) { lastLog = Date.now(); log(`  ${path.basename(dest)} ${mb(got)} / ${mb(size)}`); }
  }
  await new Promise((res, rej) => ws.end((e) => (e ? rej(e) : res())));
  fs.renameSync(tmp, dest);
  return true;
}
/** Re-encode a jpg: max dimension + quality. Uses sips on macOS, plain copy elsewhere. */
function encodeJpg(src, dest, maxDim, quality = 82) {
  ensureDir(path.dirname(dest));
  if (!hasSips) { fs.copyFileSync(src, dest); return; }
  const r = spawnSync('/usr/bin/sips', ['-Z', String(maxDim), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), src, '--out', dest], { stdio: 'pipe' });
  if (r.status !== 0 || !fs.existsSync(dest)) { console.warn('sips failed for', src, r.stderr?.toString()); fs.copyFileSync(src, dest); }
}
const pickMap = (d, names) => { for (const n of names) if (d[n]) return { name: n, entry: d[n] }; return null; };

// ---------------------------------------------------------------------------------------------- textures
async function doTexture({ id, res }) {
  const outDir = path.join(OUT, 'textures', id);
  const outs = { diff: `${id}_diff_${res}.jpg`, nor_gl: `${id}_nor_gl_${res}.jpg`, arm: `${id}_arm_${res}.jpg` };
  if (!force && Object.values(outs).every((f) => fs.existsSync(path.join(outDir, f)))) { log('texture ok', id); return; }
  const d = await fetchJson(API + id);
  const maps = { diff: pickMap(d, ['Diffuse', 'diff', 'Color']), nor_gl: pickMap(d, ['nor_gl']), arm: pickMap(d, ['arm']) };
  for (const [k, m] of Object.entries(maps)) {
    if (!m) { console.warn(`  ${id}: no ${k} map (have ${Object.keys(d).join(',')})`); continue; }
    const r = m.entry[res] ?? m.entry['1k'];
    const file = r.jpg ?? r.png;
    const raw = path.join(CACHE, 'textures', id, `${k}_${res}.jpg`);
    const fresh = await download(file.url, raw, file.size);
    encodeJpg(raw, path.join(outDir, outs[k]), res === '2k' ? 2048 : 1024, k === 'diff' ? 85 : 80);
    log(`  ${id} ${k} ${fresh ? 'downloaded' : 'cached'} → ${mb(fs.statSync(path.join(outDir, outs[k])).size)}`);
  }
}

// ---------------------------------------------------------------------------------------------- hdris
async function doHdri({ id, res }) {
  const dest = path.join(OUT, 'hdri', `${id}_${res}.hdr`);
  if (!force && fs.existsSync(dest)) { log('hdri ok', id); return; }
  const d = await fetchJson(API + id);
  const f = d.hdri[res].hdr;
  await download(f.url, dest, f.size);
  log(`  hdri ${id} → ${mb(fs.statSync(dest).size)}`);
}

// ---------------------------------------------------------------------------------------------- models
/**
 * Read a .gltf + .bin and rebuild the leaf-card primitives: connected islands with <= cardTris triangles are
 * treated as photoscan leaf/needle cards; a random `keep` fraction survives and each survivor is replaced by ONE
 * textured quad (least-squares fit of position vs uv, so the atlas region is preserved) scaled by `grow` about its
 * centre so the canopy keeps its visual mass. Bigger islands (real branch geometry) are kept as they are. Solid
 * primitives are copied through. Writes a new .gltf/.bin pair with float attributes.
 */
function thinLeafCards(gltfPath, binPath, outGltf, outBin, keep, grow, cardTris, clusterKeep, growBig) {
  const g = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));
  const bin = fs.readFileSync(binPath);
  if (g.buffers.length !== 1) throw new Error('expected a single buffer');
  const acc = (i) => g.accessors[i];
  const view = (a) => { const bv = g.bufferViews[a.bufferView]; return { off: (bv.byteOffset ?? 0) + (a.byteOffset ?? 0), stride: bv.byteStride ?? 0 }; };
  const isLeafMat = (mi) => { const m = g.materials?.[mi]; const n = (m?.name ?? '').toLowerCase(); return /twig|leaf|leaves|needle|foliage/.test(n) || m?.alphaMode === 'MASK' || m?.alphaMode === 'BLEND'; };
  const chunks = []; let total = 0;
  const push = (buf) => { const off = total; chunks.push(buf); total += buf.length; const pad = (4 - (buf.length % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); total += pad; } return off; };
  const newViews = [], newAcc = [];
  const seed = { s: 0x9e3779b9 }; const rnd = () => { let t = (seed.s += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const stats = { before: 0, after: 0, cards: 0, kept: 0, big: 0, bigKept: 0 };
  const addAccessor = (arr, type, comps, target, minmax) => {
    const off = push(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength));
    newViews.push({ buffer: 0, byteOffset: off, byteLength: arr.byteLength, target });
    const a = { bufferView: newViews.length - 1, componentType: arr instanceof Float32Array ? 5126 : arr instanceof Uint32Array ? 5125 : 5123, count: arr.length / comps, type };
    if (minmax) { const mn = new Array(comps).fill(Infinity), mx = new Array(comps).fill(-Infinity); for (let i = 0; i < arr.length; i += comps) for (let c = 0; c < comps; c++) { mn[c] = Math.min(mn[c], arr[i + c]); mx[c] = Math.max(mx[c], arr[i + c]); } a.min = mn; a.max = mx; }
    newAcc.push(a); return newAcc.length - 1;
  };
  for (const mesh of g.meshes) for (const prim of mesh.primitives) {
    const ia = acc(prim.indices); const iv = view(ia);
    const IndexT = ia.componentType === 5125 ? Uint32Array : ia.componentType === 5123 ? Uint16Array : Uint8Array;
    const idx = new IndexT(bin.buffer, bin.byteOffset + iv.off, ia.count);
    const attrs = {};
    for (const [k, ai] of Object.entries(prim.attributes)) {
      const a = acc(ai); const v = view(a); const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
      const T = a.componentType === 5126 ? Float32Array : a.componentType === 5123 ? Uint16Array : a.componentType === 5121 ? Uint8Array : Float32Array;
      if (v.stride && v.stride !== comps * T.BYTES_PER_ELEMENT) throw new Error('interleaved buffers not supported');
      attrs[k] = { a, comps, T, data: new T(bin.buffer, bin.byteOffset + v.off, a.count * comps) };
    }
    const tris = ia.count / 3; stats.before += tris;
    const leaf = isLeafMat(prim.material) && keep < 1 && attrs.TEXCOORD_0 && attrs.TEXCOORD_0.T === Float32Array && attrs.POSITION.T === Float32Array;
    if (leaf) {
      const pos = attrs.POSITION.data, uv = attrs.TEXCOORD_0.data, nor = attrs.NORMAL?.data;
      const n = attrs.POSITION.a.count; const parent = new Int32Array(n); for (let i = 0; i < n; i++) parent[i] = i;
      const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      for (let t = 0; t < tris; t++) { const a = find(idx[t * 3]), b = find(idx[t * 3 + 1]), c = find(idx[t * 3 + 2]); parent[a] = b; parent[find(b)] = find(c); }
      const groups = new Map();
      for (let t = 0; t < tris; t++) { const r = find(idx[t * 3]); let l = groups.get(r); if (!l) { l = []; groups.set(r, l); } l.push(t); }
      const oPos = [], oNor = [], oUv = [], oIdx = []; let nv = 0;
      const remap = new Int32Array(n).fill(-1);
      for (const tl of groups.values()) {
        // two populations: tiny needle/leaf cards (<= cardTris tris) and big sprig cards (bent strips, 100s of tris)
        const big = tl.length > cardTris;
        if (big) stats.big++; else stats.cards++;
        if (rnd() >= (big ? clusterKeep : keep)) continue;
        if (big) stats.bigKept++; else stats.kept++;
        const gr = big ? growBig : grow;
        const vs = new Set(); for (const t of tl) { vs.add(idx[t * 3]); vs.add(idx[t * 3 + 1]); vs.add(idx[t * 3 + 2]); }
        let cx = 0, cy = 0, cz = 0, u0 = 0, v0 = 0, nx = 0, ny = 0, nz = 0;
        for (const v of vs) { cx += pos[v * 3]; cy += pos[v * 3 + 1]; cz += pos[v * 3 + 2]; u0 += uv[v * 2]; v0 += uv[v * 2 + 1]; if (nor) { nx += nor[v * 3]; ny += nor[v * 3 + 1]; nz += nor[v * 3 + 2]; } }
        const m = vs.size; cx /= m; cy /= m; cz /= m; u0 /= m; v0 /= m;
        // least-squares affine map uv → position, and the principal axes of the uv footprint
        let Suu = 0, Suv = 0, Svv = 0; const SuP = [0, 0, 0], SvP = [0, 0, 0];
        for (const v of vs) {
          const du = uv[v * 2] - u0, dv = uv[v * 2 + 1] - v0; const dp = [pos[v * 3] - cx, pos[v * 3 + 1] - cy, pos[v * 3 + 2] - cz];
          Suu += du * du; Suv += du * dv; Svv += dv * dv; for (let c = 0; c < 3; c++) { SuP[c] += du * dp[c]; SvP[c] += dv * dp[c]; }
        }
        const det = Suu * Svv - Suv * Suv; if (Math.abs(det) < 1e-16) continue;
        const Tu = [0, 0, 0], Tv = [0, 0, 0];
        for (let c = 0; c < 3; c++) { Tu[c] = (Svv * SuP[c] - Suv * SvP[c]) / det; Tv[c] = (Suu * SvP[c] - Suv * SuP[c]) / det; }
        let N = [Tu[1] * Tv[2] - Tu[2] * Tv[1], Tu[2] * Tv[0] - Tu[0] * Tv[2], Tu[0] * Tv[1] - Tu[1] * Tv[0]];
        const nl = Math.hypot(N[0], N[1], N[2]) || 1; N = N.map((x) => x / nl);
        if (nor && N[0] * nx + N[1] * ny + N[2] * nz < 0) N = N.map((x) => -x);
        // rotated bounding rectangle in uv space (diagonal needle strips would otherwise spill into opaque atlas areas)
        const th = 0.5 * Math.atan2(2 * Suv, Suu - Svv); const e1 = [Math.cos(th), Math.sin(th)], e2 = [-Math.sin(th), Math.cos(th)];
        let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
        for (const v of vs) { const du = uv[v * 2] - u0, dv = uv[v * 2 + 1] - v0; const a = du * e1[0] + dv * e1[1], b = du * e2[0] + dv * e2[1]; amin = Math.min(amin, a); amax = Math.max(amax, a); bmin = Math.min(bmin, b); bmax = Math.max(bmax, b); }
        const base = nv;
        for (const [a, b] of [[amin, bmin], [amax, bmin], [amax, bmax], [amin, bmax]]) {
          const du = a * e1[0] + b * e2[0], dv = a * e1[1] + b * e2[1];
          oPos.push(cx + (Tu[0] * du + Tv[0] * dv) * gr, cy + (Tu[1] * du + Tv[1] * dv) * gr, cz + (Tu[2] * du + Tv[2] * dv) * gr);
          oNor.push(N[0], N[1], N[2]); oUv.push(u0 + du, v0 + dv); nv++;
        }
        oIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      stats.after += oIdx.length / 3;
      const IT = nv > 65535 ? Uint32Array : Uint16Array;
      prim.indices = addAccessor(new IT(oIdx), 'SCALAR', 1, 34963, true);
      prim.attributes = {
        POSITION: addAccessor(new Float32Array(oPos), 'VEC3', 3, 34962, true),
        NORMAL: addAccessor(new Float32Array(oNor), 'VEC3', 3, 34962, false),
        TEXCOORD_0: addAccessor(new Float32Array(oUv), 'VEC2', 2, 34962, false),
      };
      continue;
    }
    // solid primitive: copy through unchanged
    stats.after += tris;
    const idxCopy = new IndexT(idx); prim.indices = addAccessor(idxCopy, 'SCALAR', 1, 34963, true);
    for (const [k, at] of Object.entries(attrs)) {
      const out = new at.T(at.data);
      const off = push(Buffer.from(out.buffer, out.byteOffset, out.byteLength)); newViews.push({ buffer: 0, byteOffset: off, byteLength: out.byteLength, target: 34962 });
      const a2 = { bufferView: newViews.length - 1, componentType: at.a.componentType, count: at.a.count, type: at.a.type };
      if (at.a.normalized) a2.normalized = true; if (at.a.min) a2.min = at.a.min; if (at.a.max) a2.max = at.a.max;
      newAcc.push(a2); prim.attributes[k] = newAcc.length - 1;
    }
  }
  for (const img of g.images ?? []) if (img.bufferView != null) { const bv = g.bufferViews[img.bufferView]; const off = push(bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)); newViews.push({ buffer: 0, byteOffset: off, byteLength: bv.byteLength }); img.bufferView = newViews.length - 1; }
  g.bufferViews = newViews; g.accessors = newAcc; g.buffers = [{ uri: path.basename(outBin), byteLength: total }];
  fs.writeFileSync(outBin, Buffer.concat(chunks)); fs.writeFileSync(outGltf, JSON.stringify(g));
  return stats;
}

function triCount(glbPath) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12); const g = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const primTris = (p) => (p.indices != null ? g.accessors[p.indices].count : g.accessors[p.attributes.POSITION].count) / 3;
  const meshTris = g.meshes.map((m) => m.primitives.reduce((s, p) => s + primTris(p), 0));
  const perMat = g.meshes.flatMap((m) => m.primitives.map((p) => `${(g.materials?.[p.material]?.name ?? '?').replace(/^.*_/, '')}:${Math.round(primTris(p))}`));
  let total = 0; const walk = (ni) => { const n = g.nodes[ni]; if (n.mesh != null) total += meshTris[n.mesh]; for (const c of n.children ?? []) walk(c); };
  for (const s of g.scenes ?? []) for (const n of s.nodes ?? []) walk(n);
  if (!g.scenes?.length) total = meshTris.reduce((a, b) => a + b, 0);
  return { tris: Math.round(total), materials: (g.materials ?? []).map((m) => m.name ?? '?'), images: (g.images ?? []).length, perMat };
}


/** Parse an uncompressed .glb into its JSON + BIN chunk. */
function readGlb(file) {
  const buf = fs.readFileSync(file);
  const jl = buf.readUInt32LE(12); const json = JSON.parse(buf.subarray(20, 20 + jl).toString('utf8'));
  let p = 20 + jl; let bin = null;
  while (p < buf.length) { const cl = buf.readUInt32LE(p), ct = buf.readUInt32LE(p + 4); if (ct === 0x004e4942) bin = buf.subarray(p + 8, p + 8 + cl); p += 8 + cl; }
  return { json, bin };
}
/**
 * Trees: gltfpack's quadric simplifier would happily collapse the flat leaf quads (zero error), so the solid
 * primitives are decimated alone (-noq float output), then merged back with the untouched leaf quads and packed
 * without simplification.
 */
function packTree(prepGltf, lod, outGlb, stripTex) {
  const dir = path.dirname(prepGltf); const base = path.basename(prepGltf, '.gltf');
  const g = JSON.parse(fs.readFileSync(prepGltf, 'utf8'));
  const bin = fs.readFileSync(path.join(dir, g.buffers[0].uri));
  const isLeaf = (mi) => { const n = (g.materials?.[mi]?.name ?? '').toLowerCase(); return /twig|leaf|leaves|needle|foliage/.test(n) || g.materials?.[mi]?.alphaMode === 'MASK'; };
  // 1. solid-only gltf → gltfpack -noq -si
  const solid = JSON.parse(JSON.stringify(g));
  for (const m of solid.meshes) m.primitives = m.primitives.filter((p) => !isLeaf(p.material));
  const solidGltf = path.join(dir, base + '_solid.gltf'); fs.writeFileSync(solidGltf, JSON.stringify(solid));
  const solidGlb = path.join(dir, base + '_solid.glb');
  const args = ['-i', solidGltf, '-o', solidGlb, '-noq', '-km', '-kv', '-si', String(lod.ratio ?? 1), '-se', String(lod.se ?? 0.01), '-tr'];
  if (lod.sloppy) args.push('-sa');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'gltfpack', 'cli.js'), ...args], { stdio: 'pipe', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`gltfpack (solid) failed: ${r.stderr?.toString() || r.stdout?.toString()}`);
  const sg = readGlb(solidGlb);
  // 2. merge: simplified solid prims (by material name) + leaf quads from the prep → one float gltf
  const chunks = []; let total = 0; const views = [], accs = [];
  const push = (buf) => { const off = total; chunks.push(buf); total += buf.length; const pad = (4 - (buf.length % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); total += pad; } return off; };
  const copyAccessor = (src, srcBin, ai, target) => {
    const a = src.accessors[ai]; const bv = src.bufferViews[a.bufferView];
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]; const bytes = { 5126: 4, 5125: 4, 5123: 2, 5121: 1, 5122: 2, 5120: 1 }[a.componentType];
    const stride = bv.byteStride ?? comps * bytes; const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    let data;
    if (stride === comps * bytes) data = srcBin.subarray(start, start + a.count * comps * bytes);
    else { data = Buffer.alloc(a.count * comps * bytes); for (let i = 0; i < a.count; i++) srcBin.copy(data, i * comps * bytes, start + i * stride, start + i * stride + comps * bytes); }
    const off = push(Buffer.from(data)); views.push({ buffer: 0, byteOffset: off, byteLength: data.length, target });
    const a2 = { bufferView: views.length - 1, componentType: a.componentType, count: a.count, type: a.type };
    if (a.normalized) a2.normalized = true; if (a.min) a2.min = a.min; if (a.max) a2.max = a.max;
    accs.push(a2); return accs.length - 1;
  };
  const solidByMat = new Map();
  for (const m of sg.json.meshes ?? []) for (const p of m.primitives) solidByMat.set(sg.json.materials[p.material].name, p);
  const out = { asset: g.asset, scene: g.scene, scenes: g.scenes, nodes: g.nodes, materials: g.materials, textures: g.textures, images: g.images, samplers: g.samplers, extensionsUsed: g.extensionsUsed, meshes: [] };
  for (const m of g.meshes) {
    const prims = [];
    for (const p of m.primitives) {
      const matName = g.materials[p.material].name;
      if (isLeaf(p.material)) {
        const attributes = {}; for (const [k, ai] of Object.entries(p.attributes)) attributes[k] = copyAccessor(g, bin, ai, 34962);
        prims.push({ attributes, indices: copyAccessor(g, bin, p.indices, 34963), material: p.material });
      } else {
        const sp = solidByMat.get(matName); if (!sp) continue;
        const attributes = {}; for (const [k, ai] of Object.entries(sp.attributes)) if (['POSITION', 'NORMAL', 'TEXCOORD_0'].includes(k)) attributes[k] = copyAccessor(sg.json, sg.bin, ai, 34962);
        prims.push({ attributes, indices: copyAccessor(sg.json, sg.bin, sp.indices, 34963), material: p.material });
      }
    }
    out.meshes.push({ name: m.name, primitives: prims });
  }
  out.bufferViews = views; out.accessors = accs; out.buffers = [{ uri: base + '_merged.bin', byteLength: total }];
  if (stripTex) stripTextures(out);
  const mergedGltf = path.join(dir, base + '_merged.gltf');
  fs.writeFileSync(path.join(dir, base + '_merged.bin'), Buffer.concat(chunks)); fs.writeFileSync(mergedGltf, JSON.stringify(out));
  // 3. pack without simplification
  runGltfpack(mergedGltf, outGlb, { ratio: 1 }, stripTex);
}

function runGltfpack(input, output, lod, keepAttrs) {
  const packArgs = ['-i', input, '-o', output, '-c', '-km', '-si', String(lod.ratio ?? 1), '-vp', '14', '-vt', '12'];
  // a tight error limit keeps the isolated leaf quads intact (collapsing one deviates > se of the tree extent)
  packArgs.push('-se', String(lod.se ?? 0.006));
  if (lod.sloppy) packArgs.push('-sa');
  if (keepAttrs) packArgs.push('-kv');                                // untextured LODs still need UVs (they reuse lod0 materials)
  const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'gltfpack', 'cli.js'), ...packArgs], { stdio: 'pipe', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`gltfpack failed for ${path.basename(output)}: ${r.stderr?.toString() || r.stdout?.toString()}`);
}
/** Strip images/textures from a gltf JSON (materials keep their names so the runtime can map lod0 materials). */
function stripTextures(g) {
  delete g.images; delete g.textures; delete g.samplers;
  for (const mat of g.materials ?? []) {
    delete mat.normalTexture; delete mat.occlusionTexture; delete mat.emissiveTexture;
    if (mat.pbrMetallicRoughness) { delete mat.pbrMetallicRoughness.baseColorTexture; delete mat.pbrMetallicRoughness.metallicRoughnessTexture; }
    for (const ext of Object.values(mat.extensions ?? {})) for (const k of Object.keys(ext)) if (/Texture$/.test(k)) delete ext[k];
  }
  return g;
}
/** Poly Haven's jpg glTF variants drop the leaf-card alpha; fetch the separate *_alpha maps and record which material
 *  they belong to in models/nature/alphas.json (material name → file) so the runtime can attach them as alphaMap. */
const ALPHAS_PATH = path.join(OUT, 'models', 'nature', 'alphas.json');
const alphaManifest = fs.existsSync(ALPHAS_PATH) ? JSON.parse(fs.readFileSync(ALPHAS_PATH, 'utf8')) : {};
async function doAlphas(m, d) {
  for (const key of Object.keys(d).filter((k) => /alpha$/i.test(k))) {
    const e = d[key]['1k'] ?? d[key]['2k']; const f = e?.jpg ?? e?.png; if (!f) continue;
    const suffix = key.toLowerCase().replace(/_?alpha$/, '');
    const matName = suffix ? `${m.id}_${suffix}` : m.id;
    const outName = `${m.id}__${key.toLowerCase()}.jpg`;
    const out = path.join(OUT, 'models', 'nature', outName);
    const raw = path.join(CACHE, 'models', m.id, `${key}_1k.jpg`);
    if (force || !fs.existsSync(out)) { await download(f.url, raw, f.size); encodeJpg(raw, out, 1024, 80); log(`  ${m.id} alpha ${key} → ${matName} ${mb(fs.statSync(out).size)}`); }
    alphaManifest[matName] = outName;
  }
  fs.writeFileSync(ALPHAS_PATH, JSON.stringify(alphaManifest, null, 1));
}

async function doModel(m) {
  const outDir = path.join(OUT, 'models', 'nature'); ensureDir(outDir);
  const outFor = (i) => path.join(outDir, `${m.id}${i === 0 ? '' : '_lod' + i}.glb`);
  const d = await fetchJson(API + m.id);
  await doAlphas(m, d);
  if (!force && m.lods.every((_, i) => fs.existsSync(outFor(i)))) { log('model ok', m.id); return; }
  const g = d.gltf?.['1k']?.gltf;
  if (!g) throw new Error(`${m.id}: no 1k gltf`);
  const dir = path.join(CACHE, 'models', m.id);
  const gltfPath = path.join(dir, path.basename(g.url));
  await download(g.url, gltfPath, g.size);
  for (const [rel, f] of Object.entries(g.include)) {
    const fresh = await download(f.url, path.join(dir, rel), f.size);
    if (fresh) log(`  ${m.id}/${rel} ${mb(f.size)}`);
  }
  // prep dir: re-encoded textures; geometry per LOD (leaf cards thinned + flattened for trees)
  const prep = path.join(dir, 'prep'); ensureDir(path.join(prep, 'textures'));
  for (const rel of Object.keys(g.include)) {
    if (!rel.startsWith('textures/')) continue;
    const kind = /nor_gl|nor_dx|normal/i.test(rel) ? 1 : /arm|rough|ao|metal/i.test(rel) ? 2 : 0;
    const dst = path.join(prep, rel);
    if (force || !fs.existsSync(dst)) encodeJpg(path.join(dir, rel), dst, m.tex[kind], kind === 0 ? 82 : 78);
  }
  const bins = Object.keys(g.include).filter((r) => r.endsWith('.bin'));
  for (let i = 0; i < m.lods.length; i++) {
    const lod = m.lods[i]; const outGlb = outFor(i);
    if (!force && fs.existsSync(outGlb)) continue;
    let lodGltf;
    if (lod.keep != null && bins.length === 1) {
      lodGltf = path.join(prep, `${m.id}_lod${i}.gltf`);
      const st = thinLeafCards(gltfPath, path.join(dir, bins[0]), lodGltf, path.join(prep, `${m.id}_lod${i}.bin`), lod.keep, lod.grow ?? 1, m.cardTris ?? 60, lod.sprigs ?? 0, lod.growSprig ?? 1);
      log(`  ${m.id} lod${i}: ${st.cards} cards → ${st.kept} quads, ${st.big} sprigs → ${st.bigKept} quads (${Math.round(st.before)} → ${Math.round(st.after)} tris before gltfpack)`);
    } else {
      lodGltf = path.join(prep, `${m.id}_lod${i}.gltf`);
      fs.copyFileSync(gltfPath, lodGltf);
      for (const b of bins) { const dst = path.join(prep, b); if (!fs.existsSync(dst)) fs.symlinkSync(path.join(dir, b), dst); }
    }
    if (lod.keep != null) packTree(lodGltf, lod, outGlb, i > 0);
    else {
      if (i > 0) { const gj = stripTextures(JSON.parse(fs.readFileSync(lodGltf, 'utf8'))); fs.writeFileSync(lodGltf, JSON.stringify(gj)); }
      runGltfpack(lodGltf, outGlb, lod, i > 0);
    }
    const info = triCount(outGlb);
    log(`  ${m.id}${i ? ' lod' + i : ''} → ${mb(fs.statSync(outGlb).size)}, ${info.tris} tris [${info.perMat.join(' ')}]`);
  }
}

// ---------------------------------------------------------------------------------------------- main
(async () => {
  if (report) {
    const dir = path.join(OUT, 'models', 'nature'); let total = 0;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).sort()) {
      const p = path.join(dir, f); const s = fs.statSync(p).size; total += s; const i = triCount(p);
      console.log(f.padEnd(28), mb(s).padStart(9), String(i.tris).padStart(8) + ' tris', i.images + ' img', '[' + i.materials.join(', ') + ']');
    }
    console.log('total'.padEnd(28), mb(total).padStart(9));
    return;
  }
  const failures = [];
  const run = async (label, fn) => { try { await fn(); } catch (e) { console.error(`FAILED ${label}: ${e.message}`); failures.push(label); } };
  for (const t of TEXTURES) if (want('textures', t.id)) await run('texture ' + t.id, () => doTexture(t));
  for (const h of HDRIS) if (want('hdri', h.id)) await run('hdri ' + h.id, () => doHdri(h));
  for (const m of MODELS) if (want('models', m.id)) await run('model ' + m.id, () => doModel(m));
  if (failures.length) { console.error('\nFailures:', failures.join(', ')); process.exit(1); }
  log('done');
})();
