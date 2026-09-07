/**
 * Render preview harness (dev only): http://localhost:5190/pebblebrook/scripts/preview.html
 *   ?hour=12&season=spring&weather=sunny   time of day / season / weather (sunny|cloudy|rain|storm|fog|snow)
 *   &follow=player|<villagerId>|none       camera target (none = free camera at &x=&y=)
 *   &quality=low                            drop particles + lighting
 *   &speed=0                                in-game minutes per real second (0 freezes the clock)
 *   &mode=chars                             show every villager's sprite sheet + portrait instead
 *   &world=fake                             use the hand-made demo village instead of src/world's generator
 */
import { loadArt, type ArtImpl } from '../art/index.ts';
import { BUILDING_PIECE, WALL_SET_COLS } from '../art/catalogue.ts';
import { buildCharacter, FRAME_H, FRAME_W } from '../art/characters.ts';
import { ctx2d } from '../art/pixel.ts';
import type { Dir, Season, WeatherKind, World } from '../core/types.ts';
import { PLAYER_LOOK, VILLAGERS } from '../core/villagers.ts';
import { CROPS, ITEMS } from '../core/items.ts';
import { cropSprite } from '../art/crops.ts';
import { createRenderer, type RendererExt } from './index.ts';
import { FakeSim, FakeWorld } from './fakeworld.ts';

const q = new URLSearchParams(location.search);
const hour = Number(q.get('hour') ?? 12);
const season = (q.get('season') ?? 'spring') as Season;
const weather = (q.get('weather') ?? 'sunny') as WeatherKind;
const intensity = Number(q.get('intensity') ?? 0.7);
const followParam = q.get('follow') ?? 'player';
const speed = Number(q.get('speed') ?? 1);
const mode = q.get('mode') ?? 'world';
const seed = Number(q.get('seed') ?? 7);

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const hud = document.getElementById('hud');
const BASE = import.meta.env.BASE_URL;

