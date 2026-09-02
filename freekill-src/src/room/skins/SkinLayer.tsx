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
 *       <SkinLayer general={name} mode={mode} preferred={pinned} />
 *     </div>
 *
 * The element starts at `opacity: 0` and is promoted on `load` / `loadeddata`.
 * That ordering matters: a `<video>` that is visible before its first frame
 * decodes shows a black rectangle where a face should be, which looks far worse
 * than the default portrait it was trying to improve on.
 *
 * ONE MEDIA ELEMENT PER CALLER, AND ONLY WHILE IT IS ON SCREEN. 138 of the 226
 * files in the catalogue are video, and a video element is not a picture: it is
 * a decoder, a network buffer and a repaint every frame, held for as long as the
 * element exists. One per seat is the price of the feature and is paid
 * knowingly; one per seat that nobody is looking at is not. `useVisibleMedia`
 * below pauses a video that leaves the viewport and detaches its source, which
 * is the documented way to make a browser actually give the buffer back, and
 * re-attaches it when the element comes back into view.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEADLINE_MS, noteSkinFailure, noteSkinSuccess, pickSkin, type FailureReason } from './loader';
import type { ResolvedSkin, SkinMode } from './types';

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

/**
 * Play a video while it is on screen; pause it and hand the buffer back when it
 * is not.
 *
 * `removeAttribute('src')` followed by `load()` is the only thing that makes a
 * browser release a media resource -- pausing alone keeps the decoder and
 * everything already downloaded. Both directions are driven from here rather
 * than from JSX because React would otherwise put `src` straight back on the
 * next render and undo the release.
 *
 * `IntersectionObserver` is absent in the server renderer the room's component
 * tests use, and in that case this does nothing at all: the element keeps the
 * `autoPlay` it is rendered with, which is exactly today's behaviour.
 */
function useVisibleMedia(
  url: string | undefined,
  kind: ResolvedSkin['kind'] | undefined,
  onReleased: () => void,
): React.RefObject<HTMLVideoElement | HTMLImageElement | null> {
  const media = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    setOnScreen(true);
    const el = media.current;
    if (!el || kind !== 'video' || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) setOnScreen(e.isIntersecting); },
      // No margin and no threshold: a seat one pixel into the viewport is a seat
      // somebody is looking at. This is a memory valve, not a lazy-load trigger.
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [url, kind]);

  useEffect(() => {
    const el = media.current;
    if (!(el instanceof HTMLVideoElement) || !url) return;
    if (onScreen) {
      if (el.getAttribute('src') !== url) {
        el.setAttribute('src', url);
        el.load();
      }
      // Muted autoplay is permitted everywhere this runs, but a `play()` that
      // races a `load()` still rejects, and an unhandled rejection is a finding
      // in the audit.
      void el.play().catch(() => {});
      return;
    }
    el.pause();
    if (el.getAttribute('src')) {
      el.removeAttribute('src');
      el.load();
      // Fade back out: an element with no source paints nothing, and the seat's
      // own portrait is underneath it waiting to be seen again.
      onReleased();
    }
  }, [onScreen, url, onReleased]);

  return media;
}

export function SkinLayer({ general, mode, preferred, className, style }: SkinLayerProps) {
  const skin = pickSkin(general, mode, preferred);
  const url = skin?.url;

  const [shown, setShown] = useState<string | undefined>(undefined);
  const [failed, setFailed] = useState<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const release = useCallback(() => setShown(undefined), []);
  const media = useVisibleMedia(url, skin?.kind, release);

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
    // An error raised while the source is detached is our own release above,
    // not the host's answer, and counting it would let scrolling write off a
    // CDN that is serving every byte correctly -- the self-inflicted outage
    // `loader.ts`'s header exists to describe.
    const el = media.current;
    if (el instanceof HTMLVideoElement && !el.getAttribute('src')) return;
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
        ref={media as React.RefObject<HTMLVideoElement>}
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

  return (
    <img
      {...shared}
      key={url}
      ref={media as React.RefObject<HTMLImageElement>}
      src={url}
      alt=""
      decoding="async"
      loading="lazy"
      onLoad={settle}
      aria-hidden
    />
  );
}
