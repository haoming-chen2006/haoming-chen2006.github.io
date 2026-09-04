// UI entry point: createUI(ctx) per ARCHITECTURE.md. Owns the DOM overlay, screen routing, hotkeys, input capture.
import { bus } from '../core/events.ts';
import type { Vec3 } from '../core/math.ts';
import type { DialogueNode, DialogueChoice, QuestStep } from '../sim/types.ts';
import type { RollResult } from '../core/events.ts';
import { h, tooltip, hoverSounds, hideTip, sfx } from './dom.ts';
import { createHUD } from './hud.ts';
import { createDialogue } from './dialogue.ts';
import { createDice } from './dice.ts';
import { createTutorial } from './tutorial.ts';
import { createMainMenu, createClassSelect, createPause, createDeath, createCredits } from './menus.ts';
import { createSettings, loadSettings, applySettings } from './settings.ts';
import { createInventory } from './inventory.ts';
import { createSheet } from './sheet.ts';
import { createJournal } from './journal.ts';
import { createMap } from './map.ts';
import { createLevelUp } from './levelup.ts';
import { createEnding } from './ending.ts';
import { loadContent, questText } from './content.ts';
import { setAnnouncedLevel } from './levelup.ts';
import type { UIContext, UI, ScreenName, Screen } from './types.ts';
import type { Nav } from './tabs.ts';

export type { UIContext, UI, ScreenName } from './types.ts';
export { setContent } from './content.ts';
export { INFO_CARDS } from './tutorial.ts';

export interface UIOptions {
  /** Let the UI handle Esc / I / C / J / M itself (default true). Set false if game.ts routes those keys to showScreen. */
  hotkeys?: boolean;
  /** Root element to mount into (default #ui, created if missing). */
  root?: HTMLElement;
  /** Skip the dialogue typewriter (tests / accessibility). */
  instantText?: boolean;
}

const HUD_HIDDEN: ScreenName[] = ['menu', 'classSelect', 'death', 'ending', 'credits'];
const NO_PAUSE: ScreenName[] = ['menu', 'classSelect', 'death', 'ending', 'credits'];

