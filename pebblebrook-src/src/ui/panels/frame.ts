import { h, icon } from '../dom.ts';
import type { PanelId, UiCore } from '../shared.ts';

/** A framed window: wood header with title + key hint + close, parchment body, optional footer. */
export function frame(core: UiCore, id: PanelId, opts: { title: string; key?: string; cls?: string; pos?: 'center' | 'side' | 'bottom'; closable?: boolean; foot?: HTMLElement | null; headExtra?: HTMLElement[] }): { win: HTMLElement; body: HTMLElement; head: HTMLElement } {
  const body = h('div', { class: 'pb-body' });
  const head = h('div', { class: 'pb-head' }, h('span', null, opts.title), opts.key ? h('span', { class: 'pb-kbd' }, opts.key) : null, h('span', { class: 'spacer' }), ...(opts.headExtra ?? []),
    opts.closable === false ? null : h('button', { class: 'pb-x', title: 'Close (Esc)', 'aria-label': 'Close', onclick: () => core.close(id) }, icon('close')));
  const fr = h('div', { class: 'pb-frame' }, head, body, opts.foot ?? null);
  const win = h('div', { class: `pb-win ${opts.pos ?? 'center'} ${opts.cls ?? ''}`, id: `pb-${id}`, role: 'dialog', 'aria-label': opts.title }, fr);
  return { win, body, head };
}
