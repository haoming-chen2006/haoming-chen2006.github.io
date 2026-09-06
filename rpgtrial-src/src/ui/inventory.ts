// Inventory: paperdoll (equipment), stats, gold, item grid with rarity borders and tooltips, detail panel with equip/use.
import type { ItemDef, InventorySlot, EquipSlot } from '../sim/types.ts';
import { h, button, ornament, sfx, clear, esc, abilityMod, fmtMod } from './dom.ts';
import { icon } from './icons.ts';
import { getItem, RARITY_COLOR, prettify } from './content.ts';
import type { UIContext, Screen } from './types.ts';
import { screenTabs, closeButton, type Nav } from './tabs.ts';

const EQUIP_SLOTS: { slot: EquipSlot; label: string; icon: string }[] = [
  { slot: 'mainHand', label: 'Main hand', icon: 'sword' }, { slot: 'offHand', label: 'Off hand', icon: 'shield' },
  { slot: 'armor', label: 'Armour', icon: 'armor' }, { slot: 'ring', label: 'Ring', icon: 'ring' }, { slot: 'amulet', label: 'Amulet', icon: 'gem' },
];
const KINDS = ['all', 'weapon', 'armor', 'potion', 'scroll', 'quest', 'misc'];

export function itemTooltip(it: ItemDef, qty = 1): string {
  const rows: string[] = [];
  if (it.weapon) rows.push(`<div class="tt-row"><span>Damage</span><b>${it.weapon.damage} ${it.weapon.type}</b></div>`);
  if (it.weapon) { const props = [it.weapon.twoHanded && 'two-handed', it.weapon.finesse && 'finesse', it.weapon.light && 'light', it.weapon.ranged && 'ranged'].filter(Boolean).join(', '); if (props) rows.push(`<div class="tt-row"><span>Properties</span><b>${props}</b></div>`); }
  if (it.armor) rows.push(`<div class="tt-row"><span>Armour class</span><b>${it.armor.ac}${it.armor.dexCap !== undefined ? ` + Dex (max ${it.armor.dexCap})` : ' + Dex'}</b></div>`);
  if (it.shield) rows.push(`<div class="tt-row"><span>Armour class</span><b>+${it.shield.ac}</b></div>`);
  if (it.ring?.ac) rows.push(`<div class="tt-row"><span>Armour class</span><b>+${it.ring.ac}</b></div>`);
  if (it.potion?.heal) rows.push(`<div class="tt-row"><span>Heals</span><b>${it.potion.heal}</b></div>`);
  if (it.spell) rows.push(`<div class="tt-row"><span>Casts</span><b>${prettify(it.spell)}</b></div>`);
  if (it.value) rows.push(`<div class="tt-row"><span>Value</span><b>${it.value} gp</b></div>`);
  const col = RARITY_COLOR[it.rarity ?? 'common'];
  return `<div class="tt-name" style="color:${col}"><span>${esc(it.name)}</span>${qty > 1 ? `<span>×${qty}</span>` : ''}</div><div class="tt-kind">${esc(it.rarity ?? 'common')} ${esc(it.kind)}</div><div class="tt-desc">${esc(it.description)}</div>${rows.join('')}`;
}
export const rarityClass = (it: ItemDef) => it.rarity === 'uncommon' ? 'r-uncommon' : it.rarity === 'rare' ? 'r-rare' : it.rarity === 'very rare' ? 'r-very' : it.rarity === 'legendary' ? 'r-legendary' : '';

