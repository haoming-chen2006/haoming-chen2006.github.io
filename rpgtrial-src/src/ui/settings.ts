// Settings: quality tier, mouse sensitivity, invert Y, volumes (dispatches 'ui:volume'), key bindings table.
import { h, button, heading, ornament, sfx, kbd, keys } from './dom.ts';
import type { UIContext, Screen } from './types.ts';
import type { Nav } from './tabs.ts';
import type { QualityTier } from '../render/quality.ts';

const KEY = 'hm.settings';
export interface Settings { sensitivity: number; invertY: boolean; master: number; music: number; sfx: number }
const DEFAULTS: Settings = { sensitivity: 0.0022, invertY: false, master: 0.9, music: 0.7, sfx: 0.9 };
export function loadSettings(): Settings { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } }
export function applySettings(ctx: UIContext, s: Settings) {
  try { ctx.game.cam.sensitivity = s.sensitivity; ctx.game.cam.invertY = s.invertY; } catch {}
  try { document.dispatchEvent(new CustomEvent('ui:volume', { detail: { master: s.master, music: s.music, sfx: s.sfx } })); } catch {}
}

const BINDINGS: [string, string[]][] = [
  ['Move', ['W', 'A', 'S', 'D']], ['Camera', ['Mouse']], ['Zoom', ['Wheel']], ['Sprint (hold)', ['Shift']], ['Dodge roll', ['Space']], ['Jump', ['Ctrl']],
  ['Light attack', ['LMB']], ['Heavy attack (hold to charge)', ['RMB']], ['Block / parry (hold)', ['Q']], ['Lock-on', ['Tab', 'MMB']], ['Interact', ['E']],
  ['Abilities', ['1', '2', '3', '4', '5', '6']], ['Potion', ['R']], ['Walk (hold)', ['Alt']], ['Inventory', ['I']], ['Character', ['C']], ['Journal', ['J']], ['Map', ['M']], ['Pause', ['Esc']],
];

export function createSettings(ctx: UIContext, nav: Nav): Screen {
  const s = loadSettings();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} applySettings(ctx, s); };
  const grid = h('div.settings-grid');
  const row = (label: string, sub: string | null, control: HTMLElement) => { grid.append(h('label', label, sub ? h('small', sub) : null), control); };

  // quality
  const tiers: QualityTier[] = ['low', 'medium', 'high', 'ultra'];
  const seg = h('div.seg', tiers.map((t) => h('button', { type: 'button', class: t === ctx.game.quality ? 'on' : '', onclick: () => { sfx('click'); [...seg.children].forEach((c) => c.classList.toggle('on', (c as HTMLElement).textContent === t)); ctx.game.setQuality(t); } }, t)));
  row('Graphics quality', 'Shadows, ambient occlusion, bloom, grass density. Changing it reloads the scene.', seg);
  // sensitivity
  const slider = (min: number, max: number, val: number, fmt: (v: number) => string, on: (v: number) => void) => {
    const inp = h('input.slider', { type: 'range', min: String(min), max: String(max), step: String((max - min) / 100), value: String(val) }) as HTMLInputElement;
    const v = h('span.val', fmt(val)); const upd = () => { const x = Number(inp.value); inp.style.setProperty('--p', `${((x - min) / (max - min)) * 100}%`); v.textContent = fmt(x); };
    inp.addEventListener('input', () => { upd(); on(Number(inp.value)); }); inp.addEventListener('change', () => sfx('click')); upd();
    return h('div.slider-wrap', inp, v);
  };
  row('Mouse sensitivity', null, slider(0.0006, 0.006, s.sensitivity, (v) => (v / 0.0022 * 100).toFixed(0) + '%', (v) => { s.sensitivity = v; save(); }));
  const inv = h('div.toggle' + (s.invertY ? '.on' : ''), { onclick: () => { s.invertY = !s.invertY; inv.classList.toggle('on', s.invertY); sfx('click'); save(); } });
  row('Invert vertical look', null, inv);
  row('Master volume', null, slider(0, 1, s.master, (v) => Math.round(v * 100) + '%', (v) => { s.master = v; save(); }));
  row('Music', null, slider(0, 1, s.music, (v) => Math.round(v * 100) + '%', (v) => { s.music = v; save(); }));
  row('Sound effects', null, slider(0, 1, s.sfx, (v) => Math.round(v * 100) + '%', (v) => { s.sfx = v; save(); }));

  const table = h('table.keytable', BINDINGS.map(([a, ks]) => h('tr', h('td', a), h('td', keys(ks)))));
  const el = h('div.screen#settings', h('div.veil'), ornament(h('div.panel.blur.menu-panel.content',
    heading('Settings'), grid, h('h3.sec', 'Controls'), table,
    h('div', { style: { textAlign: 'center', marginTop: '18px' } }, button('Back', () => nav.back(), 'ghost small')))));
  return { el, open() { el.classList.add('on'); }, close() { el.classList.remove('on'); }, key(code) { if (code === 'Escape') { nav.back(); return true; } return true; } };
}
export { kbd };
