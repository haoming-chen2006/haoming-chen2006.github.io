// BG3-style dialogue panel: portrait, speaker, typewriter line, numbered choices with gold skill tags and DC preview.
import type { DialogueNode, DialogueChoice } from '../sim/types.ts';
import { h, clear, sfx, ornament, esc } from './dom.ts';
import { icon, CLASS_ICON } from './icons.ts';
import { getClass, SKILL_NAME } from './content.ts';
import type { UIContext } from './types.ts';

export interface DialogueUI {
  el: HTMLElement;
  present(node: DialogueNode, choices: DialogueChoice[], onPick: (i: number) => void, onContinue: () => void): void;
  hide(): void;
  /** Returns true if the key was consumed. */
  key(code: string): boolean;
  isOpen(): boolean;
}

const SPEAKER_ICON: Record<string, string> = { ilyra: 'ilyra', narrator: 'narrator', boss: 'crown', player: 'person' };
const TAG_ICON: Record<string, string> = { attack: 'sword', leave: 'door', roll: 'd20', gold: 'coin' };

export function createDialogue(ctx: UIContext, onOpenChange: (open: boolean) => void, opts: { instant?: boolean } = {}): DialogueUI {
  const portrait = h('div.dlg-portrait'); const name = h('div.dlg-name'); const text = h('div.dlg-text');
  const choicesEl = h('ul.dlg-choices'); const cont = h('div.dlg-continue', h('span', 'Continue'), h('span', { html: icon('chevronRight') }));
  const panel = ornament(h('div.panel.blur.dlg-panel', portrait, h('div.dlg-body', name, text, choicesEl, cont)));
  const el = h('div#dlg', panel);

  let open = false; let typing = false; let full = ''; let shown = 0; let timer = 0;
  let curChoices: DialogueChoice[] = []; let pick: ((i: number) => void) | null = null; let onCont: (() => void) | null = null;
  let hasChoices = false; let sel = -1;

  const substitute = (s: string) => {
    const p = ctx.world.player; const cls = getClass(p?.classId);
    return s.replace(/\{name\}/g, p?.name ?? 'Tav').replace(/\{class\}/g, cls.name.toLowerCase()).replace(/\{Class\}/g, cls.name);
  };
  function speakerInfo(id: string) {
    const a = ctx.world.actors.get(id);
    if (id === 'player' || id === ctx.world.playerId) { const p = ctx.world.player; return { name: p?.name ?? 'You', icon: CLASS_ICON[p?.classId ?? ''] ?? 'person' }; }
    if (a) return { name: a.name, icon: SPEAKER_ICON[id] ?? (a.ai?.boss ? 'crown' : a.kind === 'enemy' ? 'skull' : 'person') };
    if (id === 'narrator') return { name: 'Narrator', icon: 'narrator' };
    return { name: id.charAt(0).toUpperCase() + id.slice(1), icon: SPEAKER_ICON[id] ?? 'person' };
  }

  function typeStep() {
    if (!typing) return;
    shown = Math.min(full.length, shown + 1);
    // pause a little on punctuation
    const ch = full[shown - 1]; const delay = /[.!?…]/.test(ch) ? 140 : /[,;:—]/.test(ch) ? 70 : 18;
    text.innerHTML = esc(full.slice(0, shown)) + '<span class="cur"></span>';
    if (shown >= full.length) finishTyping(); else timer = window.setTimeout(typeStep, delay);
  }
  function finishTyping() {
    typing = false; clearTimeout(timer); shown = full.length; text.textContent = full;
    if (hasChoices) { choicesEl.classList.add('on'); sel = -1; }
    else cont.classList.add('on');
  }
  function renderChoices() {
    clear(choicesEl);
    curChoices.forEach((c, i) => {
      const m = /^\s*\[([^\]]+)\]\s*(.*)$/.exec(c.text);
      const tagText = m ? m[1] : c.check ? (SKILL_NAME[c.check.skill] ?? c.check.skill) : null;
      const body = m ? m[2] : c.text;
      const tagIcon = c.tag ? TAG_ICON[c.tag] : c.check ? 'd20' : null;
      const li = h('li.choice' + (c.tag ? '.' + c.tag : ''), { dataset: { i: String(i) } },
        h('span.n', String(i + 1)),
        tagText ? h('span.tag', { html: (tagIcon ? icon(tagIcon) : '') + esc(tagText) }) : null,
        h('span.t', substitute(body)),
        c.check ? h('span.dc', `DC ${c.check.dc}`) : (c.tag && !tagText ? h('span.ti', { html: icon(TAG_ICON[c.tag]) }) : null));
      li.addEventListener('click', (e) => { e.stopPropagation(); choose(i); });
      li.addEventListener('mouseenter', () => { sel = i; highlight(); });
      choicesEl.appendChild(li);
    });
  }
  function highlight() { [...choicesEl.children].forEach((c, i) => c.classList.toggle('sel', i === sel)); }
  function choose(i: number) {
    if (typing || !pick || i < 0 || i >= curChoices.length) return;
    sfx('click'); const fn = pick; pick = null; choicesEl.classList.remove('on'); fn(i);
  }
  function doContinue() {
    if (typing) { finishTyping(); return; }
    if (hasChoices) return;
    if (!onCont) return;
    sfx('click'); const fn = onCont; onCont = null; cont.classList.remove('on'); fn();
  }

  function present(node: DialogueNode, choices: DialogueChoice[], onPick: (i: number) => void, onContinue: () => void) {
    const sp = speakerInfo(node.speaker);
    portrait.innerHTML = icon(sp.icon); name.textContent = sp.name;
    text.classList.toggle('narr', node.speaker === 'narrator');
    full = substitute(node.text); shown = 0; typing = true; clearTimeout(timer);
    curChoices = choices; pick = onPick; onCont = onContinue; hasChoices = choices.length > 0;
    choicesEl.classList.remove('on'); cont.classList.remove('on');
    renderChoices();
    if (!open) { open = true; el.classList.add('on'); onOpenChange(true); sfx('open'); }
    text.innerHTML = '<span class="cur"></span>';
    if (opts.instant) finishTyping(); else timer = window.setTimeout(typeStep, 120);
  }
  function hide() {
    if (!open) return;
    open = false; typing = false; clearTimeout(timer); pick = null; onCont = null;
    el.classList.remove('on'); onOpenChange(false); sfx('close');
  }
  function key(code: string): boolean {
    if (!open) return false;
    if (code === 'Space' || code === 'Enter' || code === 'KeyE') { if (typing) finishTyping(); else if (hasChoices) { if (sel >= 0) choose(sel); } else doContinue(); return true; }
    const d = /^Digit([1-9])$/.exec(code); if (d) { if (typing) finishTyping(); else choose(Number(d[1]) - 1); return true; }
    if (code === 'ArrowDown' || code === 'KeyS') { if (hasChoices && !typing) { sel = (sel + 1) % curChoices.length; highlight(); } return true; }
    if (code === 'ArrowUp' || code === 'KeyW') { if (hasChoices && !typing) { sel = (sel - 1 + curChoices.length) % curChoices.length; highlight(); } return true; }
    return code !== 'Escape';
  }
  el.addEventListener('click', () => { if (typing) finishTyping(); else if (!hasChoices) doContinue(); });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return { el, present, hide, key, isOpen: () => open };
}
