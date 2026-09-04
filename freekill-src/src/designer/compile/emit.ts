/**
 * The pieces every block emitter shares: how a value becomes Lua, what the
 * event under a trigger actually carries, and who a player parameter means.
 *
 * The rule this file exists to enforce is that a block may only emit a call the
 * vocabulary cites. Where a parameter cannot be resolved — `source` under an
 * event with no causer, `chosen` with nothing chosen — it raises rather than
 * emitting something plausible, because the engine resolves a method at the
 * call and swallows what a skill raises. A wrong emission is a skill that
 * prints on the card and does nothing; a `CompileError` is a sentence the
 * designer can read.
 */
import type { BlockRef } from '../spec.ts';

export class CompileError extends Error {
  /** Where in the spec, in `validateSpec`'s path notation. */
  readonly path: string;

  constructor(path: string, message: string) {
    super(message);
    this.name = 'CompileError';
    this.path = path;
  }
}

/* -------------------------------------------------------------------------- */
/* Lua literals                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A Lua string literal.
 *
 * Not `JSON.stringify`: it spells a control byte `\u0007`, which Lua 5.4 reads
 * as an unknown escape. Lua spells the same byte `\7`.
 */
export const q = (s: string): string =>
  `"${s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/[\u0000-\u001f]/g, (c) => `\\${c.charCodeAt(0)}`)}"`;

export const indent = (lines: string[], by = '  '): string[] => lines.map((l) => (l ? by + l : l));

/* -------------------------------------------------------------------------- */
/* What an event carries                                                       */
/* -------------------------------------------------------------------------- */

/**
 * One supported trigger, and what its payload holds.
 *
 * `subject` is what the engine passes as `target`, read off the call site
 * rather than off the event name — `fk.Damage` passes `damageData.from` and
 * `fk.Damaged` passes `damageData.to` (hp.lua:268-269), and `fk.AfterCardsMove`
 * passes nothing at all (movecard.lua:204), which is why a skill on it cannot
 * be guarded with `self-is-subject`.
 */
export interface TriggerInfo {
  family: string;
  /** Prose for what `target` is, used in errors. */
  subject: string | null;
  /** The event needs a `phase` parameter and guards on it. */
  phase?: boolean;
  /** Lua for the event's causer, when it has one. */
  source?: string;
  /** Lua for the player the event happened to. */
  victim?: string;
  /** Lua for the card in play. */
  card?: string;
  /** Lua for the amount (damage dealt, hp recovered). */
  amount?: string;
  /** The payload is an array of moves rather than one record. */
  moves?: boolean;
  /** Damage is still being decided, so it may be changed or prevented. */
  damageOpen?: boolean;
}

/**
 * The supported subset. Everything here has a call site in the engine that was
 * read to fill the fields in; a trigger absent from this table compiles to an
 * error naming it, which is the point of having a table at all.
 *
 * `fk.Dying` is absent from the vocabulary itself and so never reaches here:
 * it is declared (events/death.lua:23) and fired from nowhere, so no shipped
 * skill hangs off it and the measurement never saw it. `fk.EnterDying` is the
 * one that fires.
 */
export const TRIGGERS: Record<string, TriggerInfo> = {
  // gameflow.lua:383 / :488 — generic over the phase, discriminated on the
  // player's own `phase`, which is what all 307 shipped users check.
  'fk.EventPhaseStart': { family: 'PhaseEvent', subject: 'the player whose phase it is', phase: true },
  'fk.EventPhaseEnd': { family: 'PhaseEvent', subject: 'the player whose phase it is', phase: true },
  'fk.TurnStart': { family: 'TurnEvent', subject: 'the player whose turn it is' },
  'fk.TurnEnd': { family: 'TurnEvent', subject: 'the player whose turn it is' },
  'fk.GameStart': { family: 'RoundEvent', subject: 'the first player' },

  // hp.lua:268-269. `fk.Damage` fires on the SOURCE, `fk.Damaged` on the victim.
  'fk.Damage': {
    family: 'DamageEvent', subject: 'the player who dealt the damage',
    source: 'data.from', victim: 'data.to', amount: 'data.damage', card: 'data.card',
  },
  'fk.Damaged': {
    family: 'DamageEvent', subject: 'the player who took the damage',
    source: 'data.from', victim: 'data.to', amount: 'data.damage', card: 'data.card',
  },
  // hp.lua:212 — still before `changeHp`, so the amount is open.
  'fk.DamageInflicted': {
    family: 'DamageEvent', subject: 'the player about to take the damage',
    source: 'data.from', victim: 'data.to', amount: 'data.damage', card: 'data.card',
    damageOpen: true,
  },

  'fk.HpChanged': { family: 'HpChangedEvent', subject: 'the player whose hp changed', victim: 'data.who', amount: 'data.num' },
  'fk.HpRecover': { family: 'RecoverEvent', subject: 'the player who recovered', victim: 'data.who', amount: 'data.num' },
  'fk.EnterDying': { family: 'DyingEvent', subject: 'the dying player', victim: 'data.who', source: 'data.damage and data.damage.from' },

  // usecard.lua:270 — both fire on the user.
  'fk.CardUsing': { family: 'UseCardEvent', subject: 'the player using the card', source: 'data.from', card: 'data.card' },
  'fk.CardUseFinished': { family: 'UseCardEvent', subject: 'the player who used the card', source: 'data.from', card: 'data.card' },
  // usecard.lua:558 — the AIM stages fire on the user, once per target.
  'fk.TargetSpecified': { family: 'AimData', subject: 'the player using the card', source: 'data.from', victim: 'data.to', card: 'data.card' },

  // movecard.lua:204 — `logic:trigger(fk.AfterCardsMove, nil, moveCardsData)`.
  // No subject at all, and the payload is a LIST of moves (movecard.lua:49).
  'fk.AfterCardsMove': { family: 'MoveCardsEvent', subject: null, moves: true },
};

