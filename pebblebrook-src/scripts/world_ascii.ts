/**
 * Print the map as ASCII so a human can eyeball the layout.
 *   node scripts/world_ascii.ts [seed] [--objects] [--places]
 */
import { Bus } from '../src/core/bus.ts';
import { generateWorld } from '../src/world/index.ts';

declare const process: { argv: string[]; exit(code: number): never };

const args: string[] = process.argv.slice(2);
const seed = Number(args.find((a: string) => !a.startsWith('--')) ?? 1) || 1;
const showObjects = args.includes('--objects');
const showPlaces = args.includes('--places');

const CH: Record<string, string> = {
  grass: '.', dirt: ',', path: '=', stone: '#', water: '~', deepwater: '≈', sand: ':', floor: '_', wall: 'H', roof: '^', door: 'D',
  bridge: 'B', farmland: 'p', flower: '*', tree: 'T', rock: 'O', bush: 'o', fence: '+', prop: '&', void: ' ',
};
const OBJ: Record<string, string> = {
  well: 'W', board: 'N', bench: 'n', lantern: 'i', campfire: 'f', shrine: 'S', animal: 'a', forage: 'g', fishspot: 'F', sign: '?',
  flowerbed: '%', barrel: 'b', crate: 'c', decoration: '&', stump: 'u', counter: 'C', bed: 'Z', plot: 'p', tree: 'T', rock: 'O',
};

const world = generateWorld(seed, { bus: new Bus() });
const rows: string[][] = [];
for (let y = 0; y < world.height; y++) {
  const row: string[] = [];
  for (let x = 0; x < world.width; x++) row.push(CH[world.tile(x, y)] ?? '?');
  rows.push(row);
}
if (showObjects) for (const o of world.objects) { if (o.kind === 'tree' || o.kind === 'rock' || o.kind === 'plot') continue; rows[o.pos.y][o.pos.x] = OBJ[o.kind] ?? '?'; }
for (const p of world.places) { if (p.door) rows[p.door.y][p.door.x] = 'D'; rows[p.anchor.y][p.anchor.x] = showPlaces ? '@' : rows[p.anchor.y][p.anchor.x]; }

const header = () => {
  let tens = '    ', ones = '    ';
  for (let x = 0; x < world.width; x++) { tens += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : ' '; ones += String(x % 10); }
  console.log(tens); console.log(ones);
};
header();
rows.forEach((r, y) => console.log(String(y).padStart(3, ' ') + ' ' + r.join('')));
header();
console.log(`\nseed ${seed}: ${world.places.length} places, ${world.objects.length} objects`);
if (showPlaces) for (const p of world.places) console.log(`  ${p.id.padEnd(17)} ${p.kind.padEnd(9)} anchor ${p.anchor.x},${p.anchor.y}${p.door ? ` door ${p.door.x},${p.door.y}` : ''}${p.open ? ` open ${p.open[0]}-${p.open[1]}` : ''} tiles ${p.tiles.length}`);
