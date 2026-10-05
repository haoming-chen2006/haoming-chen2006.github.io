import { music } from './audio/music.ts';
import { sfx } from './audio/sfx.ts';
import { Simulation, type SeatSetup } from './game/sim.ts';
import { other } from './game/types.ts';
import { GameScreen, type MatchConfig } from './game_screen.ts';
import { applyStaticDom, t } from './i18n.ts';
import { GameView } from './render3d/scene.ts';
import { hashWorld } from './game/hash.ts';
import { Menus, loadSettings, saveSettings, showLoading, type ScreenName } from './ui/menu.ts';
import { Online } from './ui/online.ts';

const $ = (id: string): HTMLElement => { const el = document.getElementById(id); if (!el) throw new Error(`missing #${id}`); return el; };

const settings = loadSettings();
sfx.enabled = settings.sound;
applyStaticDom();

const canvas = $('canvas') as HTMLCanvasElement;
const viewport = $('viewport');
showLoading(true, t('loading.raising'));
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
const view = new GameView(canvas, $('overlay') as HTMLCanvasElement);
const fit = () => view.resize(viewport.clientWidth, viewport.clientHeight);
new ResizeObserver(fit).observe(viewport);
window.addEventListener('resize', fit);
fit();

const game = new GameScreen(view, canvas);
game.preferFirst = settings.firstPerson;
game.onViewToggle = (first) => { settings.firstPerson = first; saveSettings(settings); };
game.onAutoQuality = (q) => { settings.quality = q; saveSettings(settings); menus.refreshMenu(); };
game.onEnd = (winner, me) => {
  if (winner === me) settings.record.wins++; else if (winner === other(me)) settings.record.losses++; else settings.record.draws++;
  saveSettings(settings);
  if (game.online) online.matchEnded();
};

const applyAudioSettings = () => {
  sfx.volume = settings.sfxVolume;
  sfx.setEnabled(settings.sound && settings.sfxVolume > 0);
  if (settings.music && settings.musicVolume > 0 && sfx.ctx) { music.attach(sfx.ctx, sfx.master!); music.setVolume(settings.musicVolume); music.start(); } else music.stop();
  if (view.quality !== settings.quality) view.setQuality(settings.quality);
  view.rig.sensitivity = 0.0022 * settings.sensitivity;
  view.rig.invertY = settings.invertY;
  view.rig.fpsFov = settings.fov;
  game.preferFirst = settings.firstPerson;
};
view.setQuality(settings.quality);
const menus = new Menus(settings, applyAudioSettings);
menus.onSettingsClosed = () => { applyAudioSettings(); game.onSettingsClosed(); };

/** A bot-vs-bot skirmish plays behind the menus. */
let demo: Simulation | null = null;
function newDemo(): void {
  demo = new Simulation({ mode: '5v5', difficulty: 'normal', seed: Date.now() % 100000, teams: [[], []], botVsBot: true });
  demo.skipCountdown();
  view.clear();
  const empty = new Map();
  for (let i = 0; i < 60 * 40; i++) demo.step(1 / 60, empty);
  demo.w.events.length = 0;
}

function startBattle(): void {
  demo = null;
  view.clear();
  menus.show('game');
  applyAudioSettings();
  const mine: SeatSetup[] = [{ heroId: settings.hero, isBot: false, name: settings.name || t('common.you') }];
  const cfg: MatchConfig = { mode: settings.mode, difficulty: settings.difficulty, teams: [mine, []] };
  game.start(cfg);
}

function backToMenus(screen: ScreenName): void {
  game.stop();
  menus.show(screen);
  if (!demo) newDemo();
  music.setScene('menu');
  sfx.setAmbience('menu');
}
const quitToMenu = (): void => backToMenus('menu');

