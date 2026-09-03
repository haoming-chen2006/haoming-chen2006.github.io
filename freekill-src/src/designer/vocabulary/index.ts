/**
 * The grammar of a FreeKill skill — what the hero designer is allowed to build.
 *
 * Two lanes need this and need to agree: a block panel where a player picks a
 * trigger and an effect, and an agent that writes Lua from a description.
 * Neither can be trusted to invent the surface, because the failure is silent —
 * Lua resolves a method at the call, not at load, and the engine swallows
 * errors raised inside a skill. A block that emits `room:changeRole` produces a
 * general whose card prints a skill that does nothing at all, and the player
 * cannot tell. That is not hypothetical; `src/engine/__tests__/roster.test.ts`
 * exists because two shipped skills did exactly that.
 *
 * So nothing here is authored from the rules text. `catalogue.generated.json`
 * and `vocabulary.generated.json` come out of `scripts/build-skill-catalogue.mjs`,
 * which boots the real engine, walks the skeletons the 697 shipped generals
 * carry, and joins each to the Lua that defines it. Every block carries a
 * `citation` naming the engine function it compiles down to. Re-run
 * `npm run build:catalogue` when the packs change;
 * `__tests__/vocabulary.test.ts` fails if the committed copy has gone stale.
 *
 * ---------------------------------------------------------------------------
 * WHAT A SKILL IS
 *
 * One printed skill is a SKELETON, not a Skill object:
 *
 *     local x = fk.CreateSkill{ name = "...", tags = { Skill.Compulsory } }
 *     x:addEffect(fk.Damaged, { can_trigger = …, on_cost = …, on_use = … })
 *     x:addEffect("maxcards", { correct_func = … })
 *
 * `fk.CreateSkill` (lua/lunarltk/core/skill_skeleton.lua:938) makes the
 * skeleton; each `addEffect` (skill_skeleton.lua:115) appends one EFFECT, and
 * `createSkill` (:179) turns the first into the main Skill and attaches the
 * rest as related skills. The unit a player reads off a general card is the
 * skeleton; the unit the engine dispatches is the effect.
 *
 * Every one of the 1304 shipped skills is written this way. The older
 * `fk.CreateTriggerSkill` / `fk.CreateActiveSkill` family appears **zero**
 * times across all thirteen shipped packs, so the designer has exactly one
 * style to emit and no compatibility branch to carry.
 *
 * ---------------------------------------------------------------------------
 * COMPOSITION RULES
 *
 * 1. AN EFFECT IS A (KEY, SPEC) PAIR. The key is either a trigger event —
 *    `fk.Damaged`, a live class, so `event.name` is the string and
 *    `event.super.name` is its family — or one of eleven strings registered in
 *    `Fk.skill_keys` (engine.lua:56): active, viewas, cardskill, distance,
 *    prohibit, atkrange, maxcards, targetmod, filter, invalidity, visibility.
 *    A package may register more (`Engine:addSkillType`, engine.lua:201) and
 *    `packages/utility` defines its own events, which are keys exactly like
 *    `fk.*` ones — 议事 is five of them.
 *
 * 2. ORDER IS NOT SOURCE ORDER. `addEffect` inserts by priority: active and
 *    viewas carry 5 and jump to the front, triggers carry 3, the status kinds
 *    carry 1 (skill_skeleton.lua:120-149). At most ONE active or viewas effect
 *    per skeleton — a second logs `qCritical` and is dropped (:136).
 *
 * 3. SEVERAL TRIGGERS ARE NORMAL, AND THEY ARE SEPARATE EFFECTS. 414 of 1304
 *    skills hang off more than one event; one hangs off eight. There is no
 *    "fires on A or B" spec — you add one effect per event, and they may share
 *    a body (无双 hoists `on_use` into a local and passes it to both). So a
 *    designer offering "several conditions at once" emits several addEffect
 *    calls, not one compound condition.
 *
 * 4. COST IS NOT EFFECT, AND THE ENGINE ENFORCES IT.
 *    `TriggerSkill:doCost` (skill_type/trigger.lua:70) runs `cost` and only
 *    runs `use` if it returned true. So "discard two cards, THEN draw three" is
 *    `on_cost` = the discard, `on_use` = the draw — and cancelling the discard
 *    correctly costs nothing. Put it all in `on_use` and a player who cancels
 *    still gets the draw.
 *
 *    The default `cost` (trigger.lua:98) returns true for a 锁定技 and
 *    otherwise raises `AskForSkillInvoke`. That is why 218 skills ask a yes/no
 *    question and 184 of those never write a line to do it.
 *
 *    What appears in a cost body, measured: ask-yes-no 184, ask-choose-players
 *    159, ask-cards 67, ask-choice 50, ask-discard 35. Costs are overwhelmingly
 *    ASKS. Effects are overwhelmingly ACTIONS.
 *
 * 5. AN ASK CAN ALSO BE AN ACTION. Six `askTo*` methods perform the thing they
 *    asked about unless passed `skip = true`: askToDiscard throws the cards
 *    (room.lua:790), askToGuanxing reorders the pile (:1833), askToYiji calls
 *    doYiji (:1157), askToUseRealCard / askToUseVirtualCard / askToPlayCard use
 *    the card, askToMoveCardInBoard moves it (:2952). A UI with a separate
 *    "choose cards" block and "discard them" block MUST emit `skip` on the
 *    first, or the cards are thrown twice.
 *
 * 6. TARGET SELECTION HAS TWO SHAPES. A trigger skill picks targets in its
 *    cost, with `askToChoosePlayers` (room.lua:806) returning a player list
 *    that is stashed via `event:setCostData(self, { tos = … })` and read back
 *    in `on_use`. An active skill declares them instead — `target_filter`
 *    decides whether one more player may be added and `feasible` decides
 *    whether the current selection is legal (skill_skeleton.lua:566-567); the
 *    client enforces both live while the player clicks.
 *
 * 7. USE LIMITS ARE DECLARED, NOT COUNTED. `max_phase_use_time`,
 *    `max_turn_use_time`, `max_round_use_time`, `max_game_use_time` on the
 *    skeleton (skill_skeleton.lua:97) plus the `check_skill_limit` attribute
 *    make the engine do the bookkeeping. A 限定技 or 觉醒技 gets
 *    game-limit 1 automatically (:108-112). Do not hand-roll this with marks.
 *
 * 8. TAGS CHANGE BEHAVIOUR, NOT JUST WORDING. `Skill.Compulsory` makes the
 *    default cost auto-accept; `Skill.Wake` additionally routes `can_trigger`
 *    through `can_wake` (:274-283); `Skill.Limited` and `Skill.Wake` pin the
 *    once-per-game limit. The full list is lunarltk/core/skill.lua:30-49.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE ENGINE CANNOT EXPRESS
 *
 * Worth knowing before a block promises it:
 *
 *   * `fk.Dying` is declared (events/death.lua:23) and fired from nowhere. A
 *     skill attached to it silently never runs. Use `fk.EnterDying`.
 *   * `Room:askToExchange` (room.lua:1865) has no caller in any shipped pack,
 *     and `Fk.mini_games` is empty, so `askToMiniGame` cannot resolve.
 *   * A `CustomDialog` needs a QML component this web client also implements
 *     (`src/room/dialogs/CustomDialogs.tsx`); a generated skill must not invent
 *     one.
 *   * There is no `fk.AfterDrawCard`. Draws are observed through
 *     `fk.AfterCardsMove` filtered on `fk.ReasonDraw`.
 *   * `Player.RoundStart` and `Player.NotActive` are never scheduled as phases;
 *     entering them raises (server/events/gameflow.lua:390-395).
 *   * Nothing is atomic. `damage`, `useCard`, `moveCards`, `judge` and
 *     `changeMaxHp` all run triggers mid-flight that can kill players, open
 *     dialogs, or cancel the operation. A block that reads state after one of
 *     these must re-read it.
 *   * `Room:throwCard` asserts every card is owned by `who` (movecard.lua:525).
 *     To discard somebody else's cards, `who` is the victim and `thrower` is
 *     the skill's owner — the other way round is a hard crash.
 */