export function createUI(ctx: UIContext, opts: UIOptions = {}): UI {
  const root = opts.root ?? (document.getElementById('ui') as HTMLElement | null) ?? (() => { const r = h('div#ui'); document.body.appendChild(r); return r; })();
  // Death and ending sit above the game's fade-to-black element (game.ts, z-index 90): the prologue fades out
  // right after `death` and before `prologueComplete`, so inside #ui (z-index 10) those screens would be invisible.
  const topRoot = (document.getElementById('ui-top') as HTMLElement | null) ?? (() => { const r = h('div#ui-top'); (root.parentElement ?? document.body).appendChild(r); return r; })();
  const ABOVE_FADE: ScreenName[] = ['death', 'ending'];
  const hotkeys = opts.hotkeys !== false;
  const cam = () => ctx.game.cam.camera;
  // backdrop blur is a full-frame readback: only on the higher tiers
  const q = ctx.game.quality; root.classList.toggle('noblur', q === 'low' || q === 'medium'); topRoot.classList.toggle('noblur', q === 'low' || q === 'medium');

  // ---- world → screen projection (no three.js import needed: read the camera matrices directly) ----
  function worldToScreen(pos: Vec3) {
    const c = cam(); const e = c.matrixWorldInverse.elements, p = c.projectionMatrix.elements;
    const vx = e[0] * pos.x + e[4] * pos.y + e[8] * pos.z + e[12], vy = e[1] * pos.x + e[5] * pos.y + e[9] * pos.z + e[13];
    const vz = e[2] * pos.x + e[6] * pos.y + e[10] * pos.z + e[14], vw = e[3] * pos.x + e[7] * pos.y + e[11] * pos.z + e[15];
    const cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12] * vw, cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13] * vw;
    const cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15] * vw;
    if (cw <= 1e-6) return { x: -9999, y: -9999, visible: false };
    const nx = cx / cw, ny = cy / cw;
    const x = (nx + 1) / 2 * innerWidth, y = (1 - ny) / 2 * innerHeight;
    return { x, y, visible: nx > -1.2 && nx < 1.2 && ny > -1.2 && ny < 1.2 };
  }

  const hud = createHUD(ctx, worldToScreen, { hold: () => dice.isOpen() });
  const tutorial = createTutorial(hud.tutorialStack, (s) => questText(ctx.world, s));
  const dialogue = createDialogue(ctx, (open) => { hud.el.classList.toggle('dialogue', open); syncCapture(); if (open) { try { ctx.game.input.releaseLock(); } catch {} } else maybeRelock(); }, { instant: !!opts.instantText });
  const dice = createDice({ env: !(q === 'low' || q === 'medium') });
  root.append(hud.el, dialogue.el, dice.el);
  tooltip(root); hoverSounds(root); hoverSounds(topRoot);
  // HUD scale: 1× at 720p–900p, up to 1.35× on tall displays (floating text compensates)
  function applyZoom() { const z = Math.min(1.35, Math.max(1, innerHeight / 900)); root.style.setProperty('--hud-zoom', z.toFixed(3)); hud.setZoom(z); }
  applyZoom(); addEventListener('resize', applyZoom);
  let warmed = false;
  function warm() { if (warmed) return; warmed = true; dice.warm(); }
  setTimeout(() => { try { (window as any).requestIdleCallback ? (window as any).requestIdleCallback(warm, { timeout: 4000 }) : warm(); } catch { warm(); } }, 2500);

  // ---- screens ----
  let current: ScreenName = null; let stack: ScreenName[] = []; let pendingLevelUp = false;
  const nav: Nav = {
    show: (name) => showScreen(name),
    back: () => { const prev = stack.pop() ?? null; showScreen(prev, true); },
    close: () => showScreen(null),
  };
  const screens: Partial<Record<Exclude<ScreenName, null>, Screen>> = {};
  const factories: Record<Exclude<ScreenName, null>, (c: UIContext, n: Nav) => Screen> = {
    menu: createMainMenu, classSelect: createClassSelect, pause: createPause, inventory: createInventory, character: createSheet, journal: createJournal, map: createMap,
    levelUp: createLevelUp, settings: createSettings, ending: createEnding, death: createDeath, credits: createCredits,
  };
  function screen(name: Exclude<ScreenName, null>): Screen {
    let s = screens[name]; if (!s) { s = factories[name](ctx, nav); screens[name] = s; (ABOVE_FADE.includes(name) ? topRoot : root).appendChild(s.el); }
    return s;
  }
  const gameStarted = () => { const st = (ctx.game as any).state; return st === undefined ? true : st === 'playing'; };

  function showScreen(name: ScreenName, fromBack = false) {
    if (name === current) return;
    if (current) { screen(current).close(); hideTip(); }
    // settings / credits remember where they came from
    if (!fromBack && (name === 'settings' || name === 'credits') && current) stack.push(current); else if (!name || (name !== 'settings' && name !== 'credits')) stack = [];
    current = name;
    if (name) { screen(name).open(); if (name !== 'menu' && name !== 'classSelect') sfx('open'); }
    else sfx('close');
    const hudHidden = !!name && HUD_HIDDEN.includes(name);
    hud.setVisible(!hudHidden); hud.setDimmed(!!name && !hudHidden);
    try { ctx.game.pause(!!name && !NO_PAUSE.includes(name)); } catch {}
    syncCapture();
    if (name) { try { ctx.game.input.releaseLock(); } catch {} } else maybeRelock();
    bus.emit('ui', { screen: name });
  }
  function syncCapture() { try { ctx.game.input.uiCapture = current !== null || dialogue.isOpen() || dice.isOpen(); } catch {} }
  function maybeRelock() { if (current === null && !dialogue.isOpen() && !dice.isOpen() && gameStarted()) { try { ctx.game.input.requestLock(); } catch {} } }
  function isBlocking() { return current !== null || dialogue.isOpen() || dice.isOpen(); }

  // ---- keys ----
  window.addEventListener('keydown', (e) => {
    const code = e.code;
    const typing = (document.activeElement as HTMLElement | null)?.tagName === 'INPUT';
    if (dice.isOpen()) { if (dice.key(code)) e.preventDefault(); return; }
    if (dialogue.isOpen() && !current) { if (dialogue.key(code)) e.preventDefault(); return; }
    if (current) {
      const s = screen(current); const consumed = s.key?.(code, e) ?? false;
      if (!consumed && code === 'Escape' && !typing) { if (stack.length) nav.back(); else if (current !== 'menu' && current !== 'death' && current !== 'ending' && current !== 'levelUp') nav.close(); }
      if (consumed || code === 'Escape' || code === 'Tab') e.preventDefault();
      return;
    }
    if (!hotkeys || typing) return;
    if (code === 'Escape') { if (gameStarted()) showScreen('pause'); e.preventDefault(); return; }
    if (!gameStarted()) return;
    const map: Record<string, ScreenName> = { KeyI: 'inventory', KeyC: 'character', KeyJ: 'journal', KeyM: 'map' };
    if (map[code]) { showScreen(map[code]); e.preventDefault(); }
  }, true);

  // ---- events that open screens ----
  const isPlayer = (id: string) => id === ctx.world.playerId;
  bus.on('levelUp', (e) => { if (!isPlayer(e.actorId)) return; setAnnouncedLevel(e.level); pendingLevelUp = true; setTimeout(tryLevelUp, 1400); });
  function tryLevelUp() {
    if (!pendingLevelUp) return;
    if (dialogue.isOpen() || dice.isOpen() || current) { setTimeout(tryLevelUp, 800); return; }
    pendingLevelUp = false;
    // nothing to choose (a dev skip fast-forwarded the choice): no phantom screen
    if ((ctx.world.player?.pendingLevelUps ?? 1) === 0) return;
    showScreen('levelUp');
  }
  bus.on('death', (e) => { if (isPlayer(e.actorId)) setTimeout(() => { const p = ctx.world.player; if (p?.dead) showScreen('death'); }, 2600); });
  bus.on('gameOver', (e) => { if (!e.victory) setTimeout(() => showScreen('death'), 1200); });
  bus.on('respawn', () => { if (current === 'death') showScreen(null); });
  bus.on('prologueComplete', () => setTimeout(() => showScreen('ending'), 1800));
  bus.on('ui', (e) => { const n = (e.screen ?? null) as ScreenName; if (n !== current && (n === null || n in factories)) showScreen(n); });
  bus.on('dialogueEnd', () => { dialogue.hide(); });
  // World checks (the cache's Perception, the boulder's Athletics, the altar, the gate) only emit `check`; dialogue rolls
  // call showRoll themselves, synchronously after the event, so judge one tick later. Saves / attacks stay as floaters.
  bus.on('check', (e) => {
    if (!isPlayer(e.actorId) || e.roll.kind !== 'check') return;
    const roll = e.roll;
    setTimeout(() => { if (!gameStarted() || dice.isOpen() || dialogue.isOpen() || current) return; ui.dialogue.showRoll(roll, () => {}); }, 0);
  });

  // ---- content + settings ----
  loadContent().then(() => hud.refreshHotbar());
  applySettings(ctx, loadSettings());

  const ui: UI = {
    update(dt) {
      try { const c = cam(); c.updateMatrixWorld(); c.matrixWorldInverse.copy(c.matrixWorld).invert(); } catch {}
      hud.update(dt);
    },
    showScreen,
    dialogue: {
      present: (node: DialogueNode, choices: DialogueChoice[], onPick: (i: number) => void, onContinue: () => void) => { hud.notePresented(node.text); dialogue.present(node, choices, onPick, onContinue); },
      hide: () => dialogue.hide(),
      showRoll: (roll: RollResult, onDone: () => void) => { syncCaptureSoon(); dice.showRoll(roll, () => { syncCapture(); maybeRelock(); onDone(); }); },
    },
    tutorial: { show: (step: QuestStep) => tutorial.show(step), complete: (id: string) => tutorial.complete(id), card: (title: string, html: string, keys?: string[]) => tutorial.card(title, html, keys) },
    worldToScreen,
    isBlocking,
    get screen() { return current; },
    toast: (text, kind) => hud.toast(text, kind),
    subtitle: (speakerId, text) => hud.subtitle(speakerId, text),
    root,
    warm,
  };
  function syncCaptureSoon() { setTimeout(syncCapture, 0); try { ctx.game.input.uiCapture = true; ctx.game.input.releaseLock(); } catch {} }
  (window as any).__hmUI = ui;
  return ui;
}
