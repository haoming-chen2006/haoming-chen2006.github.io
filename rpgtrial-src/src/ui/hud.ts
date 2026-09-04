// In-game HUD: portrait + bars, hotbar, quest objective, interaction prompt, floating combat text, boss bar,
// area title cards, toasts, item pickups, low-HP vignette, letterbox, crosshair.
import { bus, type RollResult } from '../core/events.ts';
import type { Actor, QuestStep } from '../sim/types.ts';
import type { Vec3 } from '../core/math.ts';
import { h, svg, kbd, clear, esc, retrigger } from './dom.ts';
import { icon, CLASS_ICON, DAMAGE_STYLE, CONDITION_ICON, DIVIDER_SVG } from './icons.ts';
import { getClass, getAbility, getItem, prettify, questText, RESOURCE_NAME, SKILL_NAME } from './content.ts';
import type { UIContext } from './types.ts';
import { xpForLevel } from './types.ts';

type W2S = (pos: Vec3) => { x: number; y: number; visible: boolean };

interface Floater { el: HTMLElement; pos: Vec3; t: number; life: number; rise: number; dx: number; jitter: number }

export interface HUD {
  el: HTMLElement;
  update(dt: number): void;
  setVisible(on: boolean): void;
  setDimmed(on: boolean): void;
  toast(text: string, kind?: 'info' | 'warn' | 'gold' | 'xp'): void;
  float(text: string, pos: Vec3, cls?: string, opts?: { html?: boolean; life?: number; rise?: number }): void;
  setQuest(step: QuestStep | null): void;
  tutorialStack: HTMLElement;
  refreshHotbar(): void;
  /** CSS zoom applied to #hud (floating text divides screen px by it). */
  setZoom(z: number): void;
  /** The dialogue panel is about to show this line — a matching `dialogueLine` is not a bark. */
  notePresented(text: string): void;
  /** Bottom-centre subtitle ("Ilyra — …"); used for companion barks, callable directly. */
  subtitle(speakerId: string, text: string): void;
}

