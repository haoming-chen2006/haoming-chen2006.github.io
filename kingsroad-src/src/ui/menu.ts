import type { Difficulty } from '../game/bot.ts';
import { HEROES, heroDef, pickTeam } from '../game/heroes.ts';
import { SPELL_LIST, isSpell } from '../game/spells.ts';
import { packVoice, packImage } from '../render3d/hokpack.ts';
import { itemIcon, skillIcon } from './skill_icons.ts';
import { ITEMS } from '../game/items.ts';
import { MODE_SIZE, type MatchMode } from '../game/sim.ts';
import type { Role, UnitDef } from '../game/types.ts';
import { Rng } from '../engine/rng.ts';
import { cardName, heroTitle, itemName, lang, onLanguageChange, roleName, setLanguage, skillDesc, skillName, t, tCard, type Lang } from '../i18n.ts';
import { cardThumbnail } from '../render3d/thumbnails.ts';

export interface Settings {
  hero: string;
  mode: MatchMode;
  difficulty: Difficulty;
  sound: boolean;
  music: boolean;
  firstPerson: boolean;
  quality: 'high' | 'low';
  record: { wins: number; losses: number; draws: number };
  sfxVolume: number;
  musicVolume: number;
  sensitivity: number;
  invertY: boolean;
  announcer: boolean;
  spell: string;
  festival: boolean;
  fov: number;
  name: string;
}

const KEY = 'kingsroad.settings.v1';
const clamp = (v: number, lo: number, hi: number, fallback: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

export function loadSettings(): Settings {
  const def: Settings = {
    hero: 'houyi', mode: '5v5', difficulty: 'normal', sound: true, music: true, firstPerson: true, quality: 'high', record: { wins: 0, losses: 0, draws: 0 },
    sfxVolume: 0.55, musicVolume: 0.5, sensitivity: 1, invertY: false, announcer: true, spell: 'flash', festival: false, fov: 78, name: '',
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const s = JSON.parse(raw) as Partial<Settings>;
    const merged: Settings = { ...def, ...s, record: { ...def.record, ...(s.record ?? {}) } };
    if (!HEROES.some((h) => h.id === merged.hero)) merged.hero = def.hero;
    if (!isSpell(merged.spell)) merged.spell = 'flash';
    if (!(merged.mode in MODE_SIZE)) merged.mode = '5v5';
    merged.sfxVolume = clamp(Number(merged.sfxVolume), 0, 1, def.sfxVolume);
    merged.musicVolume = clamp(Number(merged.musicVolume), 0, 1, def.musicVolume);
    merged.sensitivity = clamp(Number(merged.sensitivity), 0.3, 2.5, def.sensitivity);
    merged.fov = clamp(Number(merged.fov), 60, 100, def.fov);
    return merged;
  } catch { return def; }
}

export function saveSettings(s: Settings): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }

const $ = (id: string): HTMLElement => { const el = document.getElementById(id); if (!el) throw new Error(`missing #${id}`); return el; };

let loadingFallback = 0;
export function showLoading(on: boolean, text?: string): void {
  const el = document.getElementById('loading');
  if (!el) return;
  if (text) { const el2 = document.getElementById('loadingText'); if (el2) el2.textContent = text; }
  if (on) el.classList.remove('hidden', 'fade');
  else { window.clearTimeout(loadingFallback); el.classList.add('fade'); window.setTimeout(() => el.classList.add('hidden'), 520); }
}
loadingFallback = window.setTimeout(() => showLoading(false), 4000);

export type ScreenName = 'menu' | 'select' | 'codex' | 'help' | 'game' | 'online';

