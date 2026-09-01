/**
 * The room's emoji catalogue, resolved through the asset manifest.
 *
 * Which emoji exist is a fact about the build, not a constant: `ChatBox.qml`
 * hardcodes `model: 59`, but the shipped set is whatever the asset pipeline
 * content-hashed out of `image/emoji/`. Reading it from the manifest means the
 * picker cannot offer a picture that is not there, and an id the manifest does
 * not carry resolves to `undefined` and falls back to its own literal text.
 */
import { useMemo } from 'react';
import { useRoom } from '../RoomContext';
import type { EmojiResolver } from './emoji';

export interface EmojiCatalogue {
  /** Every emoji this build shipped, in the engine's numeric order. */
  readonly ids: readonly string[];
  readonly resolve: EmojiResolver;
}

export function useEmoji(): EmojiCatalogue {
  const { assets } = useRoom();
  return useMemo(
    () => ({ ids: assets.emojiIds(), resolve: (id: string) => assets.emoji(id) }),
    [assets],
  );
}
