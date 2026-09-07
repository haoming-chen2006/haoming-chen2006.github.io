import { music } from './audio/music.ts';
import { sfx } from './audio/sfx.ts';
import { PRESET_DECKS, cardsFromIds } from './game/cards.ts';
import { idleCommand } from './game/hero.ts';
import { Simulation } from './game/sim.ts';
import { other } from './game/types.ts';
import { GameScreen, type MatchConfig } from './game_screen.ts';
import { GameView } from './render3d/scene.ts';
import { Menus, loadSettings, saveSettings, showLoading, type ScreenName } from './ui/menu.ts';
import { Multiplayer } from './ui/multiplayer.ts';
import { Tutorial } from './ui/tutorial.ts';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

const settings = loadSettings();
sfx.enabled = settings.sound;

const canvas = $('canvas') as HTMLCanvasElement;
const viewport = $('viewport');
showLoading(true, 'Raising the arena…');
// Let the loading splash paint before the (synchronous) scene construction.
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
  if (game.online) mp.matchEnded();
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
const tutorial = new Tutorial(() => { settings.tutorialDone = true; saveSettings(settings); });
game.tutorial = tutorial;
menus.onSettingsClosed = () => { applyAudioSettings(); game.onSettingsClosed(); };

/** A bot-vs-bot skirmish plays behind the menus. */
let demo: Simulation | null = null;
function newDemo(): void {
  const names = Object.keys(PRESET_DECKS);
  const a = names[Math.floor(Math.random() * names.length)], b = names[Math.floor(Math.random() * names.length)];
  demo = new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS[a]), botDeck: cardsFromIds(PRESET_DECKS[b]), difficulty: 'normal', seed: Date.now() % 100000, botVsBot: true });
  demo.skipCountdown();
  view.clear();
  // fast-forward a little so there is already action on screen
  for (let i = 0; i < 60 * 25; i++) demo.step(1 / 60, idleCommand());
  demo.w.events.length = 0;
}

function pickBotDeck(): string[] {
  const names = Object.keys(PRESET_DECKS);
  const mine = settings.deck.join();
  const options = names.filter((n) => PRESET_DECKS[n].join() !== mine);
  const name = options[Math.floor(Math.random() * options.length)] ?? names[0];
  return PRESET_DECKS[name];
}

function startBattle(): void {
  if (settings.deck.length !== 8) return;
  demo = null;
  view.clear();
  menus.show('game');
  applyAudioSettings();
  game.start({ deck: cardsFromIds(settings.deck), botDeck: cardsFromIds(pickBotDeck()), difficulty: settings.difficulty, tutorial: settings.showTutorial && !settings.tutorialDone });
}

/** An online duel: the multiplayer controller hands over a fully described match. */
function startOnline(cfg: MatchConfig): void {
  demo = null;
  view.clear();
  menus.show('game');
  applyAudioSettings();
  game.start(cfg);
}

function backToMenus(screen: ScreenName): void {
  game.stop();
  menus.show(screen);
  if (!demo) newDemo();
  music.setScene('menu');
  sfx.setAmbience('menu');
}

function quitToMenu(): void { backToMenus('menu'); }

const mp = new Multiplayer({
  settings,
  show: (s) => { if (s === 'deck') menus.deckReturnTo = 'online'; menus.show(s); },
  startMatch: startOnline,
  endMatch: () => { game.stop(); if (!demo) newDemo(); music.setScene('menu'); sfx.setAmbience('menu'); },
  toast: (t) => game.toast(t, 'warn'),
  playUi: () => sfx.play('ui'),
});
menus.onShow = (name) => { if (name === 'online') mp.refreshDeckInfo(); };
window.addEventListener('crownfall:opponent-gone', (e) => {
  if (game.online) game.forfeit(other(game.me), `Opponent ${(e as CustomEvent<string>).detail}`);
});

$('btnPlay').addEventListener('click', () => { sfx.init(); applyAudioSettings(); startBattle(); });
$('btnOnline').addEventListener('click', () => { sfx.init(); applyAudioSettings(); void mp.openHub(); });
$('btnResume').addEventListener('click', () => game.setPaused(false));
$('btnQuit').addEventListener('click', () => { if (game.online) { game.setPaused(false); game.concede(); } else quitToMenu(); });
$('btnAgain').addEventListener('click', () => { if (game.online) void mp.requestRematch(); else { game.stop(); startBattle(); } });
$('btnMenu').addEventListener('click', () => { if (game.online) { backToMenus('room'); mp.backToRoom(); } else quitToMenu(); });

let audioReady = false;
const wakeAudio = () => { sfx.init(); if (!audioReady && sfx.ctx) { audioReady = true; applyAudioSettings(); if (!game.active) { music.setScene('menu'); sfx.startAmbience('menu'); } } };
window.addEventListener('pointerdown', wakeAudio);
window.addEventListener('keydown', (e) => {
  wakeAudio();
  if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) {
    settings.sound = !settings.sound;
    saveSettings(settings);
    applyAudioSettings();
    menus.refreshMenu();
  }
});

menus.show('menu');
newDemo();
showLoading(false);

// Invite links: #/join/CODE opens the online hub and joins the room straight away.
function handleRoute(): void {
  const m = /^#\/join\/([A-Za-z0-9]{4,8})/.exec(location.hash);
  if (m) { sfx.init(); void mp.openHub(m[1].toUpperCase()); return; }
  if (/^#\/room\//.test(location.hash)) history.replaceState(null, '', `${location.pathname}${location.search}`);
}
handleRoute();
window.addEventListener('hashchange', () => { if (/^#\/join\//.test(location.hash) && !mp.active) handleRoute(); });

// Favicon: a small painted crown, so the tab has an identity without shipping an image.
(() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); if (!g) return;
  g.fillStyle = '#131a24'; g.beginPath(); g.roundRect(0, 0, 64, 64, 14); g.fill();
  g.fillStyle = '#ffd166'; g.beginPath(); g.moveTo(12, 46); g.lineTo(10, 22); g.lineTo(23, 32); g.lineTo(32, 14); g.lineTo(41, 32); g.lineTo(54, 22); g.lineTo(52, 46); g.closePath(); g.fill();
  g.fillStyle = '#c46a12'; g.fillRect(12, 44, 40, 6);
  const link = document.createElement('link'); link.rel = 'icon'; link.href = c.toDataURL('image/png'); document.head.appendChild(link);
})();

// Debug/test hook: lets scripted play-tests project world coordinates to the screen and read the match.
(window as unknown as { __cf: unknown }).__cf = {
  view, game, settings, sfx, music, mp,
  net: () => game.netDebug(),
  world: () => game.world,
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
  if (game.active) { game.frame(dt, Math.min(0.5, raw), mp.linkStatus()); return; }
  if (demo) {
    demo.advance(dt, idleCommand());
    demo.w.events.length = 0;
    if (demo.w.phase === 'ended') newDemo();
  }
  view.renderIdle(demo ? demo.w : null, dt, time);
}
requestAnimationFrame(loop);
