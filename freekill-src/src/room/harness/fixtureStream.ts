/**
 * Loading Agent 0's recorded streams.
 *
 * `ui-notify-stream.json` is what the client Lua pushed to the UI for one seat
 * across a full 8-player 身份局 — 2,286 messages. It is exactly the input
 * `LuaClient.onNotifyUI` will carry, which is why the room can be built and
 * finished against it with no engine running.
 *
 * `seat-command-stream.json` is the wire underneath it (8,084 messages). The
 * room does not render it; it is loaded only to recover two things the UI stream
 * cannot carry — the initial draw-pile size and the request payloads a seat
 * received — and to prove the two streams line up.
 */
import payloadsRaw from '../../../fixtures/request-payloads.json';
import sceneRaw from '../../../fixtures/request-ui-scenes.json';
import notifyRaw from '../../../fixtures/ui-notify-stream.json';
import seatRaw from '../../../fixtures/seat-command-stream.json';
import type { NotifyFrame } from '../fixture/FixtureLuaClient';

interface SeatFrame { seq: number; batch: number; kind: string; command: string; data?: unknown; bytes: number }

export const notifyFrames = notifyRaw as unknown as NotifyFrame[];
export const seatFrames = seatRaw as unknown as SeatFrame[];

/** `PrepareDrawPile` carries the whole pile; its length is the starting count. */
export const initialDrawPile: number = (() => {
  const f = seatFrames.find((x) => x.command === 'PrepareDrawPile');
  return Array.isArray(f?.data) ? (f!.data as unknown[]).length : 160;
})();

/** The seat this recording belongs to: the one the stream never `AddPlayer`s. */
export const recordedSeat: number = (() => {
  const enter = notifyFrames.find((f) => f.command === 'EnterRoom');
  const capacity = Array.isArray(enter?.data) ? Number((enter!.data as unknown[])[0]) : 8;
  const added = new Set(
    notifyFrames.filter((f) => f.command === 'AddPlayer')
      .map((f) => Number((f.data as unknown[])[0])),
  );
  for (let i = 1; i <= capacity; i++) if (!added.has(i)) return i;
  return 1;
})();

/** Every request the recording put to this seat, in order, with its payload. */
export interface RecordedRequest {
  readonly index: number;
  readonly command: string;
  readonly data: unknown;
}

export const recordedRequests: readonly RecordedRequest[] = notifyFrames
  .map((f, index) => ({ index, command: f.command, data: f.data }))
  .filter((f) => f.command.startsWith('AskFor') || f.command === 'PlayCard');

/** What the recorded player actually answered, in order. */
export const recordedReplies: readonly RecordedRequest[] = notifyFrames
  .map((f, index) => ({ index, command: f.command, data: f.data }))
  .filter((f) => f.command === 'ReplyToServer');

/**
 * Every distinct `UpdateRequestUI` diff Agent 0 harvested across 16 games.
 *
 * Worth knowing before you read them: in THIS seat's recording only 3 of the 60
 * diffs carry `CardItem` or `Photo` entries, and every `#PlayCard` diff enables
 * nothing but the End button. The scene the spike's client built had no hand
 * cards in it, so the engine's `scene:update("CardItem", …)` calls landed on
 * items that did not exist. These harvested payloads are where a scene with
 * selectable cards and candidate targets actually lives.
 */
export const recordedScenes = sceneRaw as unknown as Record<string, unknown>[];

export function describeScene(s: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(s)) {
    if (k === '_type') continue;
    if (k === '_prompt') { parts.push(`prompt ${String(v)}`); continue; }
    parts.push(`${k}\u00d7${Array.isArray(v) ? v.length : 1}`);
  }
  return parts.join(' · ') || 'empty diff';
}

/** Distinct commands in the UI stream — used by the coverage panel. */
export function commandHistogram(frames: readonly NotifyFrame[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of frames) m.set(f.command, (m.get(f.command) ?? 0) + 1);
  return new Map([...m.entries()].sort((a, b) => b[1] - a[1]));
}


/**
 * Sample payloads for every dialog-shaped request a standard 身份局 can reach.
 *
 * CAREFUL — these are the payloads as they came off the WIRE, before the client
 * Lua digested them. For several commands that is not the shape the UI sees:
 * `AskForCardChosen` arrives as `[playerId, flags, reason, prompt]` and the
 * client turns it into `{ _id, _reason, _prompt, card_data, visible_data }`
 * before `notifyUI` (`lua/lunarltk/client/client.lua:300`). So prefer the
 * notify-stream payload wherever this seat actually received one, and fall back
 * to the wire sample only for requests it never saw.
 */
export const requestPayloads = payloadsRaw as unknown as Record<string, unknown[]>;

export interface InjectableRequest {
  readonly command: string;
  readonly data: unknown;
  /** `notify` is the shape the room really receives; `wire` is pre-digestion. */
  readonly source: 'notify' | 'wire';
}

/** One injectable sample per dialog-shaped request, best source first. */
export const injectableRequests: readonly InjectableRequest[] = (() => {
  const out = new Map<string, InjectableRequest>();
  for (const r of recordedRequests) {
    if (!out.has(r.command)) out.set(r.command, { command: r.command, data: r.data, source: 'notify' });
  }
  for (const [command, samples] of Object.entries(requestPayloads)) {
    if (!out.has(command)) out.set(command, { command, data: samples[0], source: 'wire' });
  }
  return [...out.values()].sort((a, b) => a.command.localeCompare(b.command));
})();
