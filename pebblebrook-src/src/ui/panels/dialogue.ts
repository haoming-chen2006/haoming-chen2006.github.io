import { bus } from '../../core/bus.ts';
import { item as itemDef } from '../../core/items.ts';
import type { ConversationTurn, Villager } from '../../core/types.ts';
import { guardTextField, h, icon, img, replaceChildren, setClass, setClassName, setHidden, setText, Throttle } from '../dom.ts';
import { cap, moodWord, REL_LABEL_CLASS, shortName, type Panel, type UiCore } from '../shared.ts';
import { frame } from './frame.ts';

export interface DialoguePanel extends Panel { open(v: Villager): void; current(): Villager | null; key(n: number): void }

interface Intent { key: string; label: string; intent?: string; kind?: 'gift' | 'trade' | 'about' }
const INTENTS: Intent[] = [
  { key: '1', label: 'Ask about their day', intent: 'day' }, { key: '2', label: 'Gossip', intent: 'gossip' }, { key: '3', label: 'Ask for help', intent: 'help' },
  { key: '4', label: 'Tell a joke', intent: 'joke' }, { key: '5', label: 'Compliment', intent: 'compliment' }, { key: '6', label: 'Give a gift', kind: 'gift' },
  { key: '7', label: 'Trade', kind: 'trade' }, { key: '8', label: 'Ask about…', kind: 'about' }, { key: '9', label: 'Goodbye', intent: 'goodbye' },
];

