import { h, setHidden } from '../dom.ts';
import type { Panel, UiCore } from '../shared.ts';
import { frame } from './frame.ts';

export function createMenu(core: UiCore): Panel {
  const { ctx } = core;
  const { win, body } = frame(core, 'menu', { title: 'Paused', key: 'Esc', cls: 'pb-menu' });
  const loadBtn = h('button', { class: 'pb-btn wood', onclick: () => { if (ctx.load()) { core.close('menu'); core.toast('Village restored', 'good'); } else core.toast('No saved village found', 'warn'); } }, 'Load');
  body.append(
    h('button', { class: 'pb-btn', id: 'pb-resume', onclick: () => core.close('menu') }, 'Resume'),
    h('button', { class: 'pb-btn wood', onclick: () => { ctx.save(); core.toast('Village saved', 'good'); setHidden(loadBtn, !core.hasSave()); } }, 'Save'),
    loadBtn,
    h('button', { class: 'pb-btn wood', onclick: () => core.open('settings') }, 'Settings'),
    h('button', { class: 'pb-btn wood', onclick: () => core.open('howto') }, 'How to play'),
    h('div', { class: 'pb-sep' }),
    h('button', { class: 'pb-btn ghost', onclick: () => { core.close('menu'); core.showTitle(true); } }, 'Back to title'),
  );
  return { id: 'menu', el: win, modal: true, closable: true, show() { setHidden(loadBtn, !core.hasSave()); setTimeout(() => (body.querySelector('#pb-resume') as HTMLElement)?.focus(), 0); }, hide() {}, tick() {} };
}
