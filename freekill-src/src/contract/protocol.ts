/**
 * The wire.
 *
 * Frozen by Agent 0 from a real 8-player 身份局 run inside a wasmoon Lua 5.4 VM.
 * Everything here is what the engine actually emitted, not what the plan guessed.
 *
 * Three things the spike changed from the plan's assumptions — read these before
 * you build against this file:
 *
 * 1. The wire payload is CBOR with *semantic tags* (33001-33005) that resolve to
 *    live engine objects inside a Lua VM. A 177-byte MoveCards packet, decoded
 *    with the engine's own tag decoders, expands into a 10.7 MB object graph
 *    because tag 33002 means "the Card with this id" and Card reaches the whole
 *    engine. TypeScript must treat tagged values as opaque references
 *    (`TaggedRef`) and resolve them through `LuaClient`, never by walking them.
 *
 * 2. Raw CBOR strings cannot cross the JS<->Lua boundary. wasmoon converts Lua
 *    strings via UTF8ToString; a CBOR byte like 0xFF is mangled ("Invalid UTF-8
 *    leading byte" and a corrupted value). Anything binary must be base64/hex on
 *    the JS side of the boundary, or stay in Lua entirely.
 *
 * 3. Messages arrive in bursts between engine yields. A full 8-human game emits
 *    64,680 individual messages but only 2,696 flush boundaries. Ship `Envelope`
 *    (a batch), not individual messages.
 */

/* ------------------------------------------------------------------ commands */

/**
 * Every UI command name, verbatim from `Fk/Base/command.mjs`, which `CLAUDE.md`
 * names as the canonical list. `contract.test.ts` asserts set equality against
 * that file, so this drifts loudly rather than quietly.
 */
export const UI_COMMANDS = [
  'PushPage', 'PopPage', 'ShowToast', 'SetBusyUI',
  'SetServerSettings', 'BackToStart', 'EnterLobby', 'AddTotalGameTime',
  'UpdateAvatar', 'UpdatePassword',
  'ErrorMsg', 'ErrorDlg',
  'ServerDetected', 'GetServerDetail', 'ServerMessage',
  'UpdateRoomList', 'UpdatePlayerNum', 'EnterRoom',
  'UpdatePackage', 'UpdateBusyText', 'DownloadComplete', 'SetDownloadingPackage',
  'PackageDownloadError', 'PackageTransferProgress',
  'ChangeRoomPage', 'ResetRoomPage', 'ContinueGame', 'BackToRoom', 'RestartGame',
  'IWantToQuitRoom', 'IWantToSaveRecord', 'IWantToBookmarkRecord', 'IWantToChat',
  'ChangeRoom',
  'Chat',
  'SetCardFootnote', 'SetCardVirtName', 'ShowVirtualCard', 'DestroyTableCard',
  'DestroyTableCardByEvent', 'MaxCard', 'AddPlayer', 'RemovePlayer', 'RoomOwner',
  'ReadyChanged', 'NetStateChanged', 'PropertyUpdate', 'UpdateHandcard',
  'UpdateCard', 'UpdateSkill', 'StartGame', 'ArrangeSeats', 'MoveFocus',
  'PlayerRunned', 'AskForGeneral', 'AskForSkillInvoke', 'AskForArrangeCards',
  'AskForGuanxing', 'AskForExchange', 'AskForChoice', 'AskForChoices',
  'AskForCardChosen', 'AskForCardsChosen', 'AskForPoxi', 'AskForMoveCardInBoard',
  'AskForCardsAndChoice', 'MoveCards', 'PlayCard', 'LoseSkill', 'AddSkill',
  'PrelightSkill', 'AskForUseActiveSkill', 'CancelRequest', 'GameLog',
  'AskForUseCard', 'AskForResponseCard', 'SetPlayerMark', 'SetBanner', 'Animate',
  'LogEvent', 'GameOver', 'FillAG', 'AskForAG', 'TakeAG', 'CloseAG',
  'CustomDialog', 'MiniGame', 'UpdateMiniGame', 'EmptyRequest', 'UpdateLimitSkill',
  'UpdateDrawPile', 'UpdateRoundNum', 'UpdateGameData', 'ChangeSelf',
  'UpdateRequestUI', 'GetPlayerHandcards', 'ReplyToServer', 'ReplayerDurationSet',
  'ReplayerElapsedChange', 'ReplayerSpeedChange', 'ChangeSkin', 'UpdateMarkArea',
] as const;

export type UiCommand = (typeof UI_COMMANDS)[number];

/**
 * The subset the server actually put on the wire in a full standard 身份局.
 * Measured, not guessed — see `fixtures/measurements.json`. Commands outside
 * this set exist (they belong to other modes or to lobby traffic); this is the
 * v1 working set the room must handle.
 */
