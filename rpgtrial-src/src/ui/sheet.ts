// Character sheet: portrait, class, level, XP, ability scores with saves, AC/HP/proficiency, skills, features.
import { SKILL_ABILITY, type SkillKey, type AbilityKey } from '../sim/types.ts';
import { h, ornament, clear, esc, abilityMod, fmtMod } from './dom.ts';
import { icon, CLASS_ICON } from './icons.ts';
import { getClass, getAbility, getItem, getFeat, SKILL_NAME, ABILITY_NAME, prettify, RESOURCE_NAME } from './content.ts';
import type { UIContext, Screen } from './types.ts';
import { xpForLevel } from './types.ts';
import { screenTabs, closeButton, type Nav } from './tabs.ts';

const ABILS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const SKILLS = Object.keys(SKILL_ABILITY) as SkillKey[];

export function createSheet(ctx: UIContext, nav: Nav): Screen {
  const head = h('div.sheet-head'); const scores = h('div.score-grid'); const core = h('div'); const skills = h('div.skills'); const feats = h('div');
  const c1 = h('div.col', head, h('h3.sec', 'Ability scores'), scores, h('h3.sec', 'Combat'), core);
  const c2 = h('div.col', h('h3.sec', 'Skills'), skills);
  const c3 = h('div.col', h('h3.sec', 'Features & abilities'), feats);
  const panel = ornament(h('div.panel.blur.big-panel.content', closeButton(nav), screenTabs('character', nav), h('div.cols.sheet', c1, c2, c3)));
  const el = h('div.screen#character', h('div.veil'), panel);

  function render() {
    const p = ctx.world.player; if (!p) return;
    const cls = getClass(p.classId); const w = ctx.world as any;
    const lo = xpForLevel(p.level), hi = xpForLevel(p.level + 1);
    clear(head);
    head.append(h('div.portrait', { html: icon(CLASS_ICON[p.classId ?? ''] ?? 'person') }),
      h('div', h('div.sn', p.name), h('div.sc', `Level ${p.level} ${cls.name}`),
        h('div.sx', `${p.xp} / ${hi} XP`, h('div.bar-xp', h('div.fill', { style: { transform: `scaleX(${Math.min(1, (p.xp - lo) / Math.max(1, hi - lo))})` } })))));
    clear(scores);
    for (const k of ABILS) {
      const v = p.abilities[k]; const m = abilityMod(v); const sv = p.saveProfs?.includes(k);
      scores.appendChild(h('div.score', { 'data-tip': `<div class="tt-name">${ABILITY_NAME[k]}</div><div class="tt-desc">Score ${v} · modifier ${fmtMod(m)}${sv ? ` · saving throw ${fmtMod(m + p.prof)} (proficient)` : ` · saving throw ${fmtMod(m)}`}</div>` },
        h('i.sv' + (sv ? '.on' : ''), { title: 'Saving throw proficiency' }), h('div.k', k.toUpperCase()), h('div.m', fmtMod(m)), h('div.v', String(v))));
    }
    clear(core);
    const eq = w.equipment ?? {}; const mh = eq.mainHand ? getItem(eq.mainHand) : null;
    const dmg = mh?.weapon ? `${mh.weapon.damage} ${fmtMod(abilityMod(p.abilities[mh.weapon.finesse ? 'dex' : 'str']))}` : p.damageDice ?? '1d4';
    const atk = p.attackBonus ?? (abilityMod(p.abilities[mh?.weapon?.finesse || mh?.weapon?.ranged ? 'dex' : 'str']) + p.prof);
    const rows: [string, string, string][] = [
      ['ac', 'Armour class', String(p.ac)], ['heal', 'Hit points', `${Math.ceil(p.hp)} / ${p.maxHp}`], ['star', 'Proficiency bonus', fmtMod(p.prof)],
      ['sword', 'Attack bonus', fmtMod(atk)], ['slash', 'Weapon damage', dmg], ['dice', 'Hit dice', `${p.hitDice} / ${p.maxHitDice} d${cls.hitDie}`],
      ['boot', 'Initiative', fmtMod(abilityMod(p.abilities.dex))], ['compass', 'Speed', `${p.runSpeed.toFixed(1)} m/s`],
    ];
    for (const [ic, l, v] of rows) core.appendChild(h('div.stat-row', h('span.l', { html: icon(ic) + esc(l) }), h('b', v)));
    for (const [k, max] of Object.entries(cls.resources)) core.appendChild(h('div.stat-row', h('span.l', { html: icon('sparkle') + esc(RESOURCE_NAME[k] ?? prettify(k)) }), h('b', `${p.resources?.[k] ?? 0} / ${(p as any).maxResources?.[k] ?? max}`)));
    clear(skills);
    for (const s of SKILLS) {
      const a = SKILL_ABILITY[s]; const prof = p.skillProfs?.includes(s); const ex = p.expertise?.includes(s);
      const b = abilityMod(p.abilities[a]) + (prof ? p.prof : 0) + (ex ? p.prof : 0);
      skills.appendChild(h('div.skill' + (prof ? '.prof' : ''), h('i.p' + (ex ? '.ex' : prof ? '.on' : '')), h('span.a', a.toUpperCase()), h('span.n', SKILL_NAME[s]), h('span.b', fmtMod(b))));
    }
    clear(feats);
    const kit: string[] = (p as any).kit ?? cls.kit;
    kit.forEach((id, i) => { const a = getAbility(id); feats.appendChild(h('div.feature', h('div.fi', { html: icon(a.icon) }), h('div', h('div.fn', a.name, h('span.fk', `${a.kind} · key ${i + 1}`)), h('div.fd', a.description)))); });
    for (const f of p.feats ?? []) { const d = getFeat(f); feats.appendChild(h('div.feature', h('div.fi', { html: icon('star') }), h('div', h('div.fn', d.name, h('span.fk', 'feat')), h('div.fd', d.description)))); }
    if (!p.feats?.length) feats.appendChild(h('div.feature', h('div.fi', { html: icon('star') }), h('div', h('div.fn', 'Level 2 feature', h('span.fk', 'locked')), h('div.fd', `Reach ${hi} XP to choose a ${cls.name.toLowerCase()} feature.`))));
  }
  return {
    el,
    open() { render(); el.classList.add('on'); },
    close() { el.classList.remove('on'); },
    key(code) { if (code === 'Escape' || code === 'KeyC') { nav.close(); return true; } if (code === 'KeyI') { nav.show('inventory'); return true; } if (code === 'KeyJ') { nav.show('journal'); return true; } if (code === 'KeyM') { nav.show('map'); return true; } return true; },
  };
}
