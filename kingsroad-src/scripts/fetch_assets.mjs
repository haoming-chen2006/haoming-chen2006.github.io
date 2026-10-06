// Pull CC0 PBR textures and models from Poly Haven (https://polyhaven.com, CC0 1.0) into public/assets/ph/.
// Usage: node scripts/fetch_assets.mjs [--res 1k]
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const RES = process.argv.includes('--res') ? process.argv[process.argv.indexOf('--res') + 1] : '1k';
const OUT = new URL('../public/assets/ph/', import.meta.url).pathname;

/** Textures: id → maps to keep. Poly Haven map names: Diffuse, nor_gl, Rough, AO, arm (ao/rough/metal packed), Displacement. */
const TEXTURES = {
  leafy_grass: ['Diffuse', 'nor_gl', 'arm'],
  grass_ground: ['Diffuse', 'nor_gl', 'arm'],
  forest_floor: ['Diffuse', 'nor_gl', 'arm'],
  patterned_paving: ['Diffuse', 'nor_gl', 'arm'],
  stone_pathway_02: ['Diffuse', 'nor_gl', 'arm'],
  mossy_rock: ['Diffuse', 'nor_gl', 'arm'],
  rock_face: ['Diffuse', 'nor_gl', 'arm'],
  japanese_stone_wall: ['Diffuse', 'nor_gl', 'arm'],
  white_sandstone_bricks: ['Diffuse', 'nor_gl', 'arm'],
  grey_roof_tiles: ['Diffuse', 'nor_gl', 'arm'],
  clay_roof_tiles_03: ['Diffuse', 'nor_gl', 'arm'],
  japanese_cedar_planks: ['Diffuse', 'nor_gl', 'arm'],
  bamboo_wall: ['Diffuse', 'nor_gl', 'arm'],
  sakura_bark: ['Diffuse', 'nor_gl', 'arm'],
  river_small_rocks: ['Diffuse', 'nor_gl', 'arm'],
  dirt: ['Diffuse', 'nor_gl', 'arm'],
  marble_tiles: ['Diffuse', 'nor_gl', 'arm'],
  coast_sand_01: ['Diffuse', 'nor_gl', 'arm'],
};
const MODELS = ['jacaranda_tree', 'island_tree_02', 'pine_tree_01', 'rock_moss_set_01', 'rock_moss_set_02', 'boulder_01', 'namaqualand_boulder_02', 'fern_02', 'grass_medium_01', 'wooden_lantern_01'];

async function fetchJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }
async function download(url, path) {
  try { const s = await stat(path); if (s.size > 0) return false; } catch { /* missing */ }
  const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(await r.arrayBuffer()));
  return true;
}

const manifest = { license: 'CC0 1.0 (Poly Haven)', res: RES, textures: {}, models: {} };
for (const [id, maps] of Object.entries(TEXTURES)) {
  const files = await fetchJson(`https://api.polyhaven.com/files/${id}`);
  manifest.textures[id] = {};
  for (const map of maps) {
    const entry = files[map]?.[RES]?.jpg ?? files[map]?.[RES]?.png;
    if (!entry) { console.log(`  ${id}: no ${map}`); continue; }
    const ext = entry.url.split('.').pop();
    const rel = `textures/${id}/${map}.${ext}`;
    const fresh = await download(entry.url, join(OUT, rel));
    manifest.textures[id][map] = rel;
    console.log(`${fresh ? 'got ' : 'have'} ${rel} (${(entry.size / 1024) | 0} KB)`);
  }
}
for (const id of MODELS) {
  const files = await fetchJson(`https://api.polyhaven.com/files/${id}`);
  const g = files.gltf?.[RES]?.gltf;
  if (!g) { console.log(`  ${id}: no gltf`); continue; }
  const base = `models/${id}/`;
  await download(g.url, join(OUT, base, `${id}.gltf`));
  for (const [rel, info] of Object.entries(g.include ?? {})) await download(info.url, join(OUT, base, rel));
  manifest.models[id] = `${base}${id}.gltf`;
  console.log(`model ${id} (${Object.keys(g.include ?? {}).length + 1} files)`);
}
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('done →', OUT);
