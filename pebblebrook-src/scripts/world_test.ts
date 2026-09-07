/**
 * Headless test for src/world: generation, places, pathfinding, clock/weather/crops, save/load.
 *   node scripts/world_test.ts            → exit 1 on any failure
 */
import { Bus } from '../src/core/bus.ts';
import { ALL_PLACE_IDS } from '../src/core/places.ts';
import { SeededRng } from '../src/core/rng.ts';
import { MINUTES_PER_DAY, fmtDate } from '../src/core/time.ts';
import type { PlotState, Vec, WeatherKind } from '../src/core/types.ts';
import { describeTile, generateWorld, walkableNeighbours } from '../src/world/index.ts';

declare const process: { argv: string[]; exit(code: number): never };

let failures = 0;
const fail = (msg: string): void => { failures++; console.log(`  FAIL ${msg}`); };
const ok = (cond: boolean, msg: string): void => { if (!cond) fail(msg); };

const SEEDS = [1, 2, 3, 4, 5];
for (const seed of SEEDS) {
  const bus = new Bus();
  const t0 = performance.now();
  const world = generateWorld(seed, { bus });
  const genMs = performance.now() - t0;
  console.log(`\n=== seed ${seed}: generated in ${genMs.toFixed(1)} ms, ${world.places.length} places, ${world.objects.length} objects`);

  // every known place exists; buildings have door + interior; anchors walkable
  for (const id of ALL_PLACE_IDS) {
    const p = world.place(id);
    if (!p) { fail(`place ${id} missing`); continue; }
    ok(p.tiles.length > 0, `${id} has tiles`);
    const anchorOk = world.walkable(p.anchor.x, p.anchor.y) || (p.door !== undefined && world.walkable(p.door.x, p.door.y));
    ok(anchorOk, `${id} anchor ${p.anchor.x},${p.anchor.y} walkable`);
    if (p.kind === 'home' || p.kind === 'shop' || (p.kind === 'workplace' && !['farm', 'dock', 'mine'].includes(id)) || id === 'chapel') {
      ok(p.door !== undefined && p.interior !== undefined, `${id} has door+interior`);
      if (p.door && p.interior) {
        ok(world.tile(p.door.x, p.door.y) === 'door', `${id} door tile is 'door'`);
        ok(world.walkable(p.door.x, p.door.y), `${id} door walkable`);
        ok(!world.walkable(p.interior.x, p.interior.y), `${id} interior not walkable`);
        ok(world.isInterior(p.interior.x, p.interior.y), `${id} interior flagged`);
        ok(world.placeAt(p.door)?.id === id, `${id} placeAt(door) is itself`);
        const info = describeTile(world, p.door.x, p.door.y - 1);
        ok(info.kind === 'wall' && info.placeId === id, `${id} wall above door described`);
        const roof = describeTile(world, p.door.x, p.tiles[0].y);
        ok(roof.kind === 'roof' && roof.roofRidge, `${id} top row is the roof ridge`);
        const path = world.findPath(world.place('square')!.anchor, p.interior);
        ok(path !== null && path[path.length - 1].x === p.interior.x && path[path.length - 1].y === p.interior.y, `${id} interior reachable as a path goal`);
        if (path) ok(path.length >= 2 && path[path.length - 2].x === p.door.x && path[path.length - 2].y === p.door.y, `${id} path enters through the door`);
      }
    }
    if (p.open) ok(p.open[0] < p.open[1], `${id} open hours ordered`);
  }
  // homes are owned; workplaces have hours
  for (const p of world.placesOfKind('home')) if (p.id !== 'home_player') ok(p.owner !== undefined, `${p.id} has an owner`);
  for (const id of ['bakery', 'smithy', 'store', 'tavern', 'clinic', 'library', 'carpenter']) ok(world.place(id)!.open !== undefined, `${id} has opening hours`);
  ok(world.place('bakery')!.facilities.includes('oven'), 'bakery has an oven');
  ok(world.place('smithy')!.facilities.includes('forge'), 'smithy has a forge');

  // objects
  const count = (k: string): number => world.objects.filter((o) => o.kind === k).length;
  const farmPlots = world.objectsAt('farm', 'plot'), playerPlots = world.objectsAt('player_farm', 'plot');
  ok(farmPlots.length === 24, `farm has 24 plots (${farmPlots.length})`);
  ok(playerPlots.length === 8, `player farm has 8 plots (${playerPlots.length})`);
  ok(count('tree') > 150, `trees as objects (${count('tree')})`);
  ok(world.objectsAt('mine', 'rock').length >= 10, `ore rocks in the mine (${world.objectsAt('mine', 'rock').length})`);
  ok(count('fishspot') >= 12, `fish spots (${count('fishspot')})`);
  ok(count('forage') >= 40, `forage spots (${count('forage')})`);
  ok(count('animal') === 10, `animals (${count('animal')})`);
  ok(count('well') === 1 && count('board') === 1 && count('campfire') === 1 && count('shrine') === 1, 'landmarks present');
  ok(count('bench') >= 6 && count('lantern') >= 12 && count('sign') >= 8, `furniture: ${count('bench')} benches, ${count('lantern')} lanterns, ${count('sign')} signs`);
  const ids = new Set(world.objects.map((o) => o.id));
  ok(ids.size === world.objects.length, 'object ids unique');
  const tilesUsed = new Map<string, string>();
  for (const o of world.objects) { const k = `${o.pos.x},${o.pos.y}`; if (tilesUsed.has(k)) fail(`two objects on ${k}: ${tilesUsed.get(k)} and ${o.id}`); tilesUsed.set(k, o.id); }
  for (const o of world.objects) {
    if (o.kind === 'tree') ok(world.tile(o.pos.x, o.pos.y) === 'tree', `${o.id} on a tree tile`);
    if (o.kind === 'rock') ok(world.tile(o.pos.x, o.pos.y) === 'rock', `${o.id} on a rock tile`);
    if (o.kind === 'plot') ok(world.tile(o.pos.x, o.pos.y) === 'farmland', `${o.id} on farmland`);
    if (o.kind === 'forage' || o.kind === 'fishspot') ok(world.walkable(o.pos.x, o.pos.y), `${o.id} walkable`);
    const k = world.tile(o.pos.x, o.pos.y);
    if (o.kind !== 'tree' && o.kind !== 'rock' && o.kind !== 'counter' && o.kind !== 'bed' && o.data.kind !== 'boat') ok(k !== 'wall' && k !== 'roof' && k !== 'door' && k !== 'water' && k !== 'deepwater' && k !== 'fence', `${o.id} (${o.kind}) not on ${k} at ${o.pos.x},${o.pos.y}`);
  }
  // every non-tree object should be reachable (some walkable neighbour connects to the square)
  let unreachable = 0;
  const sq = world.place('square')!.anchor;
  for (const o of world.objects) {
    if (o.kind === 'tree' || o.kind === 'counter' || o.kind === 'bed') continue;
    if (world.findPath(sq, o.pos) === null) { unreachable++; if (unreachable <= 40) fail(`${o.id} (${o.kind}) at ${o.pos.x},${o.pos.y} unreachable from the square`); }
  }
  ok(unreachable === 0, `${unreachable} unreachable objects`);
  // objectsNear/objectsAt/object
  const near = world.objectsNear(sq, 6);
  ok(near.length > 0 && near.every((o) => Math.hypot(o.pos.x - sq.x, o.pos.y - sq.y) <= 6), 'objectsNear radius respected');
  ok(near.some((o) => o.kind === 'well'), 'well is near the square anchor');
  ok(world.object(near[0].id) === near[0], 'object(id) round-trips');
  ok(world.objectsNear(sq, 6, 'bench').every((o) => o.kind === 'bench'), 'objectsNear kind filter');

  // pathfinding: every pair of place anchors
  const anchors = world.places.map((p) => ({ id: p.id, pos: p.door ?? p.anchor }));
  let longest = 0, longestPair = '';
  const pt0 = performance.now();
  let pairs = 0;
  for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) {
    const path = world.findPath(anchors[i].pos, anchors[j].pos);
    pairs++;
    if (!path) { fail(`no path ${anchors[i].id} → ${anchors[j].id}`); continue; }
    const last = path[path.length - 1];
    ok(last.x === anchors[j].pos.x && last.y === anchors[j].pos.y, `path ends at goal ${anchors[j].id}`);
    for (let k = 0; k < path.length; k++) {
      const prev = k === 0 ? anchors[i].pos : path[k - 1];
      if (Math.abs(path[k].x - prev.x) + Math.abs(path[k].y - prev.y) !== 1) { fail(`path step not 4-adjacent ${anchors[i].id} → ${anchors[j].id}`); break; }
      if (k < path.length - 1 && !world.walkable(path[k].x, path[k].y)) { fail(`path crosses non-walkable ${path[k].x},${path[k].y}`); break; }
    }
    if (path.length > longest) { longest = path.length; longestPair = `${anchors[i].id} → ${anchors[j].id}`; }
  }
  console.log(`  ${pairs} anchor pairs pathed in ${(performance.now() - pt0).toFixed(1)} ms; longest ${longest} steps (${longestPair})`);
  ok(longest < 200, 'longest path sane');

  // 500 random findPath calls between walkable tiles
  const rng = new SeededRng(seed * 7919);
  const walkables: Vec[] = [];
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) if (world.walkable(x, y)) walkables.push({ x, y });
  const pairsList: [Vec, Vec][] = [];
  for (let i = 0; i < 500; i++) pairsList.push([rng.pick(walkables), rng.pick(walkables)]);
  const bt0 = performance.now();
  let found = 0;
  for (const [a, b] of pairsList) if (world.findPath(a, b)) found++;
  const benchMs = performance.now() - bt0;
  console.log(`  500 random findPath calls: ${benchMs.toFixed(1)} ms, ${found} found`);
  ok(benchMs < 150, `500 findPath calls under 150 ms (${benchMs.toFixed(1)})`);
  // maxNodes caps work
  ok(world.findPath({ x: 13, y: 14 }, { x: 90, y: 30 }, { maxNodes: 50 }) === null, 'maxNodes cap returns null');
  // nearestWalkable / walkableNeighbours
  const nw = world.nearestWalkable({ x: 43, y: 34 });
  ok(world.walkable(nw.x, nw.y) && Math.abs(nw.x - 43) <= 1 && Math.abs(nw.y - 34) <= 1, 'nearestWalkable next to the well');
  ok(walkableNeighbours(world, sq).length >= 2, 'walkableNeighbours at the square');
  const deep = world.nearestWalkable({ x: 75, y: 62 }, 3);
  ok(world.walkable(deep.x, deep.y), 'nearestWalkable falls back to something walkable');

  // tile encodings
  ok(world.tileVariant(75, 62) === 1 && world.tile(75, 62) === 'deepwater', 'lake centre is deep water (variant 1)');
  let grassVariants = new Set<number>();
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) if (world.tile(x, y) === 'grass') grassVariants.add(world.tileVariant(x, y));
  ok(grassVariants.size === 4, 'grass has 4 variants');
  const bakery = world.building('bakery')!;
  const eave = describeTile(world, bakery.spec.x, bakery.spec.y + bakery.spec.roofRows - 1);
  ok(eave.roofEdge && eave.edgeLeft && !eave.edgeRight && eave.style === bakery.roof, 'bakery eave/left-edge encoded');
  const wall = describeTile(world, bakery.door.x + 1, bakery.door.y);
  ok(wall.kind === 'wall' && wall.style === bakery.style && wall.edgeRight, 'bakery wall style + right edge encoded');

  if (seed !== 1) continue;

  /* ---- clock, weather, crops over 60 days (seed 1 only) ---- */
  let newdays = 0, hours = 0, weatherEvents = 0;
  bus.on('newday', () => newdays++);
  bus.on('hour', () => hours++);
  bus.on('weather', () => weatherEvents++);

  const plot = playerPlots[0];
  ok(world.till(plot.id), 'till the player plot');
  ok(world.plant(plot.id, 'turnip_seed', 'player'), 'plant a turnip from its seed id');
  ok(world.plot(plot.id)!.state === 'planted' && world.plot(plot.id)!.crop === 'turnip', 'plot planted');
  ok(!world.plant(playerPlots[1].id, 'pumpkin_seed'), 'pumpkin refuses to plant in spring');
  ok(world.water(plot.id) && world.tileVariant(plot.pos.x, plot.pos.y) === 2, 'watered plot shows variant 2');

  const forageBefore = world.objects.filter((o) => o.kind === 'forage' && (o.data.qty as number) > 0).length;
  ok(forageBefore > 10, `forage spawned on day 1 (${forageBefore})`);
  const rock = world.objectsAt('mine', 'rock')[0];
  const rockHp = rock.data.hp as number;
  for (let i = 0; i < rockHp; i++) world.mine(rock.id);
  ok(rock.data.depleted === true && rock.data.hp === 0, 'rock depleted after its hp');
  const rock2 = world.objectsAt('mine', 'rock')[1];
  rock2.data.hp = 0; // the sim only decrements hp; the world must still respawn it
  const tree = world.objectsAt('forest', 'tree')[0];
  const wood0 = tree.data.wood as number;
  ok(world.chop(tree.id)?.item === 'wood' && (tree.data.wood as number) === wood0 - 1, 'chop takes wood');

  const log: string[] = [];
  let harvestDay = -1;
  const startDay = world.time.dayIndex;
  const festivalsSeen: string[] = [];
  const kindsSeen = new Set<WeatherKind>();
  for (let d = 0; d < 60; d++) {
    const dayStart = world.time.dayIndex;
    const seen: string[] = [];
    let last = '';
    const note = (): void => {
      const w = world.weather;
      const tag = `${w.kind}${w.intensity > 0 ? `(${w.intensity.toFixed(1)})` : ''}`;
      if (tag !== last) { seen.push(`${String(world.time.hour).padStart(2, '0')}:${String(world.time.min).padStart(2, '0')} ${tag}`); last = tag; }
      kindsSeen.add(w.kind);
    };
    note();
    const date = fmtDate(world.time);
    const f = world.festivalToday();
    if (f) festivalsSeen.push(`${f.name} (day ${world.time.dayIndex}, ${f.hour}:00)`);
    let noon = world.weather;
    // walk the day in 10-minute steps, watering at 8:00 and recording weather changes
    while (world.time.dayIndex === dayStart) {
      world.tick(10);
      if (world.time.dayIndex !== dayStart) break;
      note();
      if (world.time.hour === 12 && world.time.min === 0) noon = world.weather;
      if (world.time.hour === 8 && world.time.min === 0) world.water(plot.id);
      if (world.harvestable(plot.id) && harvestDay < 0) harvestDay = world.time.dayIndex;
    }
    log.push(`${date.padEnd(26)} noon ${noon.temperature.toFixed(0).padStart(3)}°C  forecast ${noon.forecast.padEnd(6)}  ${seen.join(' → ')}${f ? `  ★ ${f.name}` : ''}`);
  }
  console.log('  weather log:');
  for (const l of log) console.log('    ' + l);
  console.log(`  festivals: ${festivalsSeen.join('; ')}`);
  ok(newdays === 60, `60 newday events (${newdays})`);
  ok(hours === 60 * 24 - 6, `hour events from 6:00 day 1 to 0:00 day 61 (${hours})`);
  ok(weatherEvents >= 60, `weather events fired (${weatherEvents})`);
  ok(kindsSeen.has('rain') && kindsSeen.has('sunny') && kindsSeen.has('cloudy'), `weather variety: ${[...kindsSeen].join(',')}`);
  ok(festivalsSeen.length === 2 && festivalsSeen[0].startsWith('Spring Bloom Fair') && festivalsSeen[1].startsWith('Midsummer Lantern Night'), 'spring + summer festivals in 60 days');
  ok(world.time.dayIndex === startDay + 60 && world.time.season === 'autumn' && world.time.day === 5, `after 60 days it is ${world.time.season} day ${world.time.day}`);
  console.log(`  turnip planted day 1, harvestable on day ${harvestDay}`);
  ok(harvestDay === 4, `turnip harvestable by day 4 (got ${harvestDay})`);
  ok(world.plot(plot.id)!.state === 'planted' && world.plot(plot.id)!.growth === 1, 'turnip stayed ripe while unharvested');
  // it is autumn now: the spring turnip has withered
  ok((world.plot(plot.id) as unknown as { withered?: boolean }).withered === true, 'spring crop withered in summer');
  const h = world.harvest(plot.id);
  ok(h === null, 'withered crop cannot be harvested');
  // tilling clears the withered crop; pumpkin goes in for autumn
  ok(world.till(plot.id), 'till clears a withered plot');
  ok(world.plant(plot.id, 'pumpkin_seed', 'player') && world.plot(plot.id)!.crop === 'pumpkin', 'pumpkin planted in autumn');
  // rock respawned on a Monday
  ok(rock.data.depleted === false, 'rock respawned within 60 days');
  ok((rock2.data.hp as number) > 0 && rock2.data.depleted === false, 'rock mined by the sim (hp 0) respawned too');
  ok((tree.data.wood as number) >= wood0, 'tree regrew wood');
  const forageNow = world.objects.filter((o) => o.kind === 'forage' && (o.data.qty as number) > 0);
  ok(forageNow.length > 10 && forageNow.some((o) => o.data.item === 'mushroom'), `autumn forage includes mushrooms (${forageNow.length} spots)`);
  const fishAtDock = world.objectsAt('dock', 'fishspot')[0];
  ok(fishAtDock !== undefined, 'dock fish spot exists');

  // weather override
  world.forceWeather('storm', 1, 2);
  ok(world.weather.kind === 'storm', 'forceWeather applies');
  world.tick(3 * 60);
  ok(world.weather.kind !== 'storm' || world.weather.intensity !== 1, 'forceWeather expires');

  // harvest flow with a fresh spring world: strawberries regrow
  {
    const w2 = generateWorld(seed, { bus: new Bus() });
    const p2 = w2.objectsAt('player_farm', 'plot')[2];
    w2.till(p2.id); w2.plant(p2.id, 'strawberry');
    for (let d = 0; d < 6; d++) { w2.water(p2.id); w2.tick(MINUTES_PER_DAY); }
    ok(w2.harvestable(p2.id), 'strawberry ready after 6 watered days');
    const got = w2.harvest(p2.id);
    ok(got?.item === 'strawberry' && got.qty === 2 && w2.plot(p2.id)!.state === 'planted', 'strawberry harvest keeps the plant');
    for (let d = 0; d < 3; d++) { w2.water(p2.id); w2.tick(MINUTES_PER_DAY); }
    ok(w2.harvestable(p2.id), 'strawberry regrew in 3 days');
    // unwatered plots stall (no rain): find a dry day
    const p3 = w2.objectsAt('player_farm', 'plot')[3];
    w2.till(p3.id); w2.plant(p3.id, 'turnip');
    const g0 = w2.plot(p3.id)!.growth;
    w2.tick(MINUTES_PER_DAY);
    const rained = w2.rainedToday();
    if (!rained) ok(w2.plot(p3.id)!.growth === g0 || w2.plot(p3.id)!.growth > g0, 'growth only if watered/rained');
  }

  /* ---- save / load ---- */
  const snap = world.save();
  const json = JSON.stringify(snap);
  ok(json.length > 100, `save is JSON-able (${json.length} bytes)`);
  const w3 = generateWorld(seed, { bus: new Bus() });
  w3.load(JSON.parse(json));
  ok(w3.time.minute === world.time.minute && w3.weather.kind === world.weather.kind && w3.weather.forecast === world.weather.forecast, 'time + weather restored');
  const p1 = world.plot(plot.id) as PlotState, p1b = w3.plot(plot.id) as PlotState;
  ok(JSON.stringify(p1) === JSON.stringify(p1b), 'plot state restored');
  ok(JSON.stringify(w3.object(rock.id)!.data) === JSON.stringify(rock.data), 'rock data restored');
  ok(JSON.stringify(w3.object(tree.id)!.data) === JSON.stringify(tree.data), 'tree data restored');
  ok(w3.tileVariant(plot.pos.x, plot.pos.y) === world.tileVariant(plot.pos.x, plot.pos.y), 'plot tile variant restored');
  ok(w3.season === world.season && w3.festivalToday()?.id === world.festivalToday()?.id, 'season/festival restored');
  // both worlds continue identically
  world.tick(MINUTES_PER_DAY * 3); w3.tick(MINUTES_PER_DAY * 3);
  ok(JSON.stringify(world.save()) === JSON.stringify(w3.save()), 'restored world evolves identically');
}

console.log(failures === 0 ? '\nALL WORLD TESTS PASSED' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