async function main(): Promise<void> {
  const art = await loadArt(BASE);
  if (mode === 'chars') { charsPage(art); return; }
  if (mode === 'pieces') { piecesPage(art as ArtImpl); return; }
  if (mode === 'items') { itemsPage(art as ArtImpl); return; }
  let world: World;
  if (q.get('world') !== 'fake') {
    try {
      const mod = await import('../world/index.ts');
      world = mod.generateWorld(seed);
      // the real clock starts spring day 1 6:00: tick forward to the requested season/hour and force the weather
      const seasonIndex = ['spring', 'summer', 'autumn', 'winter'].indexOf(season);
      const target = (seasonIndex * 28 + 4) * 1440 + hour * 60;
      if (target > world.time.minute) world.tick(target - world.time.minute);
      (world as unknown as { forceWeather?: (k: WeatherKind, i?: number) => void }).forceWeather?.(weather, intensity);
    } catch (e) { console.warn('real world unavailable, using the fake one', e); world = new FakeWorld({ hour, season, weather, intensity, seed }); }
  } else world = new FakeWorld({ hour, season, weather, intensity, seed });
  // the demo sim drives ten walking, chatting villagers on either world
  const sim = new FakeSim(world as FakeWorld, { talk: q.get('talk') !== '0', walk: q.get('walk') !== '0' });
  const renderer = createRenderer(canvas, art, world) as RendererExt;
  renderer.follow = followParam === 'none' ? null : followParam === 'player' ? 'player' : followParam;
  if (followParam === 'none') { renderer.camera.x = Number(q.get('x') ?? world.width / 2); renderer.camera.y = Number(q.get('y') ?? world.height / 2); }
  if (q.get('quality') === 'low') renderer.setQuality('low');
  if (q.get('birds')) renderer.fx.ambient.nextBird = 0.3;
  // inside=cerys:home_cerys,bram:smithy parks villagers inside buildings (smoke, smithy glow, hidden sprites)
  for (const pair of (q.get('inside') ?? '').split(',').filter(Boolean)) {
    const [id, place] = pair.split(':');
    const v = sim?.villager(id);
    if (v && place) { v.inside = place; const p = world.place(place); if (p?.interior) v.pos = { ...p.interior }; }
  }
  const fit = () => renderer.resize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', fit);
  fit();
  // free-camera panning with WASD/arrows
  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('click', (e) => { console.log('pick', renderer.pick(e.offsetX, e.offsetY, sim)); });
  const player: { pos: { x: number; y: number }; facing: Dir; moving: boolean; look: typeof PLAYER_LOOK; inside: string | undefined } = { pos: { x: 34, y: 30 }, facing: 'down', moving: false, look: PLAYER_LOOK, inside: undefined };
  player.pos = sim.player.pos;
  if (!world.walkable(Math.floor(player.pos.x), Math.floor(player.pos.y))) { const w = world.nearestWalkable(world.place('square')?.anchor ?? player.pos); player.pos.x = w.x; player.pos.y = w.y; }
  if (q.get('px') !== null) { player.pos.x = Number(q.get('px')); player.pos.y = Number(q.get('py') ?? player.pos.y); }
  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, fps = 0, renderMs = 0;
  const w = window as unknown as { __pv: unknown };
  w.__pv = { renderer, sim, world, art, ready: true };
  function loop(ts: number): void {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    sim.speed = speed; sim.update(dt);
    // move the player with keys (also drives the walk animation)
    let mx = 0, my = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
    player.moving = mx !== 0 || my !== 0;
    if (player.moving) {
      const sp = 4 * dt;
      const nx = player.pos.x + mx * sp, ny = player.pos.y + my * sp;
      if (renderer.follow === null) { renderer.camera.x += mx * sp * 3; renderer.camera.y += my * sp * 3; player.moving = false; }
      else {
        if (world.walkable(Math.floor(nx + 0.5), Math.floor(player.pos.y + 0.5))) player.pos.x = nx;
        if (world.walkable(Math.floor(player.pos.x + 0.5), Math.floor(ny + 0.5))) player.pos.y = ny;
        player.facing = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : my > 0 ? 'down' : 'up';
      }
    }
    const r0 = performance.now();
    renderer.render(sim, dt, player);
    renderMs = renderMs * 0.9 + (performance.now() - r0) * 0.1;
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    if (hud) hud.textContent = `${world.time.season} day ${world.time.day} · ${world.time.hour}:${String(world.time.min).padStart(2, '0')} · ${world.weather.kind} · follow=${String(renderer.follow)} · zoom ${renderer.camera.zoom} · ${fps.toFixed(0)} fps · render ${renderMs.toFixed(1)} ms`;
  }
  requestAnimationFrame(loop);
}

/** every villager's full sprite sheet and portrait, at 4× on a plain background */
function charsPage(_art: unknown): void {
  const z = 4;
  const looks = [{ id: 'player', look: PLAYER_LOOK, profession: undefined as string | undefined }, ...VILLAGERS.map((v) => ({ id: v.id, look: v.look, profession: v.profession as string | undefined }))];
  const rowH = FRAME_H * 4 * z + 24;
  const colW = FRAME_W * 5 * z + 32 * z + 300;
  const cols = 3;
  canvas.width = colW * cols;
  canvas.height = rowH * Math.ceil(looks.length / cols);
  canvas.style.width = `${canvas.width}px`; canvas.style.height = `${canvas.height}px`;
  const g = ctx2d(canvas);
  g.fillStyle = '#7fb85a'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.font = '14px monospace'; g.fillStyle = '#fff';
  looks.forEach((l, i) => {
    const s = buildCharacter(l.look, l.profession);
    const y = Math.floor(i / cols) * rowH + 4, x = (i % cols) * colW;
    g.drawImage(s.frames.down[0].img, 0, 0, FRAME_W * 5, FRAME_H * 4, x, y, FRAME_W * 5 * z, FRAME_H * 4 * z);
    g.drawImage(s.portrait, x + FRAME_W * 5 * z + 12, y, 32 * z, 32 * z);
    g.fillText(`${l.id} ${l.profession ?? ''} h=${l.look.height} ${l.look.build}`, x + FRAME_W * 5 * z + 12, y + 32 * z + 18);
    g.fillText(`hair=${l.look.hairStyle} hat=${l.look.hat ?? 0}`, x + FRAME_W * 5 * z + 12, y + 32 * z + 36);
  });
  (window as unknown as { __pv: unknown }).__pv = { ready: true };
}