import vocabularyJson from './vocabulary.generated.json';

/** How a block's usage frequency is banded. Blocks cover common; AI covers the tail. */
export type Band = 'common' | 'occasional' | 'rare' | 'one-off';

/** One `addEffect` on a skeleton, as the engine built it and as the Lua reads. */
export interface CatalogueEffect {
  index: number;
  /** The engine's internal name, e.g. `#jianxiong_1_trig`. */
  name: string;
  /** `TriggerSkill`, `ActiveSkill`, `ViewAsSkill`, `DistanceSkill`, … */
  class: string;
  /** `fk.Damaged` for a trigger effect; absent for the declarative kinds. */
  event?: string;
  /** The event's superclass, e.g. `DamageEvent`. */
  family?: string;
  compulsory: boolean;
  delay: boolean;
  global: boolean;
  priority?: number;
  costOverridden: boolean;
  triggerOverridden: boolean;
  refreshOverridden: boolean;
  /** The `interaction` widget type, when the effect declares one. */
  interaction?: string;
  anim?: string;
  /** Condition-block ids fired by this effect's guard functions. */
  conditions: string[];
  /** Effect-block ids appearing in `on_cost` — what the player pays. */
  cost: string[];
  /** Effect-block ids appearing in `on_use` and friends — what happens. */
  does: string[];
  /** Wire commands this effect raises. */
  requests: string[];
  /** For the phase events, which `Player.*` phases the guard names. */
  phases?: string[];
  /** Whether the Lua block that declares this effect was located. */
  sourced: boolean;
}

