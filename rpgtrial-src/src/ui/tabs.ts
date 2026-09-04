// Shared tab bar for the four full-screen panels (Inventory / Character / Journal / Map) and a tiny nav contract.
import { h, kbd, sfx } from './dom.ts';
import { icon } from './icons.ts';
import type { ScreenName } from './types.ts';

export interface Nav { show(name: ScreenName): void; back(): void; close(): void }

const TABS: { name: ScreenName; label: string; key: string; icon: string }[] = [
  { name: 'inventory', label: 'Inventory', key: 'I', icon: 'bag' },
  { name: 'character', label: 'Character', key: 'C', icon: 'person' },
  { name: 'journal', label: 'Journal', key: 'J', icon: 'quest' },
  { name: 'map', label: 'Map', key: 'M', icon: 'map' },
];
export function screenTabs(active: ScreenName, nav: Nav): HTMLElement {
  return h('div.tabs', TABS.map((t) => h('button.tab' + (t.name === active ? '.on' : ''), { type: 'button', onclick: () => { if (t.name !== active) { sfx('click'); nav.show(t.name); } } },
    h('span', { html: icon(t.icon) }), t.label, kbd(t.key))));
}
export function closeButton(nav: Nav): HTMLElement {
  return h('button.close-x', { type: 'button', title: 'Close (Esc)', html: icon('close'), onclick: () => { sfx('close'); nav.close(); } });
}
