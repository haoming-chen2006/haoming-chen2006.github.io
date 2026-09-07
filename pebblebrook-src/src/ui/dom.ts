/** Small DOM helpers shared by every panel. No framework: build once, diff text on update. */

export type Child = Node | string | number | null | undefined | false | Child[];

type Attrs = Record<string, unknown> | null | undefined;

/** `h('div', { class: 'x', onclick: fn }, 'text', child, [more])` */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') { el.addEventListener(k.slice(2), v as EventListener); continue; }
      if (k === 'class') { el.className = String(v); continue; }
      if (k === 'style') { el.setAttribute('style', String(v)); continue; }
      if (k === 'html') { el.innerHTML = String(v); continue; } // only for our own SVG strings
      if (k === 'value' && 'value' in el) { (el as HTMLInputElement).value = String(v); continue; }
      if (k === 'checked' && 'checked' in el) { (el as HTMLInputElement).checked = Boolean(v); continue; }
      if (k === 'disabled' && 'disabled' in el) { (el as HTMLButtonElement).disabled = Boolean(v); continue; }
      if (v === true) { el.setAttribute(k, ''); continue; }
      el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) { append(el, c); continue; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export function clear(el: Element): void { while (el.firstChild) el.removeChild(el.firstChild); }

/** Replace children with `nodes` (used for lists that are rebuilt when their key changes). */
export function replaceChildren(el: Element, nodes: Child[]): void { clear(el); append(el, nodes); }

export function setText(el: Element, s: string): void { if (el.textContent !== s) el.textContent = s; }

export function setHidden(el: HTMLElement, hidden: boolean): void { if (el.hidden !== hidden) el.hidden = hidden; }

export function setClass(el: Element, cls: string, on: boolean): void { if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on); }
export function setClassName(el: Element, cls: string): void { if (el.className !== cls) el.className = cls; }

/** Set a CSS custom property / style only when it changed (avoids style recalcs at 4 Hz). */
export function setStyle(el: HTMLElement, prop: string, value: string): void {
  if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
}

