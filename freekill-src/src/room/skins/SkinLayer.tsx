/**
 * The overlay that puts alternate artwork on top of a seat's portrait.
 *
 * Deliberately additive. The caller keeps rendering its existing portrait
 * exactly as it does today and drops this alongside it inside the same
 * positioned box; this element covers it only once the artwork has decoded. The
 * caller has no loading state to handle, no fallback to write, and no way to
 * end up with an empty seat -- if the skin never arrives, nothing changes.
 *
 *     <div style={{ position: 'relative' }}>
 *       <img src={portrait} />
 *       <SkinLayer general={name} mode={mode} />
 *     </div>
 *
 * The element starts at `opacity: 0` and is promoted on `load` / `loadeddata`.
 * That ordering matters: a `<video>` that is visible before its first frame
 * decodes shows a black rectangle where a face should be, which looks far worse
 * than the default portrait it was trying to improve on.
 */
import { useEffect, useRef, useState } from 'react';
import { DEADLINE_MS, noteSkinFailure, noteSkinSuccess, pickSkin, type FailureReason } from './loader';
import type { SkinMode } from './types';

export interface SkinLayerProps {
  /** Engine general id, e.g. `caocao`. Absent or unknown renders nothing. */
  general?: string;
  mode: SkinMode;
  /** Pin one specific skin URL; ignored if it is unusable. */
  preferred?: string;
  /** Applied to the media element, over the caller's positioned box. */
  className?: string;
  style?: React.CSSProperties;
}

const FILL: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  pointerEvents: 'none',
};

export function SkinLayer({ general, mode, preferred, className, style }: SkinLayerProps) {
  const skin = pickSkin(general, mode, preferred);
  const url = skin?.url;

  const [shown, setShown] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * The deadline. A host that accepts the connection and then stalls never fires
   * `error`, so without this the element sits there holding a socket for as long
   * as the browser is willing to -- which on a slow mobile connection is tens of
   * seconds. Abandoning it also feeds the circuit breaker, which is how one
   * stalled host stops costing every *other* seat the same wait.
   */
  useEffect(() => {
    setShown(undefined);
    setFailed(undefined);
    if (!url || !skin) return;

    timer.current = setTimeout(() => {
      noteSkinFailure(url, 'timeout');
      setFailed(url);
    }, DEADLINE_MS[skin.kind]);

    return () => clearTimeout(timer.current);
  }, [url, skin?.kind]);

  if (!skin || !url || failed === url) return null;

  const settle = () => {
    clearTimeout(timer.current);
    noteSkinSuccess(url);
    setShown(url);
  };
  const giveUp = (reason: FailureReason) => () => {
    clearTimeout(timer.current);
    noteSkinFailure(url, reason);
    setFailed(url);
  };

  const shared = {
    className,
    style: { ...FILL, ...style, opacity: shown === url ? 1 : 0, transition: 'opacity 220ms ease-out' },
    onError: giveUp('error'),
  };

  if (skin.kind === 'video') {
    return (
      <video
        {...shared}
        key={url}
        src={url}
        autoPlay
        loop
        muted
        playsInline
        // `metadata` rather than `auto`: the element still streams once it is
        // playing, but a seat that is scrolled off or replaced before it starts
        // does not pull a megabyte first.
        preload="metadata"
        onLoadedData={settle}
        // Deliberately no `onStalled`. It fires on ordinary mid-play rebuffering
        // and would tear down a video that is working; the deadline above
        // already covers the one that never starts.
        aria-hidden
      />
    );
  }

  return <img {...shared} key={url} src={url} alt="" decoding="async" loading="lazy" onLoad={settle} aria-hidden />;
}
