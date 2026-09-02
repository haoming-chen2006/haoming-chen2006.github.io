/**
 * The lines the engine wanted announced rather than filed.
 *
 * `Fk/Base/ToastManager.qml` — a bottom-anchored stack of fading plates, newest
 * lowest, 3 s each with a 300 ms fade at either end. `RootPage.qml:166` puts
 * every `ShowToast` into it.
 *
 * WHY THIS EXISTS AT ALL. `Client:appendLog` sends the same rendered line twice
 * when the log message carries `toast = true`: once as `GameLog` and once as
 * `ShowToast` (`lua/lunarltk/client/client.lua:234`, and the port's own
 * `lua/web/client.lua:187`, which renders both languages first). The second copy
 * had no handler anywhere in `src/`, so it fell through `applyNotify`'s default
 * and was dropped — and with it every announcement the engine makes:
 * `#NoCardDraw`, `#NoEventDraw`, `#TimeOutDraw` and `#NoGeneralDraw` are the
 * *reason a game just ended in a draw*, and 议事, 拼点's `#ChangePindianNumber`,
 * 谷虎's claim and 天算's result are how a skill says what it decided. All of
 * them were arriving as one more line in a scrollback nobody reads mid-turn.
 *
 * THE FADE IS COMPUTED IN JS, NOT IN CSS, and that is deliberate. A CSS
 * animation is the obvious way to write this and it is the wrong one here: this
 * project has already shipped an animation layer that was invisible under
 * `prefers-reduced-motion`, and a toast that a reduced-motion reader never sees
 * is strictly worse than no toast — it is a message the game believes it
 * delivered. An interpolated `opacity` degrades to "it is on screen for three
 * seconds", which is the part that matters.
 */
import { memo, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n';
import { localize } from '../../i18n/localized';
import { useRoomState } from '../RoomContext';
import { sanitizeMarkup } from './markup';

/** `Toast.qml`'s `defaultTime`. */
const LIFETIME_MS = 3000;
/** `Toast.qml`'s `fadeTime`, at both ends. */
const FADE_MS = 300;
/** `Toast.qml` settles at `.9`, not 1. */
const PEAK = 0.9;

/** Upstream's `SequentialAnimation`: fade in, hold, fade out. */
export function toastOpacity(age: number): number {
  if (age < 0 || age >= LIFETIME_MS) return 0;
  if (age < FADE_MS) return (age / FADE_MS) * PEAK;
  const left = LIFETIME_MS - age;
  if (left < FADE_MS) return (left / FADE_MS) * PEAK;
  return PEAK;
}

export const Toasts = memo(function Toasts() {
  const state = useRoomState();
  const lang = useLanguage();
  const [, tick] = useState(0);

  // Same shape as `Indicators`: the store never expires anything, so the ticker
  // runs only while there is something on screen to expire.
  useEffect(() => {
    if (!state.toasts.length) return;
    const t = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [state.toasts.length]);

  const now = Date.now();
  const live = state.toasts.filter((t) => now - t.at < LIFETIME_MS);
  if (!live.length) return null;

  return (
    <div className="fk-toasts">
      {live.map((t) => (
        <div
          key={t.id}
          className="fk-toast"
          style={{ opacity: toastOpacity(now - t.at) }}
          // Engine markup, the same string the log line carries and through the
          // same allowlist. See `SidePanel`'s `foldLog`.
          dangerouslySetInnerHTML={{ __html: sanitizeMarkup(localize(t.html, lang)) }}
        />
      ))}
    </div>
  );
});
