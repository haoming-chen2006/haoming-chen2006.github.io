/**
 * The current skin mode, as React state.
 *
 * There is no settings UI in this lane, so the hook is the whole surface: it
 * reads the stored preference on mount and re-reads it whenever anything changes
 * it. Two events feed that, and both are needed:
 *
 *   * `storage` fires when *another tab* changes the setting. Without it, a
 *     player who turns skins off in the lobby tab keeps loading them in the
 *     room tab until a reload.
 *   * `SKIN_MODE_EVENT` is a same-document custom event, because `storage` is
 *     deliberately not fired in the tab that made the change. `setMode` below
 *     dispatches it so every hook in this document agrees immediately.
 */
import { useCallback, useEffect, useState } from 'react';
import { readSkinMode, writeSkinMode, SKIN_MODE_KEY } from './policy';
import type { SkinMode } from './types';

export const SKIN_MODE_EVENT = 'fk:skinmode';

export function useSkinMode(): [SkinMode, (mode: SkinMode) => void] {
  const [mode, setModeState] = useState<SkinMode>(readSkinMode);

  useEffect(() => {
    const sync = () => setModeState(readSkinMode());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SKIN_MODE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SKIN_MODE_EVENT, sync);
    // A tab restored from the bfcache can have missed a `storage` event entirely.
    sync();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SKIN_MODE_EVENT, sync);
    };
  }, []);

  const setMode = useCallback((next: SkinMode) => {
    writeSkinMode(next);
    setModeState(next);
    window.dispatchEvent(new Event(SKIN_MODE_EVENT));
  }, []);

  return [mode, setMode];
}