/** every building piece of every colour set, labelled, at 6× */
function piecesPage(art: ArtImpl): void {
  const z = 6, cell = 16 * z + 4;
  const names = Object.keys(BUILDING_PIECE);
  const sets = Object.keys(WALL_SET_COLS) as (keyof typeof WALL_SET_COLS)[];
  const perRow = 13;
  const rowsPerSet = Math.ceil(names.length / perRow);
  canvas.width = perRow * cell + 8;
  canvas.height = sets.length * rowsPerSet * (cell + 14) + 8;
  canvas.style.width = `${canvas.width}px`; canvas.style.height = `${canvas.height}px`;
  const g = ctx2d(canvas);
  g.fillStyle = '#c090c8'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.font = '10px monospace';
  sets.forEach((set, si) => {
    names.forEach((n, ni) => {
      const [dc, dr] = BUILDING_PIECE[n];
      const col = WALL_SET_COLS[set] + dc;
      const x = 4 + (ni % perRow) * cell, y = 4 + (si * rowsPerSet + Math.floor(ni / perRow)) * (cell + 14);
      g.drawImage(art.atlas.base, col * 17, dr * 17, 16, 16, x, y, 16 * z, 16 * z);
      g.fillStyle = '#fff'; g.fillText(`${n} ${col},${dr}`, x, y + 16 * z + 11);
    });
  });
  // composed sample buildings per set: scheme A (plain walls + base) and B (band under the eave + line eave)
  const y0 = 4 + sets.length * rowsPerSet * (cell + 14);
  canvas.height = y0 + sets.length * 5 * 16 * z + 40;
  g.fillStyle = '#7fb85a'; g.fillRect(0, y0 - 4, canvas.width, canvas.height - y0 + 4);
  const tile = (col: number, row: number, tx: number, ty: number) => g.drawImage(art.atlas.base, col * 17, row * 17, 16, 16, tx * 16 * z, ty * 16 * z, 16 * z, 16 * z);
  sets.forEach((set, si) => {
    const c = WALL_SET_COLS[set];
    const bx = 1, by = y0 / (16 * z) + si * 5;
    // scheme A
    tile(c, 21, bx, by); tile(c, 22, bx + 1, by); tile(c + 1, 22, bx + 2, by); tile(c, 22, bx + 3, by); tile(c + 1, 21, bx + 4, by);
    for (let i = 0; i < 5; i++) tile(c + (i % 2), 22, bx + i, by + 1);
    for (let i = 0; i < 5; i++) tile(c + 4, 15, bx + i, by + 2);
    for (let i = 0; i < 5; i++) tile(c + 4, 23, bx + i, by + 3);
    tile(40, 0, bx + 1, by + 2); tile(40, 0, bx + 3, by + 2); tile(32, 0, bx + 2, by + 3);
    // scheme B
    const bx2 = bx + 6;
    tile(c, 21, bx2, by); tile(c, 22, bx2 + 1, by); tile(c + 1, 22, bx2 + 2, by); tile(c, 22, bx2 + 3, by); tile(c + 1, 21, bx2 + 4, by);
    for (let i = 0; i < 5; i++) tile(c + 3, 22, bx2 + i, by + 1);
    for (let i = 0; i < 5; i++) tile(c + 4, 16, bx2 + i, by + 2);
    for (let i = 0; i < 5; i++) tile(c + (i === 0 || i === 4 ? 0 : 4), 15, bx2 + i, by + 3);
    tile(40, 0, bx2 + 1, by + 2); tile(40, 0, bx2 + 3, by + 2); tile(32, 0, bx2 + 2, by + 3);
    g.fillStyle = '#fff'; g.fillText(`${set} A`, bx * 16 * z, (by + 4) * 16 * z + 12); g.fillText(`${set} B`, bx2 * 16 * z, (by + 4) * 16 * z + 12);
  });
  (window as unknown as { __pv: unknown }).__pv = { ready: true };
}

