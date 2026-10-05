import { skillDamage } from '../game/abilities.ts';
import { ITEMS, ITEM_LIST, itemDef } from '../game/items.ts';
import type { Seat, Team, Unit } from '../game/types.ts';
import { World } from '../game/world.ts';
import { cardName, itemName, skillDesc, skillName, t, tSim } from '../i18n.ts';
import { cardThumbnail } from '../render3d/thumbnails.ts';
import { isMine, teamCss } from '../render3d/perspective.ts';

const $ = (id: string): HTMLElement => { const el = document.getElementById(id); if (!el) throw new Error(`missing #${id}`); return el; };
const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export interface HudState {
  me: Team;
  hero: Unit | undefined;
  seat: Seat | undefined;
  mode: string;
  locked: boolean;
  scoreboard: boolean;
  shop: boolean;
  online: boolean;
}

export class Hud {
  onBuy: (id: string) => void = () => {};
  onAutoBuy: (on: boolean) => void = () => {};
  onShopToggle: (open: boolean) => void = () => {};
  private skillEls: HTMLElement[] = [];
  private itemEls: HTMLElement[] = [];
  private lastPortrait = '';
  private feedTimer = 0;
  private lastShopKey = '';
  private bannerT = 0;
  private lastScoreKey = '';

  constructor() {
    $('btnShop').addEventListener('click', () => this.onShopToggle(true));
    $('btnShopClose').addEventListener('click', () => this.onShopToggle(false));
    ($('autoBuy') as HTMLInputElement).addEventListener('change', (e) => this.onAutoBuy((e.target as HTMLInputElement).checked));
  }

  reset(w: World, me: Team): void {
    this.lastPortrait = ''; this.lastShopKey = ''; this.lastScoreKey = '';
    $('feed').innerHTML = ''; $('toast').innerHTML = ''; $('streak').classList.add('hidden'); $('banner').classList.add('hidden'); $('countdown').classList.add('hidden');
    $('respawn').classList.add('hidden'); $('scoreboard').classList.add('hidden'); $('shop').classList.add('hidden');
    const skills = $('skills'); skills.innerHTML = ''; this.skillEls = [];
    const keys = ['1', '2', '3'];
    for (let i = 0; i < 3; i++) {
      const el = document.createElement('div'); el.className = 'skill'; el.innerHTML = `<div class="sk-icon"></div><div class="sk-cd"></div><div class="sk-key">${keys[i]}</div><div class="sk-rank"></div><div class="sk-name"></div>`;
      skills.appendChild(el); this.skillEls.push(el);
    }
    for (const [key, cls, label] of [['Space', 'dash', '⇢'], ['F', 'flash', '✦'], ['B', 'recall', '⌂']]) {
      const el = document.createElement('div'); el.className = `skill util ${cls}`; el.innerHTML = `<div class="sk-icon">${label}</div><div class="sk-cd"></div><div class="sk-key">${key}</div>`;
      skills.appendChild(el); this.skillEls.push(el);
    }
    const items = $('items'); items.innerHTML = ''; this.itemEls = [];
    for (let i = 0; i < 6; i++) { const el = document.createElement('div'); el.className = 'item-slot'; items.appendChild(el); this.itemEls.push(el); }
    this.buildShop(w, me);
    void me;
  }

