/**
 * The supported subset, block by block: what each one compiles to, and why.
 *
 * Two tables, because the engine draws the line and enforces it. A CONDITION is
 * an expression that goes into `can_trigger`; an ACTION is statements that go
 * into `on_cost` or `on_use`. `TriggerSkill:doCost` (skill_type/trigger.lua:70)
 * only runs the effect when the cost returned true, so an action marked
 * `cost: true` is one that belongs on the paying side — and every one of those
 * is an ask, which is what the measurement in `vocabulary/index.ts` found too:
 * costs are overwhelmingly asks, effects are overwhelmingly actions.
 *
 * A block absent from these tables is a compile error naming it. That is the
 * whole design: the tail of the vocabulary is the agent lane's job, and half of
 * a block is worse than none of it, because a skill that silently does nothing
 * is the one failure a player cannot see.
 */
import { COMPARISONS, PHASES, ZONES, type BlockRef } from '../spec.ts';
import {
  CompileError, bool, forEach, indent, int, oneOf, param, q, resolveOne, resolvePlayers, str,
  type Ctx,
} from './emit.ts';

/* -------------------------------------------------------------------------- */
/* Conditions -> one expression in can_trigger                                 */
/* -------------------------------------------------------------------------- */

type Condition = (ctx: Ctx, ref: BlockRef, path: string) => string;

/** `Player.HistoryPhase` … — the scopes `usedSkillTimes` takes (player.lua:65-68). */
const SCOPES = ['Phase', 'Turn', 'Round', 'Game'] as const;

const DAMAGE_TYPES: Record<string, string> = {
  normal: 'fk.NormalDamage',
  thunder: 'fk.ThunderDamage',
  fire: 'fk.FireDamage',
  ice: 'fk.IceDamage',
};

/** The move reasons a condition may name (system_enum.lua:71-84). */
const MOVE_REASONS: Record<string, string> = {
  draw: 'fk.ReasonDraw',
  discard: 'fk.ReasonDiscard',
  give: 'fk.ReasonGive',
  prey: 'fk.ReasonPrey',
  use: 'fk.ReasonUse',
  put: 'fk.ReasonPut',
  justMove: 'fk.ReasonJustMove',
};

const needsSubject = (ctx: Ctx, path: string, block: string): void => {
  if (ctx.info.subject) return;
  throw new CompileError(
    path,
    `${ctx.trigger} passes no subject, so "${block}" can never be true — guard it with move-involves-me instead`,
  );
};

const requireDamage = (ctx: Ctx, path: string, block: string): void => {
  if (ctx.info.family === 'DamageEvent') return;
  throw new CompileError(path, `"${block}" reads the damage, and ${ctx.trigger} is not a damage event`);
};

