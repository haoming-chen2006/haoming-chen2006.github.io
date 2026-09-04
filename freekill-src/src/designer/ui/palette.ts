/**
 * What the right-hand column offers, and in what order.
 *
 * Four tabs, and the fourth is not a fourth kind of block: 代价 and 效果 are
 * both `VOCABULARY.effects`, split on `asCost`. That is the engine's own
 * distinction — `TriggerSkill:doCost` (skill_type/trigger.lua:70) runs the cost
 * and only runs the effect if it returned true — and the split is measured, not
 * guessed: 184 of the 218 skills that ask a yes/no question do it in the cost.
 * A player who puts 「弃两张牌」 in 效果 instead of 代价 ships a skill where
 * cancelling still pays out, which is the single most likely way to build a
 * broken general, so the panel makes the two look and read differently.
 *
 * Order inside a tab is `common` before `occasional` (the vocabulary's bands,
 * cut at 5% of the roster) and then by how many shipped skills use it, so the
 * blocks a player is looking for are the ones at the top.
 */
import type { BlockKind } from '../spec';
import { VOCABULARY, forPanel, type Band } from '../vocabulary/index';
import { blockLabel, GROUP_LABELS } from './labels';

/** Which stack a block goes into. `trigger` holds exactly one. */
export type Lane = 'trigger' | 'conditions' | 'cost' | 'actions';

export const LANE_KIND: Record<Lane, BlockKind> = {
  trigger: 'trigger',
  conditions: 'condition',
  cost: 'effect',
  actions: 'effect',
};

export const LANE_LABEL: Record<Lane, string> = {
  trigger: '触发',
  conditions: '条件',
  cost: '代价',
  actions: '效果',
};

/** What the block face says before the name, Scratch's 「当…」/「如果…」. */
export const LANE_PREFIX: Record<Lane, string> = {
  trigger: '当',
  conditions: '如果',
  cost: '代价：',
  actions: '效果：',
};

export interface PaletteBlock {
  id: string;
  kind: BlockKind;
  lane: Lane;
  /** The Chinese face. */
  label: string;
  /** The generated English label, kept for the tooltip. */
  english?: string;
  citation?: string;
  band: Band;
  count: number;
  /** Three shipped skills that use it — the tooltip's evidence. */
  examples: string[];
  /** Trigger group (`flow`, `damage`, …) for the section headings. */
  group?: string;
  /** How many shipped skills use this effect as a cost rather than an effect. */
  asCost?: number;
}

export interface PaletteSection {
  key: string;
  title: string;
  blocks: PaletteBlock[];
}

const byCount = (a: { count: number }, b: { count: number }) => b.count - a.count;

const triggers = (): PaletteBlock[] =>
  forPanel(VOCABULARY.triggers)
    .slice()
    .sort(byCount)
    .map((t) => ({
      id: t.id,
      kind: 'trigger' as const,
      lane: 'trigger' as const,
      label: blockLabel('trigger', t.id),
      citation: t.id.startsWith('fk.') ? `${t.family ?? ''} · ${t.id}` : t.id,
      band: t.band,
      count: t.count,
      examples: t.examples,
      group: t.group,
    }));

const conditions = (): PaletteBlock[] =>
  forPanel(VOCABULARY.conditions)
    .slice()
    .sort(byCount)
    .map((c) => ({
      id: c.id,
      kind: 'condition' as const,
      lane: 'conditions' as const,
      label: blockLabel('condition', c.id, c.label),
      english: c.label,
      citation: c.citation,
      band: c.band,
      count: c.count,
      examples: c.examples,
    }));

const effects = (lane: 'cost' | 'actions'): PaletteBlock[] =>
  forPanel(VOCABULARY.effects)
    .filter((e) => (lane === 'cost' ? e.asCost > 0 : true))
    .slice()
    .sort(lane === 'cost' ? (a, b) => b.asCost - a.asCost : byCount)
    .map((e) => ({
      id: e.id,
      kind: 'effect' as const,
      lane,
      label: blockLabel('effect', e.id, e.label),
      english: e.label,
      citation: e.citation,
      band: e.band,
      count: e.count,
      examples: e.examples,
      asCost: e.asCost,
    }));

/**
 * The four tabs, built once.
 *
 * The vocabulary is a static import and never changes at runtime, so this is a
 * module-level constant rather than a hook — nothing here needs to re-derive on
 * a render, and a palette that rebuilds 170 objects per keystroke in the name
 * field is the kind of thing that makes a panel feel heavy.
 */
export const PALETTE: Record<Lane, PaletteBlock[]> = {
  trigger: triggers(),
  conditions: conditions(),
  cost: effects('cost'),
  actions: effects('actions'),
};

/** Every block the panel can offer, by id and lane — what the canvas looks up. */
const INDEX = new Map<string, PaletteBlock>();
for (const lane of Object.keys(PALETTE) as Lane[]) {
  for (const b of PALETTE[lane]) INDEX.set(`${lane}:${b.id}`, b);
}

/**
 * A block the canvas is drawing, even when it is not one the palette offers.
 *
 * The agent lane may return a `rare` block, and 「我的武将」 may load a spec
 * built before a pack changed. Neither is a reason to draw a blank card: the
 * canvas falls back to the id with whatever Chinese exists for it, and
 * `validateSpec` is what says whether it is real.
 */
export const paletteBlock = (lane: Lane, id: string): PaletteBlock =>
  INDEX.get(`${lane}:${id}`) ?? {
    id,
    kind: LANE_KIND[lane],
    lane,
    label: blockLabel(LANE_KIND[lane], id),
    band: 'rare',
    count: 0,
    examples: [],
  };

/** The sections a tab draws: triggers by event family, the rest by band. */
export const sectionsFor = (lane: Lane): PaletteSection[] => {
  const blocks = PALETTE[lane];
  if (lane === 'trigger') {
    const groups = new Map<string, PaletteBlock[]>();
    for (const b of blocks) {
      const key = b.group ?? 'other';
      const list = groups.get(key);
      if (list) list.push(b);
      else groups.set(key, [b]);
    }
    return [...groups.entries()]
      .sort((a, b) => b[1][0].count - a[1][0].count)
      .map(([key, list]) => ({ key, title: GROUP_LABELS[key] ?? key, blocks: list }));
  }
  const common = blocks.filter((b) => b.band === 'common');
  const rest = blocks.filter((b) => b.band !== 'common');
  const out: PaletteSection[] = [];
  if (common.length) out.push({ key: 'common', title: '常用', blocks: common });
  if (rest.length) out.push({ key: 'occasional', title: '偶尔用到', blocks: rest });
  return out;
};

/** Case-insensitive match on the Chinese face, the English label and the id. */
export const search = (blocks: PaletteBlock[], query: string): PaletteBlock[] => {
  const q = query.trim().toLowerCase();
  if (!q) return blocks;
  return blocks.filter(
    (b) =>
      b.label.includes(query.trim()) ||
      b.id.toLowerCase().includes(q) ||
      (b.english ?? '').toLowerCase().includes(q),
  );
};
