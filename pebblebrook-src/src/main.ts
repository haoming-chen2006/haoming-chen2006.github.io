/**
 * Boot: world → sim (brains) → director → art/renderer → player → ui → loop.
 * Each module is owned by an agent (specs/DESIGN.md); this file only wires them.
 */
import { createLocalBrain } from './agents/index.ts';
import { audio } from './audio/index.ts';
import { loadArt } from './art/index.ts';
import type { LlmSettings, Renderer, Sim, Ui } from './core/app.ts';
import { bus, hashString } from './core/index.ts';
import { createDirector } from './events/index.ts';
import { createLlmBrain, loadLlmSettings, saveLlmSettings } from './llm/index.ts';
import { createInput, createPlayer } from './player/index.ts';
import { createRenderer } from './render/index.ts';
import { createSim } from './sim/index.ts';
import { createUi } from './ui/index.ts';
import { generateWorld } from './world/index.ts';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const BASE = import.meta.env.BASE_URL;
const SAVE_KEY = 'pebblebrook.save.v1';

let llm: LlmSettings = loadLlmSettings();
const art = await loadArt(BASE);
const input = createInput(canvas);

let sim: Sim, renderer: Renderer, ui: Ui | null = null;
let director: ReturnType<typeof createDirector>;
let player: ReturnType<typeof createPlayer>;

function boot(seed: number, saved?: unknown): void {
  const world = generateWorld(seed, { bus });
  const local = createLocalBrain(seed);
  const llmBrain = createLlmBrain(() => llm, local);
  sim = createSim(world, seed, { local, llm: llmBrain });
  director = createDirector(sim, seed);
  if (saved && typeof saved === 'object') {
    const s = saved as { world?: unknown; sim?: unknown; director?: unknown };
    if (s.world) world.load(s.world);
    if (s.sim) sim.load(s.sim);
    if (s.director) director.load(s.director);
  }
  renderer = createRenderer(canvas, art, world);
  player = createPlayer(sim, world, () => ui);
  const fit = () => renderer.resize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', fit);
  fit();
  const ctx = {
    sim, world, director, renderer, player, audio, art, input,
    save: () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ seed, world: world.save(), sim: sim.save(), director: director.save() })); bus.emit({ type: 'save' }); } catch (e) { console.warn('save failed', e); } },
    load: () => { try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false; const data = JSON.parse(raw) as { seed: number }; boot(data.seed, data); bus.emit({ type: 'load' }); return true; } catch { return false; } },
    newGame: (s: number) => boot(s),
    setLlm: (cfg: LlmSettings) => { llm = cfg; saveLlmSettings(cfg); },
    getLlm: () => llm,
  };
  ui?.showTitle(false);
  ui = createUi(ctx);
}

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
boot(seedParam ? (Number(seedParam) || hashString(seedParam)) : 20260907);

// Debug/test hook for scripted play-tests.
(window as unknown as { __pb: unknown }).__pb = { get sim() { return sim; }, get renderer() { return renderer; }, get director() { return director; }, get ui() { return ui; }, get player() { return player; }, bus, art, audio };

let last = performance.now();
function loop(ts: number): void {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (ts - last) / 1000);
  last = ts;
  const world = sim.world;
  // 1 real second = 1 in-game minute at speed 1
  if (!world.paused && !(ui?.modal ?? false)) {
    const minutes = dt * world.speed;
    sim.update(minutes);
    director.update(minutes);
  }
  player.update(dt, input);
  // F: follow the nearest villager with the camera; F again (or moving) returns to the player.
  if (input.pressed('KeyF') && !(ui?.modal ?? false) && !input.typing) {
    if (renderer.follow && renderer.follow !== 'player') renderer.follow = 'player';
    else { const near = sim.villagersNear(sim.player.pos, 8).filter((v) => !v.inside).sort((a, b) => Math.hypot(a.pos.x - sim.player.pos.x, a.pos.y - sim.player.pos.y) - Math.hypot(b.pos.x - sim.player.pos.x, b.pos.y - sim.player.pos.y))[0]; if (near) { renderer.follow = near.id; ui?.toast(`Following ${near.name.split(' ')[0]} · F to stop`); } }
  }
  if (player.moving && renderer.follow !== 'player') renderer.follow = 'player';
  ui?.update(dt);
  renderer.render(sim, dt, { pos: sim.player.pos, facing: sim.player.facing, inside: sim.player.inside, moving: player.moving, look: player.look });
  audio.update(dt, sim.player.pos, world);
  input.endFrame();
}
requestAnimationFrame(loop);
