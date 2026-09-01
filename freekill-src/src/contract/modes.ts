/**
 * The five games this build offers, and the only place seat counts are decided.
 *
 * WHY THIS EXISTS. The lobby used to ask two questions — a mode, then a player
 * count — and the two could disagree: nothing stopped a 身份局 with three seats
 * or a duel with eight. A game is not a mode plus a number; 斗地主 *is* three
 * seats and 2v2 *is* four. So the offer is the unit, and `seats` is a property
 * of it. Nobody downstream picks a capacity: `Lobby` reads it from here,
 * `WaitingRoom` sizes the table from here, and the room row stores it.
 *
 * WHY 5- AND 8-PLAYER SHARE ONE ENGINE MODE. Upstream's `aaa_role_mode` already
 * deals the standard 三国杀 distribution at every count between two and eight —
 * `lua/lunarltk/server/gamelogic.lua` holds the table. The five- and eight-seat
 * games are that mode, played at five and eight seats; they are two *offers*,
 * not two rulesets, and duplicating the rules in Lua to express a seat count
 * would put one game in three places. `id` is what tells them apart, which is
 * why it is recorded in the room's settings as `fkMode` — `gameMode` alone
 * cannot say which of the two a room was opened as.
 *
 * The three modes upstream has no answer for — 1v1, 2v2, 斗地主 — are real
 * engine modes, in `packages/webmodes`.
 */

/** Engine role strings. Every offer below deals only these. */
export type RoleName = 'lord' | 'loyalist' | 'rebel' | 'renegade';

export type ModeId = 'duel' | 'team' | 'dizhu' | 'role5' | 'role8';

export interface RoleShare {
  readonly role: RoleName;
  readonly count: number;
  /**
   * What this offer calls the role, when its own vocabulary differs from the
   * engine's. 斗地主 deals `lord` and `rebel` because that is what makes the
   * inherited win condition, friend/enemy judgement and role art correct — but
   * nobody playing it says 主公.
   */
  readonly as?: 'landlord' | 'peasant';
}

export interface GameModeOffer {
  readonly id: ModeId;
  /** The engine's `settings.gameMode`. */
  readonly gameMode: string;
  /** Seats. Fixed: this is the whole point of the file. */
  readonly seats: number;
  /** Exactly what the deal produces, in the order a table shows them. */
  readonly roles: readonly RoleShare[];
  /** Whether anyone's allegiance starts concealed. */
  readonly hiddenRoles: boolean;
  /** Sides that have to kill each other. 1 means a free-for-all. */
  readonly factions: number;
  /**
   * What sits in each seat, clockwise from seat one, where that is public
   * knowledge at the deal. `'hidden'` is a seat whose allegiance nobody knows.
   *
   * This is a promise, not decoration: "your partner sits opposite you" is only
   * true because `webmodes_team` deals its roles alternately by seat and
   * `GameLogic:adjustSeats` rotates the lord to seat one. `modes.test.ts` holds
   * the Lua to it.
   */
  readonly seatRoles: readonly (RoleName | 'hidden')[];
}

export const GAME_MODES: readonly GameModeOffer[] = [
  {
    id: 'duel',
    gameMode: 'webmodes_duel',
    seats: 2,
    roles: [{ role: 'loyalist', count: 1 }, { role: 'rebel', count: 1 }],
    hiddenRoles: false,
    factions: 2,
    seatRoles: ['loyalist', 'rebel'],
  },
  {
    id: 'team',
    gameMode: 'webmodes_team',
    seats: 4,
    roles: [{ role: 'loyalist', count: 2 }, { role: 'rebel', count: 2 }],
    hiddenRoles: false,
    factions: 2,
    seatRoles: ['loyalist', 'rebel', 'loyalist', 'rebel'],
  },
  {
    id: 'dizhu',
    gameMode: 'webmodes_dizhu',
    seats: 3,
    roles: [
      { role: 'lord', count: 1, as: 'landlord' },
      { role: 'rebel', count: 2, as: 'peasant' },
    ],
    hiddenRoles: false,
    factions: 2,
    seatRoles: ['lord', 'rebel', 'rebel'],
  },
  {
    id: 'role5',
    gameMode: 'aaa_role_mode',
    seats: 5,
    roles: [
      { role: 'lord', count: 1 },
      { role: 'loyalist', count: 1 },
      { role: 'rebel', count: 2 },
      { role: 'renegade', count: 1 },
    ],
    hiddenRoles: true,
    factions: 3,
    seatRoles: ['lord', 'hidden', 'hidden', 'hidden', 'hidden'],
  },
  {
    id: 'role8',
    gameMode: 'aaa_role_mode',
    seats: 8,
    roles: [
      { role: 'lord', count: 1 },
      { role: 'loyalist', count: 2 },
      { role: 'rebel', count: 4 },
      { role: 'renegade', count: 1 },
    ],
    hiddenRoles: true,
    factions: 3,
    seatRoles: ['lord', 'hidden', 'hidden', 'hidden', 'hidden', 'hidden', 'hidden', 'hidden'],
  },
];

export const DEFAULT_MODE_ID: ModeId = 'role8';

export function modeById(id: string | undefined | null): GameModeOffer | undefined {
  return GAME_MODES.find((m) => m.id === id);
}

/**
 * Which offer a room was opened as.
 *
 * `fkMode` is the answer whenever the room was made by this build. The
 * gameMode+capacity fallback is for rooms that predate the field, and returning
 * `undefined` for anything else is deliberate: a room on a mode this build does
 * not offer must render as itself, not as a wrong guess.
 */
export function modeOfRoom(
  settings: Readonly<Record<string, unknown>>,
  capacity?: number,
): GameModeOffer | undefined {
  const byId = modeById(typeof settings.fkMode === 'string' ? settings.fkMode : null);
  if (byId) return byId;
  const gameMode = String(settings.gameMode ?? '');
  return GAME_MODES.find((m) => m.gameMode === gameMode && m.seats === capacity);
}

/** Seats the deal expects, per role. Used by the waiting room and by tests. */
export function roleTally(mode: GameModeOffer): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const r of mode.roles) out[r.role] = (out[r.role] ?? 0) + r.count;
  return out;
}
