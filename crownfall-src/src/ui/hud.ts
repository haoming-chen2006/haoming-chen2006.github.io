import { MAX_ELIXIR, POSSESS } from '../game/constants.ts';
import type { CardDef, Stats, Team, Unit } from '../game/types.ts';
import type { World } from '../game/world.ts';
import { cardThumbnail } from '../render3d/thumbnails.ts';
import { makeCardEl } from './cards_dom.ts';

export interface HudState {
  selectedCard: number | null;
  mode: 'command' | 'possess';
  hero: Unit | undefined;
  possessCd: number;
  hoverPossess: Unit | null;
  firstPerson?: boolean;
}

export interface Award { title: string; value: string | number; team: Team | -1 }

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/** In-match heads-up display: top bar, hand, elixir, hero panel, banners, feed, toasts, results. */
export class Hud {
  onCardPointerDown: (index: number) => void = () => {};
  private handEls: HTMLDivElement[] = [];
  private handIds: string[] = [];
  private nextId = '';
  private lastTimer = '';
  private lastPhase = '';
  private lastCrowns = [-1, -1];
  private lastElixir = -1;
  private heroPanelKey = '';
  private heroStatus = '';
  private hintHtml = '';
  private bannerT = 0;
  private streakT = 0;
  private lastCountdown = -1;
  private fightT = 0;

  reset(w: World): void {
    this.handIds = [];
    this.nextId = '';
    this.lastTimer = ''; this.lastPhase = ''; this.lastCrowns = [-1, -1]; this.lastElixir = -1; this.heroPanelKey = ''; this.heroStatus = ''; this.hintHtml = '';
    this.lastCountdown = -1; this.fightT = 0;
    $('p1name').textContent = w.players[1].name;
    $('hint').innerHTML = '';
    $('toast').innerHTML = '';
    $('feed').innerHTML = '';
    $('chips').innerHTML = '';
    $('banner').classList.add('hidden');
    $('streak').classList.add('hidden');
    $('countdown').classList.add('hidden');
    this.update(w, { selectedCard: null, mode: 'command', hero: undefined, possessCd: 0, hoverPossess: null, firstPerson: true }, 0);
  }

  private crownsHtml(n: number): string { return [0, 1, 2].map((i) => `<span class="${i < n ? 'on' : ''}">${i < n ? '♛' : '·'}</span>`).join(''); }