export const CONDITIONS: Record<string, Condition> = {
  // trigger.lua:43 — the engine's own default, which `can_trigger` replaces
  // rather than extends, so a spec that means it has to say it.
  'self-is-subject': (ctx, _ref, path) => {
    needsSubject(ctx, path, 'self-is-subject');
    return 'target == player';
  },
  'someone-else-is-subject': (ctx, _ref, path) => {
    needsSubject(ctx, path, 'someone-else-is-subject');
    return 'target ~= player';
  },

  'is-alive': () => 'not player.dead',
  'is-wounded': () => 'player:isWounded()',
  'is-my-turn': () => 'player:isCurrent()',
  'has-handcards': () => 'not player:isKongcheng()',
  'has-any-cards': () => 'not player:isNude()',
  'is-dying': () => 'player.dying',

  'in-phase': (_ctx, ref, path) => `player.phase == Player.${oneOf(ref, 'phase', path, PHASES)}`,

  'kingdom-is': (_ctx, ref, path) => `player.kingdom == ${q(str(ref, 'kingdom', path))}`,
  'gender-is': (_ctx, ref, path) =>
    oneOf(ref, 'gender', path, ['male', 'female'] as const) === 'male'
      ? 'player:isMale()'
      : 'player:isFemale()',

  'hp-compare': (ctx, ref, path) => {
    const who = resolveOne(ctx, str(ref, 'who', path), path, 'hp-compare');
    return `${who}.hp ${oneOf(ref, 'op', path, COMPARISONS)} ${int(ref, 'value', path)}`;
  },
  'card-count': (ctx, ref, path) => {
    const who = resolveOne(ctx, str(ref, 'who', path), path, 'card-count');
    const zone = oneOf(ref, 'zone', path, ZONES);
    return `#${who}:getCardIds(${q(zone)}) ${oneOf(ref, 'op', path, COMPARISONS)} ${int(ref, 'value', path)}`;
  },
  // player.lua:67 — getMark returns 0 when absent, so this never compares nil.
  'mark-value': (_ctx, ref, path) =>
    `player:getMark(${q(str(ref, 'mark', path))}) ${oneOf(ref, 'op', path, COMPARISONS)} ${int(ref, 'value', path)}`,
  // Not a hand-rolled use limit: this is the read a 出牌阶段限一次 skill makes.
  'times-used': (ctx, ref, path) =>
    `player:usedSkillTimes(${ctx.skillVar}.name, Player.History${oneOf(ref, 'scope', path, SCOPES)})`
    + ` < ${int(ref, 'limit', path)}`,

  'has-source': (ctx, _ref, path) => {
    if (!ctx.info.source) throw new CompileError(path, `${ctx.trigger} carries no source player`);
    return `${ctx.info.source} ~= nil`;
  },
  'i-am-source': (ctx, _ref, path) => {
    if (!ctx.info.source) throw new CompileError(path, `${ctx.trigger} carries no source player`);
    return `${ctx.info.source} == player`;
  },
  'i-am-target': (ctx, _ref, path) => {
    if (!ctx.info.victim) throw new CompileError(path, `${ctx.trigger} carries no target player`);
    return `${ctx.info.victim} == player`;
  },

  'damage-amount': (ctx, ref, path) => {
    requireDamage(ctx, path, 'damage-amount');
    return `data.damage ${oneOf(ref, 'op', path, COMPARISONS)} ${int(ref, 'value', path)}`;
  },
  'damage-type-is': (ctx, ref, path) => {
    requireDamage(ctx, path, 'damage-type-is');
    const kind = oneOf(ref, 'damageType', path, Object.keys(DAMAGE_TYPES) as ('normal')[]);
    // hp.lua:60-73 leaves damageType unset for ordinary damage, and the engine
    // defaults it in DamageData; comparing to fk.NormalDamage is what the
    // shipped skills do.
    return `data.damageType == ${DAMAGE_TYPES[kind]}`;
  },

  'card-name-is': (ctx, ref, path) => {
    if (!ctx.info.card) throw new CompileError(path, `${ctx.trigger} carries no card`);
    return `${ctx.info.card}.trueName == ${q(str(ref, 'cardName', path))}`;
  },
  'card-type-is': (ctx, ref, path) => {
    if (!ctx.info.card) throw new CompileError(path, `${ctx.trigger} carries no card`);
    const t = oneOf(ref, 'cardType', path, ['basic', 'trick', 'equip'] as const);
    return `${ctx.info.card}.type == Card.Type${t[0].toUpperCase()}${t.slice(1)}`;
  },

  'move-involves-me': (ctx, _ref, path) => {
    if (!ctx.info.moves) throw new CompileError(path, `"move-involves-me" only reads a card-move event, not ${ctx.trigger}`);
    ctx.helpers.add('movesInvolve');
    return 'movesInvolve(data, player)';
  },
  'move-reason-is': (ctx, ref, path) => {
    if (!ctx.info.moves) throw new CompileError(path, `"move-reason-is" only reads a card-move event, not ${ctx.trigger}`);
    ctx.helpers.add('movesFor');
    const reason = oneOf(ref, 'reason', path, Object.keys(MOVE_REASONS) as ('draw')[]);
    return `movesFor(data, ${MOVE_REASONS[reason]})`;
  },
};

/* -------------------------------------------------------------------------- */
/* Actions -> statements in on_cost / on_use                                   */
/* -------------------------------------------------------------------------- */

