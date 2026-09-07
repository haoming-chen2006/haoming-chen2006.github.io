// AGENT C owns this module. Keep the export names.
import type { Art, Renderer, SpriteRect } from '../core/app.ts';
import { bus } from '../core/bus.ts';
import type { Dir, Place, PlaceId, SimView, Vec, Villager, World, WorldObject } from '../core/types.ts';
import type { ArtImpl } from '../art/index.ts';
import { ctx2d } from '../art/pixel.ts';
import { tileSprite, windowSprite } from '../art/tiles.ts';
import { objectSprite } from '../art/objects.ts';
import { buildCharacter, FRAME_H, FRAME_W } from '../art/characters.ts';
import { emoteSprite } from '../art/emotes.ts';
import { uiIcon } from '../art/icons.ts';
import { CameraCtl } from './camera.ts';
import { CHUNK, GroundCache, type Chunk } from './ground.ts';
import { hash2, inBounds, TILE, tileOf, type View, type WorldExt } from './common.ts';
import { ambient, LightingFx, type Light } from './lighting.ts';
import { WeatherFx } from './weather.ts';
import { AmbientFx } from './particles.ts';
import { drawBubble, drawHighlight, drawLabel, drawVignette } from './overlay.ts';

export { hash2 } from './common.ts';

/** Extra surface the lead/UI may use beyond the core Renderer contract. */
export interface RendererExt extends Renderer {
  /** re-bake ground chunks (all, or the rectangle in tiles) after tiles/objects change */
  invalidate(x?: number, y?: number, w?: number, h?: number): void;
  /** what the mouse is over (updated every frame from the canvas' own mousemove) */
  hovered: { villager?: Villager; object?: WorldObject; place?: Place } | null;
  quality: 'high' | 'low';
  /** the animation clock in seconds */
  readonly time: number;
  /** the particle systems, for debugging / scripted moments (e.g. force a storm flash) */
  fx: { ambient: AmbientFx; weather: WeatherFx };
}

interface Walker { lastX: number; lastY: number; walkT: number; moving: boolean; facing: Dir; idle: number }
interface Drawable { y: number; order: number; draw: () => void }

const TALL_KINDS = new Set(['tree', 'well', 'lantern', 'shrine', 'board', 'decoration']);
const MEAL_HOURS: [number, number][] = [[6.5, 9], [12, 13.5], [18, 21]];