/** One printed skill. */
export interface CatalogueSkill {
  name: string;
  title: string;
  /** Every shipped general that carries it. */
  generals: string[];
  pack?: string;
  extension?: string;
  /** `Compulsory` (锁定技), `Limited` (限定技), `Wake` (觉醒技), `Quest` (使命技), … */
  tags: string[];
  visible: boolean;
  /** `skeleton` for `fk.CreateSkill`; `legacy` for the old family. */
  api: 'skeleton' | 'legacy' | null;
  file: string | null;
  kinds: string[];
  triggers: string[];
  families: string[];
  limits: {
    phase: number | 'dynamic' | null;
    turn: number | 'dynamic' | null;
    round: number | 'dynamic' | null;
    game: number | 'dynamic' | null;
    branches: boolean;
  };
  effects: CatalogueEffect[];
  allConditions: string[];
  allEffects: string[];
  allRequests: string[];
}

export interface Catalogue {
  bundleSha: string;
  scopes: Record<string, number>;
  counts: Record<string, number>;
  generals: { name: string; title: string; pack: string; kingdom: string; skills: string[] }[];
  skills: CatalogueSkill[];
  unresolved: { name: string; generals: string[] }[];
  unclassified: { name: string; reason: string }[];
}

/** A block the designer can offer, with the evidence that it works. */
export interface Block {
  id: string;
  label?: string;
  /** The engine function or type this block compiles down to. */
  citation?: string;
  params?: string[];
  count: number;
  share: number;
  band: Band;
  /** Three shipped skills that use it. */
  examples: string[];
}

export interface TriggerBlock extends Omit<Block, 'label' | 'citation' | 'params'> {
  family?: string;
  group: string;
  /** For a phase event, how often each `Player.*` phase is the one meant. */
  phaseParam?: Record<string, number>;
}

export interface EffectBlock extends Block {
  /** How many skills use it inside `on_cost` rather than `on_use`. */
  asCost: number;
}

export interface Vocabulary {
  bundleSha: string;
  of: { skills: number; generals: number };
  triggers: TriggerBlock[];
  conditions: Block[];
  effects: EffectBlock[];
  requests: Omit<Block, 'band'>[];
  kinds: Record<string, number>;
  tags: Record<string, number>;
  composition: {
    effectsPerSkill: Record<string, number>;
    triggersPerSkill: Record<string, number>;
    skillsWithSeveralTriggers: number;
    skillsMixingKinds: number;
    commonTriggerPairs: { pair: string; count: number; examples: string[] }[];
  };
  coverage: {
    skillsWithAKind: number;
    skillsWithATrigger: number;
    skillsWithAnEffect: number;
    skillsWithNoCondition: number;
    effectsPairedToSource: number;
    effectsTotal: number;
    effectsWithNoNamedAction: number;
    effectsWithNoNamedActionBy: Record<string, { count: number; examples: string[] }>;
  };
}

/**
 * The blocks. 91 KB, and the panel cannot draw itself without them, so this one
 * is a static import.
 */
export const VOCABULARY = vocabularyJson as unknown as Vocabulary;

/**
 * The per-skill evidence. 1.6 MB, so it is a separate chunk that loads when
 * somebody opens the designer and never before.
 *
 * A static import would put the whole thing on the critical path of a game that
 * measures its load budget — the same reason `overview.json` is fetched rather
 * than bundled. Vite splits a dynamic import into its own chunk, and the cache
 * below means the second caller pays nothing.
 */
let catalogue: Promise<Catalogue> | null = null;
export const loadCatalogue = (): Promise<Catalogue> => {
  catalogue ??= import('./catalogue.generated.json')
    .then((m) => m.default as unknown as Catalogue);
  return catalogue;
};

/**
 * The blocks a panel should offer, and the tail it should not.
 *
 * The split is by usage, not by taste: `common` is anything at least 5% of the
 * roster uses, which is where a block earns the space it takes on screen. The
 * rest is what the agent lane is for — it can write the Lua for a one-off
 * without a picture of it existing first.
 */
export const forPanel = <T extends { band: Band }>(blocks: T[]): T[] =>
  blocks.filter((b) => b.band === 'common' || b.band === 'occasional');

/** Everything a skill of this name is made of, or undefined if nothing ships it. */
export const skill = (c: Catalogue, name: string): CatalogueSkill | undefined =>
  c.skills.find((s) => s.name === name);

/** Every shipped skill that hangs off this event — the examples a block cites. */
export const usingTrigger = (c: Catalogue, event: string): CatalogueSkill[] =>
  c.skills.filter((s) => s.triggers.includes(event));

/** Every shipped skill that performs this effect. */
export const usingEffect = (c: Catalogue, id: string): CatalogueSkill[] =>
  c.skills.filter((s) => s.allEffects.includes(id));
