// AGENT D owns this module. Keep the export names.
import './ui.css';
import type { Ui, UiContext } from '../core/app.ts';
import { bus } from '../core/bus.ts';
import { fmtDate } from '../core/time.ts';
import type { ItemId, Place, Villager, WeatherKind } from '../core/types.ts';
import { canvasUrl, buildNameMatcher, cap, loadSettings, SETTINGS_KEY, shortName, SPEEDS, type Panel, type PanelId, type UiCore } from './shared.ts';
import { createBoard } from './panels/board.ts';
import { createDialogue } from './panels/dialogue.ts';
import { createDirector } from './panels/director.ts';
import { frame } from './panels/frame.ts';
import { createHover } from './panels/hover.ts';
import { createHowto } from './panels/howto.ts';
import { createHud } from './panels/hud.ts';
import { createInspector } from './panels/inspector.ts';
import { createMenu } from './panels/menu.ts';
import { createSettings } from './panels/settings.ts';
import { createShop } from './panels/shop.ts';
import { createRoster, createTitle } from './panels/title.ts';
import { createVillage } from './panels/village.ts';
import { h } from './dom.ts';

/** Extras beyond the core `Ui` contract, for play-tests and the `__pb` debug hook. */
export interface UiExtras { panels: { open(id: PanelId): void; close(id: PanelId): void; isOpen(id: PanelId): boolean; openIds(): PanelId[] } }
export type { PanelId };

let current: { dispose(): void } | null = null;
let firstBoot = true;