export function createHUD(ctx: UIContext, w2s: W2S, opts: { /** freeze the subtitle clock (dice overlay open) */ hold?: () => boolean } = {}): HUD {
  const el = h('div#hud');
  // ---- top-left: portrait + bars ----
  const portrait = h('div.portrait', h('span.pic', { html: icon('swords') }), h('span.lvl', 'LVL 1'));
  const hpFill = h('div.fill'), hpGhost = h('div.ghost'), hpTemp = h('div.temp'), hpTxt = h('div.txt');
  const hpBar = h('div.bar-hp', hpGhost, hpFill, hpTemp, hpTxt);
  const stFill = h('div.fill'); const stBar = h('div.bar-st', stFill);
  const pips = h('div.pips'); const conds = h('div.conds');
  const bars = h('div.bars', hpBar, stBar, pips, conds);
  const xpFill = h('div.fill'); const xpTxt = h('div.txt'); const xpBar = h('div.bar-xp', xpFill, xpTxt);
  // companion
  const cPortrait = h('div.portrait', { html: icon('ilyra') });
  const cFill = h('div.fill'); const cGhost = h('div.ghost'); const cName = h('div.cname', 'Ilyra');
  const companion = h('div.companion.hidden', cPortrait, h('div', cName, h('div.bar-hp', cGhost, cFill)));
  el.append(h('div.hud-left', h('div.hud-tl', portrait, bars), xpBar, companion));

  // ---- hotbar ----
  const hotbar = h('div.hotbar'); const hots: HTMLElement[] = [];
  for (let i = 0; i < 6; i++) { const s = h('div.hot.empty', h('span.key', String(i + 1))); hots.push(s); hotbar.appendChild(s); }
  hotbar.appendChild(h('div.hot-sep'));
  const potionSlot = h('div.hot.potion', h('span.key', 'R'), h('span.pic', { html: icon('potion') }), h('span.qty', '0'));
  hotbar.appendChild(potionSlot);
  el.appendChild(hotbar);
  hotbar.addEventListener('click', (e) => {
    const s = (e.target as HTMLElement).closest('.hot') as HTMLElement | null; if (!s) return;
    const i = hots.indexOf(s);
    // Simulate the key press through the input system so the sim handles it like a keypress.
    const code = i >= 0 ? `Digit${i + 1}` : 'KeyR';
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: i >= 0 ? String(i + 1) : 'r', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key: i >= 0 ? String(i + 1) : 'r', bubbles: true }));
    retrigger(s, 'pressed');
  });

  // ---- quest panel / prompt / boss / area / toasts / pickups ----
  const qTitle = h('div.qt'), qHint = h('div.qh'), qKeys = h('div.qk');
  const quest = h('div.quest-panel.hidden', h('div.ql', 'Objective'), qTitle, qHint, qKeys);
  const promptKey = kbd('E'); const promptTxt = h('span');
  const prompt = h('div.prompt', promptKey, promptTxt);
  const bossName = h('div.bn'), bossSub = h('div.bs'), bossFill = h('div.fill'), bossGhost = h('div.ghost'), bossTxt = h('div.bt');
  const boss = h('div.boss', bossName, bossSub, h('div.bb', bossGhost, bossFill), bossTxt);
  const areaName = h('div.an'), areaSub = h('div.as');
  const area = h('div.area-title', areaName, h('div.divider', { html: DIVIDER_SVG }), areaSub);
  const toasts = h('div.toasts'); const pickups = h('div.pickups');
  const fctLayer = h('div.fct-layer');
  const lowhp = h('div.lowhp'); const hitflash = h('div.hitflash');
  const lbTop = h('div.letterbox.top'), lbBot = h('div.letterbox.bottom');
  const crosshair = h('div.crosshair');
  const restFade = h('div.rest-fade');
  const tutorialStack = h('div.tut-stack');
  const subName = h('span.ss'), subText = h('span.st');
  const subtitleEl = h('div.subtitle', subName, subText);
  el.append(quest, prompt, boss, area, toasts, pickups, fctLayer, lowhp, hitflash, lbTop, lbBot, crosshair, restFade, tutorialStack, subtitleEl);

  // ---- state ----
  const floaters: Floater[] = [];
  let lastHp = -1, lastMax = -1, lastTemp = -1, lastSt = -1, lastLvl = -1, lastXp = -1, lastClass = '';
  let condKey = ''; let pipKey = '';
  let bossId: string | null = null; let bossLastHp = -1;
  let cinematic = false; let visible = true;
  let kit: string[] = []; let kitKey = '';
  const condEls = new Map<string, { el: HTMLElement; t: HTMLElement; sweep: HTMLElement; max: number }>();
  let lastCompanionHp = -1;
  let restTimer = 0;
  let hitStack = 0;

  const player = () => ctx.world.player as Actor | undefined;
  const isPlayer = (id: string) => id === ctx.world.playerId;

  function float(text: string, pos: Vec3, cls = '', opts: { html?: boolean; life?: number; rise?: number } = {}) {
    const f = h('div.fct' + (cls ? '.' + cls.split(' ').join('.') : ''));
    if (opts.html) f.innerHTML = text; else f.textContent = text;
    fctLayer.appendChild(f);
    hitStack = (hitStack + 1) % 5;
    floaters.push({ el: f, pos: { x: pos.x, y: pos.y + 1.9, z: pos.z }, t: 0, life: opts.life ?? 1.5, rise: opts.rise ?? 70, dx: (hitStack - 2) * 14, jitter: (Math.random() - .5) * 20 });
  }
  function toast(text: string, kind: 'info' | 'warn' | 'gold' | 'xp' = 'info') {
    const t = h('div.toast.' + kind, { html: (kind === 'gold' ? icon('coin') : kind === 'xp' ? icon('xp') : '') + esc(text) });
    toasts.appendChild(t); setTimeout(() => t.remove(), 3900);
    while (toasts.children.length > 4) toasts.firstChild?.remove();
  }
  function pickup(iconName: string, name: string, kind: string, qty: number) {
    const p = h('div.pickup', h('div.pi', { html: icon(iconName) }), h('div', h('div.pn', name), h('div.pk', kind)), qty > 1 ? h('div.pq', '×' + qty) : null);
    pickups.appendChild(p); setTimeout(() => p.remove(), 4700);
    while (pickups.children.length > 5) pickups.firstChild?.remove();
  }

  // ---- subtitles: `dialogueLine` events that the dialogue panel does not present (companion barks) ----
  // The runtime emits `dialogueLine` and then calls `ui.dialogue.present` synchronously with the same text, so a line is
  // judged one tick later: if the panel presented it, it is not a bark. Lines queue; a new one shortens the current.
  const subQueue: { name: string; text: string; narr: boolean }[] = [];
  let subLeft = 0, subGap = 0, lastPresented = '';
  function notePresented(text: string) { lastPresented = text; }
  function speakerName(id: string): string {
    if (id === 'narrator') return '';
    if (id === 'player' || isPlayer(id)) return player()?.name ?? 'You';
    const a = ctx.world.actors.get(id);
    // first name only ("Ilyra — …"); bosses and the like keep their title
    return a ? (a.kind === 'companion' ? a.name.split(' ')[0] : a.name) : prettify(id);
  }
  function subtitle(speakerId: string, text: string) {
    const t = String(text ?? '').trim(); if (!t) return;
    subQueue.push({ name: speakerName(speakerId), text: t, narr: speakerId === 'narrator' });
    while (subQueue.length > 3) subQueue.shift();
    if (subLeft > 0) subLeft = Math.min(subLeft, 1.2);
  }
  function subTick(dt: number) {
    if (subLeft > 0) { subLeft -= dt; if (subLeft <= 0) { subtitleEl.classList.remove('on'); subGap = 0.3; } return; }
    if (subGap > 0) { subGap -= dt; return; }
    const s = subQueue.shift(); if (!s) return;
    subName.textContent = s.name; subText.textContent = s.text;
    subtitleEl.classList.toggle('narr', s.narr); subtitleEl.classList.add('on');
    subLeft = Math.max(3, 0.06 * s.text.length);
  }

  // ---- quest ----
  let questStep: QuestStep | null = null;
  function setQuest(step: QuestStep | null) {
    questStep = step;
    if (!step) { quest.classList.add('hidden'); return; }
    quest.classList.remove('hidden');
    qTitle.textContent = questText(ctx.world, step.title); qTitle.classList.toggle('done', !!step.done); qHint.textContent = questText(ctx.world, step.hint);
    clear(qKeys); for (const k of step.keys ?? []) qKeys.appendChild(kbd(k));
    retrigger(quest, 'flash');
  }
  function currentQuestStep(): QuestStep | null {
    const q = (ctx.world as any).quest as QuestStep[] | undefined;
    if (!Array.isArray(q) || !q.length) return null;
    return q.find((s) => !s.done) ?? q[q.length - 1];
  }

  // ---- hotbar ----
  function refreshHotbar() {
    const p = player(); if (!p) return;
    const cls = getClass(p.classId);
    const custom = (ctx.world as any).kit ?? (p as any).kit ?? (ctx.world as any).hotbar;
    kit = Array.isArray(custom) && custom.length ? custom.slice() : cls.kit;
    kitKey = kit.join(',');
    hots.forEach((s, i) => {
      const id = kit[i]; clear(s); s.className = 'hot';
      s.appendChild(h('span.key', String(i + 1)));
      if (!id) { s.classList.add('empty'); s.removeAttribute('data-tip'); return; }
      const def = getAbility(id);
      s.classList.add(def.kind);
      s.appendChild(h('span.pic', { html: icon(def.icon) }));
      if (def.cost) {
        const c = h('span.cost', String(def.cost.amount));
        c.classList.add(def.cost.resource === 'stamina' ? 'st' : def.cost.resource.startsWith('spell') ? 'sp' : 'res');
        if (def.cost.resource !== 'stamina' && !def.cost.resource.startsWith('spell')) c.textContent = '';
        s.appendChild(c);
      }
      s.appendChild(h('span.cd')); s.appendChild(h('span.cdt'));
      s.dataset.tip = abilityTip(def, i + 1);
    });
  }
  function abilityTip(def: ReturnType<typeof getAbility>, key: number) {
    const rows: string[] = [];
    if (def.damage) rows.push(`<div class="tt-row"><span>Damage</span><b>${esc(def.damage)} ${esc(def.damageType ?? '')}</b></div>`);
    if (def.cost) rows.push(`<div class="tt-row"><span>Cost</span><b class="tt-cost">${def.cost.amount} ${esc(RESOURCE_NAME[def.cost.resource] ?? prettify(def.cost.resource))}</b></div>`);
    if (def.cooldown && def.cooldown > 1) rows.push(`<div class="tt-row"><span>Cooldown</span><b>${def.cooldown}s</b></div>`);
    if (def.save) rows.push(`<div class="tt-row"><span>Save</span><b>${esc(String(def.save.ability).toUpperCase())} DC ${def.save.dc === 'spell' ? 13 : def.save.dc}</b></div>`);
    if (def.range) rows.push(`<div class="tt-row"><span>Range</span><b>${def.range} m</b></div>`);
    return `<div class="tt-name"><span>${esc(def.name)}</span><kbd class="kbd">${key}</kbd></div><div class="tt-kind">${esc(def.kind)}${def.level != null ? (def.level === 0 ? ' · cantrip' : ' · level ' + def.level) : ''}</div><div class="tt-desc">${esc(def.description)}</div>${rows.join('')}`;
  }
  function usable(p: Actor, def: ReturnType<typeof getAbility>): boolean {
    if (p.dead) return false;
    if ((p.cooldowns?.[def.id] ?? 0) > 0) return false;
    if (def.cost) {
      if (def.cost.resource === 'stamina') return p.stamina >= def.cost.amount;
      return (p.resources?.[def.cost.resource] ?? 0) >= def.cost.amount;
    }
    return true;
  }
  function potionCount(): number {
    const inv = (ctx.world as any).inventory as { itemId: string; qty: number }[] | undefined;
    if (!Array.isArray(inv)) return 0;
    return inv.filter((s) => getItem(s.itemId).kind === 'potion').reduce((n, s) => n + s.qty, 0);
  }

  // ---- pips / conditions ----
  function refreshPips(p: Actor) {
    const cls = getClass(p.classId);
    const maxRes: Record<string, number> = { ...cls.resources, ...((p as any).maxResources ?? {}) };
    const parts: string[] = [];
    const slotsMax = maxRes.spellSlots1 ?? 0;
    if (slotsMax > 0) {
      parts.push(`<span class="pl">Slots</span>`);
      const cur = p.resources?.spellSlots1 ?? 0;
      for (let i = 0; i < slotsMax; i++) parts.push(`<i class="pip${i < cur ? ' on' : ''}"></i>`);
    }
    for (const [k, max] of Object.entries(maxRes)) {
      if (k === 'spellSlots1' || !max || max > 6) continue;
      parts.push(`<span class="pl">${esc(RESOURCE_NAME[k] ?? prettify(k))}</span>`);
      const cur = p.resources?.[k] ?? 0;
      for (let i = 0; i < max; i++) parts.push(`<i class="pip res${i < cur ? ' on' : ''}"></i>`);
    }
    const key = parts.join('');
    if (key !== pipKey) { pipKey = key; pips.innerHTML = key; pips.style.display = key ? '' : 'none'; }
  }
  function refreshConds(p: Actor) {
    const names = Object.keys(p.conditions ?? {});
    const key = names.join(',');
    if (key !== condKey) {
      condKey = key;
      for (const [n, c] of condEls) if (!names.includes(n)) { c.el.remove(); condEls.delete(n); }
      for (const n of names) if (!condEls.has(n)) {
        const sweep = h('span.sweep'); const t = h('span.t');
        const c = h('div.cond', { 'data-tip': `<div class="tt-name">${esc(prettify(n))}</div><div class="tt-kind">condition</div>` }, h('span.pic', { html: icon(CONDITION_ICON[n] ?? n) }), sweep, t);
        conds.appendChild(c); condEls.set(n, { el: c, t, sweep, max: p.conditions[n] || 0 });
      }
    }
    for (const [n, c] of condEls) {
      const s = p.conditions[n] ?? 0;
      if (s > c.max) c.max = s;
      if (s > 0) { c.t.textContent = s < 10 ? s.toFixed(0) : String(Math.round(s)); c.t.style.display = ''; c.sweep.style.height = `${(1 - s / Math.max(c.max, 0.01)) * 100}%`; }
      else { c.t.style.display = 'none'; c.sweep.style.height = '0'; }
    }
  }

  // ---- per-frame ----
  let zoom = 1;
  function setZoom(z: number) { zoom = z; }
  function update(dt: number) {
    const p = player();
    if (p) {
      if (p.classId !== lastClass) { lastClass = p.classId ?? ''; portrait.querySelector('.pic')!.innerHTML = icon(CLASS_ICON[lastClass] ?? 'person'); refreshHotbar(); }
      else { const src: string[] = (ctx.world as any).kit ?? (p as any).kit ?? getClass(p.classId).kit; if (Array.isArray(src) && src.length && src.join(',') !== kitKey) refreshHotbar(); }
      if (p.hp !== lastHp || p.maxHp !== lastMax || p.tempHp !== lastTemp) {
        const r = Math.max(0, Math.min(1, p.hp / Math.max(1, p.maxHp)));
        hpFill.style.transform = `scaleX(${r})`; hpGhost.style.transform = `scaleX(${r})`;
        hpTemp.style.transform = `scaleX(${Math.min(1, (p.tempHp ?? 0) / Math.max(1, p.maxHp))})`;
        hpTxt.textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}${p.tempHp ? ` (+${p.tempHp})` : ''}`;
        hpBar.classList.toggle('low', r <= 0.3 && p.hp > 0);
        lowhp.classList.toggle('on', r <= 0.3 && p.hp > 0 && !cinematic);
        if (p.hp < lastHp && lastHp >= 0) { retrigger(portrait, 'hurt'); }
        lastHp = p.hp; lastMax = p.maxHp; lastTemp = p.tempHp;
      }
      if (p.stamina !== lastSt) { stFill.style.transform = `scaleX(${Math.max(0, Math.min(1, p.stamina / Math.max(1, p.maxStamina)))})`; lastSt = p.stamina; }
      if (p.level !== lastLvl || p.xp !== lastXp) {
        lastLvl = p.level; lastXp = p.xp;
        portrait.querySelector('.lvl')!.textContent = `LVL ${p.level}`;
        const lo = xpForLevel(p.level), hi = xpForLevel(p.level + 1);
        xpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, (p.xp - lo) / Math.max(1, hi - lo)))})`;
        xpTxt.textContent = `${p.xp} / ${hi} XP`;
      }
      refreshPips(p); refreshConds(p);
      // hotbar cooldowns + usability
      hots.forEach((s, i) => {
        const id = kit[i]; if (!id) return;
        const def = getAbility(id); const cd = p.cooldowns?.[id] ?? 0;
        const cdEl = s.querySelector('.cd') as HTMLElement; const cdt = s.querySelector('.cdt') as HTMLElement;
        if (cd > 0.05) { const max = Math.max(def.cooldown ?? cd, cd); cdEl.style.setProperty('--p', `${(cd / max) * 100}%`); cdt.textContent = cd >= 1 ? String(Math.ceil(cd)) : ''; }
        else { cdEl.style.setProperty('--p', '0%'); cdt.textContent = ''; }
        s.classList.toggle('cooling', cd > 0.05);
        s.classList.toggle('unusable', !usable(p, def) && cd <= 0.05);
      });
      const pc = potionCount(); const q = potionSlot.querySelector('.qty')!; if (q.textContent !== String(pc)) q.textContent = String(pc);
      potionSlot.classList.toggle('unusable', pc === 0 || !!p.dead);
      // companion
      const c = ctx.world.actors.get('ilyra') ?? [...ctx.world.actors.values()].find((a) => a.kind === 'companion');
      if (c && !c.hidden) {
        companion.classList.remove('hidden');
        if (c.hp !== lastCompanionHp) { const r = Math.max(0, Math.min(1, c.hp / Math.max(1, c.maxHp))); cFill.style.transform = `scaleX(${r})`; cGhost.style.transform = `scaleX(${r})`; lastCompanionHp = c.hp; }
        if (cName.textContent !== c.name) cName.textContent = c.name;
      } else companion.classList.add('hidden');
      // crosshair: aiming a ranged/spell class without lock-on
      const ranged = p.weapon === 'staff' || p.weapon === 'wand' || p.weapon === 'crossbow_1handed' || p.weapon === 'crossbow_2handed';
      crosshair.classList.toggle('on', ranged && !p.targetId && !cinematic && visible && !p.dead);
      // quest panel from world.quest if the sim keeps it there
      const cur = currentQuestStep();
      if (cur && (!questStep || cur.id !== questStep.id || cur.done !== questStep.done)) setQuest(cur);
    }
    // boss
    if (bossId) {
      const b = ctx.world.actors.get(bossId);
      if (b) { if (b.hp !== bossLastHp) { const r = Math.max(0, b.hp / Math.max(1, b.maxHp)); bossFill.style.transform = `scaleX(${r})`; bossGhost.style.transform = `scaleX(${r})`; bossTxt.textContent = `${Math.max(0, Math.ceil(b.hp))} / ${b.maxHp}`; bossLastHp = b.hp; } if (b.dead) { bossId = null; setTimeout(() => { boss.classList.remove('on'); el.classList.remove('bossing'); }, 1200); } }
    }
    // floaters
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i]; f.t += dt;
      if (f.t >= f.life) { f.el.remove(); floaters.splice(i, 1); continue; }
      const s = w2s(f.pos); const k = f.t / f.life;
      if (!s.visible) { f.el.style.opacity = '0'; continue; }
      const ease = 1 - Math.pow(1 - k, 2);
      const y = s.y / zoom - ease * f.rise; const x = s.x / zoom + f.dx + f.jitter * ease;
      const scale = k < 0.12 ? 0.6 + (k / 0.12) * 0.55 : k < 0.25 ? 1.15 - ((k - 0.12) / 0.13) * 0.15 : 1;
      f.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      f.el.style.opacity = k > 0.65 ? String(1 - (k - 0.65) / 0.35) : '1';
    }
    if (restTimer > 0) { restTimer -= dt; if (restTimer <= 0) restFade.classList.remove('on'); }
    if (!(ctx.game as any).paused && !opts.hold?.()) subTick(dt);
  }

  // ---- events ----
  bus.on('damage', (d) => {
    const st = DAMAGE_STYLE[d.type] ?? DAMAGE_STYLE.slashing;
    if (isPlayer(d.targetId)) {
      retrigger(hitflash, 'on');
      float(`−${d.amount}`, d.pos, 'player' + (d.crit ? ' crit' : ''), { rise: 50 });
      return;
    }
    if (d.blocked) { float(`${icon(st.icon)}${d.amount}`, d.pos, 'block', { html: true }); return; }
    const txt = `${icon(st.icon)}${d.amount}`;
    if (d.crit) { float('CRITICAL!', { x: d.pos.x, y: d.pos.y + 0.5, z: d.pos.z }, 'crit', { life: 1.6, rise: 90 }); }
    const f = h('div'); f.innerHTML = txt;
    float(txt, d.pos, d.crit ? 'crit' : '', { html: true });
    const last = floaters[floaters.length - 1]; if (last) last.el.style.color = st.color;
  });
  bus.on('heal', (e) => float(`${icon('heal')}+${e.amount}`, e.pos, 'heal', { html: true }));
  bus.on('miss', (e) => {
    const label = e.reason === 'dodge' ? 'DODGED' : e.reason === 'block' ? 'BLOCKED' : e.reason === 'parry' ? 'PARRY!' : 'MISS';
    float(label, e.pos, e.reason === 'parry' ? 'parry' : e.reason, { rise: 40 });
  });
  bus.on('parry', (e) => float('PARRY!', e.pos, 'parry', { rise: 60 }));
  bus.on('attackRoll', (e) => {
    if (!isPlayer(e.attackerId)) return;
    const r = e.roll; const hit = r.success ? 'HIT' : 'MISS';
    const crit = r.crit === 'hit' ? ' · NAT 20' : r.crit === 'miss' ? ' · NAT 1' : '';
    float(`${r.d20}${r.bonus ? (r.bonus >= 0 ? '+' : '−') + Math.abs(r.bonus) : ''} = ${r.total} vs AC ${r.dc ?? '?'} — ${hit}${crit}`, { x: e.pos.x, y: e.pos.y - 0.6, z: e.pos.z }, 'roll ' + (r.success ? 'ok' : 'bad'), { rise: 30, life: 1.7 });
  });
  bus.on('check', (e) => {
    const r = e.roll; const skill = SKILL_NAME[r.label] ?? r.label;
    float(`${skill} ${r.total} vs DC ${r.dc ?? '?'} ${r.success ? '✓' : '✗'}`, e.pos, 'roll ' + (r.success ? 'ok' : 'bad'), { rise: 30, life: 2 });
  });
  bus.on('damageMod', (e) => float(e.mod === 'vulnerable' ? 'VULNERABLE!' : e.mod === 'immune' ? 'IMMUNE' : 'RESISTED', { x: e.pos.x, y: e.pos.y + 0.4, z: e.pos.z }, e.mod === 'vulnerable' ? 'crit' : 'miss', { rise: 50 }));
  bus.on('stagger', (e) => { if (!isPlayer(e.actorId)) float('STAGGERED', e.pos, 'miss', { rise: 40 }); });
  bus.on('xp', (e) => toast(`+${e.amount} XP`, 'xp'));
  bus.on('gold', (e) => pickup('coin', `${e.amount} Gold`, `${e.total} total`, 1));
  bus.on('loot', (e) => { const it = getItem(e.itemId); pickup(it.icon || 'bag', e.name || it.name, it.kind, e.qty); });
  bus.on('equip', (e) => toast(`Equipped ${getItem(e.itemId).name}`));
  bus.on('levelUp', (e) => { if (isPlayer(e.actorId)) { const p = player(); if (p) float('LEVEL UP!', p.pos, 'crit', { life: 2.2, rise: 90 }); } });
  bus.on('toast', (e) => toast(e.text, e.kind));
  bus.on('staminaEmpty', (e) => { if (isPlayer(e.actorId)) retrigger(stBar, 'empty'); });
  bus.on('interactable', (e) => {
    if (!e.label) { prompt.classList.remove('on'); return; }
    promptTxt.textContent = e.label; prompt.classList.add('on');
  });
  bus.on('bossStart', (e) => { bossId = e.actorId; bossLastHp = -1; bossName.textContent = e.name; bossSub.textContent = e.subtitle; boss.classList.add('on'); el.classList.add('bossing'); });
  bus.on('bossEnd', () => { bossId = null; boss.classList.remove('on'); el.classList.remove('bossing'); });
  bus.on('dialogueLine', (e) => { const text = e.text; setTimeout(() => { if (text !== lastPresented) subtitle(e.speakerId, text); }, 0); });
  // a bark that was still up when a conversation starts is moot (the speaker is now on the panel); reactions during the
  // dialogue still queue and show under the top letterbox (#hud.dialogue .subtitle)
  bus.on('dialogueStart', () => { subQueue.length = 0; if (subLeft > 0) { subLeft = 0; subtitleEl.classList.remove('on'); subGap = 0.3; } });
  bus.on('areaEnter', (e) => { areaName.textContent = e.name; areaSub.textContent = e.id === 'crypt' ? 'Beneath the hill' : 'The Hollowmere'; retrigger(area, 'on'); });
  bus.on('cinematic', (e) => { cinematic = e.on; lbTop.classList.toggle('on', e.on); lbBot.classList.toggle('on', e.on); el.classList.toggle('cine', e.on); });
  bus.on('rest', (e) => { restFade.textContent = e.kind === 'long' ? 'Long rest' : 'Short rest'; restFade.classList.add('on'); restTimer = 2.2; });
  bus.on('questStep', (e) => {
    if (e.state === 'complete') { qTitle.classList.add('done'); setTimeout(() => { const cur = currentQuestStep(); if (cur && cur.id !== e.id) setQuest(cur); else if (!cur) setQuest(null); }, 900); }
    else setQuest({ id: e.id, title: e.title, hint: e.hint, keys: (currentQuestStep()?.id === e.id ? currentQuestStep()?.keys : undefined) });
  });
  bus.on('death', (e) => { if (bossId === e.actorId) { bossId = null; setTimeout(() => { boss.classList.remove('on'); el.classList.remove('bossing'); }, 1500); } });

  function setVisible(on: boolean) { visible = on; el.classList.toggle('hidden', !on); }
  function setDimmed(on: boolean) { el.classList.toggle('dimmed', on); }

  return { el, update, setVisible, setDimmed, toast, float, setQuest, tutorialStack, refreshHotbar, setZoom, notePresented, subtitle };
}

export type { RollResult };
