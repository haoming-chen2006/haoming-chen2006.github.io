import { item as itemDef } from '../../core/items.ts';
import type { ItemStack, Place } from '../../core/types.ts';
import { guardTextField, h, icon, img, replaceChildren, setClass, setHidden, setText, Throttle } from '../dom.ts';
import { shortName, simFn, type Panel, type UiCore } from '../shared.ts';
import { frame } from './frame.ts';

export interface ShopPanel extends Panel { open(place: Place): void }

export function createShop(core: UiCore): ShopPanel {
  const { ctx } = core;
  const moneyEl = h('span', { class: 'pb-money', style: 'color:var(--pb-gold-dark)' }, icon('coin'), h('span', null, '0'));
  const { win, body } = frame(core, 'shop', { title: 'Shop', cls: 'pb-shop', headExtra: [moneyEl] });
  const tabBuy = h('button', { class: 'pb-tab on', onclick: () => setTab('buy') }, 'Buy'), tabSell = h('button', { class: 'pb-tab', onclick: () => setTab('sell') }, 'Sell');
  const keeperEl = h('span', { class: 'pb-small pb-muted pb-right', style: 'align-self:center' });
  const stock = h('div', { class: 'stock' });
  const qtyIn = h('input', { class: 'pb-input', type: 'number', min: 1, max: 99, value: 1, 'aria-label': 'Quantity' });
  guardTextField(qtyIn);
  qtyIn.oninput = () => refreshFoot();
  const totalEl = h('span', { class: 'total' });
  const actBtn = h('button', { class: 'pb-btn', onclick: () => act() }, 'Buy');
  const foot = h('div', { class: 'pb-foot' }, h('span', { class: 'pb-muted grow', id: 'pb-shop-sel' }, 'Pick an item'), h('span', { class: 'qty' }, h('button', { class: 'pb-btn ghost', onclick: () => step(-1) }, '−'), qtyIn, h('button', { class: 'pb-btn ghost', onclick: () => step(1) }, '+')), totalEl, actBtn);
  body.append(h('div', { class: 'pb-tabs' }, tabBuy, tabSell, keeperEl), stock, foot);

  let place: Place | null = null, tab: 'buy' | 'sell' = 'buy', sel: string | null = null, lastKey = '';
  const th = new Throttle(0.5);
  const sellPrice = (id: string): number => { const f = simFn<(id: string, place?: string) => number>(ctx.sim, 'sellPriceOf'); return f ? f(id, place?.id) : Math.max(1, Math.floor(ctx.sim.priceOf(id, place?.id) * 0.6)); };
  const buyPrice = (id: string): number => ctx.sim.priceOf(id, place?.id);
  const stackOf = (): ItemStack | undefined => (tab === 'buy' ? (place ? ctx.sim.shopStock(place.id) : []) : ctx.sim.player.inventory).find((s) => s.id === sel);

  function setTab(t: 'buy' | 'sell'): void { tab = t; setClass(tabBuy, 'on', t === 'buy'); setClass(tabSell, 'on', t === 'sell'); sel = null; lastKey = ''; refresh(); }
  function step(d: number): void { qtyIn.value = String(Math.max(1, Math.min(99, (Number(qtyIn.value) || 1) + d))); refreshFoot(); }
  function refresh(): void {
    if (!place) return;
    const items = tab === 'buy' ? ctx.sim.shopStock(place.id) : ctx.sim.player.inventory;
    const key = `${tab}|${items.map((s) => `${s.id}${s.qty}`).join(',')}|${sel}|${Math.floor(ctx.sim.player.money)}`;
    if (key === lastKey) return;
    lastKey = key;
    setText(moneyEl.lastChild as Element, String(Math.floor(ctx.sim.player.money)));
    replaceChildren(stock, items.length ? items.filter((s) => s.qty > 0).map((s) => {
      const d = itemDef(s.id); const price = tab === 'buy' ? buyPrice(s.id) : sellPrice(s.id);
      const row = h('div', { class: `it ${sel === s.id ? 'sel' : ''}`, tabindex: 0, role: 'button', onclick: () => { sel = s.id; lastKey = ''; refresh(); }, onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') { sel = s.id; act(); } } },
        img(core.itemIcon(s.id, 32), 'pb-item'), h('div', null, h('b', null, d.name), h('div', { class: 'd' }, d.description)), h('span', { class: 'st' }, tab === 'buy' ? (s.qty >= 99 ? 'plenty' : `${s.qty} left`) : `you have ${s.qty}`), h('span', { class: 'pr' }, icon('coin'), ` ${price}`),
        h('button', { class: 'pb-btn sm', disabled: tab === 'buy' && ctx.sim.player.money < price, onclick: (e: Event) => { e.stopPropagation(); sel = s.id; qtyIn.value = '1'; act(); } }, tab === 'buy' ? 'Buy 1' : 'Sell 1'));
      return row;
    }) : [h('div', { class: 'pb-empty' }, tab === 'buy' ? 'Nothing on the shelves right now.' : 'You have nothing to sell.')]);
    refreshFoot();
  }
  function refreshFoot(): void {
    const s = stackOf(); const q = Math.max(1, Math.min(99, Number(qtyIn.value) || 1));
    const selEl = foot.querySelector('#pb-shop-sel') as HTMLElement;
    if (!s) { setText(selEl, 'Pick an item'); setText(totalEl, ''); actBtn.disabled = true; setText(actBtn, tab === 'buy' ? 'Buy' : 'Sell'); return; }
    const unit = tab === 'buy' ? buyPrice(s.id) : sellPrice(s.id); const total = unit * q;
    setText(selEl, `${itemDef(s.id).name} × ${q}`); totalEl.replaceChildren(icon('coin'), ` ${total}`);
    const ok = tab === 'buy' ? ctx.sim.player.money >= total && s.qty >= q : s.qty >= q;
    actBtn.disabled = !ok; setText(actBtn, tab === 'buy' ? (ctx.sim.player.money < total ? 'Not enough coins' : 'Buy') : 'Sell');
  }
  function act(): void {
    if (!place) return;
    const s = stackOf(); if (!s) return;
    const q = Math.max(1, Math.min(99, Number(qtyIn.value) || 1));
    if (tab === 'buy') {
      if (ctx.sim.player.money < buyPrice(s.id) * q || s.qty < q) { core.toast('Not enough coins', 'warn'); return; }
      const r = ctx.sim.playerBuy(place.id, s.id, q);
      if (!r.ok) { core.toast(r.message || 'The shopkeeper shakes their head', 'warn'); return; }
      core.toast(`Bought ${itemDef(s.id).name} × ${q} for ${r.cost}`, 'good');
    } else {
      if (s.qty < q) return;
      const r = ctx.sim.playerSell(place.id, s.id, q);
      if (!r.ok) { core.toast(r.message || 'They do not want that', 'warn'); return; }
      core.toast(`Sold ${itemDef(s.id).name} × ${q} for ${r.earned}`, 'good');
    }
    lastKey = ''; refresh();
  }
  function open(p: Place): void {
    place = p; sel = null; qtyIn.value = '1'; lastKey = '';
    const head = win.querySelector('.pb-head > span') as HTMLElement; setText(head, p.name);
    const keeper = p.owner ? ctx.sim.villager(p.owner) : undefined;
    setText(keeperEl, keeper ? `${shortName(keeper)} keeps the counter` : ''); setHidden(keeperEl, !keeper);
    setTab('buy');
  }
  return { id: 'shop', el: win, modal: true, closable: true, show() { lastKey = ''; refresh(); }, hide() {}, tick(dt) { if (th.tick(dt)) refresh(); }, open };
}
