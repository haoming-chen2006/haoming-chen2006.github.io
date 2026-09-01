/**
 * The only thing the player sees of any of this.
 *
 * One small speaker in the corner, and behind it two faders. That is the whole
 * surface, and it is deliberately not a settings page: the two decisions worth
 * making are "sound or no sound" and "how much of each", and both of them want
 * to be one click away from the table rather than three clicks away in a modal.
 *
 * IT STARTS SILENT AND SAYS SO. The closed control shows a struck-through
 * speaker until the player turns sound on. Nothing plays before that click, on
 * this visit or any other — see `settings.ts` for why this is opt-in rather than
 * opt-out. Once on, the choice is remembered the way the language choice is, and
 * the next visit unlocks the audio context on the first real gesture instead of
 * asking again.
 *
 * IT ALSO FOLLOWS THE ROUTE. The app is hash-routed
 * (`src/shell/router.ts`), so `#/room/<id>` is the table and everything else is
 * not, and that is the lobby-versus-table signal the music rotation runs on
 * without this component having to reach into the shell for it. The engine
 * refines it from inside the game: `StartGame` and `GameOver` move the scene
 * through `RoomAudio` directly.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLanguage } from '../../i18n';
import type { Language } from '../../i18n';
import { roomAudio } from './bus';
import { HAS_VOICE_BANK } from './clips';
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

  return (
    <div className={`fk-audio${enabled ? ' fk-audio--on' : ''}`}>
      <button
        type="button"
        className="fk-audio__btn"
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
          {/* Voice lines are a licensing answer, not a preference. When the
              build has no bank the row says why rather than offering a switch
              that would do nothing — see `provenance.json`. */}
          {HAS_VOICE_BANK ? (
            <label className="fk-audio__check">
              <input
                type="checkbox"
                checked={voice}
                onChange={(e) => roomAudio.set({ voice: e.target.checked })}
              />
              <span>{label(lang, 'audio.voice')}</span>
            </label>
          ) : (
            <p className="fk-audio__note">
              <b>{label(lang, 'audio.voice')}</b>
              {' — '}
              {label(lang, 'audio.voice.absent')}
              {' '}
              {label(lang, 'audio.synth')}
            </p>
          )}
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
