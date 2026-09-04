// Tiny DOM helpers shared by all UI modules: element builder, key glyph chips, ornamental frames, sfx hooks, tooltips.
import { icon, CORNER_SVG, DIVIDER_SVG } from './icons.ts';

export type Child = Node | string | null | undefined | false | Child[];
type Attrs = Record<string, any> | null;

/** h('div.panel.wide#id', { onclick }, ...children) */
export function h<K extends keyof HTMLElementTagNameMap>(sel: K | string, attrs?: Attrs | Child, ...children: Child[]): HTMLElementTagNameMap[K] {
  const [tag, ...parts] = String(sel).split(/(?=[.#])/);
  const el = document.createElement(tag || 'div') as HTMLElementTagNameMap[K];
  for (const p of parts) { if (p[0] === '.') el.classList.add(p.slice(1)); else if (p[0] === '#') el.id = p.slice(1); }
  if (attrs && (attrs instanceof Node || typeof attrs === 'string' || Array.isArray(attrs))) { children.unshift(attrs as Child); attrs = null; }
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = String(v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && k !== 'list' && k !== 'form') (el as any)[k] = v;
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}
export function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
}
export const clear = (el: Element) => { while (el.firstChild) el.removeChild(el.firstChild); };
/** Inline SVG icon as an element. */
export const svg = (name: string, cls = '') => h('span.icw', { html: icon(name, cls) });

// ---- audio hooks: the audio agent listens for these DOM events ----
export type Sfx = 'click' | 'hover' | 'open' | 'close' | 'dice' | 'success' | 'fail' | 'levelup' | 'loot' | 'equip';
export function sfx(kind: Sfx) { try { document.dispatchEvent(new CustomEvent('ui:sfx', { detail: kind })); } catch {} }

// ---- key glyphs ----
const KEY_LABEL: Record<string, string> = {
  Shift: 'Shift', ShiftLeft: 'Shift', Space: 'Space', Tab: 'Tab', Esc: 'Esc', Escape: 'Esc', Ctrl: 'Ctrl', ControlLeft: 'Ctrl', Alt: 'Alt', AltLeft: 'Alt',
  Enter: 'Enter', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
};
const KEY_ICON: Record<string, string> = { LMB: 'mouseL', RMB: 'mouseR', MMB: 'mouseM', Mouse: 'mouseL', Wheel: 'scrollWheel', Scroll: 'scrollWheel', Mouse1: 'mouseL', Mouse2: 'mouseR', Mouse3: 'mouseM' };
/** A kbd-style key chip. Accepts 'W', 'KeyW', 'Shift', 'Space', 'LMB', 'RMB', 'MMB', 'Wheel', '1'... */
export function kbd(key: string, cls = ''): HTMLElement {
  let k = key.trim();
  if (/^Key[A-Z]$/.test(k)) k = k.slice(3);
  if (/^Digit\d$/.test(k)) k = k.slice(5);
  const ic = KEY_ICON[k];
  const el = h('kbd.kbd' + (cls ? '.' + cls : ''));
  if (ic) { el.classList.add('kbd-mouse'); el.innerHTML = icon(ic); el.title = k; return el; }
  const label = KEY_LABEL[k] ?? k;
  if (label.length > 1) el.classList.add('kbd-wide');
  el.textContent = label;
  return el;
}
/** A row of key chips for ['W','A','S','D'] or 'Shift+Space'. */
export function keys(list: string[] | string, sep = ''): HTMLElement {
  const arr = Array.isArray(list) ? list : list.split('+');
  const row = h('span.keys');
  arr.forEach((k, i) => { if (i && sep) row.appendChild(h('span.keys-sep', sep)); row.appendChild(kbd(k)); });
  return row;
}

// ---- ornamental frame ----
/** Adds the four gilded corner flourishes to a panel. */
export function ornament(el: HTMLElement): HTMLElement {
  el.classList.add('framed');
  for (const c of ['tl', 'tr', 'bl', 'br']) el.appendChild(h('i.corner.corner-' + c, { html: CORNER_SVG }));
  return el;
}
export const divider = (cls = '') => h('div.divider' + (cls ? '.' + cls : ''), { html: DIVIDER_SVG });
/** Title with ornamental divider beneath. */
export function heading(text: string, sub?: string): HTMLElement {
  return h('div.heading', h('h2', text), sub ? h('div.heading-sub', sub) : null, divider('small'));
}
export function button(label: string, onClick?: (e: MouseEvent) => void, cls = ''): HTMLButtonElement {
  const sel = 'button.btn' + cls.split(/\s+/).filter(Boolean).map((c) => '.' + c).join('');
  return h(sel, { type: 'button', onclick: (e: MouseEvent) => { sfx('click'); onClick?.(e); } }, h('span.btn-label', label)) as HTMLButtonElement;
}

// ---- tooltip ----
let tipEl: HTMLElement | null = null;
let tipFor: Element | null = null;
export function tooltip(root: HTMLElement) {
  tipEl = h('div.tooltip'); tipEl.hidden = true; root.appendChild(tipEl);
  root.addEventListener('mouseover', (e) => {
    const t = (e.target as Element).closest?.('[data-tip]') as HTMLElement | null;
    if (!t || t === tipFor) return;
    tipFor = t; showTip(t);
  });
  root.addEventListener('mouseout', (e) => {
    const t = (e.target as Element).closest?.('[data-tip]');
    if (t && t === tipFor && !(e.relatedTarget as Element | null)?.closest?.('[data-tip]')) hideTip();
  });
  root.addEventListener('mousemove', (e) => { if (tipFor && !tipEl!.hidden) placeTip(e.clientX, e.clientY); });
}
function showTip(t: HTMLElement) {
  if (!tipEl) return;
  const html = t.dataset.tip ?? ''; if (!html) return;
  tipEl.innerHTML = html; tipEl.hidden = false; tipEl.classList.remove('in'); void tipEl.offsetWidth; tipEl.classList.add('in');
  const r = t.getBoundingClientRect(); placeTip(r.right, r.top);
}
function placeTip(x: number, y: number) {
  if (!tipEl) return;
  const w = tipEl.offsetWidth, hgt = tipEl.offsetHeight; const pad = 14;
  let left = x + pad, top = y + pad;
  if (left + w > innerWidth - 8) left = x - w - pad;
  if (top + hgt > innerHeight - 8) top = innerHeight - hgt - 8;
  if (top < 8) top = 8;
  tipEl.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
export function hideTip() { if (tipEl) { tipEl.hidden = true; tipEl.classList.remove('in'); } tipFor = null; }

/** Escape text for innerHTML. */
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
export const fmtMod = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n);
export const abilityMod = (score: number) => Math.floor((score - 10) / 2);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** requestAnimationFrame-safe "re-trigger a CSS animation" helper. */
export function retrigger(el: HTMLElement, cls: string) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/** Hover sfx for interactive elements (delegated). */
export function hoverSounds(root: HTMLElement) {
  let last: Element | null = null;
  root.addEventListener('mouseover', (e) => {
    const t = (e.target as Element).closest?.('.btn, .choice, .hot, .slot, .card, .menu-item, .tab, .lv-card, .inv-slot, .eq-slot');
    if (t && t !== last) { last = t; sfx('hover'); }
    if (!t) last = null;
  });
}