  update(w: World, st: HudState, dt: number): void {
    const p = w.players[0];
    const phaseName = w.phase as string;
    // countdown (optional sim phase)
    const cdVal = (w as unknown as { countdown?: number }).countdown;
    if (phaseName === 'countdown' && typeof cdVal === 'number') {
      const n = Math.max(1, Math.ceil(cdVal));
      if (n !== this.lastCountdown) { this.lastCountdown = n; const el = $('countdown'); el.classList.remove('hidden'); el.innerHTML = `<span>${n}</span>`; }
      this.fightT = 0.9;
    } else if (this.lastCountdown !== -1) {
      this.lastCountdown = -1;
      const el = $('countdown'); el.classList.remove('hidden'); el.innerHTML = '<span style="font-size:0.55em">FIGHT!</span>';
    }
    if (this.fightT > 0 && this.lastCountdown === -1) { this.fightT -= dt; if (this.fightT <= 0) $('countdown').classList.add('hidden'); }
    // timer + phase badge
    const t = Math.max(0, Math.ceil(w.timeLeft));
    const timer = phaseName === 'countdown' ? fmtTime(180) : fmtTime(t);
    if (timer !== this.lastTimer) { const el = $('timer'); el.textContent = timer; el.classList.toggle('urgent', (w.timeLeft <= 10 && phaseName !== 'countdown') || w.phase === 'overtime'); this.lastTimer = timer; }
    const phase = w.phase === 'overtime' ? '<span class="badge ot">Overtime · next tower wins</span>' : w.elixirRate > 1 ? '<span class="badge">2× Elixir</span>' : phaseName === 'countdown' ? '<span class="badge">Prepare</span>' : '';
    if (phase !== this.lastPhase) { $('phase').innerHTML = phase; this.lastPhase = phase; }
    // crowns
    for (const team of [0, 1] as Team[]) {
      const c = w.players[team].crowns;
      if (c !== this.lastCrowns[team]) { $(`p${team}crowns`).innerHTML = this.crownsHtml(c); this.lastCrowns[team] = c; }
    }
    // elixir
    const e = Math.floor(p.elixir * 10) / 10;
    if (e !== this.lastElixir) {
      $('elixirFill').style.width = `${(p.elixir / MAX_ELIXIR) * 100}%`;
      $('elixirText').textContent = `${Math.floor(p.elixir)} / ${MAX_ELIXIR}`;
      $('elixir').classList.toggle('full', p.elixir >= MAX_ELIXIR - 0.01);
      this.lastElixir = e;
    }
    // hand
    const ids = p.hand.map((c) => c.id);
    if (ids.join() !== this.handIds.join()) this.rebuildHand(p.hand);
    for (let i = 0; i < this.handEls.length; i++) {
      const el = this.handEls[i];
      el.classList.toggle('selected', st.selectedCard === i);
      el.classList.toggle('unaffordable', p.elixir < p.hand[i].cost);
    }
    const next = w.nextCard(p);
    if (next && next.id !== this.nextId) { const wrap = $('nextCard'); wrap.innerHTML = ''; wrap.appendChild(makeCardEl(next, 54)); this.nextId = next.id; }
    this.updateHeroPanel(st);
    // hint
    const hint = st.mode === 'possess'
      ? (st.selectedCard !== null
        ? '<span class="pill">Aim at the ground and <b>click</b> to deploy beside you · <kbd>Esc</kbd> cancel</span>'
        : `<span class="pill"><kbd>WASD</kbd> move · <b>hold click</b> attack · <kbd>Space</kbd> ability · <kbd>Shift</kbd> dash · <kbd>1</kbd>–<kbd>4</kbd> cards · <kbd>E</kbd> return · <kbd>V</kbd> ${st.firstPerson ? 'third-person' : 'first-person'}</span>`)
      : st.hoverPossess ? `<span class="pill">Press <kbd>F</kbd> or click to possess the <b>${st.hoverPossess.def.name}</b></span>`
        : st.selectedCard !== null ? '<span class="pill">Click your half of the arena to deploy · right-click to cancel</span>'
          : p.possessCd > 0 ? '' : '<span class="pill">Hover a troop and press <kbd>F</kbd> to possess it</span>';
    if (hint !== this.hintHtml) { this.hintHtml = hint; $('hint').innerHTML = hint; }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('banner').classList.add('hidden'); }
    if (this.streakT > 0) { this.streakT -= dt; if (this.streakT <= 0) $('streak').classList.add('hidden'); }
  }

  private rebuildHand(hand: CardDef[]): void {
    const wrap = $('hand');
    wrap.innerHTML = '';
    this.handEls = [];
    this.handIds = hand.map((c) => c.id);
    hand.forEach((card, i) => {
      const el = makeCardEl(card, 110, String(i + 1));
      el.title = `${card.name} (${card.cost} elixir) — press ${i + 1}`;
      el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); this.onCardPointerDown(i); });
      el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.onCardPointerDown(i); } });
      wrap.appendChild(el);
      this.handEls.push(el);
    });
  }

  private updateHeroPanel(st: HudState): void {
    const el = $('heroPanel');
    if (st.mode === 'possess' && st.hero) {
      const u = st.hero;
      const ab = u.def.ability;
      const key = `h:${u.id}`;
      if (this.heroPanelKey !== key) {
        el.innerHTML = `<div class="hero-top"><div class="hero-portrait"><canvas></canvas></div><div class="hero-meta"><h4><span>${u.def.name}</span><span class="tag">Soulbound</span></h4>
          <div class="hp"><div></div><span class="hp-text"></span></div></div></div>
          <div class="skills">
          <div class="skill" data-s="attack"><div class="ring"></div><span class="key">Click</span><span class="name">Attack</span></div>
          <div class="skill" data-s="ability" title="${ab.desc}"><div class="ring"></div><span class="key">Space</span><span class="name">${ab.name}</span></div>
          <div class="skill" data-s="dash"><div class="ring"></div><span class="key">Shift</span><span class="name">Dash</span></div></div>
          <div class="hero-status"></div>`;
        const cv = el.querySelector('.hero-portrait canvas') as HTMLCanvasElement;
        const art = cardThumbnail(u.def, 128, 170);
        cv.width = art.width; cv.height = art.height;
        cv.getContext('2d')!.drawImage(art, 0, 0);
        this.heroPanelKey = key;
        this.heroStatus = '';
      }
      const hpEl = el.querySelector('.hp div') as HTMLElement;
      const frac = u.hp / u.maxHp;
      hpEl.style.width = `${frac * 100}%`;
      hpEl.classList.toggle('low', frac < 0.25);
      const hpText = el.querySelector('.hp-text') as HTMLElement;
      const txt = `${Math.max(0, Math.round(u.hp))} / ${Math.round(u.maxHp)}${u.shield > 0 ? ` +${Math.round(u.shield)}` : ''}`;
      if (hpText.textContent !== txt) hpText.textContent = txt;
      const set = (s: string, f: number, ready: boolean, active = false) => {
        const sk = el.querySelector(`.skill[data-s="${s}"]`) as HTMLElement;
        (sk.querySelector('.ring') as HTMLElement).style.setProperty('--p', String(Math.max(0, Math.min(1, f))));
        sk.classList.toggle('ready', ready && !active);
        sk.classList.toggle('active', active);
      };
      set('attack', u.attackCd / u.def.hitSpeed, u.attackCd <= 0);
      set('ability', u.abilityCd / ab.cooldown, u.abilityCd <= 0 && u.abilityT <= 0, u.abilityT > 0);
      set('dash', u.dashCd / POSSESS.dashCooldown, u.dashCd <= 0, !!u.dashVel);
      const status = u.status.stun > 0 ? '✦ Stunned' : u.status.freeze > 0 ? '❄ Frozen' : u.abilityT > 0 ? `⚡ ${ab.name} active` : u.charging ? '⟫ Charging — next hit doubled' : u.critNext > 1 ? '✧ Empowered strike ready' : u.status.burnT > 0 ? '🔥 Burning' : u.status.rage > 0 || u.buffT > 0 ? '▲ Frenzied' : u.shield > 0 ? '◈ Shielded' : `Space: ${ab.name}`;
      if (status !== this.heroStatus) { this.heroStatus = status; (el.querySelector('.hero-status') as HTMLElement).textContent = status; }
    } else {
      const cooling = st.possessCd > 0;
      const key = cooling ? `c:${Math.ceil(st.possessCd)}` : 'c:0';
      if (this.heroPanelKey !== key) {
        const total = POSSESS.cooldownAfterRelease;
        const frac = cooling ? 1 - Math.min(1, st.possessCd / total) : 1;
        el.innerHTML = `<h4><span>Commander</span><span class="tag">Throne</span></h4><div class="cmd-wrap">
          <div class="soul-ring ${cooling ? 'cooling' : ''}" style="--p:${frac}"><span>${cooling ? `${Math.ceil(st.possessCd)}s` : '♛'}</span></div>
          <div class="cmd">${cooling ? '<b>Soul returning…</b><br>Deploy and defend from the throne until it settles.' : 'Deploy cards, then hover a troop and press <b>F</b> to <b>possess</b> it and fight in person.'}</div></div>`;
        this.heroPanelKey = key;
      }
    }
  }

  /** Stacked notification at the bottom of the arena. */
  toast(text: string, kind: 'warn' | 'info' | 'good' = 'warn'): void {
    const stack = $('toast');
    const item = document.createElement('div');
    item.className = `toast-item ${kind}`;
    item.textContent = text;
    stack.appendChild(item);
    while (stack.children.length > 3) stack.firstElementChild?.remove();
    window.setTimeout(() => item.classList.add('fade'), 1700);
    window.setTimeout(() => item.remove(), 2100);
  }

  /** Kill feed / event log entry in the top right. */
  feed(text: string, color = ''): void {
    const feed = $('feed');
    const item = document.createElement('div');
    item.className = 'feed-item';
    if (color) item.style.borderLeftColor = color;
    item.innerHTML = text;
    feed.appendChild(item);
    while (feed.children.length > 5) feed.firstElementChild?.remove();
    window.setTimeout(() => item.classList.add('fade'), 4000);
    window.setTimeout(() => item.remove(), 4500);
  }

  /** Small floating chip above the elixir bar (e.g. "+0.3 Soul Harvest"). */
  chip(text: string, color = ''): void {
    const wrap = $('chips');
    const c = document.createElement('div');
    c.className = 'chip';
    c.textContent = text;
    if (color) { c.style.background = color; c.style.borderColor = color; }
    wrap.appendChild(c);
    window.setTimeout(() => c.remove(), 1400);
  }

  /** Mid-size callout (kill streaks, first blood). */
  streak(text: string, color = ''): void {
    const el = $('streak');
    el.classList.remove('hidden');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    el.textContent = text;
    el.style.color = color || '';
    this.streakT = 1.6;
  }

  banner(text: string, sub = '', color = ''): void {
    const el = $('banner');
    el.classList.remove('hidden');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    const bt = $('bannerText');
    bt.style.animation = 'none'; void bt.offsetWidth; bt.style.animation = '';
    bt.textContent = text;
    bt.style.color = color || '';
    $('bannerSub').textContent = sub;
    this.bannerT = 2.4;
  }

  setPaused(on: boolean): void { $('pauseOverlay').classList.toggle('hidden', !on); }

  showResults(w: World, winner: Team | -1, reason: string): void {
    const title = $('resultTitle');
    title.textContent = winner === 0 ? 'Victory' : winner === 1 ? 'Defeat' : 'Draw';
    title.className = winner === 0 ? 'win' : winner === 1 ? 'lose' : 'draw';
    const crowns = (n: number, color: string) => (n ? Array.from({ length: n }, () => `<span class="crown" style="color:${color}">♛</span>`).join('') : `<span class="crown" style="color:${color};opacity:.35">–</span>`);
    $('resultCrowns').innerHTML = `<span>${crowns(w.players[0].crowns, 'var(--blue)')}</span><span class="vs">VS</span><span>${crowns(w.players[1].crowns, 'var(--red)')}</span>`;
    $('resultReason').textContent = reason;
    const s0 = w.players[0].stats, s1 = w.players[1].stats;
    const given = (w.result as unknown as { awards?: Award[] } | null)?.awards;
    const awards: Award[] = given && given.length ? given : [
      { title: 'Champion', value: Math.round(Math.max(s0.heroDamage, s1.heroDamage)), team: s0.heroDamage >= s1.heroDamage ? (s0.heroDamage > 0 ? 0 : -1) : 1 },
      { title: 'Warlord', value: Math.round(Math.max(s0.towerDamage, s1.towerDamage)), team: s0.towerDamage >= s1.towerDamage ? 0 : 1 },
      { title: 'Executioner', value: Math.max(s0.unitKills, s1.unitKills), team: s0.unitKills >= s1.unitKills ? 0 : 1 },
    ];
    $('resultAwards').innerHTML = awards.slice(0, 3).map((a) => `<div class="award ${a.team === 0 ? 'you' : a.team === 1 ? 'foe' : ''}"><div class="a-title">${a.title}</div><div class="a-value">${a.value}</div><div class="a-who">${a.team === 0 ? 'You' : a.team === 1 ? w.players[1].name : '—'}</div></div>`).join('');
    const row = (label: string, k: keyof Stats) => {
      const a = Math.round(s0[k]), b = Math.round(s1[k]);
      return `<tr><td>${label}</td><td class="${a > b ? 'best' : ''}">${a}</td><td class="${b > a ? 'best' : ''}">${b}</td></tr>`;
    };
    $('resultStats').innerHTML = `<tr><th></th><th>You</th><th>${w.players[1].name}</th></tr>` +
      row('Tower damage', 'towerDamage') + row('Cards played', 'unitsDeployed') + row('Elixir spent', 'elixirSpent') + row('Troops defeated', 'unitKills') +
      row('Possessions', 'possessions') + row('Champion damage', 'heroDamage') + row('Champion kills', 'heroKills') + row('Champion deaths', 'heroDeaths');
    $('results').classList.remove('hidden');
  }

  hideResults(): void { $('results').classList.add('hidden'); }
}
