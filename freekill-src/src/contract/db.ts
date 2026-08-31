/**
 * Postgres rows. Supabase carries messages, identity and durability — never
 * rules. No game logic in a table, no game logic in an Edge Function.
 *
 * The privacy design is not optional and it is not client-side discipline: the
 * seed and every row in `commands` are readable ONLY by the current host,
 * enforced by RLS. Either one reconstructs every hidden hand — the seed
 * determines the deal, and the log holds every player's private replies. The
 * engine suite confirms both: replaying a room's logged replies from its seed
 * rebuilds an identical state digest at every decision boundary, on hosts whose
 * Lua string-hash seeds differ.
 *
 * The seed is deliberately NOT a column on the room row. RLS filters rows, not
 * columns, and the room row is the public lobby listing — a seed on it could
 * never be host-only. It lives in its own one-row-per-room table, which turns
 * "a non-host reads the seed" into "a non-host selects zero rows".
 */

export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type ConnectionState = 'online' | 'offline' | 'left';

export interface RoomRow {
  readonly id: string;
  /** Short shareable join code. This is the whole "no addresses, no ports" story. */
  readonly code: string;
  /** Display name, shown in the lobby. */
  readonly name: string;
  /** Seats in the room. 8 for a standard 身份局. */
  readonly capacity: number;
  /** `auth.uid()` of the current authoritative host. Changes on migration. */
  readonly host_id: string;
  /** Denormalised so the lobby can name the host without reading seat rows —
   *  opening `room_players` to non-members would leak who is sitting where.
   *  Trigger-maintained. */
  readonly host_name: string;
  /** Occupied seats, trigger-maintained, for the same reason. */
  readonly seated: number;
  readonly status: RoomStatus;
  /**
   * Must include `generalTimeout` — the engine throws without it. See
   * `RoomSpec.settings` in `engine.ts`.
   */
  readonly settings: Record<string, unknown>;
  /** Identity of the rules. A client whose `lua-manifest` hash differs must not
   *  be seated: it would compute different legality. */
  readonly bundle_sha: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * HOST-ONLY, and a separate table on purpose — see the note at the top of this
 * file. One row per room. A 32-bit integer handed to `math.randomseed` in a
 * fresh VM; with the command log it reconstructs every hidden hand.
 */
export interface RoomSecretRow {
  readonly room_id: string;
  readonly seed: number;
}

export interface RoomPlayerRow {
  readonly room_id: string;
  /** `auth.uid()` for a person, `bot:<room>:<seat>` for a seat the host's engine
   *  drives. Bots are not auth users, so this cannot be a uuid. */
  readonly user_id: string;
  /** 1-based seat. Also the engine's `playerId` and `connId`. */
  readonly seat: number;
  readonly display_name: string;
  readonly avatar: string;
  readonly connection: ConnectionState;
  /** True for a seat the host's engine drives with `fk.Player_Robot`. */
  readonly is_bot: boolean;
  readonly joined_at: string;
  readonly last_seen_at: string;
}

/**
 * Append-only. `(room_id, seq)` unique; `seq` dense from 1. An out-of-order or
 * gapped insert must be rejected — a gap makes the log unreplayable.
 *
 * HOST-ONLY for both read and insert.
 */
export interface CommandRow {
  readonly room_id: string;
  readonly seq: number;
  /** Whose decision. */
  readonly player_id: number;
  /** The `AskFor*` / `PlayCard` being answered. */
  readonly command: string;
  /** The accepted reply. Verified plain data — no live engine objects. */
  readonly reply: unknown;
  /** FNV-1a 64 hex of the room state right after this decision. Replay compares
   *  these boundary by boundary; a final-state-only match hides divergence that
   *  self-corrects. */
  readonly digest: string;
  readonly created_at: string;
}

/** What `promote_host` must do atomically, so two players cannot both win. */
export interface PromoteHostArgs {
  readonly room_id: string;
  /** Caller asserts the previous host is observably disconnected. */
  readonly previous_host_id: string;
}

export interface PromoteHostResult {
  readonly ok: boolean;
  readonly host_id: string;
  /** Handed over only on success, only to the new host. */
  readonly seed: number | null;
  /** Where the new host resumes from. */
  readonly last_seq: number;
}