export function createInventory(ctx: UIContext, nav: Nav): Screen {
  const paperdoll = h('div.paperdoll'); const stats = h('div'); const goldRow = h('div.gold-row');
  const filters = h('div.inv-filters'); const grid = h('div.inv-grid'); const detail = h('div.inv-detail');
  const left = h('div.col', h('h3.sec', 'Equipment'), paperdoll, h('h3.sec', 'Defence'), stats, goldRow);
  const right = h('div.col', filters, grid, detail);
  const panel = ornament(h('div.panel.blur.big-panel.content', closeButton(nav), screenTabs('inventory', nav), h('div.cols.inv', left, right)));
  const el = h('div.screen#inventory', h('div.veil'), panel);
  let selected: string | null = null; let filter = 'all';

  const world = () => ctx.world as any;
  const inventory = (): InventorySlot[] => Array.isArray(world().inventory) ? world().inventory : [];
  const equipment = (): Partial<Record<EquipSlot, string | null>> => world().equipment ?? {};
  const isEquipped = (id: string) => Object.values(equipment()).includes(id);

  function render() {
    const p = ctx.world.player; const inv = inventory(); const eq = equipment();
    // paperdoll
    clear(paperdoll);
    for (const s of EQUIP_SLOTS) {
      const id = eq[s.slot]; const it = id ? getItem(id) : null;
      const slot = h('div.eq-slot', { 'data-tip': it ? itemTooltip(it) : '', onclick: () => { if (id) { selected = id; render(); sfx('click'); } } },
        h('div.ei' + (it ? '' : '.empty'), { html: icon(it ? it.icon : s.icon) }),
        h('div', h('div.es', s.label), h('div.en', it ? it.name : '—')));
      paperdoll.appendChild(slot);
    }
    // stats
    clear(stats);
    if (p) {
      const rows: [string, string, string][] = [
        ['ac', 'Armour class', String(p.ac)], ['heal', 'Hit points', `${Math.ceil(p.hp)} / ${p.maxHp}`], ['boot', 'Dexterity', fmtMod(abilityMod(p.abilities.dex))],
        ['weight', 'Carried', `${inv.reduce((n, s) => n + s.qty, 0)} items`],
      ];
      for (const [ic, l, v] of rows) stats.appendChild(h('div.stat-row', h('span.l', { html: icon(ic) + esc(l) }), h('b', v)));
    }
    goldRow.innerHTML = `${icon('coin')}<b>${world().gold ?? 0}</b><span>gold</span><span class="w">${inv.length} stacks</span>`;
    // filters
    clear(filters);
    for (const k of KINDS) filters.appendChild(h('button', { type: 'button', class: k === filter ? 'on' : '', onclick: () => { filter = k; sfx('click'); render(); } }, k));
    // grid
    clear(grid);
    const shown = inv.filter((s) => { const it = getItem(s.itemId); return filter === 'all' || it.kind === filter || (filter === 'armor' && it.kind === 'shield') || (filter === 'misc' && (it.kind === 'ring' || it.kind === 'food')); });
    for (const s of shown) {
      const it = getItem(s.itemId);
      const slot = h('div.inv-slot' + (selected === s.itemId ? '.sel' : ''), { class: rarityClass(it), 'data-tip': itemTooltip(it, s.qty), onclick: () => { selected = s.itemId; sfx('click'); render(); }, ondblclick: () => act(it) },
        h('span.pic', { html: icon(it.icon) }), s.qty > 1 ? h('span.q', String(s.qty)) : null, isEquipped(s.itemId) ? h('span.eq', 'EQ') : null);
      slot.classList.add('inv-slot'); if (selected === s.itemId) slot.classList.add('sel');
      slot.style.color = RARITY_COLOR[it.rarity ?? 'common'];
      grid.appendChild(slot);
    }
    const pad = Math.max(0, 30 - shown.length);
    for (let i = 0; i < pad; i++) grid.appendChild(h('div.inv-slot.empty'));
    // detail
    clear(detail);
    const sel = selected ? inv.find((s) => s.itemId === selected) : null;
    if (!sel) { detail.appendChild(h('div.empty', inv.length ? 'Select an item to inspect it.' : 'Your pack is empty. The shore may hold something worth taking.')); return; }
    const it = getItem(sel.itemId);
    const actions = h('div.da');
    const equippable = it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'shield' || it.kind === 'ring';
    if (equippable) actions.appendChild(button(isEquipped(it.id) ? 'Unequip' : 'Equip', () => act(it), 'small'));
    if (it.kind === 'potion' || it.kind === 'scroll' || it.kind === 'food') actions.appendChild(button('Use', () => act(it), 'small primary'));
    if (it.kind !== 'quest') actions.appendChild(button('Drop', () => { const w = world(); const fn = w.dropItem ?? w.removeItem; if (typeof fn === 'function') { fn.call(w, it.id, 1); sfx('click'); if (!inventory().some((s) => s.itemId === it.id)) selected = null; render(); } }, 'small ghost'));
    detail.append(h('div.di', { style: { color: RARITY_COLOR[it.rarity ?? 'common'] } }, h('span.pic', { html: icon(it.icon) })),
      h('div', { style: { flex: '1' } }, h('div.dn', { style: { color: RARITY_COLOR[it.rarity ?? 'common'] } }, it.name), h('div.dk', `${it.rarity ?? 'common'} ${it.kind}${sel.qty > 1 ? ` · ×${sel.qty}` : ''}`), h('div.dd', it.description),
        h('div.ds', { html: detailStats(it) }), actions));
  }
  function detailStats(it: ItemDef) {
    const s: string[] = [];
    if (it.weapon) s.push(`<span>${icon('sword')}${it.weapon.damage} ${it.weapon.type}</span>`);
    if (it.armor) s.push(`<span>${icon('ac')}AC ${it.armor.ac}${it.armor.dexCap !== undefined ? ` + Dex (max ${it.armor.dexCap})` : ' + Dex'}</span>`);
    if (it.shield) s.push(`<span>${icon('shield')}+${it.shield.ac} AC</span>`);
    if (it.potion?.heal) s.push(`<span>${icon('heal')}Heals ${it.potion.heal}</span>`);
    if (it.value) s.push(`<span>${icon('coin')}${it.value} gp</span>`);
    return s.join('');
  }
  function act(it: ItemDef) {
    const w = world();
    if (it.kind === 'potion' || it.kind === 'scroll' || it.kind === 'food') { if (typeof w.useItem === 'function') w.useItem(it.id); sfx('click'); }
    else if (isEquipped(it.id)) { const slot = (Object.keys(equipment()) as EquipSlot[]).find((k) => equipment()[k] === it.id); if (slot && typeof w.unequip === 'function') w.unequip(slot); sfx('equip'); }
    else { if (typeof w.equip === 'function') w.equip(it.id); sfx('equip'); }
    setTimeout(render, 30);
  }
  return {
    el,
    open() { render(); el.classList.add('on'); },
    close() { el.classList.remove('on'); },
    key(code) { if (code === 'Escape' || code === 'KeyI') { nav.close(); return true; } if (code === 'KeyC') { nav.show('character'); return true; } if (code === 'KeyJ') { nav.show('journal'); return true; } if (code === 'KeyM') { nav.show('map'); return true; } return true; },
  };
}
