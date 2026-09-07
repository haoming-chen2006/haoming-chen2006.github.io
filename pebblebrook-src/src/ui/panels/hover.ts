import type { Villager } from '../../core/types.ts';
import { h, img, setHidden, setText } from '../dom.ts';
import { doing, moodWord, type UiCore } from '../shared.ts';

/** Small card near the cursor for the villager under the mouse. Polled from Ui.update at ~10 Hz. */
export function createHover(core: UiCore): { el: HTMLElement; tick(dt: number, modal: boolean): void } {
  const { ctx } = core;
  const portrait = img('', 'pb-portrait sm', '');
  const name = h('b'), d = h('div', { class: 'd' }), m = h('div', { class: 'd' });
  const el = h('div', { class: 'pb-hover', id: 'pb-hover', hidden: true }, portrait, h('div', null, name, d, m));
  let acc = 0, last: Villager | null = null;
  function tick(dt: number, modal: boolean): void {
    acc += dt; if (acc < 0.1) return; acc = 0;
    if (modal) { if (last) { last = null; setHidden(el, true); } return; }
    const mouse = ctx.input.mouse;
    let v: Villager | null = null;
    try { const hit = ctx.renderer.pick(mouse.x, mouse.y, ctx.sim); v = hit?.villager ?? null; } catch { v = null; }
    if (!v) { if (last) { last = null; setHidden(el, true); } return; }
    if (v !== last) { last = v; portrait.src = core.portrait(v); setText(name, v.name); setHidden(el, false); }
    setText(d, doing(v)); setText(m, `${moodWord(v.mood)}${v.status.length ? ` · ${v.status.join(', ')}` : ''}`);
    const W = core.root.clientWidth, H = core.root.clientHeight; const w = el.offsetWidth || 200, hgt = el.offsetHeight || 60;
    let x = mouse.x + 16, y = mouse.y + 16;
    if (x + w > W - 8) x = mouse.x - w - 12; if (y + hgt > H - 8) y = mouse.y - hgt - 12;
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    if (ctx.input.clicked) core.openInspector(v);
  }
  return { el, tick };
}