export const OBSERVED_WIRE_COMMANDS = [
  'AddCardUseHistory', 'AddPlayer', 'AddSkill', 'AddSkillUseHistory', 'Animate',
  'ArrangeSeats', 'AskForAG', 'AskForCardChosen', 'AskForGeneral',
  'AskForGuanxing', 'AskForResponseCard', 'AskForSkillInvoke',
  'AskForUseActiveSkill', 'AskForUseCard', 'CancelRequest', 'ChangeSelf',
  'CloseAG', 'DestroyTableCardByEvent', 'EmptyRequest', 'EnterRoom', 'FillAG',
  'FilterCard', 'GameLog', 'GameOver', 'LogEvent', 'LoseSkill', 'MoveCards', 'MoveFocus',
  'PlayCard', 'PrepareDrawPile', 'PropertyUpdate', 'RoomOwner', 'SetCardFootnote',
  'SetCardUseHistory', 'SetCardVirtName', 'SetCurrent', 'SetPlayerMark',
  'SetSkillBranchUseHistory', 'SetSkillUseHistory', 'ShowCard', 'ShowVirtualCard',
  'StartGame', 'SyncDrawPile', 'TakeAG',
  'UpdateMarkArea', 'UpdateQuestSkillUI', 'UpdateRoundNum', 'UpdateSkill',
  // Added by Agent 1 after longer games than the spike's reached states it
  // never did. Both are real wire commands with real client callbacks, and
  // neither is in `Fk/Base/command.mjs`, so neither was in `UI_COMMANDS` either.
  // `ShuffleDrawPile` fires when the draw pile is exhausted and reshuffled
  // (`lua/lunarltk/client/client.lua:59`); `Observe` carries the room snapshot
  // an observer or a reconnecting player is handed
  // (`lua/server/roombase.lua:385`).
  'ShuffleDrawPile', 'Observe',
  // Added when the six mirrored rosters arrived. `Room:setCardMark` broadcasts
  // it (`lua/lunarltk/server/room.lua:346`) and `ClientBase` has always had the
  // callback for it (`lua/lunarltk/client/client.lua:42`) — the 274-general
  // roster simply contained no skill that ever marked a card, so a whole engine
  // command went unobserved. Nothing in `src/room` reads it directly: card marks
  // reach the table through `getCardData`, which the store already pulls per
  // render.
  'SetCardMark',
] as const;

export type WireCommand = (typeof OBSERVED_WIRE_COMMANDS)[number] | UiCommand;

/**
 * These three carry per-card / per-skill use counters. Measured over a full
 * 8-human standard 身份局: 45,120 of 64,680 messages (69.8%) and 240,640 of
 * 897,833 CBOR bytes (26.8%) — 15,040 each, averaging 5-6 bytes apiece.
 *
 * They are the message-count problem, not the byte problem. Agent 1: they must
 * stay in the stream (the receiving client's own engine consumes them), but
 * within one flush the same (card, skill) counter is rewritten repeatedly and
 * only the last value matters — coalesce by key before the envelope goes out.
 * Agent 2: after coalescing, count envelopes, not commands.
 */
export const HIGH_FREQUENCY_LOW_VALUE_COMMANDS = [
  'SetCardUseHistory', 'SetSkillUseHistory', 'SetSkillBranchUseHistory',
] as const;

/* --------------------------------------------------------------- CBOR tags */

/**
 * Semantic tags the engine's own `cbor.tagged_decoders` registers.
 * See `lua/lunarltk/core/{card,skill,player,general}.lua`.
 */
export const CBOR_TAG = {
  PLAYER: 33001,
  REAL_CARD: 33002,
  VIRTUAL_CARD: 33003,
  SKILL: 33004,
  GENERAL: 33005,
} as const;

export type CborTag = (typeof CBOR_TAG)[keyof typeof CBOR_TAG];

/**
 * How a tagged value must appear once it is out of Lua. Never dereference this
 * in TypeScript — hand it to `LuaClient.getCardData` / `getSkillData` / etc.
 */
export interface TaggedRef {
  readonly __tag: CborTag;
  /** For REAL_CARD a card id; SKILL a skill name; PLAYER a player id;
   *  GENERAL a general name; VIRTUAL_CARD a compact struct. */
  readonly value: unknown;
}

export function isTaggedRef(v: unknown): v is TaggedRef {
  return typeof v === 'object' && v !== null && '__tag' in v
    && (Object.values(CBOR_TAG) as number[]).includes((v as TaggedRef).__tag as number);
}

/**
 * Non-UTF-8 byte strings surviving a JSON hop. Produced by the spike's canonical
 * encoder for things like the CBOR-encoded `banners` blob inside a room
 * serialisation. `<hex>` is lowercase, two chars per byte.
 */
export const BYTES_PREFIX = '__bytes:';

/* ----------------------------------------------------------------- envelope */

export type MessageKind = 'notify' | 'request';

/** One thing the engine said to one seat. */
export interface WireMessage {
  /** Monotonic per-room sequence. Gaps mean loss; the log is the repair. */
  readonly seq: number;
  readonly kind: MessageKind;
  readonly command: WireCommand;
  /** CBOR-decoded with tags left as `TaggedRef`. `undefined` for payload-less
   *  commands such as `StartGame`. */
  readonly data?: unknown;
  /** Size of the original CBOR payload in bytes. Billing and budgeting. */
  readonly bytes: number;
}

/**
 * What actually goes over Realtime: everything the engine emitted for one
 * recipient between two yields. One envelope, one broadcast.
 */
export interface Envelope {
  readonly roomId: string;
  /** Flush index; strictly increasing per room. */
  readonly batch: number;
  /** `null` for the public channel, a player id for a per-player channel. */
  readonly to: number | null;
  readonly messages: readonly WireMessage[];
}

/** Player -> host. A request is a request until the host's engine accepts it. */
export interface ClientReply {
  readonly roomId: string;
  readonly playerId: number;
  /** Echoes the `AskFor*` / `PlayCard` command being answered. */
  readonly command: WireCommand;
  /** Whatever the request handler produced. Plain data — see `db.ts`. */
  readonly reply: unknown;
}

/** Channel naming. Agent 2 owns the implementation; the names are frozen here. */
export const channels = {
  public: (roomId: string) => `room:${roomId}`,
  player: (roomId: string, playerId: number) => `room:${roomId}:p:${playerId}`,
} as const;