/* -------------------------------------------------------------------------- */
/* The context an emitter works in                                             */
/* -------------------------------------------------------------------------- */

export interface Ctx {
  /** The Lua local holding the skeleton, so emitted calls can say `x.name`. */
  skillVar: string;
  trigger: string;
  info: TriggerInfo;
  /** `skills[0].effects[1]`, for error paths. */
  path: string;
  warnings: string[];
  /** Helper functions the file needs, filled in as emitters ask for them. */
  helpers: Set<string>;
  /** What the cost stashed, so `chosen` and `cards = "cost"` can be resolved. */
  stash: { tos: boolean; cards: boolean };
  /** `ask-discard` threw the cards itself; a later `throw` would double-throw. */
  discardThrew: boolean;
}

/** A player parameter, resolved. `plural` decides whether the call needs a loop. */
export interface Players {
  code: string;
  plural: boolean;
}

export const resolvePlayers = (ctx: Ctx, ref: string, path: string): Players => {
  switch (ref) {
    case 'self':
      return { code: 'player', plural: false };
    case 'target':
      if (!ctx.info.subject) {
        throw new CompileError(path, `${ctx.trigger} passes no subject — "target" means nobody here`);
      }
      return { code: 'target', plural: false };
    case 'source':
      if (!ctx.info.source) {
        throw new CompileError(path, `${ctx.trigger} carries no source player`);
      }
      return { code: ctx.info.source, plural: false };
    case 'chosen':
      if (!ctx.stash.tos) {
        throw new CompileError(path, '"chosen" needs an ask-choose-players block in the cost');
      }
      return { code: 'cost.tos', plural: true };
    case 'current':
      return { code: 'room.current', plural: false };
    case 'others':
      return { code: 'room:getOtherPlayers(player)', plural: true };
    case 'all':
      return { code: 'room:getAlivePlayers()', plural: true };
    default:
      throw new CompileError(path, `"${ref}" is not a player — use self, target, source, chosen, current, others or all`);
  }
};

/** A player parameter that has to name exactly one player. */
export const resolveOne = (ctx: Ctx, ref: string, path: string, why: string): string => {
  const p = resolvePlayers(ctx, ref, path);
  if (p.plural) throw new CompileError(path, `${why} needs one player, and "${ref}" is several`);
  return p.code;
};

/** Run `body` once per player, looping when the reference names several. */
export const forEach = (who: Players, body: (p: string) => string[]): string[] => {
  if (!who.plural) return body(who.code);
  return [`for _, p in ipairs(${who.code}) do`, ...indent(body('p')), 'end'];
};

/* -------------------------------------------------------------------------- */
/* Reading parameters                                                          */
/* -------------------------------------------------------------------------- */

export const param = (ref: BlockRef, name: string): string | undefined => {
  const v = ref.params[name];
  return v === undefined || v === '' ? undefined : String(v);
};

export const str = (ref: BlockRef, name: string, path: string, fallback?: string): string => {
  const v = param(ref, name) ?? fallback;
  if (v === undefined) throw new CompileError(path, `"${ref.block}" needs a ${name}`);
  return v;
};

export const int = (ref: BlockRef, name: string, path: string, fallback?: number): number => {
  const raw = param(ref, name);
  if (raw === undefined) {
    if (fallback === undefined) throw new CompileError(path, `"${ref.block}" needs a ${name}`);
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new CompileError(path, `"${ref.block}"'s ${name} must be a whole number, not "${raw}"`);
  return n;
};

export const bool = (ref: BlockRef, name: string, fallback = false): boolean => {
  const raw = param(ref, name);
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
};

export const oneOf = <T extends string>(
  ref: BlockRef, name: string, path: string, allowed: readonly T[], fallback?: T,
): T => {
  const v = (param(ref, name) ?? fallback) as T | undefined;
  if (v === undefined) throw new CompileError(path, `"${ref.block}" needs a ${name}`);
  if (!allowed.includes(v)) {
    throw new CompileError(path, `"${ref.block}"'s ${name} must be one of ${allowed.join(', ')} (got "${v}")`);
  }
  return v;
};

/* -------------------------------------------------------------------------- */
/* Helper functions the generated file may need                                */
/* -------------------------------------------------------------------------- */

/**
 * `fk.AfterCardsMove` hands over an ARRAY of moves (movecard.lua:49), so every
 * question about it is a loop. Emitted into the file once, only when asked for,
 * rather than inlined as a closure per condition.
 */
export const HELPERS: Record<string, string[]> = {
  movesInvolve: [
    '--- 移动事件的载荷是一组移动（movecard.lua:49），逐个看有没有涉及某人。',
    'local function movesInvolve(data, who)',
    '  for _, move in ipairs(data) do',
    '    if move.from == who or move.to == who then return true end',
    '  end',
    '  return false',
    'end',
  ],
  movesFor: [
    '--- 这组移动里有没有出于某个原因的（system_enum.lua:71-84）。',
    'local function movesFor(data, reason)',
    '  for _, move in ipairs(data) do',
    '    if move.moveReason == reason then return true end',
    '  end',
    '  return false',
    'end',
  ],
};
