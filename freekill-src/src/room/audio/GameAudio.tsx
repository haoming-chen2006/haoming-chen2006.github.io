/**
 * The only thing the player sees of any of this.
 *
 * One small speaker in the corner, and behind it three faders. That is the whole
 * surface, and it is deliberately not a settings page: the decisions worth
 * making are "sound or no sound" and "how much of each", and both of them want
 * to be one click away from the table rather than three clicks away in a modal.
 *
 * WHY THREE AND NOT TWO. The generals are their own answer. Somebody who wants
 * the table loud and the music low is a different person from somebody who wants
 * 曹操 to shout every time he uses 奸雄, and by the third game they are often the
 * same person having changed their mind. A fader says that; a checkbox does not,
 * and the row that used to be here was a checkbox with an apology under it.
 *
 * IT STARTS SILENT AND SAYS SO. The closed control shows a struck-through
 * speaker until the player turns sound on. Nothing plays before that click, on
 * this visit or any other — see `settings.ts` for why this is opt-in rather than
 * opt-out. Once on, the choice is remembered the way the language choice is, and
 * the next visit unlocks the audio context on the first real gesture instead of
 * asking again.
 *
 * IT ALSO FOLLOWS THE ROUTE. The app is hash-routed (`src/shell/router.ts`), so
 * `#/room/<id>` is the table and everything else is not, and that is the
 * lobby-versus-table signal the music rotation runs on without this component
 * having to reach into the shell for it. The engine refines it from inside the
 * game: `StartGame` and `GameOver` move the scene through `RoomAudio` directly.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLanguage } from '../../i18n';
import type { Language } from '../../i18n';
import { roomAudio } from './bus';
import { CLIP_COUNT, HAS_VOICE_BANK } from './clips';
import LABELS from './labels.json';
import './audio.css';

type LabelKey = Exclude<keyof typeof LABELS, '$comment'>;

/** See the note at the top of `labels.json`: this is `t()` with a local table. */
function label(lang: Language, key: LabelKey): string {
  const row = LABELS[key] as Record<string, string>;
  return row[lang] ?? row.en_US;
}

/** `#/room/<id>` is the table. Everything else — lobby, landing, reference — is not. */
function sceneFromHash(hash: string): 'lobby' | 'table' {
  return /^#\/room\//.test(hash) ? 'table' : 'lobby';
}


/**
 * Where the control sits, and the fact that the player owns it.
 *
 * It used to be pinned bottom-left, which is where the hand's own skill buttons
 * live — so on a wide table the panel sat on top of the thing you were trying
 * to click. Top-right is out of the way of both the hand and the seat ring, and
 * because "out of the way" depends on the table, the player can drag it.
 *
 * Stored per browser, in viewport-relative terms so a window resize does not
 * strand it off-screen, and clamped on read for the case where it does anyway
 * (a smaller monitor, a restored window). `null` means "wherever the stylesheet
 * puts it", which keeps the default in CSS rather than duplicating it here.
 */
const SPOT_KEY = 'fk.audio.spot';