/** every item icon, crop stage, emote and UI icon at 3× */
function itemsPage(art: ArtImpl): void {
  const z = 3, cell = 16 * z + 6;
  const perRow = 24;
  const rows = Math.ceil(ITEMS.length / perRow) + 1 + CROPS.length + 1 + 2;
  canvas.width = perRow * cell + 8;
  canvas.height = rows * (cell + 12) + 40;
  canvas.style.width = `${canvas.width}px`; canvas.style.height = `${canvas.height}px`;
  const g = ctx2d(canvas);
  g.fillStyle = '#f3e6c8'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.font = '9px monospace'; g.fillStyle = '#2b2118';
  const draw = (sp: { img: CanvasImageSource; sx: number; sy: number; sw: number; sh: number }, x: number, y: number) => g.drawImage(sp.img, sp.sx, sp.sy, sp.sw, sp.sh, x, y - (sp.sh - 16) * z, sp.sw * z, sp.sh * z);
  let y = 4;
  ITEMS.forEach((it, i) => {
    const x = 4 + (i % perRow) * cell; if (i && i % perRow === 0) y += cell + 12;
    const sp = art.item(it.id); if (sp) draw(sp, x, y);
    g.fillText(it.id.slice(0, 9), x, y + 16 * z + 9);
  });
  y += cell + 12;
  g.fillStyle = '#7fb85a'; g.fillRect(0, y, canvas.width, CROPS.length * (cell + 12) + 16 * z);
  CROPS.forEach((c) => {
    y += cell + 12;
    g.fillStyle = '#2b2118';
    for (let st = 0; st < c.stages; st++) { const sp = cropSprite(c.id, st); draw(sp, 4 + st * cell, y); }
    g.fillText(`${c.id} ×${c.stages}`, 4 + 6 * cell, y + 16 * z);
  });
  y += cell + 12 + 16 * z;
  ['happy', 'sad', 'angry', 'love', 'question', 'idea', 'sleepy', 'music', 'sweat', 'exclaim', 'sick'].forEach((e, i) => { const sp = art.emote(e); if (sp) draw(sp, 4 + i * cell, y); g.fillText(e, 4 + i * cell, y + 16 * z + 9); });
  y += cell + 12;
  const ui: [('weather' | 'skill' | 'place'), string][] = [['weather', 'sunny'], ['weather', 'cloudy'], ['weather', 'rain'], ['weather', 'storm'], ['weather', 'fog'], ['weather', 'snow'],
    ['skill', 'farming'], ['skill', 'fishing'], ['skill', 'mining'], ['skill', 'cooking'], ['skill', 'crafting'], ['skill', 'charm'], ['skill', 'lore'], ['skill', 'medicine'],
    ['place', 'home'], ['place', 'shop'], ['place', 'workplace'], ['place', 'public'], ['place', 'nature'], ['place', 'farm'], ['place', 'landmark']];
  ui.forEach(([k, id], i) => { const c = art.icon(k, id, 16 * z); g.drawImage(c, 4 + i * cell, y); g.fillText(id, 4 + i * cell, y + 16 * z + 9); });
  (window as unknown as { __pv: unknown }).__pv = { ready: true };
}

main().catch((e) => { console.error(e); if (hud) hud.textContent = String(e); });
