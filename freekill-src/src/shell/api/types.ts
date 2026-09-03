/**
 * What the shell needs from the backplane, and nothing more.
 *
 * Agent 2 owns `src/net/` — the Supabase schema, anonymous auth, the per-player
 * Realtime channels and the host-only command log. This interface is the shell's
 * side of that seam: the lobby, the sign-in screen and the waiting room are
 * written against it, and `src/shell/api/index.ts` binds it to the real module
 * when that module exists, or to a local implementation when it does not.
 *
 * Note what is absent: no seed, ever. `rooms.seed` is host-only by RLS
 * (contract/db.ts) and the shell has no reason to hold it — the host's engine
 * worker gets it directly.
 */
import type { ConnectionState, RoomStatus } from '../../contract/db';
import type { ChatLine } from '../../contract/views';

export interface Identity {
  readonly userId: string;
  readonly displayName: string;
  readonly avatar: string;
}

export interface RoomSummary {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: RoomStatus;
  readonly hostName: string;
  readonly seated: number;
  readonly capacity: number;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly updatedAt: string;
}

export interface RoomMember {
  readonly userId: string;
  readonly seat: number;
  readonly displayName: string;
  readonly avatar: string;
  readonly connection: ConnectionState;
  readonly isBot: boolean;
  readonly ready: boolean;
}

export interface RoomDetail {
  readonly summary: RoomSummary;
  readonly hostId: string;
  readonly members: readonly RoomMember[];
  readonly chat: readonly ChatLine[];
  readonly bundleSha: string;
}

export interface CreateRoomInput {
  readonly name: string;
  readonly capacity: number;
  readonly settings: Record<string, unknown>;
  readonly bundleSha: string;
}

export interface LobbyApi {
  /** 'supabase' once Agent 2's module is wired; 'local' before that. Shown in
   *  the UI, because a lobby that silently only works in one tab is a lie. */
  readonly kind: 'supabase' | 'local';

  currentIdentity(): Promise<Identity | null>;
  signIn(displayName: string, avatar: string): Promise<Identity>;
  signOut(): Promise<void>;

  listRooms(): Promise<readonly RoomSummary[]>;
  createRoom(input: CreateRoomInput): Promise<RoomDetail>;
  joinByCode(code: string): Promise<RoomDetail>;
  getRoom(roomId: string): Promise<RoomDetail | null>;

  /** Push updates for one room. Returns an unsubscribe. */
  watchRoom(roomId: string, onChange: (room: RoomDetail | null) => void): () => void;
  /** Push updates for the room list. */
  watchLobby(onChange: (rooms: readonly RoomSummary[]) => void): () => void;

  setReady(roomId: string, ready: boolean): Promise<void>;
  addBot(roomId: string, seat: number): Promise<void>;
  removeSeat(roomId: string, seat: number): Promise<void>;
  updateSettings(roomId: string, patch: Record<string, unknown>): Promise<void>;
  startGame(roomId: string): Promise<void>;
  leaveRoom(roomId: string): Promise<void>;
  /**
   * `playerId` is the sender's seat, which is also its in-game player id. It
   * is what puts a speech bubble over the right portrait: `ChatLine.playerId`
   * has always been read back and keyed on, but no backplane ever wrote it,
   * so every bubble was dropped. Null for an observer, who has no seat.
   */
  sendChat(roomId: string, text: string, playerId?: number | null): Promise<void>;
}
