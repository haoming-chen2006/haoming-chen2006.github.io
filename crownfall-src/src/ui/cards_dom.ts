import { CARD_BY_ID } from '../game/cards.ts';
import type { CardDef } from '../game/types.ts';
import { cardThumbnail } from '../render3d/thumbnails.ts';

/** Build a card element with a 3D-rendered thumbnail, cost gem and rarity frame. */
export function makeCardEl(card: CardDef, size = 96, hotkey?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.card = card.id;
  el.dataset.rarity = card.rarity;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${card.name}, cost ${card.cost}, ${card.rarity} ${card.kind}`);
  const art = cardThumbnail(card, 128, 170);
  const cv = document.createElement('canvas');
  cv.width = art.width; cv.height = art.height;
  cv.getContext('2d')!.drawImage(art, 0, 0);
  el.appendChild(cv);
  void size;
  const cost = document.createElement('div'); cost.className = 'cost'; cost.textContent = String(card.cost);
  const name = document.createElement('div'); name.className = 'name'; name.textContent = card.name;
  el.appendChild(cost); el.appendChild(name);
  if (hotkey) { const k = document.createElement('div'); k.className = 'key'; k.textContent = hotkey; el.appendChild(k); }
  return el;
}

const roleLabel: Record<string, string> = { tank: 'Tank', dps: 'Damage dealer', ranged: 'Ranged', splash: 'Splash', swarm: 'Swarm', support: 'Support', assassin: 'Assassin', wincon: 'Win condition', air: 'Air' };
const RARITY_COLOR: Record<CardDef['rarity'], string> = { common: '#9fb0c2', rare: '#f09a3a', epic: '#b06bff', legendary: '#35e0d0' };

export function cardDetailHtml(card: CardDef): string {
  const stat = (k: string, v: string | number) => `<span>${k}</span><span>${v}</span>`;
  const rows: string[] = [stat('Cost', `${card.cost} elixir`)];
  if (card.kind === 'troop') {
    rows.push(stat('Health', card.hp), stat('Damage', card.damage), stat('Hit speed', `${card.hitSpeed}s`), stat('DPS', Math.round(card.damage / card.hitSpeed)),
      stat('Range', card.range <= 1 ? 'Melee' : card.range), stat('Speed', card.speed >= 2 ? 'Very fast' : card.speed >= 1.5 ? 'Fast' : card.speed >= 1 ? 'Medium' : 'Slow'),
      stat('Targets', card.targets === 'both' ? 'Air & Ground' : card.targets === 'buildings' ? 'Buildings' : card.targets === 'ground' ? 'Ground' : 'Air'),
      stat('Count', card.count), stat('Role', roleLabel[card.role] ?? card.role));
    if (card.splash) rows.push(stat('Splash radius', card.splash));
    if (card.flying) rows.push(stat('Flying', 'Yes'));
    if (card.charge) rows.push(stat('Charge', `x${card.charge.dmgMult} dmg`));
    if (card.chain) rows.push(stat('Chain', `${card.chain.count} extra targets`));
    if (card.healAura) rows.push(stat('Heal aura', `${card.healAura.hps}/s`));
  } else if (card.kind === 'building') {
    rows.push(stat('Health', card.hp), stat('Lifetime', `${card.lifetime}s`));
    if (card.damage > 0) rows.push(stat('Damage', card.damage), stat('Hit speed', `${card.hitSpeed}s`), stat('Range', card.range), stat('Targets', card.targets === 'both' ? 'Air & Ground' : 'Ground'));
    if (card.spawn) rows.push(stat('Spawns', `${card.spawn.unit} / ${card.spawn.every}s`));
  } else {
    rows.push(stat('Radius', card.radius));
    if (card.damage) rows.push(stat('Damage', card.damage), stat('Tower damage', Math.round(card.damage * card.towerMult)));
    if (card.stun) rows.push(stat('Stun', `${card.stun}s`));
    if (card.freeze) rows.push(stat('Freeze', `${card.freeze}s`));
    if (card.rage) rows.push(stat('Buff', `+${Math.round((card.rage.speed - 1) * 100)}% for ${card.rage.duration}s`));
  }
  let ability = '';
  if (card.kind === 'troop') {
    const a = card.ability;
    ability = `<div class="ability"><b>⚡ ${a.name}</b> <span class="muted">· ${a.cooldown}s cooldown</span><br>${a.desc}</div>`;
  }
  const kind = card.kind === 'troop' ? 'Troop' : card.kind === 'building' ? 'Building' : 'Spell';
  return `<div class="detail-top"><canvas data-thumb="${card.id}" width="128" height="170"></canvas><div><h3>${card.name}</h3><div class="rarity" style="color:${RARITY_COLOR[card.rarity]}">${card.rarity} ${kind}</div></div></div><p class="muted">${card.desc}</p><div class="stats">${rows.join('')}</div>${ability}`;
}

/** After inserting cardDetailHtml into the DOM, paint the thumbnail canvas it contains. */
export function paintDetailThumb(root: HTMLElement): void {
  const cv = root.querySelector<HTMLCanvasElement>('canvas[data-thumb]');
  if (!cv) return;
  const card = CARD_BY_ID[cv.dataset.thumb ?? ''];
  if (!card) return;
  const art = cardThumbnail(card, 128, 170);
  cv.width = art.width; cv.height = art.height;
  cv.getContext('2d')!.drawImage(art, 0, 0);
}
