import type { Difficulty } from '../game/bot.ts';
import { ALL_CARDS, DEFAULT_DECK, PRESET_DECKS, avgCost, cardById, cardsFromIds } from '../game/cards.ts';
import type { CardDef } from '../game/types.ts';
import { cardDetailHtml, makeCardEl, paintDetailThumb } from './cards_dom.ts';

export interface Settings {
  deck: string[];
  difficulty: Difficulty;
  sound: boolean;
  music: boolean;
  firstPerson: boolean;
  quality: 'high' | 'low';
  record: { wins: number; losses: number; draws: number };
  /** 0..1 */
  sfxVolume: number;
  /** 0..1 */
  musicVolume: number;
  /** mouse-look multiplier, 0.3..2.5 */
  sensitivity: number;
  invertY: boolean;
  /** first-person field of view in degrees */
  fov: number;
  /** show the guided tutorial on the next battle */
  showTutorial: boolean;
  tutorialDone: boolean;
}

const KEY = 'crownfall.settings.v1';

export function loadSettings(): Settings {
  const def: Settings = {
    deck: [...DEFAULT_DECK], difficulty: 'normal', sound: true, music: true, firstPerson: true, quality: 'high', record: { wins: 0, losses: 0, draws: 0 },
    sfxVolume: 0.55, musicVolume: 0.55, sensitivity: 1, invertY: false, fov: 78, showTutorial: true, tutorialDone: false,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const s = JSON.parse(raw) as Partial<Settings>;
    const deck = Array.isArray(s.deck) ? s.deck.filter((id) => typeof id === 'string' && ALL_CARDS.some((c) => c.id === id)) : def.deck;
    const merged: Settings = { ...def, ...s, deck: deck.length ? deck : def.deck, record: { ...def.record, ...(s.record ?? {}) } };
    merged.sfxVolume = clamp(Number(merged.sfxVolume), 0, 1, def.sfxVolume);
    merged.musicVolume = clamp(Number(merged.musicVolume), 0, 1, def.musicVolume);
    merged.sensitivity = clamp(Number(merged.sensitivity), 0.3, 2.5, def.sensitivity);
    merged.fov = clamp(Number(merged.fov), 60, 100, def.fov);
    return merged;
  } catch { return def; }
}

const clamp = (v: number, lo: number, hi: number, fallback: number): number => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

let loadingFallback = 0;
/** Show/hide the boot splash (e.g. while card thumbnails render). */
export function showLoading(on: boolean, text?: string): void {
  const el = document.getElementById('loading');
  if (!el) return;
  if (text) { const t = document.getElementById('loadingText'); if (t) t.textContent = text; }
  if (on) { el.classList.remove('hidden', 'fade'); }
  else { window.clearTimeout(loadingFallback); el.classList.add('fade'); window.setTimeout(() => el.classList.add('hidden'), 520); }
}
// Safety net: never leave the splash up if nobody dismisses it explicitly.
loadingFallback = window.setTimeout(() => showLoading(false), 2500);

export type ScreenName = 'menu' | 'deck' | 'help' | 'game';

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: 'Squire Bot plays slowly and defends poorly. Learn the ropes.',
  normal: 'Captain Bot reacts in about a second and counters properly.',
  hard: 'Warlord Bot: instant counters, relentless pushes, +15% elixir.',
};