export function createUi(ctx: UiContext): Ui & UiExtras {
  current?.dispose();
  let root = document.getElementById('ui');
  if (!root) { root = h('div', { id: 'ui' }); (document.getElementById('app') ?? document.body).appendChild(root); }
  root.replaceChildren();

  const settings = loadSettings();
  try { ctx.audio.setVolume(settings.music, settings.sfx); ctx.renderer.setQuality(settings.quality); } catch { /* modules may be stubs */ }

  const portraits = new Map<string, string>(), icons = new Map<string, string>();
  let namesKey = '', names = buildNameMatcher(ctx.sim.villagers);
  const panels = new Map<PanelId, Panel>();
  const stack: PanelId[] = [];
  const dim = h('div', { class: 'pb-layer-dim', id: 'pb-dim', hidden: true, onclick: () => { const top = topPanel(); if (top && top.closable && top.modal && top.id !== 'dialogue') close(top.id); } });

  const core: UiCore = {
    ctx, root, settings,
    portrait(v) {
      const key = v === 'player' ? 'player' : v.id;
      let u = portraits.get(key);
      if (!u) { try { u = canvasUrl(ctx.art.character(v === 'player' ? ctx.player.look : v.look, v === 'player' ? undefined : v.profession).portrait); } catch { u = ''; } if (u) portraits.set(key, u); }
      return u ?? '';
    },
    itemIcon(id: ItemId, size = 32) { const k = `item:${id}@${size}`; let u = icons.get(k); if (!u) { try { u = canvasUrl(ctx.art.icon('item', id, size)); } catch { u = ''; } icons.set(k, u); } return u; },
    weatherIcon(kind: WeatherKind, size = 24) { const k = `weather:${kind}@${size}`; let u = icons.get(k); if (!u) { try { u = canvasUrl(ctx.art.icon('weather', kind, size)); } catch { u = ''; } icons.set(k, u); } return u; },
    open, close, toggle, isOpen,
    openInspector, openDialogue, openShop, openBoard, showTitle, toast,
    get names() { const k = ctx.sim.villagers.map((v) => v.id).join(','); if (k !== namesKey) { namesKey = k; names = buildNameMatcher(ctx.sim.villagers); } return names; },
    saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* no storage */ } },
    hasSave() { try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) ?? ''; if (k.startsWith('pebblebrook.save')) return true; } } catch { /* no storage */ } return false; },
    setSpeed(n) { ctx.world.speed = n; ctx.world.paused = false; hud.refreshSpeed(); },
    togglePause() { ctx.world.paused = !ctx.world.paused; hud.refreshSpeed(); },
  };

  const hud = createHud(core);
  const title = createTitle(core), roster = createRoster(core, frame), howto = createHowto(core), settingsPanel = createSettings(core), menu = createMenu(core);
  const dialogue = createDialogue(core), inspector = createInspector(core), village = createVillage(core), board = createBoard(core), shop = createShop(core), director = createDirector(core);
  const hover = createHover(core);
  for (const p of [inspector, village, director, board, shop, dialogue, menu, settingsPanel, howto, roster, title]) { panels.set(p.id, p); p.el.hidden = true; }
  root.append(hud.el, dim, inspector.el, village.el, director.el, board.el, shop.el, dialogue.el, menu.el, settingsPanel.el, howto.el, roster.el, title.el, hover.el);
  // HUD buttons must not steal keyboard focus (Space would then click them instead of pausing)
  hud.el.addEventListener('mousedown', (e) => { if ((e.target as Element).closest('button')) e.preventDefault(); });

  function topPanel(): Panel | null { return stack.length ? panels.get(stack[stack.length - 1]) ?? null : null; }
  function anyModal(): boolean { return stack.some((id) => panels.get(id)?.modal); }
  function relayer(): void {
    let topModal = -1;
    stack.forEach((id, i) => { const p = panels.get(id)!; p.el.style.zIndex = String(10 + i * 2); if (p.modal) topModal = i; });
    const showDim = topModal >= 0 && stack[topModal] !== 'title';
    dim.hidden = !showDim; dim.style.zIndex = String(10 + topModal * 2 - 1);
    hud.el.style.zIndex = '5';
    hover.el.style.zIndex = '200';
    // the HUD is meaningless behind the title screen
    hud.el.hidden = isOpen('title');
  }
  function open(id: PanelId): void {
    const p = panels.get(id); if (!p) return;
    const i = stack.indexOf(id);
    if (i >= 0) { stack.splice(i, 1); stack.push(id); relayer(); return; }
    stack.push(id); p.el.hidden = false; p.show(); relayer();
  }
  function close(id: PanelId): void {
    const p = panels.get(id); if (!p) return;
    const i = stack.indexOf(id); if (i < 0) return;
    stack.splice(i, 1); p.el.hidden = true; p.hide(); relayer();
  }
  function toggle(id: PanelId): void { if (isOpen(id)) close(id); else open(id); }
  function isOpen(id: PanelId): boolean { return stack.includes(id); }
  function closeTop(): boolean {
    for (let i = stack.length - 1; i >= 0; i--) { const p = panels.get(stack[i])!; if (p.closable) { close(p.id); return true; } if (p.modal) return false; }
    return false;
  }

  function openInspector(v: Villager | null): void {
    if (v) { open('inspector'); inspector.open(v); return; }
    if (isOpen('inspector')) { const cur = inspector.current(); const list = ctx.sim.villagers; const i = cur ? list.findIndex((x) => x.id === cur.id) : -1; if (list.length) inspector.open(list[(i + 1) % list.length]); }
    else { open('inspector'); const pick = ctx.sim.player.talkingTo ? ctx.sim.villager(ctx.sim.player.talkingTo) : null; if (pick) inspector.open(pick); }
  }
  function openDialogue(v: Villager): void { open('dialogue'); dialogue.open(v); }
  function openShop(place: Place): void { open('shop'); shop.open(place); }
  function openBoard(): void { open('board'); }
  function toast(text: string, kind: 'info' | 'warn' | 'good' = 'info'): void { hud.toast(text, kind); }
  function showTitle(show: boolean): void {
    if (show) { for (const id of [...stack]) if (id !== 'title') close(id); open('title'); try { ctx.audio.setScene('title'); } catch { /* stub */ } }
    else { close('title'); try { ctx.audio.setScene(ctx.world.time.isDaylight ? 'day' : 'night'); } catch { /* stub */ } }
  }

  // ---------------------------------------------------------------- keyboard
  const isTyping = (t: EventTarget | null): boolean => { const el = t as HTMLElement | null; return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable); };
  function onKey(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    if (ctx.input.typing || isTyping(e.target)) { if (e.key === 'Escape') (e.target as HTMLElement).blur(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const modal = anyModal(); const top = topPanel();
    switch (e.code) {
      case 'Escape': if (!closeTop() && !isOpen('title')) open('menu'); e.preventDefault(); break;
      case 'Tab': if (!modal) { e.preventDefault(); if (isOpen('inspector')) { const cur = inspector.current(); const list = ctx.sim.villagers; const i = cur ? list.findIndex((x) => x.id === cur.id) : -1; if (list.length) inspector.open(list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length]); } else openInspector(null); } break;
      case 'KeyV': if (!modal) { toggle('village'); e.preventDefault(); } break;
      case 'KeyG': if (!modal) { toggle('director'); e.preventDefault(); } break;
      case 'KeyB': if (!modal) open('board'); else if (top?.id === 'board') close('board'); break;
      case 'Space': if (!modal) { core.togglePause(); e.preventDefault(); } break;
      case 'Minus': case 'NumpadSubtract': if (!modal) { const i = SPEEDS.indexOf(ctx.world.speed); core.setSpeed(SPEEDS[Math.max(0, (i < 0 ? 0 : i) - 1)]); e.preventDefault(); } break;
      case 'Equal': case 'NumpadAdd': if (!modal) { const i = SPEEDS.indexOf(ctx.world.speed); core.setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, (i < 0 ? 0 : i) + 1)]); e.preventDefault(); } break;
      default:
        if (top?.id === 'dialogue' && /^Digit[1-9]$/.test(e.code)) { dialogue.key(Number(e.code.slice(5))); e.preventDefault(); }
    }
  }
  window.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- bus
  const offs = [
    bus.on('toast', (e) => toast(e.text, e.kind)),
    bus.on('chronicle', (e) => { if (e.importance >= 3) hud.ticker(e.text); }),
    bus.on('event', (e) => { if (e.phase === 'start') toast(`${e.event.name}: ${e.event.text}`, 'good'); else toast(`${e.event.name} is over.`); }),
    bus.on('request', (e) => { if (e.phase === 'posted' && e.request.by !== 'player') { const v = ctx.sim.villager(e.request.by); toast(`${v ? shortName(v) : e.request.by} pinned a request on the board (B)`); } }),
    bus.on('weather', (e) => toast(`Weather turns ${e.weather.kind === 'sunny' ? 'sunny' : `to ${e.weather.kind}`}.`)),
    bus.on('newday', () => toast(`${fmtDate(ctx.world.time)} — a new day.`)),
    bus.on('relationship', (e) => { if (e.b !== 'player' || isOpen('dialogue') || Math.abs(e.delta) < 3) return; const v = ctx.sim.villager(e.a); if (v) toast(`${shortName(v)} ${e.delta > 0 ? 'thinks a little better of you' : 'is a little cooler towards you'}${e.label ? ` (${e.label})` : ''}.`, e.delta > 0 ? 'good' : 'warn'); }),
  ];

  function update(dt: number): void {
    if (!hud.el.hidden) hud.tick(dt);
    for (const id of stack) panels.get(id)?.tick(dt);
    hover.tick(dt, anyModal());
  }

  const ui: Ui & UiExtras = {
    update, get modal() { return anyModal(); },
    openDialogue, openShop, openBoard, openInspector, toast, showTitle,
    /** extra, for play-tests and main.ts debugging: open any panel by id */
    panels: { open, close, isOpen, openIds: () => [...stack] },
  };
  current = { dispose() { window.removeEventListener('keydown', onKey); for (const off of offs) off(); root!.replaceChildren(); } };
  if (firstBoot) { firstBoot = false; showTitle(true); }
  else { relayer(); try { ctx.audio.setScene(ctx.world.time.isDaylight ? 'day' : 'night'); } catch { /* stub */ } }
  return ui;
}

export { cap };
