// env-dressing: fetch CC0 Poly Haven models + PBR texture sets, downscale textures, pack with gltfpack.
// Usage: node scripts/fetch-props.mjs [--force] [--only id,id]
// Output: public/assets/models/props/<id>/<id>.glb  and  public/assets/textures/<id>/<id>_{diff,nor_gl,arm}_1k.jpg
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = process.env.PROPS_SCRATCH ?? path.join(ROOT, 'node_modules', '.cache', 'props-src');
const OUT_MODELS = path.join(ROOT, 'public/assets/models/props');
const OUT_TEX = path.join(ROOT, 'public/assets/textures');

/** id → { tex: max texture px, si: simplify ratio (auto-lowered above 100k tris), kn: keep named nodes } */
const MODELS = [
  // shore
  { id: 'dutch_ship_medium', tex: 512, si: 0.6, kn: true },
  { id: 'antique_estoc', tex: 512 },
  { id: 'modular_wooden_pier', tex: 512, si: 0.5, kn: true },
  { id: 'wooden_barrels_01', tex: 256, kn: true },
  { id: 'wooden_crate_01', tex: 512 },
  { id: 'wooden_crate_02', tex: 256 },
  { id: 'wooden_lantern_01', tex: 512 },
  { id: 'rock_moss_set_01', tex: 512, kn: true },
  { id: 'rock_moss_set_02', tex: 512, kn: true },
  { id: 'dead_tree_trunk', tex: 512 },
  { id: 'rock_07', tex: 512 },
  { id: 'rock_09', tex: 512 },
  // camp
  { id: 'stone_fire_pit', tex: 512 },
  { id: 'treasure_chest', tex: 1024, kn: true },
  { id: 'tree_stump_01', tex: 512 },
  { id: 'tree_stump_02', tex: 512 },
  { id: 'Lantern_01', tex: 256 },
  { id: 'wooden_bucket_01', tex: 256 },
  { id: 'jug_01', tex: 256 },
  { id: 'wooden_bowl_01', tex: 256 },
  { id: 'wooden_axe_02', tex: 256 },
  { id: 'brass_pot_01', tex: 256 },
  { id: 'ceramic_pot', tex: 256 },
  // path
  { id: 'boulder_01', tex: 512, si: 0.5 },
  // chapel
  { id: 'modular_fort_01', tex: 512, kn: true },
  { id: 'gothic_statue', tex: 512 },
  { id: 'brass_candleholders', tex: 256, kn: true },
  { id: 'lantern_chandelier_01', tex: 256 },
  { id: 'kite_shield', tex: 256 },
  { id: 'marble_bust_01', tex: 256 },
  { id: 'wooden_candlestick', tex: 256 },
  // gate / hillside
  { id: 'large_iron_gate', tex: 1024, kn: true },
  { id: 'rock_face_01', tex: 512 },
  { id: 'rock_face_02', tex: 512 },
  { id: 'namaqualand_boulder_02', tex: 512, si: 0.5 },
  { id: 'namaqualand_boulder_04', tex: 512, si: 0.5 },
  // crypt extras
  { id: 'wine_barrel_01', tex: 256 },
];
/** PBR texture sets (1k jpg diff / nor_gl / arm), re-encoded to keep weight down. */
const TEXTURES = [
  { id: 'castle_brick_07', size: 1024 },      // ruined chapel walls
  { id: 'medieval_blocks_06', size: 1024 },   // crypt walls, gate facade
  { id: 'cobblestone_floor_08', size: 1024 }, // courtyard floor patches
  { id: 'mossy_rock', size: 1024 },           // rock mass around the crypt gate
  { id: 'old_planks_02', size: 1024 },        // jetty, coffins, beams
];

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;

async function fetchJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
function sips(file, max, quality = 82) {
  execFileSync('sips', ['-Z', String(max), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), file, '--out', file], { stdio: 'ignore' });
}
function triCount(gltfFile) {
  const g = JSON.parse(fs.readFileSync(gltfFile, 'utf8')); let t = 0;
  for (const m of g.meshes ?? []) for (const p of m.primitives) { if (p.indices !== undefined) t += g.accessors[p.indices].count / 3; else t += g.accessors[p.attributes.POSITION].count / 3; }
  return t;
}
function mb(file) { return (fs.statSync(file).size / 1e6).toFixed(2) + ' MB'; }

async function doModel(m) {
  const out = path.join(OUT_MODELS, m.id, m.id + '.glb');
  if (fs.existsSync(out) && !FORCE) { console.log('skip', m.id, mb(out)); return; }
  const d = await fetchJson('https://api.polyhaven.com/files/' + m.id);
  const g = d.gltf?.['1k']?.gltf; if (!g) throw new Error('no 1k gltf for ' + m.id);
  const dir = path.join(SCRATCH, m.id); const gltf = path.join(dir, m.id + '.gltf');
  await download(g.url, gltf);
  for (const [rel, inc] of Object.entries(g.include)) await download(inc.url, path.join(dir, rel));
  // downscale + re-encode textures (jpg only)
  for (const rel of Object.keys(g.include)) if (/\.(jpe?g)$/i.test(rel)) sips(path.join(dir, rel), m.tex);
  const tris = triCount(gltf);
  let si = m.si ?? 1; if (tris * si > 100000) si = 100000 / tris;
  const argv = ['-i', gltf, '-o', out, '-c', '-si', si.toFixed(3), '-vp', '14', '-vt', '12'];
  if (m.kn) argv.push('-kn');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(path.join(ROOT, 'node_modules/.bin/gltfpack'), argv, { stdio: 'inherit' });
  console.log('packed', m.id, 'tris', tris, 'si', si.toFixed(2), '→', mb(out));
}
async function doTexture(t) {
  const dir = path.join(OUT_TEX, t.id); const files = {};
  const d = await fetchJson('https://api.polyhaven.com/files/' + t.id);
  for (const [key, suffix] of [['Diffuse', 'diff'], ['nor_gl', 'nor_gl'], ['arm', 'arm']]) {
    const f = path.join(dir, `${t.id}_${suffix}_1k.jpg`); files[suffix] = f;
    if (fs.existsSync(f) && !FORCE) continue;
    const url = d[key]?.['1k']?.jpg?.url; if (!url) { console.warn('missing map', t.id, key); continue; }
    await download(url, f); sips(f, t.size, suffix === 'diff' ? 84 : 78);
  }
  console.log('texture', t.id, Object.values(files).filter(fs.existsSync).map(mb).join(' '));
}

(async () => {
  fs.mkdirSync(SCRATCH, { recursive: true });
  const errors = [];
  for (const m of MODELS) { if (only && !only.has(m.id)) continue; try { await doModel(m); } catch (e) { errors.push(m.id + ': ' + e.message); console.error('FAILED', m.id, e.message); } }
  for (const t of TEXTURES) { if (only && !only.has(t.id)) continue; try { await doTexture(t); } catch (e) { errors.push(t.id + ': ' + e.message); console.error('FAILED', t.id, e.message); } }
  let total = 0; const walk = (p) => { for (const f of fs.readdirSync(p)) { const fp = path.join(p, f); const s = fs.statSync(fp); if (s.isDirectory()) walk(fp); else total += s.size; } };
  if (fs.existsSync(OUT_MODELS)) walk(OUT_MODELS);
  for (const t of TEXTURES) if (fs.existsSync(path.join(OUT_TEX, t.id))) walk(path.join(OUT_TEX, t.id));
  console.log(`\nprops+textures total: ${(total / 1e6).toFixed(1)} MB`);
  if (errors.length) { console.log('errors:\n' + errors.join('\n')); process.exitCode = 1; }
})();