/** Online: the lobby controller hands over a fully described match. */
function startOnline(cfg: MatchConfig): void {
  demo = null;
  view.clear();
  menus.show('game');
  applyAudioSettings();
  game.start(cfg);
}
const online = new Online({
  settings,
  show: (s) => menus.show(s),
  startMatch: startOnline,
  endMatch: () => { game.stop(); if (!demo) newDemo(); music.setScene('menu'); sfx.setAmbience('menu'); },
  toast: (t2) => game.toast(t2, 'warn'),
  playUi: () => sfx.play('ui'),
  simulation: () => game.simulation,
});
menus.onStart = () => { sfx.init(); applyAudioSettings(); startBattle(); };
$('btnOnline').addEventListener('click', () => { sfx.init(); applyAudioSettings(); void online.openHub(); });
$('btnResume').addEventListener('click', () => game.setPaused(false));
$('btnQuit').addEventListener('click', () => { game.setPaused(false); game.surrender(); if (game.online) { setTimeout(() => { game.stop(); online.backToRoom(); if (!demo) newDemo(); music.setScene('menu'); sfx.setAmbience('menu'); }, 2600); } });
$('btnAgain').addEventListener('click', () => { if (game.online) { game.stop(); online.backToRoom(); if (!demo) newDemo(); } else { game.stop(); startBattle(); } });
$('btnMenu').addEventListener('click', () => { if (game.online) { game.stop(); online.backToRoom(); if (!demo) newDemo(); music.setScene('menu'); sfx.setAmbience('menu'); } else quitToMenu(); });

// Invite links: #/join/CODE opens the online hub and joins the room straight away.
function handleRoute(): void {
  const m = /^#\/join\/([A-Za-z0-9]{4,8})/.exec(location.hash);
  if (m) { sfx.init(); void online.openHub(m[1].toUpperCase()); history.replaceState(null, '', `${location.pathname}${location.search}`); }
}
window.addEventListener('hashchange', () => { if (/^#\/join\//.test(location.hash) && !online.active) handleRoute(); });

let audioReady = false;
const wakeAudio = () => { sfx.init(); if (!audioReady && sfx.ctx) { audioReady = true; applyAudioSettings(); if (!game.active) { music.setScene('menu'); sfx.startAmbience('menu'); } } };
window.addEventListener('pointerdown', wakeAudio);
window.addEventListener('keydown', wakeAudio);

menus.show('menu');
newDemo();
showLoading(false);
handleRoute();

// Favicon: a small painted crown.
(() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); if (!g) return;
  g.fillStyle = '#131a24'; g.beginPath(); g.roundRect(0, 0, 64, 64, 14); g.fill();
  g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(12, 46); g.lineTo(10, 22); g.lineTo(23, 32); g.lineTo(32, 14); g.lineTo(41, 32); g.lineTo(54, 22); g.lineTo(52, 46); g.closePath(); g.fill();
  g.fillStyle = '#c46a12'; g.fillRect(12, 44, 40, 6);
  const link = document.createElement('link'); link.rel = 'icon'; link.href = c.toDataURL('image/png'); document.head.appendChild(link);
})();

// Debug/test hook for scripted play-tests.
(window as unknown as { __kr: unknown }).__kr = {
  view, game, settings, sfx, music, menus, online,
  world: () => game.world,
  hero: () => game.hero(),
  hash: () => (game.world ? hashWorld(game.world) : 0),
  net: () => online.stats,
  start: startBattle,
  toScreen(x: number, z: number, y = 0.05): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    const p = view.rig.project(x, y, z, r.width, r.height);
    return { x: r.left + p.x, y: r.top + p.y };
  },
};

let last = performance.now();
let time = 0;
function loop(ts: number): void {
  requestAnimationFrame(loop);
  const raw = (ts - last) / 1000;
  const dt = Math.min(0.1, raw);
  last = ts;
  time += dt;
  if (game.active) { game.frame(dt, Math.min(0.5, raw)); return; }
  if (demo) {
    demo.advance(dt, new Map());
    demo.w.events.length = 0;
    if (demo.w.phase === 'ended') newDemo();
  }
  view.renderIdle(demo ? demo.w : null, dt, time);
}
requestAnimationFrame(loop);
