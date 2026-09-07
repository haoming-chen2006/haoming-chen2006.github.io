import { WEEKDAYS } from '../../core/time.ts';
import { item as itemDef } from '../../core/items.ts';
import { h, icon, setClass, setHidden, setText, setAttr, Throttle } from '../dom.ts';
import { cap, clock12, SPEEDS, type Panel, type UiCore } from '../shared.ts';

export interface HudPanel extends Panel {
  toast(text: string, kind?: 'info' | 'warn' | 'good'): void;
  ticker(text: string): void;
  /** re-read speed/pause state now (called after key presses) */
  refreshSpeed(): void;
}

const SEASON_TEMP: Record<string, string> = { spring: '14°', summer: '26°', autumn: '11°', winter: '-2°' };

export function createHud(core: UiCore): HudPanel {
  const { ctx } = core;
  const timeEl = h('div', { class: 'time' }, '6:00 am');
  const dateEl = h('div', { class: 'date' }, h('b', null, 'Mon 1'), h('span', null, 'Spring, Year 1'));
  const seasonEl = h('span', { class: 'season', title: 'Season' });
  const wxImg = h('img', { class: 'wx-ico', alt: 'weather', title: 'Weather' });
  const wxText = h('span', null, 'sunny');
  const pauseEl = h('span', { class: 'pause', hidden: true }, 'PAUSED');
  const clock = h('div', { class: 'pb-hud-box pb-hud-clock', id: 'pb-clock' }, timeEl, dateEl, h('div', { class: 'wx' }, seasonEl, wxImg, wxText), pauseEl);

  const money = h('span', { class: 'pb-money', id: 'pb-money', title: 'Your coins' }, icon('coin'), h('span', { class: 'v' }, '0'));
  const pauseBtn = h('button', { class: 'pb-btn ghost', title: 'Pause / resume (Space)', onclick: () => core.togglePause() }, icon('pause'));
  const speedBtns = SPEEDS.map((s) => h('button', { class: 'pb-btn ghost', title: `Speed ${s}× (− / = to change)`, onclick: () => core.setSpeed(s) }, `${s}×`));
  const panelBtn = (id: 'inspector' | 'village' | 'board' | 'director' | 'menu', label: string, key: string) =>
    h('button', { class: 'pb-btn wood', 'data-panel': id, title: `${label} (${key})`, onclick: () => (id === 'menu' ? core.open('menu') : id === 'inspector' ? core.openInspector(null) : core.toggle(id)) }, h('span', { class: 'lbl' }, label), h('span', { class: 'pb-kbd' }, key));
  const panelBtns = [panelBtn('inspector', 'Inspector', 'Tab'), panelBtn('village', 'Village', 'V'), panelBtn('board', 'Board', 'B'), panelBtn('director', 'Director', 'G'), panelBtn('menu', 'Menu', 'Esc')];
  const right = h('div', { class: 'pb-hud-box pb-hud-right', id: 'pb-topright' }, money, h('span', { class: 'pb-speeds', title: 'Space pauses; − and = step the speed' }, pauseBtn, ...speedBtns), h('span', { class: 'group' }, ...panelBtns));

  const tickerText = h('span', { class: 't' });
  const ticker = h('div', { class: 'pb-ticker', id: 'pb-ticker', hidden: true }, icon('star'), tickerText);
  const tickerQueue: string[] = [];
  let tickerLeft = 0;

  const slots: { el: HTMLElement; img: HTMLImageElement; q: HTMLElement; id: string }[] = [];
  const hotbar = h('div', { class: 'pb-hotbar', id: 'pb-hotbar' });
  for (let i = 0; i < 9; i++) {
    const img = h('img', { alt: '', hidden: true });
    const q = h('span', { class: 'q' });
    const el = h('div', { class: 'pb-slot', onclick: () => { ctx.sim.player.hotbar = i; } }, h('span', { class: 'n' }, String(i + 1)), img, q);
    slots.push({ el, img, q, id: '' });
    hotbar.appendChild(el);
  }
  const iconCache = new Map<string, string>();
  const iconFor = (id: string): string => { let u = iconCache.get(id); if (!u) { u = core.itemIcon(id, 32); iconCache.set(id, u); } return u; };

  const promptText = h('span');
  const prompt = h('div', { class: 'pb-prompt', id: 'pb-prompt', hidden: true }, h('span', { class: 'pb-kbd' }, 'E'), promptText);
  const toasts = h('div', { class: 'pb-toasts', id: 'pb-toasts' });

  const el = h('div', { class: 'pb-hud', id: 'pb-hud' }, clock, right, ticker, hotbar, prompt, toasts);

  const fast = new Throttle(0.1), slow = new Throttle(0.25);
  let lastMinute = -1, lastWeather = '', lastSeason = '';

  let pausedShown: boolean | null = null;
  function refreshSpeed(): void {
    const w = ctx.world;
    if (pausedShown !== w.paused) { pausedShown = w.paused; setHidden(pauseEl, !w.paused); setClass(pauseBtn, 'on', w.paused); pauseBtn.replaceChildren(icon(w.paused ? 'play' : 'pause')); }
    speedBtns.forEach((b, i) => setClass(b, 'on', !w.paused && w.speed === SPEEDS[i]));
  }

  function tick(dt: number): void {
    const t = ctx.world.time;
    if (fast.tick(dt)) {
      const wholeMinute = Math.floor(t.minute);
      if (wholeMinute !== lastMinute) {
        lastMinute = wholeMinute;
        setText(timeEl, clock12(t.hour, t.min));
        setText(dateEl.firstChild as Element, `${WEEKDAYS[t.weekday]} ${t.day}`);
        setText(dateEl.lastChild as Element, ` ${cap(t.season)}, Year ${t.year}`);
      }
      if (t.season !== lastSeason) { lastSeason = t.season; seasonEl.replaceChildren(icon(t.season)); setAttr(seasonEl, 'title', cap(t.season)); }
      const w = ctx.world.weather;
      if (w.kind !== lastWeather) { lastWeather = w.kind; wxImg.src = core.weatherIcon(w.kind, 24); setAttr(wxImg, 'title', `${cap(w.kind)}, tomorrow ${w.forecast}`); }
      setText(wxText, `${cap(w.kind)} · ${Number.isFinite(w.temperature) ? `${Math.round(w.temperature)}°` : SEASON_TEMP[t.season]}`);
      setText(money.lastChild as Element, String(Math.floor(ctx.sim.player.money)));
      refreshSpeed();
      const p = ctx.player.prompt();
      setHidden(prompt, !p);
      if (p) setText(promptText, p);
      // panel button states
      for (const b of panelBtns) { const id = b.dataset.panel as 'inspector' | 'village' | 'board' | 'director' | 'menu'; setClass(b, 'on', core.isOpen(id)); }
    }
    if (slow.tick(dt)) {
      const inv = ctx.sim.player.inventory;
      const sel = ctx.sim.player.hotbar;
      for (let i = 0; i < 9; i++) {
        const s = slots[i], st = inv[i];
        setClass(s.el, 'sel', i === sel);
        if (!st) { if (s.id) { s.id = ''; setHidden(s.img, true); setText(s.q, ''); setAttr(s.el, 'title', null); } continue; }
        if (s.id !== st.id) { s.id = st.id; s.img.src = iconFor(st.id); setHidden(s.img, false); setAttr(s.el, 'title', itemDef(st.id).name); }
        setText(s.q, st.qty > 1 ? String(st.qty) : '');
      }
    }
    if (tickerLeft > 0) { tickerLeft -= dt; if (tickerLeft <= 0) { const next = tickerQueue.shift(); if (next) showTicker(next); else setHidden(ticker, true); } }
  }

  function showTicker(text: string): void {
    setText(tickerText, text); setAttr(ticker, 'title', text);
    ticker.hidden = true; void ticker.offsetWidth; ticker.hidden = false; // restart the drop animation
    tickerLeft = 5;
  }

  function toast(text: string, kind: 'info' | 'warn' | 'good' = 'info'): void {
    const t = h('div', { class: `pb-toast ${kind}` }, text);
    toasts.appendChild(t);
    while (toasts.children.length > 5) toasts.firstChild?.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 3800);
  }

  return {
    id: 'hud', el, modal: false, closable: false,
    show() { fast.force(); slow.force(); lastMinute = -1; }, hide() {}, tick,
    toast, refreshSpeed,
    ticker(text) { if (tickerLeft > 0) { tickerQueue.push(text); if (tickerQueue.length > 3) tickerQueue.shift(); } else showTicker(text); },
  };
}