type Filter = 'all' | 'troop' | 'building' | 'spell';
type Sort = 'cost' | 'name' | 'rarity';
const RARITY_RANK: Record<CardDef['rarity'], number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export class Menus {
  private settings: Settings;
  private onSettingsChanged: () => void;
  private filter: Filter = 'all';
  private sort: Sort = 'cost';
  private deckBuilt = false;
  /** Called when the settings modal closes (e.g. to re-capture the mouse in game). */
  onSettingsClosed: () => void = () => {};

  constructor(settings: Settings, onSettingsChanged: () => void) {
    this.settings = settings;
    this.onSettingsChanged = onSettingsChanged;
    this.wire();
    this.refreshMenu();
  }

  show(name: ScreenName): void {
    for (const s of ['menu', 'deck', 'help', 'game']) $(s).classList.toggle('hidden', s !== name);
    if (name === 'menu') this.refreshMenu();
    if (name === 'deck') { if (!this.deckBuilt) this.buildDeckScreen(); this.renderDeck(); this.renderCollection(); }
  }

  openSettings(): void { this.syncSettingsForm(); $('settingsModal').classList.remove('hidden'); }
  closeSettings(): void { $('settingsModal').classList.add('hidden'); this.persist(); this.onSettingsClosed(); }
  isSettingsOpen(): boolean { return !$('settingsModal').classList.contains('hidden'); }

  private wire(): void {
    $('difficultySeg').querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        this.settings.difficulty = (b.dataset.d as Difficulty) ?? 'normal';
        this.refreshMenu();
        this.persist();
      });
    });
    $('btnSound').addEventListener('click', () => { this.settings.sound = !this.settings.sound; this.refreshMenu(); this.persist(); });
    $('btnMusic').addEventListener('click', () => { this.settings.music = !this.settings.music; this.refreshMenu(); this.persist(); });
    $('btnQuality').addEventListener('click', () => { this.settings.quality = this.settings.quality === 'high' ? 'low' : 'high'; this.refreshMenu(); this.persist(); });
    $('btnFullscreen').addEventListener('click', () => { void this.toggleFullscreen(); });
    $('btnDeck').addEventListener('click', () => this.show('deck'));
    $('btnHelp').addEventListener('click', () => this.show('help'));
    $('btnHelpBack').addEventListener('click', () => this.show('menu'));
    $('btnDeckBack').addEventListener('click', () => { this.persist(); this.show('menu'); });
    $('btnSettings').addEventListener('click', () => this.openSettings());
    $('btnPauseSettings').addEventListener('click', () => this.openSettings());
    $('btnSettingsClose').addEventListener('click', () => this.closeSettings());
    $('settingsModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeSettings(); });
    $('btnResetProgress').addEventListener('click', () => { this.settings.record = { wins: 0, losses: 0, draws: 0 }; this.settings.tutorialDone = false; this.settings.showTutorial = true; this.syncSettingsForm(); this.refreshMenu(); this.persist(); });
    // settings form
    const range = (id: string, out: string, apply: (v: number) => void, fmt: (v: number) => string) => {
      const inp = $(id) as HTMLInputElement;
      inp.addEventListener('input', () => { const v = Number(inp.value); apply(v); $(out).textContent = fmt(v); this.onSettingsChanged(); });
    };
    range('setSfx', 'setSfxOut', (v) => { this.settings.sfxVolume = v / 100; this.settings.sound = v > 0; }, (v) => `${v}%`);
    range('setMusic', 'setMusicOut', (v) => { this.settings.musicVolume = v / 100; this.settings.music = v > 0; }, (v) => `${v}%`);
    range('setSens', 'setSensOut', (v) => { this.settings.sensitivity = v; }, (v) => `${v.toFixed(1)}×`);
    range('setFov', 'setFovOut', (v) => { this.settings.fov = v; }, (v) => `${v}°`);
    const check = (id: string, apply: (on: boolean) => void) => {
      const inp = $(id) as HTMLInputElement;
      inp.addEventListener('change', () => { apply(inp.checked); this.refreshMenu(); this.onSettingsChanged(); });
    };
    check('setInvert', (on) => { this.settings.invertY = on; });
    check('setFirst', (on) => { this.settings.firstPerson = on; });
    check('setTutorial', (on) => { this.settings.showTutorial = on; if (on) this.settings.tutorialDone = false; });
    check('setQuality', (on) => { this.settings.quality = on ? 'high' : 'low'; });
    // Capture phase so the game's input layer never sees the Escape that closes the modal.
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isSettingsOpen()) { e.stopImmediatePropagation(); e.preventDefault(); this.closeSettings(); } }, true);
    document.addEventListener('fullscreenchange', () => { $('btnFullscreen').textContent = document.fullscreenElement ? '⛶ Exit' : '⛶'; });
    // deck builder toolbar
    $('deckFilter').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { this.filter = (b.dataset.f as Filter) ?? 'all'; $('deckFilter').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); this.renderCollection(); }));
    $('deckSort').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { this.sort = (b.dataset.s as Sort) ?? 'cost'; $('deckSort').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); this.renderCollection(); }));
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* not permitted */ }
  }

  private syncSettingsForm(): void {
    const s = this.settings;
    ($('setSfx') as HTMLInputElement).value = String(Math.round((s.sound ? s.sfxVolume : 0) * 100));
    $('setSfxOut').textContent = `${Math.round((s.sound ? s.sfxVolume : 0) * 100)}%`;
    ($('setMusic') as HTMLInputElement).value = String(Math.round((s.music ? s.musicVolume : 0) * 100));
    $('setMusicOut').textContent = `${Math.round((s.music ? s.musicVolume : 0) * 100)}%`;
    ($('setSens') as HTMLInputElement).value = String(s.sensitivity);
    $('setSensOut').textContent = `${s.sensitivity.toFixed(1)}×`;
    ($('setFov') as HTMLInputElement).value = String(s.fov);
    $('setFovOut').textContent = `${s.fov}°`;
    ($('setInvert') as HTMLInputElement).checked = s.invertY;
    ($('setFirst') as HTMLInputElement).checked = s.firstPerson;
    ($('setTutorial') as HTMLInputElement).checked = s.showTutorial && !s.tutorialDone;
    ($('setQuality') as HTMLInputElement).checked = s.quality === 'high';
  }

  private persist(): void { saveSettings(this.settings); this.onSettingsChanged(); }

  refreshMenu(): void {
    $('difficultySeg').querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.d === this.settings.difficulty));
    $('difficultyDesc').textContent = DIFFICULTY_DESC[this.settings.difficulty];
    $('btnSound').textContent = `Sound: ${this.settings.sound ? 'On' : 'Off'}`;
    $('btnMusic').textContent = `Music: ${this.settings.music ? 'On' : 'Off'}`;
    $('btnQuality').textContent = `Graphics: ${this.settings.quality === 'high' ? 'High' : 'Low'}`;
    const r = this.settings.record;
    $('record').textContent = r.wins + r.losses + r.draws > 0 ? `Record  ${r.wins}W · ${r.losses}L · ${r.draws}D` : 'No battles yet';
    const complete = this.settings.deck.length === 8;
    const play = $('btnPlay') as HTMLButtonElement;
    play.disabled = !complete;
    play.innerHTML = complete ? '<span class="btn-icon">⚔</span>Battle' : 'Deck needs 8 cards';
  }

  private buildDeckScreen(): void {
    this.deckBuilt = true;
    const presets = $('presets');
    presets.innerHTML = '';
    for (const name of Object.keys(PRESET_DECKS)) {
      const b = document.createElement('button');
      b.className = 'btn small'; b.textContent = name; b.dataset.preset = name;
      b.addEventListener('click', () => { this.settings.deck = [...PRESET_DECKS[name]]; this.renderDeck(); this.renderCollection(); });
      presets.appendChild(b);
    }
    const clear = document.createElement('button');
    clear.className = 'btn small ghost'; clear.textContent = 'Clear';
    clear.addEventListener('click', () => { this.settings.deck = []; this.renderDeck(); this.renderCollection(); });
    presets.appendChild(clear);
  }

  private showDetail(card: CardDef): void {
    const d = $('cardDetail');
    d.innerHTML = cardDetailHtml(card);
    paintDetailThumb(d);
  }

  private renderCollection(): void {
    const coll = $('collection');
    coll.innerHTML = '';
    let cards = ALL_CARDS.filter((c) => this.filter === 'all' || c.kind === this.filter);
    cards = [...cards].sort((a, b) => this.sort === 'cost' ? a.cost - b.cost || a.name.localeCompare(b.name) : this.sort === 'name' ? a.name.localeCompare(b.name) : RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.cost - b.cost);
    for (const card of cards) {
      const el = makeCardEl(card, 96);
      const inDeck = this.settings.deck.includes(card.id);
      el.classList.toggle('inDeck', inDeck);
      if (inDeck) { const check = document.createElement('div'); check.className = 'check'; check.textContent = '✓'; el.appendChild(check); }
      if (!inDeck && this.settings.deck.length >= 8) el.classList.add('dimmed');
      const toggle = () => {
        const i = this.settings.deck.indexOf(card.id);
        if (i >= 0) this.settings.deck.splice(i, 1);
        else if (this.settings.deck.length < 8) this.settings.deck.push(card.id);
        this.renderDeck(); this.renderCollection();
        this.showDetail(card);
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
      el.addEventListener('pointerenter', () => this.showDetail(card));
      el.addEventListener('focus', () => this.showDetail(card));
      coll.appendChild(el);
    }
  }

  private renderDeck(): void {
    const slots = $('deckSlots');
    slots.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const id = this.settings.deck[i];
      if (id) {
        const card = cardById(id);
        const el = makeCardEl(card, 96);
        el.title = 'Click to remove';
        el.addEventListener('click', () => { this.settings.deck.splice(i, 1); this.renderDeck(); this.renderCollection(); });
        el.addEventListener('pointerenter', () => this.showDetail(card));
        slots.appendChild(el);
      } else {
        const s = document.createElement('div'); s.className = 'slot'; s.textContent = '+'; slots.appendChild(s);
      }
    }
    $('presets').querySelectorAll<HTMLElement>('button[data-preset]').forEach((b) => b.classList.toggle('active', PRESET_DECKS[b.dataset.preset ?? '']?.join() === this.settings.deck.join()));
    const deck = cardsFromIds(this.settings.deck);
    const n = deck.length;
    $('deckInfo').textContent = n === 8 ? `Deck ready · avg cost ${avgCost(deck).toFixed(1)}` : `${n}/8 cards`;
    const troops = deck.filter((c) => c.kind === 'troop').length, buildings = deck.filter((c) => c.kind === 'building').length, spells = deck.filter((c) => c.kind === 'spell').length;
    const air = deck.some((c) => (c.kind === 'troop' || c.kind === 'building') && (c.targets === 'both' || c.targets === 'air'));
    const splash = deck.some((c) => (c.kind === 'troop' && c.splash > 0) || (c.kind === 'spell' && c.damage > 0));
    const wincon = deck.some((c) => c.kind === 'troop' && (c.role === 'wincon' || c.role === 'tank'));
    const flyer = deck.some((c) => c.kind === 'troop' && c.flying);
    const yes = (ok: boolean, good: string, bad: string) => `<span class="${ok ? 'ok' : 'warn'}">${ok ? good : bad}</span>`;
    $('deckSummary').innerHTML = `<span>Average cost</span><span>${n ? avgCost(deck).toFixed(1) : '–'}</span>
      <span>Troops / Buildings / Spells</span><span>${troops} / ${buildings} / ${spells}</span>
      <span>Anti-air</span><span>${yes(air, 'Covered', 'None!')}</span>
      <span>Splash damage</span><span>${yes(splash, 'Yes', 'None')}</span>
      <span>Win condition</span><span>${yes(wincon, 'Yes', 'Missing')}</span>
      <span>Flying troops</span><span>${flyer ? 'Yes' : 'No'}</span>`;
    saveSettings(this.settings);
  }
}
