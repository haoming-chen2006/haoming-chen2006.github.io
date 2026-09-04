// Journal: quest steps with checkmarks, lore entries (world.journalEntries), and the running quest log.
import { bus } from '../core/events.ts';
import type { QuestStep } from '../sim/types.ts';
import { h, ornament, clear, kbd } from './dom.ts';
import { icon } from './icons.ts';
import type { UIContext, Screen } from './types.ts';
import { screenTabs, closeButton, type Nav } from './tabs.ts';
import { CODEX } from '../content/story.ts';
import { questText } from './content.ts';

export interface LoreEntry { id: string; title: string; text: string; icon?: string }
const CODEX_ICON: Record<string, string> = { hollowmere: 'moon', moonmaiden: 'ilyra', crypt: 'gate', abbot: 'crown', skeletons: 'skull', aldmere: 'map', ilyra: 'ilyra' };

export function createJournal(ctx: UIContext, nav: Nav): Screen {
  const questList = h('div.quest-list'); const lore = h('div'); const log = h('div.journal-log');
  const left = h('div.col', h('h3.sec', 'The Hollowmere'), questList, h('h3.sec', 'Log'), log);
  const right = h('div.col', h('h3.sec', 'Lore'), lore);
  const panel = ornament(h('div.panel.blur.big-panel.content', closeButton(nav), screenTabs('journal', nav), h('div.cols.journal', left, right)));
  const el = h('div.screen#journal', h('div.veil'), panel);
  const logLines: string[] = [];
  bus.on('questLog', (e) => { logLines.push(e.text); if (logLines.length > 40) logLines.shift(); });
  let openLore: string | null = null;

  function render() {
    const w = ctx.world as any;
    const steps: QuestStep[] = Array.isArray(w.quest) ? w.quest : [];
    clear(questList);
    if (!steps.length) questList.appendChild(h('div.qstep', h('div.qc'), h('div', h('div.qt', 'Wake'), h('div.qh', 'You are lying on a cold shore. The journal is empty — for now.'))));
    const curIdx = steps.findIndex((s) => !s.done);
    steps.forEach((s, i) => {
      const cur = i === curIdx;
      questList.appendChild(h('div.qstep' + (s.done ? '.done' : '') + (cur ? '.cur' : ''), h('div.qc', { html: icon('check') }),
        h('div', h('div.qt', questText(w, s.title)), h('div.qh', questText(w, s.hint)), cur && s.keys?.length ? h('div', { style: { marginTop: '4px' } }, s.keys.map((k) => kbd(k))) : null)));
    });
    clear(log);
    if (!logLines.length) log.appendChild(h('div', { style: { fontStyle: 'italic', color: 'var(--ink-faint)' } }, 'Nothing written yet.'));
    for (const l of logLines.slice().reverse()) log.appendChild(h('div', l));
    clear(lore);
    const flags: Set<string> = w.flags instanceof Set ? w.flags : new Set();
    const codex: LoreEntry[] = CODEX.filter((c) => !c.unlock || flags.has(c.unlock)).map((c) => ({ id: c.id, title: c.title, text: c.text, icon: CODEX_ICON[c.id] ?? 'scroll' }));
    const entries: LoreEntry[] = Array.isArray(w.journalEntries) ? w.journalEntries : (Array.isArray(w.lore) ? w.lore : codex.length ? codex : DEFAULT_LORE);
    if (!entries.length) lore.appendChild(h('div', { style: { fontStyle: 'italic', color: 'var(--ink-faint)' } }, 'You have learned nothing yet.'));
    for (const e of entries) {
      const item = h('div.lore' + (openLore === e.id ? '.on' : ''), { onclick: () => { openLore = openLore === e.id ? null : e.id; render(); } },
        h('div.ln', h('span', { html: icon(e.icon ?? 'scroll') }), e.title), h('div.lt', e.text));
      lore.appendChild(item);
    }
  }
  return {
    el,
    open() { render(); el.classList.add('on'); },
    close() { el.classList.remove('on'); },
    key(code) { if (code === 'Escape' || code === 'KeyJ') { nav.close(); return true; } if (code === 'KeyI') { nav.show('inventory'); return true; } if (code === 'KeyC') { nav.show('character'); return true; } if (code === 'KeyM') { nav.show('map'); return true; } return true; },
  };
}

export const DEFAULT_LORE: LoreEntry[] = [
  { id: 'hollowmere', title: 'The Hollowmere', icon: 'moon', text: 'A black lake in the hills, older than the road that skirts it. The fisherfolk say it has no bottom, and that on still nights you can hear bells from the town that drowned in it.' },
  { id: 'ilyra', title: 'Ilyra', icon: 'ilyra', text: 'A hooded wanderer who pulled you from the water. She wears a silver crescent and speaks of the crypt as though she has been inside it before.' },
  { id: 'crypt', title: 'The Crypt Beneath the Hill', icon: 'gate', text: 'An iron gate in the hillside, north of the ruined chapel. The dead have been leaving it lately, and someone has been letting them.' },
];
