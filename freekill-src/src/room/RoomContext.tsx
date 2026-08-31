/**
 * The room's shared services: the store, the Lua facade, the asset resolver.
 *
 * `useRoom()` is the only way components reach them, and `useRoomVersion()` is
 * the only subscription. The store is mutable with a version counter because a
 * full game is 2,286 notify messages arriving in bursts; re-rendering the table
 * once per burst is right, once per message is not.
 */
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useLanguage } from '../i18n';
import type { RoomMode } from '../contract/views';
import type { Assets } from './assets/assets';
import type { LtkLua } from './ltk/LtkLua';
import { processPrompt, type PlayerNaming } from './ltk/prompt';
import type { RoomStore } from './state/store';

export interface RoomServices {
  readonly store: RoomStore;
  readonly lua: LtkLua;
  readonly assets: Assets;
  readonly mode: RoomMode;
  /** The seat the viewer occupies, or null when observing or replaying. */
  readonly meId: number | null;
  readonly naming: PlayerNaming;
}

const Ctx = createContext<RoomServices | null>(null);

export function RoomProvider({ value, children }: { value: RoomServices; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * The room's services — and, deliberately, a subscription to the language.
 *
 * Every component in the room calls this to reach `lua`, and almost every
 * string it draws goes through `lua.tr`. `LuaClient` is wrapped once, at the
 * seam in `RoomPage`, by a translator that reads the language at call time
 * (`withLanguage(client, getLanguage)`) — stable identity, so `RoomView`'s
 * `useMemo(..., [client])` does not throw the table away on a toggle. The one
 * thing a stable wrapper cannot do is tell React that the answers changed.
 * `useLanguage()` here is that missing edge: one line, and all 84 `tr` call
 * sites across the room repaint.
 */
export function useRoom(): RoomServices {
  const v = useContext(Ctx);
  useLanguage();
  if (!v) throw new Error('useRoom outside <RoomProvider>');
  return v;
}

/** Re-render on every committed burst. */
export function useRoomVersion(): number {
  const { store } = useRoom();
  return useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
}

/** The current state snapshot. Read after a version bump; never mutated here. */
export function useRoomState() {
  const { store } = useRoom();
  useRoomVersion();
  return store.state;
}

export function useScene() {
  const { store } = useRoom();
  useRoomVersion();
  return store.scene;
}

/** Translate an engine i18n key. */
export function useTr() {
  const { lua } = useRoom();
  return (key: string) => lua.tr(key);
}

/** Translate a prompt key with its `%src` / `%dest` / `%arg` substitutions. */
export function usePrompt() {
  const { lua, naming } = useRoom();
  return (key: string) => processPrompt(lua, naming, key);
}

/** Builds the `PlayerNaming` a prompt needs out of the live store. */
export function makeNaming(store: RoomStore): PlayerNaming {
  return {
    seatNumber: (pid) => store.state.players[pid]?.seat ?? 0,
    general: (pid) => store.state.players[pid]?.general ?? '',
    deputyGeneral: (pid) => store.state.players[pid]?.deputyGeneral ?? '',
    selfId: () => store.state.selfId,
  };
}
