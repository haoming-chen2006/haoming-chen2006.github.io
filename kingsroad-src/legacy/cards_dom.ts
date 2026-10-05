import { CARD_BY_ID } from '../game/cards.ts';
import type { CardDef } from '../game/types.ts';
import { abilityDesc, abilityName, cardDesc, cardName, t } from '../i18n.ts';
import { cardThumbnail } from '../render3d/thumbnails.ts';

/** Build a card element with a 3D-rendered thumbnail, cost gem and rarity frame. */
export function makeCardEl(card: CardDef, size = 96, hotkey?: string): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.card = card.id;
  el.dataset.rarity = card.rarity;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', t('detail.aria', { name: cardName(card), cost: card.cost, rarity: t(`rarity.${card.rarity}`), kind: t(`kind.${card.kind}`) }));
  const art = cardThumbnail(card, 128, 170);
  const cv = document.createElement('canvas');
  cv.width = art.width; cv.height = art.height;
  cv.getContext('2d')!.drawImage(art, 0, 0);
  el.appendChild(cv);
  void size;
  const cost = document.createElement('div'); cost.className = 'cost'; cost.textContent = String(card.cost);
  const name = document.createElement('div'); name.className = 'name'; name.textContent = cardName(card);
  el.appendChild(cost); el.appendChild(name);
  if (hotkey) { const k = document.createElement('div'); k.className = 'key'; k.textContent = hotkey; el.appendChild(k); }
  return el;
}

const RARITY_COLOR: Record<CardDef['rarity'], string> = { common: '#9fb0c2', rare: '#f09a3a', epic: '#b06bff', legendary: '#35e0d0' };

export function cardDetailHtml(card: CardDef): string {
  const stat = (k: string, v: string | number) => `<span>${k}</span><span>${v}</span>`;
  const secs = (n: number) => t('stat.seconds', { n });
  const rows: string[] = [stat(t('stat.cost'), t('stat.costValue', { n: card.cost }))];
  if (card.kind === 'troop') {
    rows.push(stat(t('stat.health'), card.hp), stat(t('stat.damage'), card.damage), stat(t('stat.hitSpeed'), secs(card.hitSpeed)), stat(t('stat.dps'), Math.round(card.damage / card.hitSpeed)),
      stat(t('stat.range'), card.range <= 1 ? t('range.melee') : card.range),
      stat(t('stat.speed'), t(card.speed >= 2 ? 'speed.veryFast' : card.speed >= 1.5 ? 'speed.fast' : card.speed >= 1 ? 'speed.medium' : 'speed.slow')),
      stat(t('stat.targets'), t(`targets.${card.targets}`)),
      stat(t('stat.count'), card.count), stat(t('stat.role'), t(`role.${card.role}`)));
    if (card.splash) rows.push(stat(t('stat.splashRadius'), card.splash));
    if (card.flying) rows.push(stat(t('stat.flying'), t('common.yes')));
    if (card.charge) rows.push(stat(t('stat.charge'), t('stat.chargeValue', { n: card.charge.dmgMult })));
    if (card.chain) rows.push(stat(t('stat.chain'), t('stat.chainValue', { n: card.chain.count })));
    if (card.healAura) rows.push(stat(t('stat.healAura'), t('stat.perSecond', { n: card.healAura.hps })));
  } else if (card.kind === 'building') {
    rows.push(stat(t('stat.health'), card.hp), stat(t('stat.lifetime'), secs(card.lifetime)));
    if (card.damage > 0) rows.push(stat(t('stat.damage'), card.damage), stat(t('stat.hitSpeed'), secs(card.hitSpeed)), stat(t('stat.range'), card.range), stat(t('stat.targets'), t(card.targets === 'both' ? 'targets.both' : 'targets.ground')));
    if (card.spawn) rows.push(stat(t('stat.spawns'), t('stat.spawnsValue', { unit: cardName(CARD_BY_ID[card.spawn.unit]), n: card.spawn.every })));
  } else {
    rows.push(stat(t('stat.radius'), card.radius));
    if (card.damage) rows.push(stat(t('stat.damage'), card.damage), stat(t('stat.towerDamage'), Math.round(card.damage * card.towerMult)));
    if (card.stun) rows.push(stat(t('stat.stun'), secs(card.stun)));
    if (card.freeze) rows.push(stat(t('stat.freeze'), secs(card.freeze)));
    if (card.rage) rows.push(stat(t('stat.buff'), t('stat.buffValue', { n: Math.round((card.rage.speed - 1) * 100), d: card.rage.duration })));
  }
  let ability = '';
  if (card.kind === 'troop') {
    ability = `<div class="ability"><b>⚡ ${abilityName(card)}</b> <span class="muted">${t('detail.cooldown', { n: card.ability.cooldown })}</span><br>${abilityDesc(card)}</div>`;
  }
  const rarityKind = t('detail.rarityKind', { rarity: t(`rarity.${card.rarity}`), kind: t(`kind.${card.kind}`) });
  return `<div class="detail-top"><canvas data-thumb="${card.id}" width="128" height="170"></canvas><div><h3>${cardName(card)}</h3><div class="rarity" style="color:${RARITY_COLOR[card.rarity]}">${rarityKind}</div></div></div><p class="muted">${cardDesc(card)}</p><div class="stats">${rows.join('')}</div>${ability}`;
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