export function createRenderer(canvas: HTMLCanvasElement, art: Art, world: World): Renderer {
  const impl = art as ArtImpl;
  const atlas = impl.atlas;
  const g = ctx2d(canvas);
  const wx = world as WorldExt;
  const cam = new CameraCtl();
  const ground = new GroundCache(atlas, wx);
  const lighting = new LightingFx();
  const weatherFx = new WeatherFx();
  const ambientFx = new AmbientFx();
  const walkers = new Map<string, Walker>();
  const view: View = { scale: 3, dpr: 1, ox: 0, oy: 0, W: 1, H: 1, x0: 0, y0: 0, x1: 0, y1: 0, t: 0 };
  let dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let cssW = canvas.clientWidth || 800, cssH = canvas.clientHeight || 600;
  let frames = 0;
  let hover: Vec | null = null;
  let visibleObjects: WorldObject[] = [];
  let visibleChunks: Chunk[] = [];
  let lastSeason = world.time.season;

  canvas.addEventListener('mousemove', (e) => { hover = { x: e.offsetX, y: e.offsetY }; });
  canvas.addEventListener('mouseleave', () => { hover = null; });
  weatherFx.onThunder = () => bus.emit({ type: 'sfx', name: 'thunder' });
  bus.on('newday', () => ground.invalidate());
  bus.on('load', () => { ground.invalidate(); cam.snap = true; });

  function resize(w: number, h: number): void {
    cssW = Math.max(1, w); cssH = Math.max(1, h);
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    cam.zoom = cssW < 1100 ? 2 : 3;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    g.imageSmoothingEnabled = false;
  }

  function computeView(): void {
    view.dpr = dpr;
    view.scale = Math.max(1, Math.round(cam.zoom * dpr));
    view.W = canvas.width; view.H = canvas.height;
    const [ox, oy] = cam.origin(view.W, view.H, view.scale);
    view.ox = ox; view.oy = oy;
    const ts = TILE * view.scale;
    view.x0 = Math.floor(-ox / ts); view.y0 = Math.floor(-oy / ts);
    view.x1 = Math.ceil((view.W - ox) / ts); view.y1 = Math.ceil((view.H - oy) / ts);
  }

  const inView = (x: number, y: number, pad = 2): boolean => x >= view.x0 - pad && x <= view.x1 + pad && y >= view.y0 - pad && y <= view.y1 + pad;

  function blit(s: SpriteRect, tx: number, ty: number, alpha = 1): void {
    const sc = view.scale;
    const dx = Math.round(view.ox + (tx + (s.ox ?? 0)) * TILE * sc), dy = Math.round(view.oy + (ty + (s.oy ?? 0)) * TILE * sc);
    if (alpha !== 1) g.globalAlpha = alpha;
    g.drawImage(s.img, s.sx, s.sy, s.sw, s.sh, dx, dy, s.sw * sc, s.sh * sc);
    if (alpha !== 1) g.globalAlpha = 1;
  }

  function walker(id: string, pos: Vec, facing: Dir, moving: boolean | null, dt: number): Walker {
    let w = walkers.get(id);
    if (!w) { w = { lastX: pos.x, lastY: pos.y, walkT: hash2(id.length, id.charCodeAt(0)) * 10, moving: false, facing, idle: 0 }; walkers.set(id, w); }
    const ddx = pos.x - w.lastX, ddy = pos.y - w.lastY;
    const moved = Math.abs(ddx) + Math.abs(ddy);
    const isMoving = moving ?? moved > 0.0005;
    if (isMoving) { w.walkT += dt; w.idle = 0; } else w.idle += dt;
    w.moving = isMoving;
    if (moved > 0.0005 && moving === null) {
      // derive facing from motion when the sim has not set it
      if (Math.abs(ddx) > Math.abs(ddy)) w.facing = ddx > 0 ? 'right' : 'left'; else w.facing = ddy > 0 ? 'down' : 'up';
    } else w.facing = facing;
    if (facing && moved > 0.0005) w.facing = facing;
    w.lastX = pos.x; w.lastY = pos.y;
    return w;
  }

  function drawCharacter(look: Villager['look'], profession: string | undefined, pos: Vec, w: Walker, alpha = 1): void {
    const sprites = buildCharacter(look, profession);
    const frame = w.moving ? 1 + (Math.floor(w.walkT * 7.5) % 4) : 0;
    const s = sprites.frames[w.facing][frame] ?? sprites.frames.down[0];
    blit(s, pos.x, pos.y, alpha);
  }

  /** the place whose roof should turn transparent because the followed entity is under it */
  function placeBehind(sim: SimView, playerPos: Vec): PlaceId | null {
    let pos: Vec | null = null;
    if (renderer.follow === 'player') pos = playerPos;
    else if (renderer.follow) pos = sim.villager(renderer.follow)?.pos ?? null;
    if (!pos) return null;
    const t = tileOf(pos);
    for (const p of world.places) if (p.door && p.door.x === t.x && p.door.y === t.y) return p.id;
    const kind = inBounds(world, t.x, t.y) ? world.tile(t.x, t.y) : 'void';
    if (kind === 'floor' || kind === 'door' || kind === 'wall') return world.placeAt(t)?.id ?? null;
    // one tile south of a building wall: the head pokes into the wall row, roofs stay opaque
    return null;
  }

  function collectSceneLists(sim: SimView, playerInside: PlaceId | undefined, hour: number): { chimneys: Vec[]; trees: Vec[]; grass: Vec[]; insidePlaces: Set<string> } {
    const insidePlaces = new Set<string>();
    for (const v of sim.villagers) if (v.inside) insidePlaces.add(v.inside);
    if (playerInside) insidePlaces.add(playerInside);
    const meal = MEAL_HOURS.some(([a, b]) => hour >= a && hour < b);
    const cold = world.time.season === 'winter';
    const chimneys: Vec[] = [];
    for (const c of visibleChunks) for (const ch of c.chimneys) {
      if (!inView(ch.x, ch.y, 3)) continue;
      const p = ch.placeId ? world.place(ch.placeId) : undefined;
      const busy = ch.placeId ? insidePlaces.has(ch.placeId) : false;
      const workshop = p && (p.id === 'bakery' || p.id === 'smithy' || p.id === 'tavern');
      if ((busy && (meal || cold || hour >= 17)) || (workshop && busy)) chimneys.push({ x: ch.x + 0.7, y: ch.y - 0.2 });
    }
    const trees: Vec[] = [];
    for (const o of visibleObjects) if (o.kind === 'tree') trees.push(o.pos);
    const grass: Vec[] = [];
    for (let y = view.y0; y <= view.y1; y += 2) for (let x = view.x0 + (y & 1); x <= view.x1; x += 3) if (inBounds(world, x, y) && world.tile(x, y) === 'grass') grass.push({ x, y });
    return { chimneys, trees, grass, insidePlaces };
  }

  function actionIcon(tool: string): SpriteRect | null {
    const t = tool.toLowerCase();
    let skill: string | null = null;
    if (/fish/.test(t)) skill = 'fishing';
    else if (/till|plant|water|harvest|tend|garden|forage/.test(t)) skill = 'farming';
    else if (/mine|chop/.test(t)) skill = 'mining';
    else if (/forge|repair|craft|build/.test(t)) skill = 'crafting';
    else if (/bake|cook|eat|drink|serve/.test(t)) skill = 'cooking';
    else if (/say|chat|gossip|greet|talk|compliment|tease|argue|comfort|invite|gift|hug|dance|propose|story|music/.test(t)) skill = 'charm';
    else if (/read|teach|book|catalogue|write|recall/.test(t)) skill = 'lore';
    else if (/treat|check|heal/.test(t)) skill = 'medicine';
    if (!skill) return null;
    const c = uiIcon(atlas, 'skill', skill, 16);
    return { img: c, sx: 0, sy: 0, sw: 16, sh: 16 };
  }

  function objectLabel(o: WorldObject): string {
    const d = o.data as Record<string, unknown>;
    switch (o.kind) {
      case 'plot': return d.crop ? `${String(d.crop)} (${d.state === 'planted' ? `stage ${Number(d.stage ?? 0) + 1}` : String(d.state)})` : `plot (${String(d.state ?? 'empty')})`;
      case 'tree': return d.stump ? 'stump' : `${String(d.kind ?? 'oak')} tree`;
      case 'rock': return d.ore && d.ore !== 'stone' ? `${String(d.ore)} rock` : 'rock';
      case 'forage': return String(d.item ?? 'forage');
      case 'fishspot': return 'fishing spot';
      case 'animal': return String(d.name ?? d.kind ?? 'animal');
      case 'decoration': return String(d.name ?? d.kind ?? 'decoration');
      default: return o.kind;
    }
  }

  function render(sim: SimView, dt: number, player: { pos: Vec; facing: Dir; inside?: PlaceId; moving: boolean; look: Villager['look'] }): void {
    dt = Math.min(0.1, Math.max(0, dt));
    view.t += dt;
    frames++;
    const time = world.time;
    const season = world.season ?? time.season;
    if (season !== lastSeason) { lastSeason = season; ground.invalidate(); }
    const hour = time.hour + time.min / 60;
    const weather = world.weather;
    const amb = ambient(hour, season, weather.kind, season === 'winter');
    const lowQ = renderer.quality === 'low';

    // camera
    let target: Vec | null = null;
    if (renderer.follow === 'player') target = player.pos;
    else if (renderer.follow) target = sim.villager(renderer.follow)?.pos ?? null;
    computeView();
    cam.update(dt, target, world, view.W / (TILE * view.scale), view.H / (TILE * view.scale));
    computeView();
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#101614';
    g.fillRect(0, 0, view.W, view.H);

    // ground chunks (bake lazily, more aggressively on the first frames)
    ground.beginFrame();
    ground.maxBakesPerFrame = frames < 3 ? 64 : 2;
    visibleChunks = [];
    const cx0 = Math.floor(Math.max(0, view.x0) / CHUNK), cy0 = Math.floor(Math.max(0, view.y0) / CHUNK);
    const cx1 = Math.floor(Math.min(world.width - 1, view.x1) / CHUNK), cy1 = Math.floor(Math.min(world.height - 1, view.y1) / CHUNK);
    const ts = TILE * view.scale;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = ground.get(cx, cy, season);
      const dx = view.ox + cx * CHUNK * ts, dy = view.oy + cy * CHUNK * ts;
      if (!c) { g.fillStyle = '#2f4a25'; g.fillRect(dx, dy, CHUNK * ts, CHUNK * ts); continue; }
      g.drawImage(c.canvas, 0, 0, c.canvas.width, c.canvas.height, dx, dy, CHUNK * ts, CHUNK * ts);
      visibleChunks.push(c);
    }
    // animated water
    if (!lowQ) {
      const frame = Math.floor(view.t * 2.2) % 3;
      if (frame !== 0) for (const c of visibleChunks) for (const wt of c.water) {
        if (!inView(wt.x, wt.y, 0)) continue;
        const s = tileSprite(atlas, 'water', wt.variant, season, wt.mask, frame);
        if (s) blit(s, wt.x, wt.y);
        if (wt.kind === 'deepwater') blit(atlas.autotile('deep', ground.mask(wt.x, wt.y, 'deepwater'), season), wt.x, wt.y);
      }
    }

    // entities, y-sorted
    const items: Drawable[] = [];
    visibleObjects = [];
    const lights: Light[] = [];
    const objFrame = Math.floor(view.t * 3);
    for (const o of world.objects) {
      if (!inView(o.pos.x, o.pos.y, 3)) continue;
      visibleObjects.push(o);
      let data = o.data;
      if (o.kind === 'tree') data = { ...o.data, single: world.tile(o.pos.x, o.pos.y) === 'tree' };
      if (o.kind === 'lantern') { data = { ...o.data, lit: amb.night > 0.15 }; if (amb.night > 0.15 && !lowQ) lights.push({ x: o.pos.x + 0.5, y: o.pos.y + 0.15, r: 3.2, colour: '#ffd27a', intensity: 0.95, flicker: Math.sin(view.t * 9 + o.pos.x) * 0.03 }); }
      if (o.kind === 'campfire' && o.data.lit !== false && !lowQ) lights.push({ x: o.pos.x + 0.5, y: o.pos.y + 0.5, r: 3.8, colour: '#ff9a3c', intensity: 1, flicker: Math.sin(view.t * 13 + Math.sin(view.t * 7)) * 0.06 });
      const frameFor = o.kind === 'animal' ? Math.floor(view.t * 1.6 + hash2(o.pos.x, o.pos.y) * 4) : o.kind === 'fishspot' ? Math.floor(view.t * 2.5 + hash2(o.pos.x, o.pos.y) * 3) : objFrame;
      const s = objectSprite(atlas, o.kind, data, season, frameFor);
      if (!s) continue;
      const parts = Array.isArray(s) ? s : [s];
      const flat = o.kind === 'plot' || o.kind === 'fishspot' || o.kind === 'flowerbed' || o.kind === 'forage' && o.data.item !== 'berries';
      items.push({ y: flat ? -1000 + o.pos.y : o.pos.y, order: 0, draw: () => { for (const p of parts) blit(p, o.pos.x, o.pos.y); } });
    }
    for (const v of sim.villagers) {
      if (v.inside) { walkers.get(v.id) && (walkers.get(v.id)!.moving = false); continue; }
      const w = walker(v.id, v.pos, v.facing, null, dt);
      if (!inView(v.pos.x, v.pos.y, 2)) continue;
      items.push({ y: v.pos.y + 0.01, order: 1, draw: () => drawCharacter(v.look, v.profession, v.pos, w) });
    }
    if (!player.inside) {
      const w = walker('__player', player.pos, player.facing, player.moving, dt);
      items.push({ y: player.pos.y + 0.02, order: 2, draw: () => drawCharacter(player.look, undefined, player.pos, w) });
      if (amb.night > 0.3 && !lowQ) lights.push({ x: player.pos.x + 0.5, y: player.pos.y + 0.5, r: 2.4, colour: '#fff4d8', intensity: 0.55 });
    }
    items.sort((a, b) => a.y - b.y || a.order - b.order);
    for (const it of items) it.draw();

    // overhead: roofs (transparent for the building the followed entity is in)
    const behind = placeBehind(sim, player.pos);
    for (const c of visibleChunks) for (const r of c.roofs) {
      if (!inView(r.x, r.y, 0)) continue;
      blit(r.sprite, r.x, r.y, behind && r.placeId === behind ? 0.4 : 1);
    }

    // lit windows + their glow
    const lists = collectSceneLists(sim, player.inside, hour);
    if (amb.night > 0.2) for (const c of visibleChunks) for (const w of c.windows) {
      if (!inView(w.x, w.y, 0)) continue;
      blit(windowSprite(atlas, w.set, true), w.x, w.y);
      if (!lowQ) lights.push({ x: w.x + 0.5, y: w.y + 0.6, r: 2.3, colour: '#ffb347', intensity: 0.75 });
    }
    // the smithy glows when someone is at the forge
    const smithy = world.place('smithy');
    if (smithy && lists.insidePlaces.has('smithy') && !lowQ) {
      const at = smithy.door ?? smithy.anchor;
      lights.push({ x: at.x + 0.5, y: at.y + 0.3, r: 3.5, colour: '#ff7a2a', intensity: 0.9, flicker: Math.sin(view.t * 11) * 0.08 });
    }

    // ambient particles behind the lighting
    ambientFx.quality = renderer.quality;
    ambientFx.update(dt, { season, weather: weather.kind, hour, night: amb.night, chimneys: lists.chimneys, trees: lists.trees, grass: lists.grass, daylight: time.isDaylight }, view);
    ambientFx.drawScene(g, view);

    // lighting
    lighting.quality = renderer.quality;
    lighting.render(g, view, amb, lights);
    ambientFx.drawLights(g, view);

    // weather
    weatherFx.quality = renderer.quality;
    weatherFx.update(dt, weather.kind, weather.intensity, view);
    weatherFx.draw(g, view, weather.kind, weather.intensity);

    // screen-space overlays
    if (renderer.highlight) drawHighlight(g, view, renderer.highlight, view.t);
    renderer.hovered = hover ? pick(hover.x, hover.y, sim) : null;
    const nowMin = time.minute;
    for (const v of sim.villagers) {
      if (v.inside || !inView(v.pos.x, v.pos.y, 2)) continue;
      const sc = view.scale;
      const hx = view.ox + (v.pos.x + 0.5) * TILE * sc;
      const headY = view.oy + (v.pos.y + 1) * TILE * sc - (FRAME_H - 2) * sc - Math.max(0, (v.look.height - 24)) * sc;
      let topY = headY;
      if (v.emote && v.emote.kind !== 'none' && v.emote.until > nowMin) {
        const es = emoteSprite(v.emote.kind);
        if (es) {
          const bob = Math.round(Math.sin(view.t * 6) * 1.5) * sc;
          const ex = Math.round(hx - 8 * sc), ey = Math.round(topY - 18 * sc + bob);
          g.drawImage(es.img, es.sx, es.sy, es.sw, es.sh, ex, ey, 16 * sc, 16 * sc);
          topY = ey;
        }
      }
      if (v.speech && v.speech.until > nowMin && v.speech.text) {
        const left = v.speech.until - nowMin;
        const alpha = Math.min(1, left / 0.6);
        drawBubble(g, view, hx, topY - 2 * sc, v.speech.text, alpha);
      }
      if (renderer.hovered?.villager === v) {
        drawLabel(g, view, hx, topY - (v.speech && v.speech.until > nowMin ? 0 : 4 * sc), v.name, {});
        if (v.action?.label) drawLabel(g, view, hx, view.oy + (v.pos.y + 1) * TILE * sc + 3 * sc, v.action.label, { small: true, icon: actionIcon(v.action.tool), below: true });
      }
    }
    if (renderer.hovered && !renderer.hovered.villager) {
      const h = renderer.hovered;
      const sc = view.scale;
      if (h.object) drawLabel(g, view, view.ox + (h.object.pos.x + 0.5) * TILE * sc, view.oy + h.object.pos.y * TILE * sc - 2 * sc, objectLabel(h.object), { small: true });
      else if (h.place && hover) { const tt = screenToTile(hover.x, hover.y); drawLabel(g, view, view.ox + (Math.floor(tt.x) + 0.5) * TILE * sc, view.oy + Math.floor(tt.y) * TILE * sc - 2 * sc, h.place.name, { small: true }); }
    }
    drawVignette(g, view, lowQ ? 0 : 0.16 + amb.night * 0.14);
  }

  function screenToTile(px: number, py: number): Vec {
    const ts = TILE * view.scale;
    return { x: (px * dpr - view.ox) / ts, y: (py * dpr - view.oy) / ts };
  }
  function tileToScreen(pos: Vec): Vec {
    const ts = TILE * view.scale;
    return { x: (view.ox + pos.x * ts) / dpr, y: (view.oy + pos.y * ts) / dpr };
  }

  function pick(px: number, py: number, sim: SimView): { villager?: Villager; object?: WorldObject; place?: Place } | null {
    const dx = px * dpr, dy = py * dpr;
    const sc = view.scale;
    let best: Villager | undefined;
    let bestY = -Infinity;
    for (const v of sim.villagers) {
      if (v.inside) continue;
      const sx = view.ox + v.pos.x * TILE * sc, sy = view.oy + (v.pos.y + 1) * TILE * sc - FRAME_H * sc;
      if (dx >= sx && dx < sx + FRAME_W * sc && dy >= sy && dy < sy + FRAME_H * sc && v.pos.y > bestY) { best = v; bestY = v.pos.y; }
    }
    if (best) return { villager: best };
    const t = screenToTile(px, py);
    const tx = Math.floor(t.x), ty = Math.floor(t.y);
    let obj: WorldObject | undefined;
    for (const o of visibleObjects) {
      if (o.pos.x === tx && o.pos.y === ty) { obj = o; break; }
      if (o.pos.x === tx && o.pos.y === ty + 1 && TALL_KINDS.has(o.kind)) obj = obj ?? o;
    }
    if (obj) return { object: obj };
    const place = inBounds(world, tx, ty) ? world.placeAt({ x: tx, y: ty }) : undefined;
    return place ? { place } : null;
  }

  const renderer: RendererExt = {
    camera: cam,
    follow: 'player',
    highlight: null,
    hovered: null,
    quality: 'high',
    get time() { return view.t; },
    render,
    resize,
    screenToTile,
    tileToScreen,
    pick,
    setQuality: (q) => { renderer.quality = q; },
    invalidate: (x?: number, y?: number, w?: number, h?: number) => ground.invalidate(x, y, w, h),
    fx: { ambient: ambientFx, weather: weatherFx },
  };
  resize(cssW, cssH);
  return renderer;
}