/** Skill and hero detail markup shared by hero select and the codex. */
export function heroDetailHtml(def: UnitDef): string {
  const skills = def.skills.map((a, i) => `<div class="hd-skill"><div class="hd-skill-icon" style="background:url(${skillIcon(a)}) center / cover"><span class="hd-skill-n">${i + 1}</span></div><div><b>${skillName(a)}</b><span class="muted"> · ${t('select.cooldown', { s: a.cooldown })} · ${t('select.mana', { m: a.mana })}</span><p>${skillDesc(a)}</p></div></div>`).join('');
  const build = (def.build ?? []).map((id) => `<span class="build-item" style="--c:${ITEMS[id].color}"><img src="${itemIcon(ITEMS[id])}" alt=""> ${itemName(id, ITEMS[id].name)}</span>`).join('');
  const stat = (label: string, v: number) => `<div class="hd-stat"><span>${label}</span><b>${v}</b></div>`;
  return `<div class="hd-head"><div class="hd-port"></div><div><h3>${cardName(def)}</h3><div class="hd-title">${heroTitle(def)} · <span class="role ${def.role}">${roleName(def.role)}</span></div></div></div>
    <p class="hd-lore">${def.lore ?? ''}</p>
    <div class="hd-stats">${stat('HP', def.hp)}${stat('ATK', def.damage)}${stat('POW', def.power)}${stat('ARM', def.armor)}${stat('SPD', def.speed)}${stat('RNG', def.range)}</div>
    ${def.passive ? `<h4>${t('select.passive')}</h4><div class="hd-skill hd-passive"><div class="hd-skill-icon" style="background:radial-gradient(circle at 35% 35%, #ffd166, #3a2a05 85%)">✦</div><div><b>${tCard(`passive.${def.id}`, def.passive.name)}</b><p>${tCard(`passivedesc.${def.id}`, def.passive.desc)}</p></div></div>` : ''}
    <h4>${t('select.skills')}</h4>${skills}
    <p class="hd-tips">${def.tips ?? ''}</p>
    <h4>${t('select.build')}</h4><div class="hd-build">${build}</div>`;
}

export class Menus {
  settings: Settings;
  onShow: (name: ScreenName) => void = () => {};
  onSettingsClosed: () => void = () => {};
  onStart: () => void = () => {};
  private current: ScreenName = 'menu';
  private applyAudio: () => void;
  private previewSeed = Date.now() % 100000;

