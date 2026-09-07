import type { ToolDef } from '../../core/types.ts';
import { CRAFT_TOOLS } from './craft.ts';
import { ECONOMY_TOOLS } from './economy.ts';
import { INFO_TOOLS } from './info.ts';
import { LIFE_TOOLS } from './life.ts';
import { META_TOOLS } from './meta.ts';
import { MOVE_TOOLS } from './move.ts';
import { SOCIAL_TOOLS } from './social.ts';
import { WORK_TOOLS } from './work.ts';

/** The whole catalogue. Order is the order brains see it. */
export const TOOLS: ToolDef[] = [...MOVE_TOOLS, ...WORK_TOOLS, ...SOCIAL_TOOLS, ...ECONOMY_TOOLS, ...LIFE_TOOLS, ...CRAFT_TOOLS, ...INFO_TOOLS, ...META_TOOLS];

export const TOOL_BY_NAME: Map<string, ToolDef> = new Map(TOOLS.map((t) => [t.name, t]));

{
  const seen = new Set<string>();
  for (const t of TOOLS) { if (seen.has(t.name)) throw new Error(`duplicate tool ${t.name}`); seen.add(t.name); }
}