export function createDialogue(core: UiCore): DialoguePanel {
  const { ctx } = core;
  const { win, body } = frame(core, 'dialogue', { title: 'Talking', cls: 'pb-dialogue', pos: 'bottom' });
  const titleEl = win.querySelector('.pb-head > span') as HTMLElement;
  const portrait = img('', 'pb-portrait lg', '');
  const nameEl = h('b'), moodEl = h('div', { class: 'mood' });
  const relLabel = h('span', { class: 'pb-chip muted' }, 'stranger');
  const hearts = h('div', { class: 'hearts' }, ...Array.from({ length: 5 }, () => icon('heartEmpty')));
  const affBar = h('div', { class: 'pb-bar aff', style: 'width:96px;height:8px', title: 'Affinity' }, h('i'));
  const relBox = h('div', { class: 'rel', style: 'position:relative' }, relLabel, hearts, affBar);
  const lineEl = h('div', { class: 'line', onclick: () => finishTyping() });
  const lineText = h('span'), caret = h('span', { class: 'caret' }), toneEl = h('span', { class: 'tone' });
  lineEl.append(lineText, caret, toneEl);
  const history = h('div', { class: 'history' });
  const intents = h('div', { class: 'intents' });
  const picker = h('div', { class: 'picker', hidden: true });
  const pickerBar = h('div', { class: 'pb-row', hidden: true }, h('span', { class: 'pb-muted grow' }), h('button', { class: 'pb-btn ghost sm', onclick: () => showIntents() }, 'Back'));
  const chatInput = h('input', { class: 'pb-input', id: 'pb-chat', placeholder: 'Say anything… (Enter to send)', maxlength: 240, 'aria-label': 'Say something' });
  guardTextField(chatInput);
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); if (e.key === 'Escape') chatInput.blur(); });
  const chatRow = h('div', { class: 'chat', hidden: true }, chatInput, h('button', { class: 'pb-btn', onclick: () => sendChat() }, 'Say'));
  body.append(h('div', { class: 'who' }, portrait, nameEl, moodEl, relBox), h('div', { class: 'talk' }, lineEl, history, intents, pickerBar, picker, chatRow));

  let v: Villager | null = null;
  let turns: { who: string; text: string; you: boolean }[] = [];
  let full = '', shown = 0, typing = false, busy = false, ended = false, endTimer = 0;
  let intentBtns: HTMLButtonElement[] = [];
  const slow = new Throttle(0.25);
  let lastAff = 0;

  function sells(vv: Villager): boolean {
    const p = ctx.world.place(vv.workplace);
    if (!p) return false;
    if (p.kind === 'shop') return true;
    try { return ctx.sim.shopStock(p.id).length > 0; } catch { return false; }
  }

  function buildIntents(): void {
    intentBtns = INTENTS.map((it) => {
      const b = h('button', { class: 'pb-btn ghost', 'data-intent': it.intent ?? it.kind ?? '', onclick: () => run(it) }, h('span', { class: 'pb-kbd' }, it.key), it.label);
      if (it.kind === 'trade' && v && !sells(v)) b.disabled = true;
      return b;
    });
    replaceChildren(intents, intentBtns);
  }

  function showIntents(): void { setHidden(intents, false); setHidden(picker, true); setHidden(pickerBar, true); setHidden(chatRow, ctx.getLlm().provider === 'none' || ended); }

  function say(text: string, tone?: ConversationTurn['tone']): void {
    full = text; shown = core.settings.typewriter ? 0 : text.length; typing = shown < full.length;
    setText(lineText, full.slice(0, shown)); setHidden(caret, !typing); setText(toneEl, tone && tone !== 'neutral' ? tone : '');
    setClass(lineEl, 'thinking', false);
  }
  function finishTyping(): void { if (typing) { shown = full.length; setText(lineText, full); typing = false; setHidden(caret, true); } }
  function pushHistory(who: string, text: string, you: boolean): void {
    turns.push({ who, text, you }); if (turns.length > 12) turns.shift();
    replaceChildren(history, turns.slice(-7, -1).map((t) => h('div', { class: `h ${t.you ? 'you' : ''}` }, h('b', null, t.who), h('span', null, t.text))));
    history.scrollTop = history.scrollHeight;
  }
  function setBusy(b: boolean): void { busy = b; for (const x of intentBtns) x.disabled = b || (x.dataset.intent === 'trade' && !!v && !sells(v)); chatInput.disabled = b; if (b) { setClass(lineEl, 'thinking', true); setText(lineText, `${v ? shortName(v) : ''} is thinking…`); setHidden(caret, true); setText(toneEl, ''); } }

  async function talk(intent: string, line?: string, label?: string): Promise<void> {
    if (!v || busy || ended) return;
    if (label) pushHistory('You', label, true);
    setBusy(true);
    let turn: ConversationTurn;
    try { turn = await ctx.sim.playerTalk(v, intent, line); } catch (e) { turn = { speaker: v.id, text: '…', tone: 'neutral' }; core.toast(`${shortName(v)} did not answer (${(e as Error).message ?? 'error'})`, 'warn'); }
    setBusy(false);
    if (!v) return;
    say(turn.text, turn.tone); pushHistory(shortName(v), turn.text, false);
    if (turn.end || intent === 'goodbye') { ended = true; endTimer = 1.6; setHidden(intents, true); setHidden(chatRow, true); setHidden(picker, true); setHidden(pickerBar, true); }
  }
  function sendChat(): void { const t = chatInput.value.trim(); if (!t) return; chatInput.value = ''; void talk('chat', t, t); }

  function run(it: Intent): void {
    if (!v || busy || ended) return;
    if (it.intent) { void talk(it.intent, undefined, it.label); return; }
    if (it.kind === 'trade') { const p = ctx.world.place(v.workplace); if (p) core.openShop(p); return; }
    setHidden(intents, true); setHidden(chatRow, true); setHidden(picker, false); setHidden(pickerBar, false);
    if (it.kind === 'gift') {
      setText(pickerBar.firstChild as Element, 'Give which?');
      const inv = ctx.sim.player.inventory.filter((s) => s.qty > 0);
      replaceChildren(picker, inv.length ? inv.map((s) => h('div', { class: 'pb-card click', tabindex: 0, role: 'button', onclick: () => giveGift(s.id), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') giveGift(s.id); } }, img(core.itemIcon(s.id, 32), 'pb-item sm'), h('span', null, itemDef(s.id).name), h('span', { class: 'q' }, `×${s.qty}`))) : [h('div', { class: 'pb-empty' }, 'Your pockets are empty.')]);
    } else {
      setText(pickerBar.firstChild as Element, `Ask ${shortName(v)} about…`);
      replaceChildren(picker, ctx.sim.villagers.filter((o) => o.id !== v!.id).map((o) => h('div', { class: 'pb-card click', tabindex: 0, role: 'button', onclick: () => askAbout(o), onkeydown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') askAbout(o); } }, img(core.portrait(o), 'pb-portrait sm', o.name), h('span', null, shortName(o)), h('span', { class: 'q' }, cap(o.profession)))));
    }
    (picker.firstElementChild as HTMLElement | null)?.focus();
  }
  function giveGift(id: string): void {
    if (!v) return;
    showIntents();
    const r = ctx.sim.playerGift(v, id);
    pushHistory('You', `gave ${itemDef(id).name}`, true);
    say(r.reaction, r.ok ? 'warm' : 'cold'); pushHistory(shortName(v), r.reaction, false);
    if (!r.ok) core.toast(r.reaction, 'warn');
  }
  function askAbout(o: Villager): void { showIntents(); void talk('about', o.id, `Asked about ${shortName(o)}`); }

  function updateRel(animate: boolean, delta = 0): void {
    if (!v) return;
    const r = v.relationships['player'];
    const aff = r?.affinity ?? 0;
    setText(relLabel, r?.label ?? 'stranger'); setClassName(relLabel, `pb-chip ${REL_LABEL_CLASS[r?.label ?? 'stranger'] ?? 'muted'}`);
    hearts.querySelectorAll('.pb-ico').forEach((hEl, i) => { hEl.innerHTML = ''; hEl.appendChild(icon(aff >= (i + 1) * 20 ? 'heart' : 'heartEmpty')); });
    const bar = affBar.firstElementChild as HTMLElement;
    setClass(bar, 'neg', aff < 0); bar.style.width = `${Math.abs(aff) / 2}%`;
    affBar.title = `Affinity ${aff > 0 ? '+' : ''}${Math.round(aff)} · trust ${Math.round(r?.trust ?? 0)} · familiarity ${Math.round(r?.familiarity ?? 0)}`;
    if (animate && delta) {
      hearts.classList.remove('pulse'); void hearts.offsetWidth; hearts.classList.add('pulse');
      const d = h('span', { class: `delta ${delta < 0 ? 'neg' : ''}`, style: 'right:-8px;top:-4px' }, `${delta > 0 ? '+' : ''}${Math.round(delta)}`);
      relBox.appendChild(d); setTimeout(() => d.remove(), 1200);
    }
    lastAff = aff;
  }

  const offRel = bus.on('relationship', (e) => { if (!v || win.hidden) return; if ((e.a === v.id && e.b === 'player') || (e.a === 'player' && e.b === v.id)) updateRel(true, e.delta || (v.relationships['player']?.affinity ?? 0) - lastAff); });
  void offRel;

  function open(vv: Villager): void {
    if (v && v.id !== vv.id) { try { ctx.sim.endPlayerConversation(); } catch { /* sim may not be ready */ } }
    v = vv; turns = []; ended = false; endTimer = 0; busy = false;
    portrait.src = core.portrait(vv); portrait.alt = vv.name;
    setText(nameEl, vv.name); setText(titleEl, `Talking to ${shortName(vv)}`);
    replaceChildren(history, []);
    buildIntents(); showIntents(); updateRel(false);
    say('', 'neutral');
    void talk('greet');
  }

  function tick(dt: number): void {
    if (!v) return;
    if (typing) { shown = Math.min(full.length, shown + dt * 45); setText(lineText, full.slice(0, Math.floor(shown))); if (shown >= full.length) { typing = false; setHidden(caret, true); } }
    if (ended && !typing && endTimer > 0) { endTimer -= dt; if (endTimer <= 0) core.close('dialogue'); }
    if (slow.tick(dt)) { setText(moodEl, `${moodWord(v.mood)} · ${cap(v.profession)}`); const aff = v.relationships['player']?.affinity ?? 0; if (aff !== lastAff) updateRel(true, aff - lastAff); }
  }

  return {
    id: 'dialogue', el: win, modal: true, closable: true,
    show() {}, hide() { try { ctx.sim.endPlayerConversation(); } catch { /* sim may not be ready */ } v = null; },
    tick, open, current: () => v,
    key(n) { if (busy || ended) return; if (!intents.hidden) { const it = INTENTS[n - 1]; if (it) run(it); } },
  };
}
