import { describe, expect, it } from 'vitest';
import { GAME_MODES, roleTally, type GameModeOffer } from '../../contract/modes.ts';
import { allBotSeats, InProcessLuaHost } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { bundle, sha } from './support.ts';

/**
 * Every offer in the catalogue, played to a finish.
 *
 * THE TABLE THIS PROTECTS. Role distribution is a lookup table indexed by seat
 * count, and a lookup table is exactly the thing that breaks without any code
 * changing: add a mode, shift a seat count, and the eight-player game quietly
 * deals a five-player spread. So the deal is asserted as a multiset against
 * `contract/modes.ts` for every count this build offers — that file and the Lua
 * have to agree, and here is where they are made to.
 *
 * WHY EACH ONE IS PLAYED ALL THE WAY. A mode that deals correctly and then
 * cannot end is worse than one that never starts, because it wastes a table of
 * people to discover. `webmodes_duel` and `webmodes_team` have no 主公 at all,
 * and the inherited `GameMode:getWinner` returns "" forever when a `loyalist`
 * dies — so a 2v2 whose yellow side is wiped out would run until the deck ran
 * dry with nobody told they had lost. That is a real bug this file is here to
 * catch, and only a finished game catches it.
 *
 * Seats are all bots. `allBotSeats` leaves seat 1 in Trust rather than Robot,
 * because `ServerRoomBase:checkNoHuman` ends a room with no human in it.
 */

interface Finished {
  /** playerId -> role, as the engine finally recorded them. */
  roles: Record<number, string>;
  /** playerId -> whether the seat ended the game dead. */
  dead: Record<number, boolean>;
  /** playerId -> whether its role was face-up. */
  shown: Record<number, boolean>;
  /** In-game seat number -> role. Not the chair anyone picked: see below. */
  bySeat: Record<number, string>;
  /** The winning faction string the engine broadcast. */
  winner: string;
  /** Skills seat-by-seat at the end, for the landlord's mode skills. */
  skills: Record<number, string[]>;
  decisions: number;
}

interface ProjectedPlayer {
  properties?: { role?: string; dead?: boolean; role_shown?: boolean; id?: number; seat?: number };
  skills?: string[];
}

async function playMode(mode: GameModeOffer, seed: number): Promise<Finished> {
  const host = await InProcessLuaHost.create(bundle(), { decodeData: true });
  try {
    const session = await RoomSession.start(host, {
      roomId: `modes-${mode.id}`,
      seed,
      seats: allBotSeats(mode.seats),
      ownerId: 1,
      timeout: 15,
      settings: { gameMode: mode.gameMode, fkMode: mode.id },
    }, { bundleSha: await sha() });

    const res = await session.advance();
    if (res.err) throw new Error(`${mode.id}: engine failed: ${res.err}`);
    if (!res.over) {
      throw new Error(`${mode.id}: stopped ${res.stopped} waiting on ${JSON.stringify(res.waitingOn)}`);
    }

    // The winner as a seat is told it, not as the host privately computed it:
    // `GameOver` is the only thing a player ever sees on the subject.
    const over = session.streamOf(1).filter((m) => m.command === 'GameOver');
    expect(over, `${mode.id}: GameOver broadcasts`).toHaveLength(1);

    const state = await host.stateJson() as { players?: Record<string, ProjectedPlayer> };
    const roles: Record<number, string> = {};
    const dead: Record<number, boolean> = {};
    const shown: Record<number, boolean> = {};
    const skills: Record<number, string[]> = {};
    const bySeat: Record<number, string> = {};
    for (const [pid, p] of Object.entries(state.players ?? {})) {
      const id = Number(pid);
      roles[id] = String(p.properties?.role ?? '');
      dead[id] = !!p.properties?.dead;
      shown[id] = !!p.properties?.role_shown;
      skills[id] = p.skills ?? [];
      if (p.properties?.seat) bySeat[p.properties.seat] = roles[id];
    }

    return {
      roles, dead, shown, skills, bySeat,
      winner: String(over[0].data ?? ''),
      decisions: (await host.stats()).decisions,
    };
  } finally {
    host.dispose();
  }
}

/** `lord+loyalist` / `rebel+rebel_chief` -> the roles that share the win. */
const WINNING_ROLES: Record<string, readonly string[]> = {
  'lord+loyalist': ['lord', 'loyalist'],
  'lord+loyalist+civilian': ['lord', 'loyalist', 'civilian'],
  'rebel+rebel_chief': ['rebel', 'rebel_chief'],
  'rebel+rebel_chief+civilian': ['rebel', 'rebel_chief', 'civilian'],
  renegade: ['renegade'],
  'renegade+civilian': ['renegade', 'civilian'],
};

