/** Standalone UI preview: public/ui-preview.html loads this with a mock context. Not part of the game build. */
import { createUi } from './index.ts';
import { createMockContext } from './mock.ts';
import { bus } from '../core/bus.ts';

// Play-tests run on the shared dev server while other agents save files; `?nohmr=1` keeps Vite from reloading the page mid-run.
if (import.meta.hot && new URLSearchParams(location.search).get('nohmr') === '1') {
  import.meta.hot.on('vite:beforeFullReload', () => { throw new Error('(preview: skipping full reload)'); });
  import.meta.hot.on('vite:beforeUpdate', () => { throw new Error('(preview: skipping hot update)'); });
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = createMockContext(7);
const ui = createUi(ctx);
const fit = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; ctx.mock.drawBackdrop(canvas); };
window.addEventListener('resize', fit); fit();

let last = performance.now(), redraw = 0;
function loop(ts: number): void {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
  if (!ctx.world.paused && !ui.modal) ctx.sim.update(dt * ctx.world.speed);
  ui.update(dt);
  redraw += dt; if (redraw > 0.5) { redraw = 0; ctx.mock.drawBackdrop(canvas); }
  ctx.input.endFrame();
}
requestAnimationFrame(loop);

const v = (id: string) => ctx.mock.villager(id);
const api = {
  ui, ctx, mock: ctx.mock, bus,
  show(what: string): void {
    (document.activeElement as HTMLElement | null)?.blur?.();
    ui.showTitle(false);
    switch (what) {
      case 'title': ui.showTitle(true); break;
      case 'hud': for (const id of ui.panels.openIds()) ui.panels.close(id); break;
      case 'dialogue': ui.openDialogue(v('cerys')); break;
      case 'inspector': ui.openInspector(v('ada')); break;
      case 'board': ui.openBoard(); break;
      case 'shop': ui.openShop(ctx.world.place('store')!); break;
      default: ui.panels.open(what as 'village' | 'director' | 'menu' | 'settings' | 'howto' | 'roster');
    }
  },
  press(code: string): void { press(code); },
  night(): void { const t = ctx.world.time; const target = 21.5 * 60; const cur = t.hour * 60 + t.min; ctx.sim.update(cur < target ? target - cur : 1440 - cur + target); ctx.mock.drawBackdrop(canvas); },
  rain(): void { ctx.world.weather.kind = 'rain'; bus.emit({ type: 'weather', weather: ctx.world.weather }); ctx.mock.drawBackdrop(canvas); },
  toast(): void { ui.toast('Cerys gave you a sweet roll.', 'good'); ui.toast('It is getting dark.', 'info'); ui.toast('You are out of energy.', 'warn'); },
  happen(): void { ctx.mock.happen(); },
  llm(on: boolean): void { ctx.mock.llm(on); },
  hover(id: string | null): void { ctx.mock.hover(id); },
  bar(show: boolean): void { bar.hidden = !show; },
};
function press(code: string, key?: string): void { window.dispatchEvent(new KeyboardEvent('keydown', { code, key: key ?? code.replace('Key', '').toLowerCase(), bubbles: true, cancelable: true })); }
(window as unknown as { __pbui: typeof api }).__pbui = api;

// dev bar
const bar = document.createElement('div');
bar.id = 'preview-bar';
bar.setAttribute('style', 'position:fixed;left:8px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:2px;z-index:1000;font:11px monospace;background:#000c;padding:6px;color:#fff;border-radius:4px');
const add = (label: string, fn: () => void) => { const b = document.createElement('button'); b.textContent = label; b.setAttribute('style', 'font:11px monospace;padding:2px 6px;text-align:left;cursor:pointer'); b.onclick = fn; bar.appendChild(b); };
for (const p of ['title', 'hud', 'dialogue', 'inspector', 'village', 'board', 'shop', 'director', 'menu']) add(p, () => api.show(p));
add('night', api.night); add('rain', api.rain); add('toasts', api.toast); add('happen', api.happen);
add('llm on', () => api.llm(true)); add('llm off', () => api.llm(false)); add('hover bram', () => api.hover('bram')); add('hover off', () => api.hover(null));
document.body.appendChild(bar);
if (new URLSearchParams(location.search).get('bar') === '0') bar.hidden = true;
