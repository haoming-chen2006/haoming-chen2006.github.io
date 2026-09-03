/**
 * The props Agent 4 mounts Agent 3's components with. This file exists so lane 4
 * can build a working shell against a stub and swap in the real component with
 * no edit on either side.
 */
import type { ReactNode } from 'react';
import type { LuaClient, SeatSpec } from './engine';
import type { ClientReply, Envelope, WireCommand } from './protocol';
import type { AssetManifest } from './manifest';

export interface SeatView {
  readonly playerId: number;
  readonly seat: number;
  readonly displayName: string;
  readonly avatar: string;
  readonly isBot: boolean;
  readonly isHost: boolean;
  readonly connection: 'online' | 'offline' | 'left';
  readonly ready: boolean;
}

export interface WaitingRoomViewProps {
  readonly roomId: string;
  readonly joinCode: string;
  /** Deep link a friend can open. The entire "share a link" journey. */
  readonly joinUrl: string;
  readonly seats: readonly SeatView[];
  readonly capacity: number;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly meId: number;
  readonly isHost: boolean;
  /** Host-only actions. Undefined for non-hosts — hide, don't disable. */
  readonly onStart?: () => void;
  readonly onAddBot?: (seat: number) => void;
  readonly onRemoveSeat?: (seat: number) => void;
  readonly onChangeSettings?: (patch: Record<string, unknown>) => void;
  readonly onLeave: () => void;
  readonly onChat: (text: string) => void;
  readonly chat: readonly ChatLine[];
}

export interface ChatLine {
  readonly id: string;
  readonly playerId: number | null;
  readonly displayName: string;
  readonly text: string;
  readonly at: number;
}

export type RoomMode = 'play' | 'observe' | 'replay';

export interface RoomViewProps {
  readonly roomId: string;
  readonly mode: RoomMode;
  /** Seat the viewer occupies. `null` for observers and replays. */
  readonly meId: number | null;
  readonly seats: readonly SeatView[];

  /**
   * The room's only source of game truth. Everything rendered comes from
   * `client.onNotifyUI`; everything the player does goes back through
   * `client.interact`. There is no second path.
   */
  readonly client: LuaClient;

  readonly assets: AssetManifest;

  /** Replay/observer transport controls. Undefined in `play` mode. */
  readonly playback?: {
    readonly playing: boolean;
    readonly index: number;
    readonly total: number;
    readonly onPlayPause: () => void;
    readonly onStep: (delta: number) => void;
    readonly onSeek: (index: number) => void;
  };

  readonly chat: readonly ChatLine[];
  readonly onChat: (text: string) => void;
  readonly onSurrender?: () => void;
  /**
   * Deal this table another game — same seats, same bots, same settings.
   *
   * Host-only, so it is undefined for everybody else and the results box says
   * whose button it is instead of showing a dead one. The room does not know
   * what "again" costs: it calls this, and lane 4 rebuilds the engine room, the
   * client VM and the table around it. See `LobbyApi.playAgain`.
   */
  readonly onPlayAgain?: () => void;
  readonly onLeave: () => void;

  /** Rendered into the room's corner — lane 4's connection/host-migration UI. */
  readonly statusSlot?: ReactNode;
}

/**
 * A fixture-backed source Agents 3 and 4 render against until Agent 1 lands.
 * Same `LuaClient` interface either way; only the origin of the envelopes changes.
 */
export interface FixtureSource {
  readonly envelopes: readonly Envelope[];
  readonly seats: readonly SeatSpec[];
  replies(): readonly ClientReply[];
  commandsUsed(): readonly WireCommand[];
}