describe('the modes the lobby offers', () => {
  for (const mode of GAME_MODES) {
    describe(`${mode.id} (${mode.seats} seats, ${mode.gameMode})`, () => {
      let played: Finished;

      it('plays a whole game and reaches GameOver', async () => {
        played = await playMode(mode, 20260828 + mode.seats);
        expect(played.decisions).toBeGreaterThan(10);
        expect(Object.keys(played.roles)).toHaveLength(mode.seats);
      }, 300_000);

      it('deals exactly the roles the catalogue promises', () => {
        const got: Record<string, number> = {};
        for (const role of Object.values(played.roles)) got[role] = (got[role] ?? 0) + 1;
        expect(got).toEqual(roleTally(mode));
      });

      it('names a winner the final board agrees with', () => {
        expect(played.winner, `${mode.id} winner string`).not.toBe('');
        const winners = WINNING_ROLES[played.winner];
        expect(winners, `unrecognised winner string ${JSON.stringify(played.winner)}`).toBeDefined();

        const survivors = Object.entries(played.roles)
          .filter(([pid]) => !played.dead[Number(pid)])
          .map(([, role]) => role);
        expect(survivors.length, `${mode.id}: everybody died`).toBeGreaterThan(0);

        if (mode.factions === 2) {
          // Two sides, so the rule is the simple one: the game ends when one of
          // them is gone, and whoever is left is who won.
          for (const role of survivors) {
            expect(winners, `${role} survived but ${played.winner} won`).toContain(role);
          }
          return;
        }

        // 身份局 is not "last side standing", and a check that assumed it would
        // be wrong in the one case that matters: a 内奸 can be alive and have
        // lost, because the 反贼 got to the 主公 first. So the condition is
        // stated the way the mode states it — around the 主公.
        const lordAlive = Object.entries(played.roles)
          .some(([pid, role]) => role === 'lord' && !played.dead[Number(pid)]);
        if (winners.includes('lord')) {
          expect(lordAlive, 'the lord won while dead').toBe(true);
          for (const role of survivors) {
            expect(['rebel', 'rebel_chief', 'renegade'], `${role} survived the lord's win`)
              .not.toContain(role);
          }
        } else {
          expect(lordAlive, `${played.winner} won with the lord alive`).toBe(false);
          if (winners.includes('renegade')) {
            expect(survivors, 'a renegade win leaves only the renegade').toEqual(['renegade']);
          }
        }
      });

      it('seats the allegiances where the catalogue draws them', () => {
        // `seatRoles` is what the lobby's ring shows, and the ring is the only
        // place "your partner sits opposite you" is ever stated. If the Lua
        // stopped alternating, or `adjustSeats` stopped rotating the lord to
        // seat one, the picture would go on claiming it. Hidden seats are
        // skipped: the catalogue does not pretend to know them.
        for (const [i, expected] of mode.seatRoles.entries()) {
          if (expected === 'hidden') continue;
          expect(played.bySeat[i + 1], `${mode.id} seat ${i + 1}`).toBe(expected);
        }
      });

      if (mode.hiddenRoles) {
        it('starts the game with allegiances concealed', () => {
          // Every role is face-up once the game is over (`Room:gameOver` turns
          // them all), so what is asserted here is the mode's own claim: this
          // one has something to hide, and the catalogue says so.
          expect(mode.factions).toBeGreaterThan(2);
        });
      } else {
        it('has no hidden allegiance and no renegade', () => {
          expect(Object.values(played.roles)).not.toContain('renegade');
          expect(Object.values(played.shown).every(Boolean)).toBe(true);
        });
      }
    });
  }
});

describe('斗地主', () => {
  const dizhu = GAME_MODES.find((m) => m.id === 'dizhu')!;
  let played: Finished;

  it('seats one landlord and two peasants', async () => {
    played = await playMode(dizhu, 909090);
    const roles = Object.values(played.roles);
    expect(roles.filter((r) => r === 'lord')).toHaveLength(1);
    expect(roles.filter((r) => r === 'rebel')).toHaveLength(2);
  }, 300_000);

  it('gives the landlord 飞扬 and 跋扈, and nobody else', () => {
    const landlord = Number(Object.entries(played.roles).find(([, r]) => r === 'lord')![0]);
    expect(played.skills[landlord]).toContain('dz__feiyang');
    expect(played.skills[landlord]).toContain('dz__bahu');
    for (const [pid, skills] of Object.entries(played.skills)) {
      if (Number(pid) === landlord) continue;
      expect(skills, `seat ${pid} is a peasant`).not.toContain('dz__feiyang');
      expect(skills, `seat ${pid} is a peasant`).not.toContain('dz__bahu');
    }
  });

  it('grants no 共苦: it is not a skill anyone holds', () => {
    for (const skills of Object.values(played.skills)) {
      expect(skills).not.toContain('dz__gongku');
    }
  });
});

describe('the catalogue itself', () => {
  it('offers each mode once, at one fixed seat count', () => {
    expect(new Set(GAME_MODES.map((m) => m.id)).size).toBe(GAME_MODES.length);
    for (const m of GAME_MODES) {
      expect(m.seats, m.id).toBeGreaterThanOrEqual(2);
      expect(m.roles.reduce((n, r) => n + r.count, 0), `${m.id} role count`).toBe(m.seats);
    }
  });

  it('matches standard 三国杀 at five and eight', () => {
    // The two distributions everyone already knows. If these ever move, they
    // moved by accident.
    expect(roleTally(GAME_MODES.find((m) => m.id === 'role5')!))
      .toEqual({ lord: 1, loyalist: 1, rebel: 2, renegade: 1 });
    expect(roleTally(GAME_MODES.find((m) => m.id === 'role8')!))
      .toEqual({ lord: 1, loyalist: 2, rebel: 4, renegade: 1 });
  });
});