function useDraggableSpot(): {
  spot: { x: number; y: number } | null;
  onGrab: (e: React.PointerEvent) => void;
  dragging: boolean;
} {
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(SPOT_KEY);
      if (!raw) return null;
      const v = JSON.parse(raw) as { x: number; y: number };
      return typeof v?.x === 'number' && typeof v?.y === 'number' ? v : null;
    } catch { return null; }
  });
  const [dragging, setDragging] = useState(false);
  const from = useRef<{ dx: number; dy: number } | null>(null);

  const onGrab = useCallback((e: React.PointerEvent) => {
    // Only a plain left-button drag on the handle itself; the button's own
    // click still has to work, so the move threshold is enforced below rather
    // than by swallowing the event here.
    if (e.button !== 0) return;
    const box = (e.currentTarget as HTMLElement).closest('.fk-audio') as HTMLElement | null;
    if (!box) return;
    const r = box.getBoundingClientRect();
    from.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };

    let moved = false;
    const clamp = (x: number, y: number) => ({
      x: Math.min(Math.max(x, 4), Math.max(4, window.innerWidth - r.width - 4)),
      y: Math.min(Math.max(y, 4), Math.max(4, window.innerHeight - r.height - 4)),
    });
    const move = (ev: PointerEvent) => {
      const g = from.current;
      if (!g) return;
      // A few pixels of slop, so a click that trembles is still a click.
      if (!moved && Math.abs(ev.clientX - r.left - g.dx) + Math.abs(ev.clientY - r.top - g.dy) < 4) return;
      moved = true;
      setDragging(true);
      setSpot(clamp(ev.clientX - g.dx, ev.clientY - g.dy));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      from.current = null;
      setDragging(false);
      if (moved) {
        setSpot((s) => {
          try { if (s) localStorage.setItem(SPOT_KEY, JSON.stringify(s)); } catch { /* private mode */ }
          return s;
        });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, []);

  // A window that shrinks can leave a stored spot off-screen, and a control you
  // cannot reach is worse than one in the wrong corner.
  useEffect(() => {
    const onResize = () => setSpot((s) => (s ? {
      x: Math.min(s.x, Math.max(4, window.innerWidth - 60)),
      y: Math.min(s.y, Math.max(4, window.innerHeight - 60)),
    } : s));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { spot, onGrab, dragging };
}

export function GameAudio() {
  const lang = useLanguage();
  const status = useSyncExternalStore(roomAudio.subscribe, () => roomAudio.status(), () => roomAudio.status());
  const { enabled, music, effects, voice } = status.settings;

  // Arm the first gesture once. This is what makes a remembered "on" come back
  // on the next visit without a second click, and it never fires when sound is
  // off, so it can never be a way in for autoplay.
  useEffect(() => roomAudio.arm(), []);

  useEffect(() => {
    const follow = () => roomAudio.setScene(sceneFromHash(window.location.hash));
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  const toggle = useCallback(() => { roomAudio.set({ enabled: !enabled }); }, [enabled]);
  const { spot, onGrab, dragging } = useDraggableSpot();

  return (
    <div
      className={`fk-audio${enabled ? ' fk-audio--on' : ''}${dragging ? ' fk-audio--dragging' : ''}`}
      // An explicit spot overrides the stylesheet's corner. `right`/`bottom` are
      // cleared so the two systems cannot both position it at once.
      style={spot ? { left: spot.x, top: spot.y, right: 'auto', bottom: 'auto' } : undefined}
    >
      <button
        type="button"
        className="fk-audio__btn"
        onPointerDown={onGrab}
        onClick={toggle}
        aria-pressed={enabled}
        title={label(lang, enabled ? 'audio.off' : 'audio.on')}
        aria-label={label(lang, enabled ? 'audio.off' : 'audio.on')}
      >
        <Speaker on={enabled} />
      </button>

      {/* The faders exist only once there is something to fade. A panel of
          disabled sliders is furniture. */}
      {enabled ? (
        <div className="fk-audio__panel" role="group" aria-label={label(lang, 'audio.title')}>
          <Fader
            label={label(lang, 'audio.music')}
            value={music}
            onChange={(v) => roomAudio.set({ music: v })}
          />
          <Fader
            label={label(lang, 'audio.effects')}
            value={effects}
            onChange={(v) => roomAudio.set({ effects: v })}
          />
          {/* A build with no pack still plays every cue — the synthesised patch
              is behind all of them — so the fader stays and only the note under
              it changes. */}
          <Fader
            label={label(lang, 'audio.voice')}
            value={voice}
            onChange={(v) => roomAudio.set({ voice: v })}
          />
          <p className="fk-audio__note">
            {HAS_VOICE_BANK
              ? label(lang, 'audio.voice.count').replace('{n}', String(CLIP_COUNT))
              : null}
            {HAS_VOICE_BANK ? ' ' : null}
            {label(lang, 'audio.synth')}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Inline rather than an asset: two paths, and it must recolour with the theme. */
function Speaker({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
      <path
        d="M4 9.5h3.2L12 5.4v13.2L7.2 14.5H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {on ? (
        <>
          <path d="M15.4 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M18 6.8a7.6 7.6 0 0 1 0 10.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <path d="M15.6 9.6 20.4 14.4M20.4 9.6 15.6 14.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Fader({ label: text, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="fk-audio__fader">
      <span className="fk-audio__name">{text}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={text}
      />
      <span className="fk-audio__pct">{Math.round(value * 100)}</span>
    </label>
  );
}