  constructor(settings: Settings, applyAudio: () => void) {
    this.settings = settings;
    this.applyAudio = applyAudio;
    const s = settings;
    // mode + difficulty
    $('modeSeg').querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.classList.toggle('active', b.dataset.mode === s.mode); b.addEventListener('click', () => { s.mode = b.dataset.mode as MatchMode; saveSettings(s); this.refreshMenu(); }); });
    $('difficultySeg').querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.classList.toggle('active', b.dataset.diff === s.difficulty); b.addEventListener('click', () => { s.difficulty = b.dataset.diff as Difficulty; saveSettings(s); this.refreshMenu(); }); });
    $('btnPlay').addEventListener('click', () => this.show('select'));
    $('btnHeroes').addEventListener('click', () => this.show('codex'));
    $('btnHelp').addEventListener('click', () => this.show('help'));
    $('btnHelpBack').addEventListener('click', () => this.show('menu'));
    $('btnSelectBack').addEventListener('click', () => this.show('menu'));
    $('btnCodexBack').addEventListener('click', () => this.show('menu'));
    $('btnStart').addEventListener('click', () => this.onStart());
    $('btnSettings').addEventListener('click', () => this.openSettings());
    $('btnPauseSettings').addEventListener('click', () => this.openSettings());
    $('btnSettingsClose').addEventListener('click', () => this.closeSettings());
    $('btnSound').addEventListener('click', () => { s.sound = !s.sound; saveSettings(s); this.applyAudio(); this.refreshMenu(); });
    $('btnMusic').addEventListener('click', () => { s.music = !s.music; saveSettings(s); this.applyAudio(); this.refreshMenu(); });
    $('btnQuality').addEventListener('click', () => { s.quality = s.quality === 'high' ? 'low' : 'high'; saveSettings(s); this.applyAudio(); this.refreshMenu(); });
    $('btnLang').addEventListener('click', () => { setLanguage(lang() === 'en' ? 'zh' : 'en'); });
    $('btnFullscreen').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); });
    $('btnResetProgress').addEventListener('click', () => { s.record = { wins: 0, losses: 0, draws: 0 }; saveSettings(s); this.refreshMenu(); });
    const bindRange = (id: string, out: string, get: () => number, set: (v: number) => void, fmt: (v: number) => string) => {
      const el = $(id) as HTMLInputElement; el.value = String(get()); $(out).textContent = fmt(get());
      el.addEventListener('input', () => { set(Number(el.value)); $(out).textContent = fmt(Number(el.value)); saveSettings(s); this.applyAudio(); });
    };
    bindRange('setSfx', 'setSfxOut', () => Math.round(s.sfxVolume * 100), (v) => { s.sfxVolume = v / 100; }, (v) => `${v}%`);
    bindRange('setMusic', 'setMusicOut', () => Math.round(s.musicVolume * 100), (v) => { s.musicVolume = v / 100; }, (v) => `${v}%`);
    bindRange('setSens', 'setSensOut', () => s.sensitivity, (v) => { s.sensitivity = v; }, (v) => `${v.toFixed(1)}×`);
    bindRange('setFov', 'setFovOut', () => s.fov, (v) => { s.fov = v; }, (v) => `${v}°`);
    const inv = $('setInvert') as HTMLInputElement; inv.checked = s.invertY; inv.addEventListener('change', () => { s.invertY = inv.checked; saveSettings(s); this.applyAudio(); });
    const fest = $('setFestival') as HTMLInputElement; fest.checked = s.festival; fest.addEventListener('change', () => { s.festival = fest.checked; saveSettings(s); });
    const ann = $('setAnnouncer') as HTMLInputElement; ann.checked = s.announcer; ann.addEventListener('change', () => { s.announcer = ann.checked; saveSettings(s); this.applyAudio(); });
    const fp = $('setFirst') as HTMLInputElement; fp.checked = s.firstPerson; fp.addEventListener('change', () => { s.firstPerson = fp.checked; saveSettings(s); this.applyAudio(); });
    $('setQuality').querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => { s.quality = b.dataset.q as 'high' | 'low'; saveSettings(s); this.applyAudio(); this.refreshMenu(); }));
    $('setLangSeg').querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => setLanguage(b.dataset.lang as Lang)));
    onLanguageChange(() => { this.refreshMenu(); if (this.current === 'select') this.renderSelect(); if (this.current === 'codex') this.renderCodex(); if (this.current === 'help') this.renderHelp(); });
    this.refreshMenu();
  }

  get screen(): ScreenName { return this.current; }

  show(name: ScreenName): void {
    this.current = name;
    for (const id of ['menu', 'select', 'codex', 'help', 'game', 'online']) $(id).classList.toggle('hidden', id !== name);
    document.body.classList.toggle('in-game', name === 'game');
    if (name === 'select') this.renderSelect();
    if (name === 'codex') this.renderCodex();
    if (name === 'help') this.renderHelp();
    this.onShow(name);
  }

  openSettings(): void { $('settingsModal').classList.remove('hidden'); this.refreshMenu(); }
  closeSettings(): void { $('settingsModal').classList.add('hidden'); this.onSettingsClosed(); }

  refreshMenu(): void {
    const s = this.settings;
    $('modeSeg').querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('active', b.dataset.mode === s.mode));
    $('difficultySeg').querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('active', b.dataset.diff === s.difficulty));
    $('modeDesc').textContent = t(`mode.${s.mode}`);
    $('record').textContent = t('menu.record', { w: s.record.wins, l: s.record.losses });
    $('btnSound').classList.toggle('off', !s.sound); $('btnMusic').classList.toggle('off', !s.music); $('btnQuality').textContent = s.quality === 'high' ? '✦' : '✧';
    $('btnLang').textContent = lang() === 'en' ? '中' : 'EN';
    $('setQuality').querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('active', b.dataset.q === s.quality));
    $('setLangSeg').querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang()));
  }

  /** Bots the preview shows for both teams at the current mode (deterministic per menu visit). */
  previewTeams(): [string[], string[]] {
    const rng = new Rng(this.previewSeed);
    const size = MODE_SIZE[this.settings.mode];
    const mine = pickTeam(this.settings.hero, rng).slice(0, size);
    const taken = new Set(mine);
    const theirs = pickTeam(null, rng).filter((id) => !taken.has(id)).slice(0, size);
    while (theirs.length < size) { const h = HEROES.find((x) => !taken.has(x.id) && !theirs.includes(x.id)); if (!h) break; theirs.push(h.id); }
    return [mine, theirs];
  }

  private roleFilter: Role | 'all' = 'all';

  private renderGrid(grid: HTMLElement, detail: HTMLElement, selected: string, onPick: (id: string) => void): void {
    grid.innerHTML = '';
    // 定位 tabs like the hero gallery: 全部 / 坦克 / 战士 / 刺客 / 法师 / 射手 / 辅助
    const tabs = document.createElement('div'); tabs.className = 'role-tabs';
    for (const r of ['all', 'tank', 'warrior', 'assassin', 'mage', 'marksman', 'support'] as const) {
      const b = document.createElement('button'); b.className = `role-tab ${r === this.roleFilter ? 'active' : ''} ${r}`; b.textContent = r === 'all' ? t('select.allRoles') : roleName(r);
      b.addEventListener('click', () => { this.roleFilter = r; this.renderGrid(grid, detail, selected, onPick); });
      tabs.appendChild(b);
    }
    grid.appendChild(tabs);
    for (const def of HEROES) {
      if (this.roleFilter !== 'all' && def.role !== this.roleFilter) continue;
      const el = document.createElement('button');
      el.className = `hero-tile ${def.role} ${def.id === selected ? 'selected' : ''}`;
      el.appendChild(cardThumbnail(def, 110, 130));
      const cap = document.createElement('div'); cap.className = 'ht-cap'; cap.innerHTML = `<b>${cardName(def)}</b><span>${roleName(def.role)}</span>`;
      el.appendChild(cap);
      el.addEventListener('click', () => onPick(def.id));
      grid.appendChild(el);
    }
    const def = heroDef(selected);
    detail.innerHTML = heroDetailHtml(def);
    (detail.querySelector('.hd-port') as HTMLElement).appendChild(cardThumbnail(def, 220, 300));
    void packImage(`heroes/${def.id}/splash.jpg`).then((img) => { if (img && detail.querySelector('.hd-port')) { (detail as HTMLElement).style.backgroundImage = `linear-gradient(180deg, rgba(8,12,18,0.2), rgba(8,12,18,0.9) 70%), url(${img.src})`; (detail as HTMLElement).style.backgroundSize = 'cover'; } });
  }

  private renderSelect(): void {
    const s = this.settings;
    $('selectMode').textContent = t('select.mode', { mode: s.mode, diff: t(`diff.${s.difficulty}`) });
    this.renderGrid($('heroGrid'), $('heroDetail'), s.hero, (id) => { s.hero = id; saveSettings(s); packVoice(id, 'pick'); this.renderSelect(); });
    const row = $('spellRow'); row.innerHTML = '';
    for (const sp of SPELL_LIST) {
      const b = document.createElement('button'); b.className = `spell-btn ${s.spell === sp.id ? 'selected' : ''}`;
      b.innerHTML = `<span class="sp-icon" style="background:radial-gradient(circle at 35% 35%, ${sp.color}, #111 85%)">${sp.icon}</span>${tCard(`spell.${sp.id}`, sp.name)}`;
      b.title = tCard(`spelldesc.${sp.id}`, sp.desc);
      b.addEventListener('click', () => { s.spell = sp.id; saveSettings(s); this.renderSelect(); });
      row.appendChild(b);
    }
    const [mine, theirs] = this.previewTeams();
    const tile = (id: string, team: 0 | 1) => { const d = document.createElement('div'); d.className = `tp-tile t${team}`; d.appendChild(cardThumbnail(heroDef(id), 40, 46, team)); d.title = cardName(heroDef(id)); return d; };
    const tp = $('teamsPreview'); tp.innerHTML = '';
    const a = document.createElement('div'); a.className = 'tp-team'; a.innerHTML = `<span>${t('select.yourTeam')}</span>`; mine.forEach((id) => a.appendChild(tile(id, 0)));
    const vs = document.createElement('div'); vs.className = 'tp-vs'; vs.textContent = 'VS';
    const b = document.createElement('div'); b.className = 'tp-team'; theirs.forEach((id) => b.appendChild(tile(id, 1))); b.innerHTML += `<span>${t('select.enemyTeam')}</span>`;
    tp.append(a, vs, b);
  }

  private codexPick = HEROES[0].id;
  private renderCodex(): void { this.renderGrid($('codexGrid'), $('codexDetail'), this.codexPick, (id) => { this.codexPick = id; this.renderCodex(); }); }
  private renderHelp(): void { $('helpBody').innerHTML = t('help.body'); }
}