  update(w: World, st: HudState, dt: number): void {
    const me = st.me, foe = (me === 0 ? 1 : 0) as Team;
    $('timer').textContent = fmtTime(w.time);
    $('k0').textContent = String(w.players[me].kills); $('k1').textContent = String(w.players[foe].kills);
    $('t0').textContent = '▲'.repeat(Math.max(0, w.towers(me).length - 1)); $('t1').textContent = '▲'.repeat(Math.max(0, w.towers(foe).length - 1));
    $('phase').textContent = w.phase === 'countdown' ? '' : w.waveNo > 0 ? t('hud.wave', { n: w.waveNo }) : '';
    const h = st.hero, seat = st.seat;
    const card = $('heroCard');
    if (h && seat) {
      card.classList.remove('dead');
      if (this.lastPortrait !== h.def.id) { this.lastPortrait = h.def.id; const p = $('hcPortrait'); p.innerHTML = ''; p.appendChild(cardThumbnail(h.def, 72, 72, me)); $('hcName').textContent = cardName(h.def); }
      $('hcLevel').textContent = String(h.level);
      const d = w.stats(h);
      ($('hpFill')).style.width = `${(100 * h.hp) / h.maxHp}%`; $('hpText').textContent = `${Math.round(h.hp)} / ${Math.round(h.maxHp)}${h.shield > 0 ? ` +${Math.round(h.shield)}` : ''}`;
      ($('manaFill')).style.width = `${(100 * h.mana) / Math.max(1, h.maxMana)}%`; $('manaText').textContent = `${Math.round(h.mana)} / ${Math.round(h.maxMana)}`;
      const need = World.xpToNext(seat.level);
      ($('xpFill')).style.width = `${need === Infinity ? 100 : (100 * seat.xp) / need}%`;
      $('gold').textContent = String(Math.floor(seat.gold));
      // skills
      for (let i = 0; i < 3; i++) {
        const el = this.skillEls[i], a = h.def.skills[i], cd = h.skillCd[i], rank = h.skillRank[i];
        const maxCd = a.cooldown * (1 - d.cooldown);
        el.classList.toggle('locked', rank === 0);
        el.classList.toggle('nomana', rank > 0 && h.mana < a.mana);
        el.classList.toggle('ready', rank > 0 && cd <= 0 && h.mana >= a.mana);
        el.classList.toggle('active', h.activeSkill === i && h.abilityT > 0);
        const cdEl = el.querySelector('.sk-cd') as HTMLElement;
        cdEl.style.setProperty('--p', String(cd > 0 ? Math.min(1, cd / Math.max(0.1, maxCd)) : 0));
        cdEl.textContent = cd > 0.05 ? (cd >= 10 ? String(Math.ceil(cd)) : cd.toFixed(1)) : '';
        (el.querySelector('.sk-rank') as HTMLElement).innerHTML = '<i></i>'.repeat(rank);
        (el.querySelector('.sk-name') as HTMLElement).textContent = skillName(a);
        (el.querySelector('.sk-icon') as HTMLElement).style.background = `radial-gradient(circle at 35% 35%, ${a.color ?? '#fff'}, #111 85%)`;
        el.title = `${skillName(a)} · ${skillDesc(a)} · ${t('select.cooldown', { s: a.cooldown })} · ${t('select.mana', { m: a.mana })} · ${Math.round(skillDamage(w, h, a, Math.max(1, rank)))} dmg`;
      }
      const util = [[h.dashCd, 6], [h.flashCd, 60], [h.recallT > 0 ? h.recallT : 0, 3.2]];
      for (let i = 0; i < 3; i++) {
        const el = this.skillEls[3 + i]; const [cd, max] = util[i];
        el.classList.toggle('ready', cd <= 0);
        const cdEl = el.querySelector('.sk-cd') as HTMLElement; cdEl.style.setProperty('--p', String(cd > 0 ? Math.min(1, cd / max) : 0)); cdEl.textContent = cd > 0.05 ? (cd >= 10 ? String(Math.ceil(cd)) : cd.toFixed(1)) : '';
      }
      this.skillEls[5].classList.toggle('active', h.recallT > 0);
      // items
      for (let i = 0; i < 6; i++) {
        const el = this.itemEls[i], id = seat.items[i];
        if (!id) { el.className = 'item-slot'; el.innerHTML = ''; el.title = ''; continue; }
        const it = itemDef(id);
        el.className = 'item-slot filled'; el.style.setProperty('--c', it.color); el.innerHTML = `<span>${it.icon}</span>`; el.title = `${itemName(id, it.name)} · ${it.desc}`;
      }
      // buffs
      const buffs: string[] = [];
      if (h.status.blueT > 0) buffs.push(`<span class="buff blue">${t('buff.blue')} ${Math.ceil(h.status.blueT)}</span>`);
      if (h.status.redT > 0) buffs.push(`<span class="buff red">${t('buff.red')} ${Math.ceil(h.status.redT)}</span>`);
      if (h.status.tyrantT > 0) buffs.push(`<span class="buff tyrant">${t('buff.tyrant')} ${Math.ceil(h.status.tyrantT)}</span>`);
      if (h.status.overlordT > 0) buffs.push(`<span class="buff overlord">${t('buff.overlord')} ${Math.ceil(h.status.overlordT)}</span>`);
      if (h.recallT > 0) buffs.push(`<span class="buff recall">${t('hud.recalling')} ${h.recallT.toFixed(1)}</span>`);
      $('buffs').innerHTML = buffs.join('');
      $('respawn').classList.add('hidden');
      $('damageFlash').classList.toggle('low', h.hp / h.maxHp < 0.25);
    } else if (seat) {
      card.classList.add('dead');
      $('respawn').classList.remove('hidden');
      $('respawnTimer').textContent = String(Math.ceil(Math.max(0, seat.respawnT)));
      $('buffs').innerHTML = '';
      $('damageFlash').classList.remove('low');
    }
    // team bars
    this.teamBars(w, me);
    // shop refresh
    if (st.shop) this.refreshShop(w, seat);
    $('shop').classList.toggle('hidden', !st.shop);
    $('scoreboard').classList.toggle('hidden', !st.scoreboard);
    if (st.scoreboard) this.scoreboard(w, me);
    ($('autoBuy') as HTMLInputElement).checked = seat?.autoBuy ?? true;
    this.feedTimer += dt;
    void dt;
  }

