import { bus } from '../../core/bus.ts';
import { ITEMS, item as itemDef } from '../../core/items.ts';
import type { Request } from '../../core/types.ts';
import { guardTextField, h, icon, img, replaceChildren, setHidden, setText, Throttle } from '../dom.ts';
import { fmtAgo, fmtDuration, shortName, type Panel, type UiCore } from '../shared.ts';
import { frame } from './frame.ts';

export function createBoard(core: UiCore): Panel {
  const { ctx } = core;
  const postBtn = h('button', { class: 'pb-btn', onclick: () => { setHidden(form, !form.hidden); if (!form.hidden) text.focus(); } }, icon('pin'), 'Post a request');
  const { win, body } = frame(core, 'board', { title: 'Notice board', key: 'B', cls: 'pb-board', foot: h('div', { class: 'pb-foot' }, h('span', { class: 'pb-small pb-muted grow' }, 'Villagers pin what they need. Accept one, bring the goods, get the reward.'), postBtn) });
  const list = h('div', { class: 'pb-list', style: 'gap:8px' });
  const text = h('textarea', { class: 'pb-textarea', placeholder: 'What do you need? e.g. "Three trout for a soup, will pay."', maxlength: 200, style: 'min-height:56px' });
  const reward = h('input', { class: 'pb-input', type: 'number', min: 0, max: 9999, value: 20, style: 'width:90px', 'aria-label': 'Reward coins' });
  const needItem = h('select', { class: 'pb-select', style: 'width:180px', 'aria-label': 'Item needed' }, h('option', { value: '' }, 'no item needed'), ...ITEMS.map((i) => h('option', { value: i.id }, i.name)));
  const needQty = h('input', { class: 'pb-input', type: 'number', min: 1, max: 99, value: 1, style: 'width:64px', 'aria-label': 'Quantity' });
  for (const f of [text, reward, needQty]) guardTextField(f);
  const form = h('div', { class: 'pb-card', hidden: true, style: 'margin-bottom:8px' }, h('h3', null, 'Your notice'), text,
    h('div', { class: 'pb-row wrap', style: 'margin-top:8px' }, h('span', null, 'Reward'), icon('coin'), reward, h('span', null, 'Needs'), needItem, needQty, h('span', { class: 'pb-right' }), h('button', { class: 'pb-btn ghost', onclick: () => setHidden(form, true) }, 'Cancel'), h('button', { class: 'pb-btn', onclick: () => post() }, 'Pin it')));
  body.append(form, list);

  function post(): void {
    const t = text.value.trim(); if (!t) { core.toast('Write what you need first', 'warn'); return; }
    const money = Math.max(0, Math.floor(Number(reward.value) || 0));
    if (money > ctx.sim.player.money) { core.toast('You cannot promise more coins than you have', 'warn'); return; }
    const needs = needItem.value ? [{ id: needItem.value, qty: Math.max(1, Math.floor(Number(needQty.value) || 1)) }] : [];
    ctx.sim.postRequest('player', t, { money }, needs);
    text.value = ''; setHidden(form, true); core.toast('Pinned to the board', 'good'); lastKey = '';
  }

  function accept(r: Request): void {
    if (!ctx.sim.playerAcceptRequest(r.id)) { core.toast('Could not accept that request', 'warn'); return; }
    core.toast(`Accepted ${r.by === 'player' ? 'your own' : shortName(ctx.sim.villager(r.by) ?? { name: r.by }) + '’s'} request`, 'good'); lastKey = '';
  }
  function complete(r: Request): void {
    const res = ctx.sim.playerCompleteRequest(r.id);
    if (!res.ok) { core.toast(res.message || 'You do not have what it needs yet', 'warn'); return; }
    core.toast(`${res.message ? `${res.message} ` : 'Done! '}${r.reward.money ? `+${r.reward.money} coins` : ''}${r.reward.item ? ` +${itemDef(r.reward.item.id).name}` : ''}`.trim(), 'good'); lastKey = '';
  }

  let lastKey = '';
  const th = new Throttle(0.5);
  function refresh(): void {
    const now = ctx.world.time.minute;
    const reqs = [...ctx.sim.requests].sort((a, b) => Number(!!a.done) - Number(!!b.done) || b.postedAt - a.postedAt);
    const key = reqs.map((r) => `${r.id}${r.acceptedBy ?? ''}${r.done ? 1 : 0}`).join(',') + '|' + ctx.sim.player.inventory.map((s) => `${s.id}${s.qty}`).join(',');
    if (key === lastKey) return;
    lastKey = key;
    replaceChildren(list, reqs.length ? reqs.map((r) => {
      const poster = r.by === 'player' ? null : ctx.sim.villager(r.by);
      const mine = r.by === 'player', accepted = r.acceptedBy === 'player';
      const canDo = r.needs.every((n) => ctx.sim.has(ctx.sim.player, n.id, n.qty));
      const acts: HTMLElement[] = [];
      const expired = r.expired || (r.expiresAt <= now && !r.done);
      if (r.done) acts.push(h('span', { class: 'pb-chip good' }, r.acceptedBy && r.acceptedBy !== 'player' ? `done by ${shortName(ctx.sim.villager(r.acceptedBy) ?? { name: r.acceptedBy })}` : 'done'));
      else if (expired) acts.push(h('span', { class: 'pb-chip muted' }, 'expired'));
      else if (mine) acts.push(h('span', { class: 'pb-chip muted' }, r.acceptedBy ? `${shortName(ctx.sim.villager(r.acceptedBy) ?? { name: r.acceptedBy })} took it` : 'waiting'));
      else if (accepted) acts.push(h('button', { class: 'pb-btn sm', disabled: !canDo, title: canDo ? 'Hand over the goods' : 'You do not have everything yet', onclick: () => complete(r) }, 'Complete'));
      else if (r.acceptedBy) acts.push(h('span', { class: 'pb-chip muted' }, `${shortName(ctx.sim.villager(r.acceptedBy) ?? { name: r.acceptedBy })} took it`));
      else { acts.push(h('button', { class: 'pb-btn sm', onclick: () => accept(r) }, 'Accept')); if (canDo && !r.needs.length) acts.push(h('button', { class: 'pb-btn ghost sm', onclick: () => { accept(r); complete(r); } }, 'Do it now')); }
      return h('div', { class: `pb-req ${r.done || expired ? 'done' : ''}` }, h('span', { class: 'pin pb-ico' }, icon('pin')),
        poster ? img(core.portrait(poster), 'pb-portrait', poster.name) : img(core.portrait('player'), 'pb-portrait', 'You'),
        h('div', null, h('div', { class: 'by' }, poster ? poster.name : 'You', h('span', { class: 'pb-small pb-mute2' }, ` · ${fmtAgo(r.postedAt, now)}${r.expiresAt > now ? ` · ${fmtDuration(r.expiresAt - now)} left` : ' · expired'}`)), h('div', { class: 'txt' }, r.text),
          h('div', { class: 'meta' }, h('span', { class: 'needs' }, 'Needs:', r.needs.length ? r.needs.map((n) => h('span', { class: `pb-chip ${ctx.sim.has(ctx.sim.player, n.id, n.qty) ? 'good' : ''}`, title: itemDef(n.id).description }, img(core.itemIcon(n.id, 32), 'pb-item sm', ''), `${itemDef(n.id).name} ×${n.qty}`)) : h('span', { class: 'pb-muted' }, 'a favour')),
            h('span', { class: 'needs' }, 'Reward:', r.reward.money ? h('span', { class: 'pb-chip gold' }, icon('coin'), String(r.reward.money)) : null, r.reward.item ? h('span', { class: 'pb-chip gold' }, img(core.itemIcon(r.reward.item.id, 32), 'pb-item sm', ''), `${itemDef(r.reward.item.id).name}${r.reward.item.qty > 1 ? ` ×${r.reward.item.qty}` : ''}`) : null, !r.reward.money && !r.reward.item ? h('span', { class: 'pb-muted' }, 'gratitude') : null))),
        h('div', { class: 'acts' }, ...acts));
    }) : [h('div', { class: 'pb-empty' }, 'The board is empty. Pin something?')]);
  }
  const off = bus.on('request', () => { lastKey = ''; });
  void off;
  return { id: 'board', el: win, modal: true, closable: true, show() { lastKey = ''; refresh(); setHidden(form, true); }, hide() {}, tick(dt) { if (th.tick(dt)) refresh(); } };
}
void setText;