export interface Action {
  /** May appear in `on_cost`. */
  cost?: boolean;
  /** May appear in `on_use`. */
  use?: boolean;
  emit: (ctx: Ctx, ref: BlockRef, path: string) => string[];
}

/** The card list an action operates on. Only what the cost put aside. */
const cardsFrom = (ctx: Ctx, ref: BlockRef, path: string, who: string): string => {
  const from = oneOf(ref, 'cards', path, ['cost', 'hand'] as const);
  if (from === 'hand') return `${who}:getCardIds("h")`;
  if (!ctx.stash.cards) {
    throw new CompileError(path, '"cards = cost" needs an ask-cards or ask-discard block in the cost');
  }
  return 'cost.cards';
};

/** Every ask names the skill, so the log and the prompt say which one asked. */
const asksAs = (ctx: Ctx) => `skill_name = ${ctx.skillVar}.name`;

export const ACTIONS: Record<string, Action> = {
  draw: {
    use: true,
    emit: (ctx, ref, path) => {
      const who = resolvePlayers(ctx, str(ref, 'who', path), path);
      const n = int(ref, 'count', path);
      if (n < 1) throw new CompileError(path, 'a draw of fewer than one card does nothing (movecard.lua:428)');
      return forEach(who, (p) => [`room:drawCards(${p}, ${n}, ${ctx.skillVar}.name)`]);
    },
  },

  obtain: {
    use: true,
    emit: (ctx, ref, path) => {
      const who = resolveOne(ctx, str(ref, 'who', path), path, 'obtain');
      const cards = cardsFrom(ctx, ref, path, who);
      const visible = bool(ref, 'visible', false);
      return [
        `room:obtainCard(${who}, ${cards}, ${visible}, fk.ReasonJustMove, player, ${ctx.skillVar}.name)`,
      ];
    },
  },

  throw: {
    use: true,
    emit: (ctx, ref, path) => {
      // movecard.lua:525 asserts every card is owned by `who`, so discarding a
      // victim's cards means who = the victim and thrower = the skill's owner.
      // The other way round is a hard crash, not a no-op.
      const who = resolveOne(ctx, str(ref, 'who', path), path, 'throw');
      const thrower = param(ref, 'thrower')
        ? resolveOne(ctx, str(ref, 'thrower', path), path, 'throw') : 'player';
      const cards = cardsFrom(ctx, ref, path, who);
      if (ctx.discardThrew && cards === 'cost.cards') {
        throw new CompileError(
          path,
          'ask-discard already threw those cards (room.lua:790) — set its skip parameter, or drop this throw',
        );
      }
      return [`room:throwCard(${cards}, ${ctx.skillVar}.name, ${who}, ${thrower})`];
    },
  },

  recover: {
    use: true,
    emit: (ctx, ref, path) => {
      const who = resolvePlayers(ctx, str(ref, 'who', path), path);
      const n = int(ref, 'amount', path);
      // hp.lua:424 clamps to maxHp - hp and refuses at full health, so this
      // needs no guard of its own.
      return forEach(who, (p) => [
        'room:recover {',
        `  who = ${p},`,
        `  num = ${n},`,
        '  recoverBy = player,',
        `  skillName = ${ctx.skillVar}.name,`,
        '}',
      ]);
    },
  },

  'lose-hp': {
    use: true,
    emit: (ctx, ref, path) => {
      const who = resolvePlayers(ctx, str(ref, 'who', path), path);
      const n = int(ref, 'amount', path);
      return forEach(who, (p) => [`room:loseHp(${p}, ${n}, ${ctx.skillVar}.name)`]);
    },
  },

  damage: {
    use: true,
    emit: (ctx, ref, path) => {
      const to = resolvePlayers(ctx, str(ref, 'to', path), path);
      const from = param(ref, 'from')
        ? resolveOne(ctx, str(ref, 'from', path), path, 'damage') : 'player';
      const n = int(ref, 'amount', path);
      const kind = param(ref, 'damageType');
      if (kind !== undefined && !(kind in DAMAGE_TYPES)) {
        throw new CompileError(path, `damageType must be one of ${Object.keys(DAMAGE_TYPES).join(', ')}`);
      }
      return forEach(to, (p) => [
        'room:damage {',
        `  from = ${from},`,
        `  to = ${p},`,
        `  damage = ${n},`,
        ...(kind ? [`  damageType = ${DAMAGE_TYPES[kind]},`] : []),
        `  skillName = ${ctx.skillVar}.name,`,
        '}',
      ]);
    },
  },

  'change-max-hp': {
    use: true,
    emit: (ctx, ref, path) => {
      const who = resolvePlayers(ctx, str(ref, 'who', path), path);
      const d = int(ref, 'delta', path);
      return forEach(who, (p) => [`room:changeMaxHp(${p}, ${d})`]);
    },
  },

  // roombase.lua:480. Setting 0 deletes the mark (player.lua:58), and the name
  // prefix is what decides whether it is drawn: @ visible, @@ hidden.
  'set-mark': {
    cost: true,
    use: true,
    emit: (ctx, ref, path) => {
      const who = resolvePlayers(ctx, str(ref, 'who', path), path);
      const mark = q(str(ref, 'mark', path));
      const value = int(ref, 'value', path);
      return forEach(who, (p) => [`room:setPlayerMark(${p}, ${mark}, ${value})`]);
    },
  },
  'add-mark': {
    cost: true,
    use: true,
    emit: (ctx, ref, path) => {
      const who = resolvePlayers(ctx, str(ref, 'who', path), path);
      const mark = q(str(ref, 'mark', path));
      const n = int(ref, 'count', path, 1);
      return forEach(who, (p) => [`room:addPlayerMark(${p}, ${mark}, ${n})`]);
    },
  },

  'change-damage': {
    use: true,
    emit: (ctx, ref, path) => {
      requireDamage(ctx, path, 'change-damage');
      if (!ctx.info.damageOpen) {
        throw new CompileError(
          path,
          `${ctx.trigger} fires after the hp has already changed (hp.lua:262) — change the damage under fk.DamageInflicted`,
        );
      }
      // hp.lua:81. DamageEvent:breakCheck (hp.lua:222) aborts the timing the
      // moment the total drops below 1, so a reduction to zero prevents it.
      return [`data:changeDamage(${int(ref, 'delta', path)})`];
    },
  },
  'prevent-damage': {
    use: true,
    emit: (ctx, _ref, path) => {
      requireDamage(ctx, path, 'prevent-damage');
      if (!ctx.info.damageOpen) {
        throw new CompileError(
          path,
          `${ctx.trigger} fires after the hp has already changed (hp.lua:262) — prevent it under fk.DamageInflicted`,
        );
      }
      return ['data:preventDamage()'];
    },
  },

  // movecard.lua:881, which is moveCards underneath (:890) — the supported
  // shape of "exchange hands", rather than hand-rolling two CardsMoveInfo.
  swap: {
    use: true,
    emit: (ctx, ref, path) => {
      const a = resolveOne(ctx, str(ref, 'a', path), path, 'swap');
      const b = resolveOne(ctx, str(ref, 'b', path), path, 'swap');
      const zone = oneOf(ref, 'zone', path, ZONES, 'h');
      return [`room:swapAllCards(player, { ${a}, ${b} }, ${ctx.skillVar}.name, ${q(zone)})`];
    },
  },

  /* ------------------------------------------------------------------ asks */

  // room.lua:1653. A non-compulsory trigger raises this by itself when it has
  // no on_cost at all (trigger.lua:98); writing it explicitly is for the case
  // where something else in the cost has to happen first or afterwards.
  'ask-yes-no': {
    cost: true,
    emit: (ctx, ref, path) => {
      const who = resolveOne(ctx, str(ref, 'who', path), path, 'ask-yes-no');
      const prompt = param(ref, 'prompt');
      return [
        `if not room:askToSkillInvoke(${who}, {`,
        `  ${asksAs(ctx)},`,
        ...(prompt ? [`  prompt = ${q(prompt)},`] : []),
        '}) then return false end',
      ];
    },
  },

  'ask-choose-players': {
    cost: true,
    emit: (ctx, ref, path) => {
      const who = resolveOne(ctx, str(ref, 'who', path), path, 'ask-choose-players');
      const pool = resolvePlayers(ctx, param(ref, 'targets') ?? 'others', path);
      if (!pool.plural) {
        throw new CompileError(path, 'ask-choose-players needs a set of candidates — others, all, or chosen');
      }
      const min = int(ref, 'min', path);
      const max = int(ref, 'max', path);
      ctx.stash.tos = true;
      return [
        `local tos = room:askToChoosePlayers(${who}, {`,
        `  targets = ${pool.code},`,
        `  min_num = ${min},`,
        `  max_num = ${max},`,
        `  ${asksAs(ctx)},`,
        '})',
        `if #tos < ${min} then return false end`,
      ];
    },
  },

  // room.lua:855 — asks for the cards WITHOUT doing anything to them, which is
  // what makes it the right cost block to pair with a `throw` or an `obtain`.
  'ask-cards': {
    cost: true,
    emit: (ctx, ref, path) => {
      const who = resolveOne(ctx, str(ref, 'who', path), path, 'ask-cards');
      const min = int(ref, 'min', path);
      const max = int(ref, 'max', path);
      const pattern = param(ref, 'pattern');
      ctx.stash.cards = true;
      return [
        `local cards = room:askToCards(${who}, {`,
        `  min_num = ${min},`,
        `  max_num = ${max},`,
        ...(pattern ? [`  pattern = ${q(pattern)},`] : []),
        `  ${asksAs(ctx)},`,
        '})',
        `if #cards < ${min} then return false end`,
      ];
    },
  },

  // room.lua:729, and it THROWS the cards itself at :790 unless `skip` is set.
  // That is why `discardThrew` is tracked: a spec that then also throws them
  // is discarding twice, and the second throw asserts on cards nobody owns.
  'ask-discard': {
    cost: true,
    emit: (ctx, ref, path) => {
      const who = resolveOne(ctx, str(ref, 'who', path), path, 'ask-discard');
      const min = int(ref, 'min', path);
      const max = int(ref, 'max', path);
      const zone = oneOf(ref, 'zone', path, ZONES, 'h');
      if (zone === 'j') throw new CompileError(path, 'askToDiscard only reaches the hand and the equipment area');
      const skip = bool(ref, 'skip', false);
      ctx.stash.cards = true;
      ctx.discardThrew = !skip;
      return [
        `local cards = room:askToDiscard(${who}, {`,
        `  min_num = ${min},`,
        `  max_num = ${max},`,
        `  include_equip = ${zone === 'e'},`,
        `  skip = ${skip},`,
        '  cancelable = true,',
        `  ${asksAs(ctx)},`,
        '})',
        `if #cards < ${min} then return false end`,
      ];
    },
  },
};