  private teamBars(w: World, me: Team): void {
    for (const team of [me, (me === 0 ? 1 : 0) as Team]) {
      const el = team === me ? $('teamMine') : $('teamFoe');
      const html = w.players[team].seats.map((s) => {
        const h = w.getUnit(s.heroId);
        const hp = h ? h.hp / h.maxHp : 0;
        const dead = !h;
        return `<div class="tb-hero ${dead ? 'dead' : ''} ${s.isBot ? '' : 'human'}" title="${s.name}"><div class="tb-port" data-hero="${s.heroDefId}"></div><div class="tb-bar"><i style="width:${hp * 100}%"></i></div><span class="tb-lv">${s.level}</span>${dead ? `<span class="tb-rs">${Math.ceil(s.respawnT)}</span>` : ''}</div>`;
      }).join('');
      if (el.dataset.key !== html) {
        el.dataset.key = html; el.innerHTML = html;
        el.querySelectorAll<HTMLElement>('.tb-port').forEach((p) => { const def = w.players[team].seats.find((s) => s.heroDefId === p.dataset.hero); if (def) { const { heroDef } = heroLookup(); p.appendChild(cardThumbnail(heroDef(def.heroDefId), 36, 36, team)); } });
      }
    }
  }

  private buildShop(w: World, me: Team): void {
    const grid = $('shopGrid'); grid.innerHTML = '';
    for (const it of ITEM_LIST) {
      const el = document.createElement('button'); el.className = 'shop-item'; el.dataset.id = it.id;
      el.innerHTML = `<span class="si-icon" style="--c:${it.color}">${it.icon}</span><span class="si-name">${itemName(it.id, it.name)}</span><span class="si-cost">${it.cost}</span><span class="si-desc">${it.desc}</span>`;
      el.addEventListener('click', () => this.onBuy(it.id));
      grid.appendChild(el);
    }
    void w; void me;
  }

  private refreshShop(w: World, seat: Seat | undefined): void {
    if (!seat) return;
    const h = w.getUnit(seat.heroId);
    const key = `${Math.floor(seat.gold)}:${seat.items.join()}:${h?.def.id}`;
    if (key === this.lastShopKey) return;
    this.lastShopKey = key;
    $('shopGold').textContent = t('hud.gold', { g: Math.floor(seat.gold) });
    $('shopGrid').querySelectorAll<HTMLButtonElement>('.shop-item').forEach((el) => {
      const it = ITEMS[el.dataset.id!];
      const owned = seat.items.includes(it.id);
      const bootsDup = it.id.startsWith('boots_') && seat.items.some((x) => x.startsWith('boots_'));
      const full = seat.items.length >= 6;
      el.classList.toggle('owned', owned); el.classList.toggle('poor', !owned && seat.gold < it.cost); el.disabled = owned || bootsDup || (full && !owned);
      (el.querySelector('.si-cost') as HTMLElement).textContent = owned ? t('hud.owned') : full ? t('hud.full') : String(it.cost);
    });
    const build = h?.def.build ?? [];
    $('shopBuild').innerHTML = `<span class="muted">${t('select.build')}:</span> ` + build.map((id) => `<span class="build-item ${seat.items.includes(id) ? 'have' : ''}" style="--c:${ITEMS[id].color}">${ITEMS[id].icon} ${itemName(id, ITEMS[id].name)}</span>`).join('');
  }

  private scoreboard(w: World, me: Team): void {
    const key = w.players.map((p) => p.seats.map((s) => `${s.kills}/${s.deaths}/${s.assists}/${s.level}/${Math.floor(s.gold)}/${s.items.join('')}`).join('|')).join('#');
    if (key === this.lastScoreKey) return;
    this.lastScoreKey = key;
    const { heroDef } = heroLookup();
    const rows = (team: Team) => w.players[team].seats.map((s) => `<tr class="${isMine(team) ? 'mine' : 'foe'}"><td>${cardName(heroDef(s.heroDefId))}<small>${s.name}${s.isBot ? '' : ' ★'}</small></td><td>${s.level}</td><td>${s.kills} / ${s.deaths} / ${s.assists}</td><td>${Math.floor(s.stats.goldEarned)}</td><td class="sb-items">${s.items.map((id) => `<i style="--c:${ITEMS[id].color}">${ITEMS[id].icon}</i>`).join('')}</td></tr>`).join('');
    $('scoreboard').innerHTML = `<table><thead><tr><th>${t('score.hero')}</th><th>${t('score.level')}</th><th>${t('score.kda')}</th><th>${t('score.gold')}</th><th>${t('score.items')}</th></tr></thead><tbody>${rows(me)}<tr class="sep"><td colspan="5"></td></tr>${rows((me === 0 ? 1 : 0) as Team)}</tbody></table>`;
  }

