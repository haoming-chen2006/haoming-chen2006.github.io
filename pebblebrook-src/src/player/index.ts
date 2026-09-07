/**
 * The player: keyboard/mouse input, the avatar, and what `E` does to whatever is nearest —
 * villagers (dialogue), doors (enter/leave), plots (till/plant/water/harvest), trees, rocks,
 * fishing spots, forage, shop counters, the notice board, and the player's bed.
 */
import type { InputState, PlayerController, Sim, Ui } from '../core/app.ts';
import { CROP_BY_ID, CROP_BY_SEED, ITEM_BY_ID, PLACES, PLAYER_LOOK, bus, dist, type Place, type PlotState, type Vec, type Villager, type World, type WorldObject } from '../core/index.ts';

const SPEED = 4.2;          // tiles per second
const REACH = 1.35;         // tiles
const KEYS_MOVE: Record<string, Vec> = { KeyW: { x: 0, y: -1 }, ArrowUp: { x: 0, y: -1 }, KeyS: { x: 0, y: 1 }, ArrowDown: { x: 0, y: 1 }, KeyA: { x: -1, y: 0 }, ArrowLeft: { x: -1, y: 0 }, KeyD: { x: 1, y: 0 }, ArrowRight: { x: 1, y: 0 } };

export function createInput(canvas: HTMLCanvasElement): InputState {
  const down = new Set<string>(), pressed = new Set<string>();
  const st: InputState = {
    down: (c) => down.has(c), pressed: (c) => pressed.has(c), mouse: { x: 0, y: 0 }, mouseDown: false, clicked: false, rightClicked: false, wheel: 0,
    // Only a VISIBLE text field counts: a seed box left focused behind a closed title screen must not eat WASD.
    get typing() { const a = document.activeElement as HTMLElement | null; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable) && a.offsetParent !== null; },
    endFrame() { pressed.clear(); st.clicked = false; st.rightClicked = false; st.wheel = 0; },
  };
  window.addEventListener('keydown', (e) => {
    if (st.typing) return;
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => { down.clear(); st.mouseDown = false; });
  const update = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); st.mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointermove', update);
  canvas.addEventListener('pointerdown', (e) => { update(e); (document.activeElement as HTMLElement | null)?.blur?.(); if (e.button === 0) { st.mouseDown = true; st.clicked = true; } if (e.button === 2) st.rightClicked = true; });
  window.addEventListener('pointerup', (e) => { if (e.button === 0) st.mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { st.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  return st;
}

interface Target { kind: 'villager' | 'door' | 'leave' | 'plot' | 'tree' | 'rock' | 'fishspot' | 'forage' | 'board' | 'counter' | 'bed' | 'well' | 'animal' | 'shrine' | 'bench'; label: string; villager?: Villager; object?: WorldObject; place?: Place; pos: Vec }

export function createPlayer(sim: Sim, world: World, ui: () => Ui | null): PlayerController {
  const p = sim.player;
  let busy: { label: string; t: number; dur: number; done: () => void } | null = null;
  let moving = false;
  let lastTarget: Target | null = null;
  let stepT = 0;

  const facingDir = (d: Vec) => { if (Math.abs(d.x) > Math.abs(d.y)) return d.x > 0 ? 'right' : 'left'; return d.y > 0 ? 'down' : 'up'; };
  const tileOf = (v: Vec) => ({ x: Math.floor(v.x), y: Math.floor(v.y) });
  const held = () => p.inventory[p.hotbar]?.id;
  const holds = (id: string) => p.inventory.some((s) => s.id === id && s.qty > 0);
  const toast = (t: string, kind: 'info' | 'warn' | 'good' = 'info') => ui()?.toast(t, kind);

  /** What is closest in reach, with the label E would show. */
  function findTarget(): Target | null {
    if (p.inside) {
      const place = world.place(p.inside);
      const opts: Target[] = [];
      // at home in the evening (or worn out) the bed comes first; otherwise the door does
      const h = world.time.hour;
      if (place?.id === PLACES.home_player && (h >= 17 || h < 5 || p.energy < 40)) opts.push({ kind: 'bed', label: 'Sleep until morning', place, pos: p.pos });
      if (place?.door) opts.push({ kind: 'leave', label: `Leave ${place.name}`, place, pos: place.door });
      if (place && (place.kind === 'shop' || place.facilities.includes('counter')) && place.id !== PLACES.home_player) opts.push({ kind: 'counter', label: `Browse ${place.name}`, place, pos: p.pos });
      if (place?.id === PLACES.home_player && !opts.some((o) => o.kind === 'bed')) opts.push({ kind: 'bed', label: 'Sleep until morning', place, pos: p.pos });
      for (const v of sim.villagers) if (v.inside === p.inside) opts.push({ kind: 'villager', label: `Talk to ${v.name.split(' ')[0]}`, villager: v, pos: v.pos });
      return opts[0] ?? null;
    }
    let best: Target | null = null, bd = Infinity;
    const consider = (t: Target, d: number, bias = 0) => { if (d - bias < bd) { bd = d - bias; best = t; } };
    for (const v of sim.villagers) {
      if (v.inside) continue;
      const d = dist(v.pos, p.pos);
      if (d <= REACH + 0.4) consider({ kind: 'villager', label: `Talk to ${v.name.split(' ')[0]}`, villager: v, pos: v.pos }, d, 0.3);
    }
    // the tile in front of the player, then the surrounding ring
    const front = { x: p.pos.x + (p.facing === 'right' ? 1 : p.facing === 'left' ? -1 : 0) * 0.8, y: p.pos.y + (p.facing === 'down' ? 1 : p.facing === 'up' ? -1 : 0) * 0.8 };
    for (const o of world.objectsNear(p.pos, REACH + 0.6)) {
      const d = dist(o.pos, front) * 0.6 + dist(o.pos, p.pos) * 0.4;
      if (d > REACH + 0.5) continue;
      const t = objectTarget(o);
      if (t) consider(t, d);
    }
    // the travelling merchant's stall on the square, while that event is running
    if (sim.events.some((e) => e.id === 'merchant')) {
      const sq = world.place(PLACES.square);
      if (sq && dist(sq.anchor, p.pos) <= 3.5) consider({ kind: 'counter', label: 'Browse the merchant\'s stall', place: sq, pos: sq.anchor }, dist(sq.anchor, p.pos), 0.5);
    }
    // doors: any building door within reach
    for (const place of world.places) {
      if (!place.door) continue;
      const d = dist(place.door, p.pos);
      if (d <= REACH) consider({ kind: 'door', label: `Enter ${place.name}`, place, pos: place.door }, d, 0.2);
    }
    return best;
  }

  function objectTarget(o: WorldObject): Target | null {
    switch (o.kind) {
      case 'plot': {
        const st = world.plot(o.id);
        if (!st) return null;
        const owner = st.owner;
        if (owner && owner !== 'player') return { kind: 'plot', label: `${ownerName(owner)}'s crop`, object: o, pos: o.pos };
        const h = held();
        if (st.state === 'empty') return holds('hoe') ? { kind: 'plot', label: 'Till the soil', object: o, pos: o.pos } : { kind: 'plot', label: 'Needs a hoe', object: o, pos: o.pos };
        if (st.state === 'tilled') { const crop = h ? CROP_BY_SEED[h] : undefined; return crop ? { kind: 'plot', label: `Plant ${crop.name}`, object: o, pos: o.pos } : { kind: 'plot', label: 'Select seeds to plant', object: o, pos: o.pos }; }
        if (st.growth >= 1) return { kind: 'plot', label: `Harvest ${CROP_BY_ID[st.crop ?? '']?.name ?? 'crop'}`, object: o, pos: o.pos };
        if (!st.watered) return holds('watering_can') ? { kind: 'plot', label: 'Water', object: o, pos: o.pos } : { kind: 'plot', label: 'Needs water (watering can)', object: o, pos: o.pos };
        return { kind: 'plot', label: `${CROP_BY_ID[st.crop ?? '']?.name ?? 'Crop'} growing (${Math.round(st.growth * 100)}%)`, object: o, pos: o.pos };
      }
      case 'tree': return { kind: 'tree', label: holds('axe') ? 'Chop wood' : 'Shake the tree', object: o, pos: o.pos };
      case 'rock': return holds('pickaxe') ? { kind: 'rock', label: `Mine ${ITEM_BY_ID[String(o.data.ore ?? 'stone')]?.name ?? 'rock'}`, object: o, pos: o.pos } : { kind: 'rock', label: 'Needs a pickaxe', object: o, pos: o.pos };
      case 'fishspot': return holds('fishing_rod') ? { kind: 'fishspot', label: 'Fish', object: o, pos: o.pos } : { kind: 'fishspot', label: 'Fish (needs a rod)', object: o, pos: o.pos };
      case 'forage': { const qty = Number(o.data.qty ?? 0); if (qty <= 0) return null; return { kind: 'forage', label: `Gather ${ITEM_BY_ID[String(o.data.item)]?.name ?? 'forage'}`, object: o, pos: o.pos }; }
      case 'board': return { kind: 'board', label: 'Read the notice board', object: o, pos: o.pos };
      case 'counter': { const place = o.place ? world.place(o.place) : undefined; return place ? { kind: 'counter', label: `Browse ${place.name}`, object: o, place, pos: o.pos } : null; }
      case 'well': return { kind: 'well', label: 'Draw water', object: o, pos: o.pos };
      case 'animal': return { kind: 'animal', label: `Pet ${String(o.data.name ?? o.data.species ?? 'animal')}`, object: o, pos: o.pos };
      case 'shrine': return { kind: 'shrine', label: 'Leave an offering', object: o, pos: o.pos };
      case 'bench': return { kind: 'bench', label: 'Sit for a while', object: o, pos: o.pos };
      default: return null;
    }
  }

  const ownerName = (id: string) => sim.villager(id)?.name.split(' ')[0] ?? id;

  function act(t: Target): void {
    const u = ui();
    switch (t.kind) {
      case 'villager': if (t.villager) { p.facing = facingDir({ x: t.villager.pos.x - p.pos.x, y: t.villager.pos.y - p.pos.y }); u?.openDialogue(t.villager); bus.emit({ type: 'player', what: 'talk', detail: t.villager.id }); } break;
      case 'door': if (t.place && sim.playerEnter(t.place.id)) { bus.emit({ type: 'player', what: 'enter', detail: t.place.id }); bus.emit({ type: 'sfx', name: 'door' }); if (t.place.kind === 'shop' && t.place.id !== PLACES.home_player) u?.openShop(t.place); } else toast(t.place ? `${t.place.name} is closed` : 'Closed', 'warn'); break;
      case 'leave': sim.playerLeave(); bus.emit({ type: 'player', what: 'leave' }); bus.emit({ type: 'sfx', name: 'door' }); break;
      case 'counter': if (t.place) u?.openShop(t.place); break;
      case 'board': u?.openBoard(); break;
      case 'bed': sleep(); break;
      case 'plot': plotAction(t.object!); break;
      case 'tree': timed(holds('axe') ? 'Chopping' : 'Shaking', holds('axe') ? 1.6 : 0.8, () => {
        const o = t.object!; const wood = Number(o.data.wood ?? 0);
        if (holds('axe') && wood > 0) { o.data.wood = wood - 1; sim.give(p, { id: 'wood', qty: 2 }); toast('+2 Wood', 'good'); bus.emit({ type: 'sfx', name: 'chop', pos: o.pos }); p.skills.crafting += 0.05; }
        else if (sim.rng.chance(0.35)) { const item = world.season === 'autumn' ? 'apple' : 'berries'; sim.give(p, { id: item, qty: 1 }); toast(`A ${ITEM_BY_ID[item].name.toLowerCase()} fell out`, 'good'); }
        else toast('Nothing but leaves.');
      }); break;
      case 'rock': timed('Mining', 1.8, () => {
        const o = t.object!; const hits = Number(o.data.hits ?? 3) - 1; o.data.hits = hits;
        bus.emit({ type: 'sfx', name: 'mine', pos: o.pos });
        if (hits <= 0) { const ore = String(o.data.ore ?? 'stone'); const qty = ore === 'stone' ? 2 : 1; sim.give(p, { id: ore, qty }); o.data.hits = 3; o.data.depleted = true; toast(`+${qty} ${ITEM_BY_ID[ore]?.name ?? ore}`, 'good'); p.skills.mining += 0.1; if (ore !== 'stone' && sim.rng.chance(0.08 + p.skills.mining * 0.01)) { sim.give(p, { id: 'gem', qty: 1 }); toast('A gemstone!', 'good'); } }
        else toast(`Crack… (${hits} more)`);
        bus.emit({ type: 'player', what: 'mine' });
      }); break;
      case 'fishspot': timed('Fishing', 2.4 + sim.rng.range(0, 2.5), () => {
        const o = t.object!;
        const table = Array.isArray(o.data.table) && o.data.table.length ? (o.data.table as string[]) : ['perch', 'trout', 'carp'];
        const luck = 0.45 + p.skills.fishing * 0.04 + (world.weather.kind === 'rain' ? 0.15 : 0);
        if (sim.rng.chance(luck)) { const fish = sim.rng.pick(table); sim.give(p, { id: fish, qty: 1 }); toast(`Caught a ${ITEM_BY_ID[fish]?.name ?? fish}!`, 'good'); p.skills.fishing += 0.12; bus.emit({ type: 'sfx', name: 'splash', pos: o.pos }); }
        else toast('It got away.');
        bus.emit({ type: 'player', what: 'fish' });
      }); break;
      case 'forage': { const o = t.object!; const qty = Number(o.data.qty ?? 0); const item = String(o.data.item); if (qty > 0) { sim.give(p, { id: item, qty }); o.data.qty = 0; toast(`+${qty} ${ITEM_BY_ID[item]?.name ?? item}`, 'good'); bus.emit({ type: 'sfx', name: 'pickup', pos: o.pos }); } break; }
      case 'well': { p.energy = Math.min(100, p.energy + 5); toast('Cool water. Refreshing.'); bus.emit({ type: 'sfx', name: 'splash' }); break; }
      case 'animal': { toast(`${String(t.object!.data.name ?? 'It')} nuzzles your hand.`, 'good'); bus.emit({ type: 'sfx', name: 'animal' }); break; }
      case 'shrine': { const h = held(); if (h && sim.take(p, { id: h, qty: 1 })) { toast(`You leave ${ITEM_BY_ID[h]?.name ?? h} at the shrine.`, 'good'); p.energy = Math.min(100, p.energy + 10); } else toast('Hold an item to offer it.'); break; }
      case 'bench': timed('Resting', 2, () => { p.energy = Math.min(100, p.energy + 12); toast('You rest a moment.'); }); break;
    }
  }

  function plotAction(o: WorldObject): void {
    const st = world.plot(o.id);
    if (!st) return;
    if (st.owner && st.owner !== 'player') { toast(`That is ${ownerName(st.owner)}'s crop.`, 'warn'); return; }
    const set = (next: Partial<PlotState>) => world.setPlot(o.id, { ...st, ...next, owner: 'player' });
    if (st.state === 'empty') {
      if (!holds('hoe')) { toast('You need a hoe. Hal sells them.', 'warn'); return; }
      timed('Tilling', 0.9, () => { set({ state: 'tilled', watered: false, growth: 0, stage: 0, daysSincePlant: 0, crop: undefined }); bus.emit({ type: 'sfx', name: 'hoe', pos: o.pos }); p.energy -= 2; });
      return;
    }
    if (st.state === 'tilled') {
      const h = held(); const crop = h ? CROP_BY_SEED[h] : undefined;
      if (!crop) { toast('Select seeds on the hotbar (1–9) to plant.', 'warn'); return; }
      if (!crop.seasons.includes(world.season)) { toast(`${crop.name} will not grow in ${world.season}.`, 'warn'); return; }
      if (!sim.take(p, { id: h!, qty: 1 })) return;
      set({ state: 'planted', crop: crop.id, growth: 0, stage: 0, daysSincePlant: 0 });
      bus.emit({ type: 'sfx', name: 'plant', pos: o.pos });
      toast(`Planted ${crop.name}.`, 'good');
      p.skills.farming += 0.05;
      return;
    }
    if (st.growth >= 1 && st.crop) {
      const crop = CROP_BY_ID[st.crop];
      const qty = crop.yieldQty + (sim.rng.chance(p.skills.farming * 0.05) ? 1 : 0);
      sim.give(p, { id: crop.id, qty });
      if (crop.regrowDays) set({ growth: 0, stage: Math.max(0, crop.stages - 2), watered: false, daysSincePlant: 0 });
      else set({ state: 'empty', crop: undefined, growth: 0, stage: 0, watered: false, daysSincePlant: 0 });
      toast(`+${qty} ${crop.name}`, 'good');
      bus.emit({ type: 'sfx', name: 'harvest', pos: o.pos });
      bus.emit({ type: 'player', what: 'harvest', detail: crop.id });
      p.skills.farming += 0.15;
      return;
    }
    if (!st.watered) {
      if (!holds('watering_can')) { toast('You need a watering can.', 'warn'); return; }
      timed('Watering', 0.7, () => { set({ watered: true }); bus.emit({ type: 'sfx', name: 'water', pos: o.pos }); p.energy -= 1; });
      return;
    }
    toast(`${CROP_BY_ID[st.crop ?? '']?.name ?? 'Crop'} is ${Math.round(st.growth * 100)}% grown.`);
  }

  function timed(label: string, dur: number, done: () => void): void {
    if (p.energy <= 3) { toast('You are exhausted. Sleep or rest first.', 'warn'); return; }
    busy = { label, t: 0, dur, done };
  }

  function sleep(): void {
    const t = world.time;
    const untilMorning = t.hour >= 6 ? (24 - t.hour) * 60 - t.min + 6 * 60 : (6 - t.hour) * 60 - t.min;
    const total = Math.max(30, Math.min(14 * 60, untilMorning));
    busy = { label: 'Sleeping', t: 0, dur: 1.6, done: () => {
      for (let m = 0; m < total; m += 15) { sim.update(Math.min(15, total - m)); }
      p.energy = 100;
      toast('A new day in Pebblebrook.', 'good');
      bus.emit({ type: 'player', what: 'sleep' });
      ui()?.toast('You wake up rested.', 'good');
    } };
  }

  const ctrl: PlayerController = {
    moving: false,
    look: PLAYER_LOOK,
    prompt() { return busy ? `${busy.label}…` : (lastTarget?.label ?? null); },
    update(dt, input) {
      const u = ui();
      moving = false;
      if (busy) {
        busy.t += dt;
        if (busy.t >= busy.dur) { const b = busy; busy = null; b.done(); }
        ctrl.moving = false;
        return;
      }
      if (u?.modal) { ctrl.moving = false; lastTarget = findTarget(); return; }
      // movement
      let dx = 0, dy = 0;
      for (const [code, d] of Object.entries(KEYS_MOVE)) if (input.down(code)) { dx += d.x; dy += d.y; }
      if (!p.inside && (dx || dy)) {
        const l = Math.hypot(dx, dy); dx /= l; dy /= l;
        const sp = SPEED * (input.down('ShiftLeft') || input.down('ShiftRight') ? 1.5 : 1) * dt;
        const nx = p.pos.x + dx * sp, ny = p.pos.y + dy * sp;
        if (canStand(nx, p.pos.y)) p.pos.x = nx;
        if (canStand(p.pos.x, ny)) p.pos.y = ny;
        p.facing = facingDir({ x: dx, y: dy });
        moving = true;
        stepT += dt; if (stepT > 0.32) { stepT = 0; bus.emit({ type: 'sfx', name: 'step', pos: p.pos }); }
        p.energy = Math.max(0, p.energy - dt * 0.15);
      }
      ctrl.moving = moving;
      // hotbar
      for (let i = 1; i <= 9; i++) if (input.pressed(`Digit${i}`)) p.hotbar = i - 1;
      if (input.wheel) p.hotbar = ((p.hotbar + input.wheel) % 9 + 9) % 9;
      // interact
      lastTarget = findTarget();
      if (input.pressed('KeyE') && lastTarget) act(lastTarget);
    },
  };

  /** Positions are tile indices (an integer position is the tile's top-left, like villagers), so the body sits at +0.5. */
  function canStand(x: number, y: number): boolean {
    const r = 0.3, cx = x + 0.5, cy = y + 0.5;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as [number, number][]) {
      const t = tileOf({ x: cx + ox, y: cy + oy });
      if (!world.walkable(t.x, t.y)) return false;
      for (const v of sim.villagers) { if (!v.inside && Math.abs(v.pos.x - x) < 0.45 && Math.abs(v.pos.y - y) < 0.45) return false; }
    }
    return true;
  }

  return ctrl;
}
