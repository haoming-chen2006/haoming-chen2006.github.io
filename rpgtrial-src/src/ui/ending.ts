// Ending: "Prologue Complete" with the stats table from `prologueComplete` and the credits.
import { bus } from '../core/events.ts';
import { h, ornament, sfx, clear, divider } from './dom.ts';
import { CREDITS_HTML } from './menus.ts';
import { prettify } from './content.ts';
import { ENDING_STATS_LABELS } from '../content/story.ts';
import type { UIContext, Screen } from './types.ts';
import type { Nav } from './tabs.ts';

const STAT_LABEL: Record<string, string> = { ...ENDING_STATS_LABELS, kills: 'Enemies destroyed', damageDealt: 'Damage dealt', damageTaken: 'Damage taken', crits: 'Critical hits', checksPassed: 'Checks passed', checksFailed: 'Checks failed', deaths: 'Deaths', potions: 'Potions drunk', dodges: 'Dodges', parries: 'Parries', gold: 'Gold found', xp: 'Experience earned', time: 'Time', level: 'Final level', secrets: 'Secrets found', rolls: 'Dice rolled', nat20: 'Natural 20s', nat1: 'Natural 1s' };
const fmtStat = (k: string, v: number) => k === 'time' ? `${Math.floor(v / 60)}m ${Math.round(v % 60)}s` : String(v);

let stats: Record<string, number> = {};
bus.on('prologueComplete', (e) => { stats = e.stats ?? {}; });   // module-level: the screen is created lazily, after the event

export function createEnding(ctx: UIContext, nav: Nav): Screen {
  const table = h('table.stats-table');
  const panel = ornament(h('div.panel.blur.ending-panel.content',
    h('h1', 'Prologue Complete'), h('div.sub', 'The gate closes behind you. The road north is open.'), divider(),
    table, h('div.credits', { html: CREDITS_HTML }),
    h('div.menu-list', h('button.menu-item', { type: 'button', onclick: () => { sfx('click'); ctx.game.restart(); } }, 'Return to the shore'))));
  const el = h('div.screen#ending.dim', h('div.veil'), panel);
  function render() {
    clear(table);
    const entries = Object.entries(stats); const p = ctx.world.player;
    if (!entries.length && p) stats = { ...((ctx.world as any).stats ?? {}), level: p.level, xp: p.xp };
    for (const [k, v] of Object.entries(stats)) table.appendChild(h('tr', h('td', STAT_LABEL[k] ?? prettify(k)), h('td', fmtStat(k, v))));
  }
  return { el, open() { render(); el.classList.add('on'); sfx('levelup'); }, close() { el.classList.remove('on'); }, key() { return true; } };
}