  // ---------- transient messages ----------

  toast(text: string, kind: 'warn' | 'info' | 'good' = 'warn'): void {
    const stack = $('toast');
    const el = document.createElement('div'); el.className = `toast-item ${kind}`; el.textContent = tSim(text);
    stack.appendChild(el);
    while (stack.children.length > 3) stack.removeChild(stack.firstChild!);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2200);
  }

  feed(html: string, color = ''): void {
    const feed = $('feed');
    const el = document.createElement('div'); el.className = 'feed-item'; el.innerHTML = html; if (color) el.style.borderLeftColor = color;
    feed.appendChild(el);
    while (feed.children.length > 6) feed.removeChild(feed.firstChild!);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 6500);
  }

  streak(text: string, color = ''): void {
    const el = $('streak');
    el.textContent = tSim(text); el.style.color = color || '';
    el.classList.remove('hidden'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    setTimeout(() => el.classList.add('hidden'), 2000);
  }

  banner(text: string, sub = '', color = ''): void {
    const el = $('banner');
    $('bannerText').textContent = tSim(text); $('bannerSub').textContent = tSim(sub); el.style.color = color || '';
    el.classList.remove('hidden'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    this.bannerT = 2.6;
    setTimeout(() => { if (this.bannerT <= 2.6) el.classList.add('hidden'); }, 2600);
  }

  countdown(text: string): void {
    const el = $('countdown');
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = tSim(text); el.classList.remove('hidden'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    setTimeout(() => el.classList.add('hidden'), 900);
  }

  hint(text: string): void { $('hint').textContent = text ? tSim(text) : ''; }

  setPaused(on: boolean): void { $('pauseOverlay').classList.toggle('hidden', !on); }
  setPauseMode(online: boolean): void { $('pauseSub').textContent = online ? t('pause.online') : t('pause.sub'); $('btnQuit').textContent = t('pause.quit'); }
  setNetPill(text: string, kind: 'ok' | 'warn' | 'bad' = 'ok'): void { const el = $('netPill'); el.textContent = text; el.className = `net-pill ${kind}`; el.classList.toggle('hidden', !text); }

  showResults(w: World, me: Team, winner: Team | -1, reason: string): void {
    const el = $('results'); el.classList.remove('hidden');
    const title = winner === -1 ? t('results.draw') : winner === me ? t('results.victory') : t('results.defeat');
    $('resultTitle').textContent = title; $('resultTitle').className = winner === me ? 'win' : winner === -1 ? '' : 'lose';
    const m = Math.floor(w.time / 60), s = String(Math.floor(w.time % 60)).padStart(2, '0');
    $('resultScore').textContent = t('results.duration', { m, s, k0: w.players[me].kills, k1: w.players[me === 0 ? 1 : 0].kills });
    $('resultReason').textContent = tSim(reason);
    const awards = w.result?.awards ?? [];
    $('resultAwards').innerHTML = awards.map((a) => `<div class="award ${a.team === me ? 'mine' : 'foe'}"><b>${tSim(a.title)}</b><span>${a.seat ?? ''} · ${a.value}</span></div>`).join('');
    const { heroDef } = heroLookup();
    const rows = (team: Team) => w.players[team].seats.map((s) => `<tr style="color:${teamCss(team)}"><td>${cardName(heroDef(s.heroDefId))} <small>${s.name}</small></td><td>${s.level}</td><td>${s.kills}/${s.deaths}/${s.assists}</td><td>${Math.floor(s.stats.goldEarned)}</td></tr>`).join('');
    $('resultStats').innerHTML = `<tr><th>${t('score.hero')}</th><th>${t('score.level')}</th><th>${t('score.kda')}</th><th>${t('score.gold')}</th></tr>${rows(me)}${rows((me === 0 ? 1 : 0) as Team)}`;
  }
  hideResults(): void { $('results').classList.add('hidden'); }
}

// late import to avoid a cycle between ui and game data at module-eval time
import { heroDef as _heroDef } from '../game/heroes.ts';
function heroLookup() { return { heroDef: _heroDef }; }