export function setAttr(el: Element, name: string, value: string | null): void {
  if (value === null) { if (el.hasAttribute(name)) el.removeAttribute(name); return; }
  if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

/** Text fields must not leak game keys (WASD, E, Space, digits) to the window listeners. */
export function guardTextField(el: HTMLElement): void {
  const stop = (e: Event) => { e.stopPropagation(); };
  el.addEventListener('keydown', stop);
  el.addEventListener('keyup', stop);
  el.addEventListener('keypress', stop);
}

export function img(src: string, cls: string, alt = ''): HTMLImageElement {
  const el = document.createElement('img');
  el.src = src; el.className = cls; el.alt = alt; el.draggable = false;
  return el;
}

/** Inline pixel-style SVG icons (16×16 grids). Only literal strings we author go through innerHTML. */
const P = (paths: string, extra = ''): string => `<svg viewBox="0 0 16 16" width="16" height="16" shape-rendering="crispEdges" ${extra}>${paths}</svg>`;
export const ICONS: Record<string, string> = {
  coin: P('<rect x="3" y="2" width="10" height="12" fill="#e2b350"/><rect x="2" y="3" width="12" height="10" fill="#e2b350"/><rect x="5" y="4" width="6" height="8" fill="#f6dc8c"/><rect x="7" y="5" width="2" height="6" fill="#a97a24"/><rect x="6" y="5" width="4" height="1" fill="#a97a24"/><rect x="6" y="10" width="4" height="1" fill="#a97a24"/>'),
  heart: P('<rect x="2" y="3" width="4" height="2" fill="#c95a45"/><rect x="10" y="3" width="4" height="2" fill="#c95a45"/><rect x="1" y="5" width="14" height="3" fill="#c95a45"/><rect x="2" y="8" width="12" height="2" fill="#c95a45"/><rect x="4" y="10" width="8" height="2" fill="#c95a45"/><rect x="6" y="12" width="4" height="1" fill="#c95a45"/><rect x="7" y="13" width="2" height="1" fill="#c95a45"/><rect x="3" y="5" width="2" height="2" fill="#ee8d78"/>'),
  heartEmpty: P('<rect x="2" y="3" width="4" height="2" fill="#b39b7a"/><rect x="10" y="3" width="4" height="2" fill="#b39b7a"/><rect x="1" y="5" width="14" height="3" fill="#b39b7a"/><rect x="2" y="8" width="12" height="2" fill="#b39b7a"/><rect x="4" y="10" width="8" height="2" fill="#b39b7a"/><rect x="6" y="12" width="4" height="1" fill="#b39b7a"/><rect x="7" y="13" width="2" height="1" fill="#b39b7a"/>'),
  spring: P('<rect x="7" y="9" width="2" height="6" fill="#5b8a3c"/><rect x="4" y="3" width="8" height="6" fill="#e58fb0"/><rect x="6" y="1" width="4" height="2" fill="#e58fb0"/><rect x="2" y="5" width="2" height="2" fill="#e58fb0"/><rect x="12" y="5" width="2" height="2" fill="#e58fb0"/><rect x="6" y="5" width="4" height="2" fill="#f6dc8c"/>'),
  summer: P('<rect x="5" y="5" width="6" height="6" fill="#f3c440"/><rect x="7" y="1" width="2" height="2" fill="#f3c440"/><rect x="7" y="13" width="2" height="2" fill="#f3c440"/><rect x="1" y="7" width="2" height="2" fill="#f3c440"/><rect x="13" y="7" width="2" height="2" fill="#f3c440"/><rect x="3" y="3" width="2" height="2" fill="#f3c440"/><rect x="11" y="11" width="2" height="2" fill="#f3c440"/><rect x="11" y="3" width="2" height="2" fill="#f3c440"/><rect x="3" y="11" width="2" height="2" fill="#f3c440"/>'),
  autumn: P('<rect x="7" y="10" width="2" height="5" fill="#8a4b1f"/><rect x="5" y="2" width="6" height="2" fill="#d9772e"/><rect x="3" y="4" width="10" height="4" fill="#d9772e"/><rect x="4" y="8" width="8" height="2" fill="#c95a2a"/><rect x="6" y="10" width="4" height="1" fill="#c95a2a"/><rect x="7" y="4" width="2" height="6" fill="#f0a24a"/>'),
  winter: P('<rect x="7" y="1" width="2" height="14" fill="#bfe4f6"/><rect x="1" y="7" width="14" height="2" fill="#bfe4f6"/><rect x="3" y="3" width="2" height="2" fill="#bfe4f6"/><rect x="11" y="11" width="2" height="2" fill="#bfe4f6"/><rect x="11" y="3" width="2" height="2" fill="#bfe4f6"/><rect x="3" y="11" width="2" height="2" fill="#bfe4f6"/><rect x="6" y="6" width="4" height="4" fill="#ffffff"/>'),
  play: P('<rect x="4" y="2" width="2" height="12" fill="currentColor"/><rect x="6" y="3" width="2" height="10" fill="currentColor"/><rect x="8" y="4" width="2" height="8" fill="currentColor"/><rect x="10" y="6" width="2" height="4" fill="currentColor"/><rect x="12" y="7" width="1" height="2" fill="currentColor"/>'),
  pause: P('<rect x="3" y="2" width="4" height="12" fill="currentColor"/><rect x="9" y="2" width="4" height="12" fill="currentColor"/>'),
  close: P('<rect x="2" y="2" width="3" height="3" fill="currentColor"/><rect x="11" y="2" width="3" height="3" fill="currentColor"/><rect x="5" y="5" width="6" height="6" fill="currentColor"/><rect x="2" y="11" width="3" height="3" fill="currentColor"/><rect x="11" y="11" width="3" height="3" fill="currentColor"/>'),
  eye: P('<rect x="1" y="7" width="14" height="2" fill="currentColor"/><rect x="3" y="5" width="10" height="6" fill="currentColor"/><rect x="5" y="3" width="6" height="10" fill="currentColor"/><rect x="6" y="6" width="4" height="4" fill="#f3e6c8"/><rect x="7" y="7" width="2" height="2" fill="currentColor"/>'),
  key: P('<rect x="2" y="5" width="6" height="6" fill="currentColor"/><rect x="4" y="7" width="2" height="2" fill="#f3e6c8"/><rect x="8" y="7" width="7" height="2" fill="currentColor"/><rect x="12" y="9" width="2" height="2" fill="currentColor"/><rect x="9" y="9" width="2" height="2" fill="currentColor"/>'),
  star: P('<rect x="7" y="1" width="2" height="4" fill="currentColor"/><rect x="1" y="6" width="14" height="2" fill="currentColor"/><rect x="3" y="8" width="10" height="2" fill="currentColor"/><rect x="4" y="10" width="3" height="2" fill="currentColor"/><rect x="9" y="10" width="3" height="2" fill="currentColor"/><rect x="3" y="12" width="2" height="2" fill="currentColor"/><rect x="11" y="12" width="2" height="2" fill="currentColor"/><rect x="5" y="5" width="6" height="1" fill="currentColor"/>'),
  pin: P('<rect x="5" y="1" width="6" height="2" fill="#c95a45"/><rect x="6" y="3" width="4" height="5" fill="#c95a45"/><rect x="3" y="8" width="10" height="2" fill="#c95a45"/><rect x="7" y="10" width="2" height="5" fill="#3e2a17"/>'),
  arrow: P('<rect x="2" y="7" width="10" height="2" fill="currentColor"/><rect x="9" y="4" width="2" height="2" fill="currentColor"/><rect x="11" y="6" width="2" height="4" fill="currentColor"/><rect x="9" y="10" width="2" height="2" fill="currentColor"/>'),
  brain: P('<rect x="3" y="2" width="10" height="2" fill="currentColor"/><rect x="2" y="4" width="12" height="6" fill="currentColor"/><rect x="3" y="10" width="10" height="2" fill="currentColor"/><rect x="6" y="12" width="4" height="2" fill="currentColor"/><rect x="7" y="4" width="2" height="6" fill="#f3e6c8"/><rect x="4" y="6" width="2" height="1" fill="#f3e6c8"/><rect x="10" y="7" width="2" height="1" fill="#f3e6c8"/>'),
  search: P('<rect x="2" y="2" width="8" height="8" fill="currentColor"/><rect x="4" y="4" width="4" height="4" fill="#f3e6c8"/><rect x="9" y="9" width="2" height="2" fill="currentColor"/><rect x="11" y="11" width="3" height="3" fill="currentColor"/>'),
};
export const icon = (name: string, cls = 'pb-ico'): HTMLElement => h('span', { class: cls, html: ICONS[name] ?? '' });

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const pct = (v: number, max = 100): string => `${Math.round(clamp((v / max) * 100, 0, 100))}%`;

/** Simple throttle helper for panels that update while open. */
export class Throttle {
  private acc = 0;
  private readonly every: number;
  constructor(every: number) { this.every = every; }
  /** returns true when it is time to do the work */
  tick(dt: number): boolean { this.acc += dt; if (this.acc >= this.every) { this.acc = 0; return true; } return false; }
  force(): void { this.acc = this.every; }
}

/** Split text into nodes, wrapping villager names in `.pb-who` spans. */
export function highlightNames(text: string, names: { re: RegExp; ids: Map<string, string> }, onClick?: (id: string) => void): Node[] {
  const out: Node[] = [];
  let last = 0;
  names.re.lastIndex = 0;
  for (const m of text.matchAll(names.re)) {
    const i = m.index ?? 0;
    if (i > last) out.push(document.createTextNode(text.slice(last, i)));
    const id = names.ids.get(m[0].toLowerCase()) ?? '';
    const span = h('span', { class: 'pb-who', 'data-id': id, onclick: onClick ? () => onClick(id) : null }, m[0]);
    out.push(span);
    last = i + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

export function download(filename: string, text: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = h('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}
