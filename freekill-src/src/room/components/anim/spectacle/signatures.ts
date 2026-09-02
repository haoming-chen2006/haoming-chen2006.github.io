/**
 * Which skill gets which motif.
 *
 * One entry per skill, keyed by the engine's own name for it — the same string
 * `Animate{type="InvokeSkill"}` puts on the wire and the same string
 * `GetGeneralDetail` walks `all_skills` for. A skill with no entry falls back
 * to its `skill_type` category, which is a real effect and a good one; a skill
 * with an entry is drawn as itself.
 *
 * THE TABLE IS ART DIRECTION, NOT RULES. Nothing in it is read for a decision.
 * It maps a name the engine broadcast to a picture, exactly the way `cards.ts`
 * maps the card name in a sound path to a recipe, and every field in it is a
 * shape, a colour or a count. A skill whose rules change tomorrow keeps its
 * picture and keeps being correct, because the picture never claimed to know
 * what the skill did — the engine says when it fired, and this says what it
 * looks like when it does.
 *
 * It is split by package, because that is how the roster is shipped and how it
 * grows: a new pack is a new file and one line here.
 */
import type { Motif } from './motif';
import { BINGSHI } from './signatures/bingshi';
import { MISC } from './signatures/misc';
import { RARE } from './signatures/rare';
import { SHIJI } from './signatures/shiji';
import { SP } from './signatures/sp';
import { STANDARD } from './signatures/standard';

export const SIGNATURES: Readonly<Record<string, Motif>> = {
  ...STANDARD,
  ...BINGSHI,
  ...SHIJI,
  ...SP,
  ...RARE,
  ...MISC,
};

/** How many skills are drawn as themselves rather than as their category. */
export const DESIGNED_COUNT = Object.keys(SIGNATURES).length;

/**
 * The skill a generated name belongs to.
 *
 * A skill in this engine is a *skeleton* that creates one real `Skill` per
 * trigger it declares, and those get names the author never wrote:
 * `SkillSkeleton:createTriggerSkill` builds `#<parent>_<n>_trig`
 * (`lua/lunarltk/core/skill_skeleton.lua:263`), and a sub-skill attached to a
 * card or a private pile ends in `&`. Both fire `InvokeSkill` under their own
 * generated name, and both are the same skill to a player: 残势 fired 24 times
 * as `canshi` and 38 times as `#canshi_2_trig` in one audited pair of games.
 *
 * THE ENGINE ALREADY SAYS THEY ARE THE SAME. `createTriggerSkill` registers the
 * child's translation as `Fk:translate(_skill.name)` — the parent's — so the
 * plaque under the effect has always read 残势 for both, and only the picture
 * disagreed. `Player:getSkillNameList` strips exactly these two decorations to
 * get back to `skel.name` (`player.lua:1463`), and this strips the same two.
 *
 * Exact match first, always: a real skill is free to be named anything, and a
 * name that is in the table is that name's own answer.
 */
export function signatureOf(name: string): Motif | undefined {
  const exact = SIGNATURES[name];
  if (exact) return exact;
  const bare = name.replace(/&$/, '').replace(/^#/, '').replace(/_\d+_trig$/, '');
  return bare === name ? undefined : SIGNATURES[bare];
}
