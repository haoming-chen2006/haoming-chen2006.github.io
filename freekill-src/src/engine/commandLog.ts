import type { DecisionRecord, RoomSpec } from '../contract/engine.ts';

/**
 * The command log: seed, settings, seats, and every accepted decision in order.
 *
 * A suspended Lua coroutine cannot be serialized - the call stack *is* the game
 * state - so migration is replay-based, not snapshot-based, and the log has to
 * be complete enough to rebuild the room from nothing but the seed.
 *
 * It is. A decision is recorded at the one place the engine accepts one
 * (`Request:_checkReply`), including the AI's, and replay forces each logged
 * reply back in at that same point. The AI is therefore never consulted for a
 * decision the log already holds, which is what makes migration immune to the
 * AI's own iteration-order sensitivity.
 *
 * Both halves are enough on their own to reconstruct every hidden hand - the
 * seed determines the deal, the replies contain every private choice - which is
 * why `db.ts` makes both host-only readable. That is enforced by RLS in
 * Agent 2's lane; nothing here should be broadcast.
 */
export interface RoomLogHeader {
  roomId: string;
  seed: number;
  timeout: number;
  ownerId: number;
  settings: Record<string, unknown>;
  seats: RoomSpec['seats'];
  /** Identity of the rules. Replaying under a different bundle is not sound. */
  bundleSha: string;
  createdAt?: string;
}

export interface RoomLog {
  header: RoomLogHeader;
  records: DecisionRecord[];
}

/**
 * Durability, implemented by Agent 2 against Supabase. The engine emits through
 * this and never imports a transport.
 */
export interface CommandLogSink {
  open(header: RoomLogHeader): Promise<void>;
  append(records: readonly DecisionRecord[]): Promise<void>;
}

export interface CommandLogSource {
  read(roomId: string): Promise<RoomLog>;
}

/** In-memory implementation. Tests and single-tab play use this. */
export class MemoryCommandLog implements CommandLogSink, CommandLogSource {
  private logs = new Map<string, RoomLog>();
  private current: string | null = null;

  async open(header: RoomLogHeader): Promise<void> {
    this.logs.set(header.roomId, { header, records: [] });
    this.current = header.roomId;
  }

  /**
   * `seq` must be dense from 1. A gap makes the log unreplayable, and it is
   * better to fail here than to discover it during a migration, so this
   * mirrors the unique/dense constraint `db.ts` puts on `commands`.
   */
  async append(records: readonly DecisionRecord[]): Promise<void> {
    if (this.current === null) throw new Error('MemoryCommandLog.append before open');
    const log = this.logs.get(this.current)!;
    for (const r of records) {
      const expected = log.records.length + 1;
      if (r.seq !== expected) {
        throw new Error(`command log gap: expected seq ${expected}, got ${r.seq}`);
      }
      log.records.push(r);
    }
  }

  async read(roomId: string): Promise<RoomLog> {
    const log = this.logs.get(roomId);
    if (!log) throw new Error(`no command log for room ${roomId}`);
    return { header: log.header, records: [...log.records] };
  }

  get(roomId: string): RoomLog | undefined {
    return this.logs.get(roomId);
  }
}

export function headerFromSpec(spec: RoomSpec, bundleSha: string): RoomLogHeader {
  return {
    roomId: spec.roomId,
    seed: spec.seed,
    timeout: spec.timeout,
    ownerId: spec.ownerId,
    settings: spec.settings as Record<string, unknown>,
    seats: spec.seats,
    bundleSha,
  };
}

export function specFromHeader(header: RoomLogHeader): RoomSpec {
  return {
    roomId: header.roomId,
    seed: header.seed,
    timeout: header.timeout,
    ownerId: header.ownerId,
    settings: header.settings,
    seats: header.seats,
  };
}