/** The cost lines, plus the `setCostData` that lets `on_use` read the pick back. */
export const closeCost = (ctx: Ctx, lines: string[]): string[] => {
  const kept: string[] = [];
  if (ctx.stash.tos) kept.push('tos = tos');
  if (ctx.stash.cards) kept.push('cards = cards');
  return [
    ...lines,
    ...(kept.length ? [`event:setCostData(self, { ${kept.join(', ')} })`] : []),
    'return true',
  ];
};

export const emitAction = (
  ctx: Ctx, ref: BlockRef, path: string, where: 'cost' | 'use',
): string[] => {
  const action = ACTIONS[ref.block];
  if (!action) {
    throw new CompileError(path, `the compiler does not support the "${ref.block}" block yet`);
  }
  if (where === 'cost' && !action.cost) {
    throw new CompileError(path, `"${ref.block}" is not something a player pays — put it in the actions`);
  }
  if (where === 'use' && !action.use) {
    throw new CompileError(path, `"${ref.block}" is an ask, and asks belong in the cost (trigger.lua:70)`);
  }
  return action.emit(ctx, ref, path);
};

export const emitCondition = (ctx: Ctx, ref: BlockRef, path: string): string => {
  const cond = CONDITIONS[ref.block];
  if (!cond) {
    throw new CompileError(path, `the compiler does not support the "${ref.block}" condition yet`);
  }
  return cond(ctx, ref, path);
};

export { indent };
