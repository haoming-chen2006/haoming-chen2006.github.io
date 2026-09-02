/**
 * The control that makes the whole feature reachable.
 *
 * Everything under `src/room/skins/` was built, tested and wired into `Photo`
 * before this existed, and none of it was ever visible: the mode defaulted to
 * `off` and nothing in the app could write it. This is the missing half -- the
 * one thing that turns a catalogue into a feature.
 *
 * ── IT OFFERS ITSELF ONCE, WHEN THE OFFER MEANS SOMETHING ────────────────────
 *
 * The moment a player cares what their general looks like is the moment they
 * have just chosen one, so the panel opens itself the first time this viewer's
 * seat is given a general the catalogue has artwork for. Once per general per
 * page load, from `OFFERED` below -- a second game as the same general is not a
 * second offer, and a remount mid-game is not one either.
 *
 * The silence in the other direction is load-bearing. 110 of the 341 shipped
 * generals have any artwork at all; for the other 231 there is nothing to
 * choose, and an empty box popping up to say so is worse than the feature not
 * existing. `claimOffer` gates the auto-open on artwork that will actually
 * arrive, so those seats never see it.
 *
 * ── IT FLOATS; IT NEVER BLOCKS ───────────────────────────────────────────────
 *
 * A cosmetic panel must never be able to stop a player answering a question.
 * This is a corner chip and a popover, not a `.fk-modal`, and it sits under both
 * the request dialogs (z-index 40) and the amazing-grace board (30) -- the exact
 * bug class `dialogs/parts.tsx` documents, where a full-screen overlay ate every
 * click at a nullification ask. The trigger is 32px in the corner the audio
 * control already claimed for per-viewer preferences.
 *
 * ── NOTHING HERE GOES ON THE WIRE ────────────────────────────────────────────
 *
 * A skin is what one browser draws over a portrait. It is not a move, it is not
 * a setting the room negotiates, and no other seat ever learns that it changed.
 * There is no `lua.interact`, no reply and no store write anywhere in this
 * directory; `skins.test.ts` asserts that by reading the source, because the
 * cheapest way for this to become a real bug is for somebody to make it shared.
 * The only side effect a click here has is one `localStorage` key.
 *
 * ── ONE VIDEO AT A TIME ──────────────────────────────────────────────────────
 *
 * 138 of the 226 files are video, at a 769 KB median, and one general has seven
 * of them. A grid that mounted them all would pull several megabytes to let
 * somebody look at one. So exactly one tile is ever live: whatever the pointer
 * is on, or failing that, whatever the seat is already wearing. Every other
 * video tile is chrome with no element behind it and no bytes on the wire.
 * Stills are 73 KB median and are drawn as ordinary lazy images.
 */
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n';
import type { Language } from '../../i18n';
import { cls } from '../components/CardItem';
import { useRoom } from '../RoomContext';
import { useSkinChoices } from './choice';
import { NO_SKIN, noteSkinFailure, pickSkin, skinsFor } from './loader';
import { SKIN_MODES, type ResolvedSkin, type SkinMode } from './types';
import { useSkinMode } from './useSkinMode';
import LABELS from './labels.json';
import './skins.css';

type LabelKey = Exclude<keyof typeof LABELS, '$comment'>;

/** See the note at the top of `labels.json`: this is `t()` with a local table. */
function label(lang: Language, key: LabelKey): string {
  const row = LABELS[key] as Record<string, string>;
  return row[lang] ?? row.en_US;
}

const MODE_LABEL: Readonly<Record<SkinMode, LabelKey>> = {
  off: 'skins.mode.off',
  static: 'skins.mode.static',
  all: 'skins.mode.all',
};

/** Generals already offered a picker on this page load. See the header. */
const OFFERED = new Set<string>();

/**
 * Take the one offer this general gets, if there is one to take.
 *
 * A predicate with a side effect, deliberately: "should the panel open itself"
 * and "this general has now had its offer" are one decision, and splitting them
 * is how you get a panel that reopens on every render. The effect that calls it
 * is the only caller.
 *
 * The question is `pickSkin`, not `hasSkins`, and the difference is not
 * pedantry. `hasSkins` asks the catalogue; `pickSkin` asks whether anything in
 * it is going to *arrive* -- it respects the mode, and it respects the circuit
 * breaker, so a general whose every file is on a host that has already been
 * written off this session is silently not offered. 20 of the 110 generals have
 * files on cnb.cool and 7 have nothing else, and cnb.cool answers
 * `cross-origin-resource-policy: same-origin`, which no browser will render from
 * another origin. Those seats must say nothing rather than open a box with
 * nothing in it.
 */
export function claimOffer(general: string | undefined, mode: SkinMode): boolean {
  if (!general || OFFERED.has(general)) return false;
  if (!pickSkin(general, mode)) return false;
  OFFERED.add(general);
  return true;
}

/** Test seam, so a suite can ask the once-per-general question twice. */
export function resetSkinOffers(): void {
  OFFERED.clear();
}

/**
 * A name for one skin, or nothing.
 *
 * `generate.mjs` drops the pack's Chinese display names on purpose -- they would
 * add several hundred Han to a font subset that is checked against the sources
 * character by character, to caption artwork the player can simply look at. What
 * is left is the file name, and for 189 of the 226 files that is a readable
 * romanisation (`zhenji_luoshuishenyun` -> `luoshuishenyun`), which is enough to
 * tell seven videos of the same general apart in a list.
 *
 * The other 37 are named in Chinese, and those get nothing rather than tofu: the
 * caller captions them by position instead. Decoding the Han here would put
 * glyphs on screen that the shipped face was never subset for.
 */
export function skinName(skin: ResolvedSkin, general: string): string | undefined {
  if (skin.label) return skin.label;
  const file = skin.url.slice(skin.url.lastIndexOf('/') + 1);
  let base: string;
  try { base = decodeURIComponent(file); } catch { base = file; }
  base = base.replace(/\.[a-z0-9]+$/i, '');

  // The file is named `<general>_<skin>`, but the two ids are not always the
  // same id: `mobile__caomao` ships `caomao_longxuexuanhuang.mp4` alongside
  // `mobile__caomao_xiaolongpoyuan.mp4`, so the pack-qualified name and the bare
  // one both have to come off or one tile reads "caomao longxuexuanhuang".
  const bare = general.slice(general.lastIndexOf('__') + 2);
  for (const prefix of new Set([general, bare])) {
    const stripped = base.replace(new RegExp(`^(?:\\w+__)?${prefix.replace(/\W/g, '')}_`, 'i'), '');
    if (stripped !== base) { base = stripped; break; }
  }

  return /^[\x20-\x7e]+$/.test(base) ? base.replace(/_/g, ' ') : undefined;
}

export interface SkinPickerProps {
  /** The viewer's own general, once the engine has given them one. */
  readonly general?: string;
}

/**
 * Who opened the panel, which decides what an empty one is allowed to look like.
 *
 * A player who presses the chip has asked a question and gets an answer even if
 * the answer is only the three tiers. An offer that opens itself has not been
 * asked for, so it has to earn the space: if every file this general has turns
 * out to be unloadable -- the whole of cnb.cool is, see `claimOffer` -- the
 * uninvited panel takes itself away again rather than sitting there empty.
 */
type Opener = 'shut' | 'offer' | 'player';

export const SkinPicker = memo(function SkinPicker({ general }: SkinPickerProps) {
  const { lua } = useRoom();
  const lang = useLanguage();
  const [mode, setMode] = useSkinMode();
  const [open, setOpen] = useState<Opener>('shut');
  /** Files whose tile would not load; lifted here so an offer can withdraw. */
  const [broken, setBroken] = useState<readonly string[]>([]);

  useEffect(() => { if (claimOffer(general, mode)) setOpen('offer'); }, [general, mode]);
  useEffect(() => { setBroken([]); }, [general]);

  const skins = useMemo(() => skinsFor(general), [general]);
  const offered = mode === 'off' ? [] : skins.filter((s) => !broken.includes(s.url));
  const showPanel = open === 'player' || (open === 'offer' && offered.length > 0);

  const fail = useCallback((url: string) => {
    noteSkinFailure(url, 'error');
    setBroken((b) => (b.includes(url) ? b : [...b, url]));
  }, []);

  return (
    <div className={cls('fk-skins', showPanel && 'fk-skins--open')}>
      <button
        type="button"
        className="fk-skins__btn"
        aria-expanded={showPanel}
        title={lua.tr('Change Skin')}
        aria-label={lua.tr('Change Skin')}
        onClick={() => setOpen((o) => (o === 'shut' ? 'player' : 'shut'))}
      >
        <PortraitIcon />
      </button>

      {showPanel ? (
        <div
          className="fk-skins__panel"
          role="group"
          aria-label={lua.tr('Change Skin')}
          // An uninvited panel becomes an invited one the moment it is used, and
          // that is not a nicety: `showPanel` withdraws an *offer* whose grid has
          // emptied, and pressing `off` empties the grid. Without this, turning
          // skins off from the panel that offered them made the panel — and the
          // switch to turn them back on — vanish under the player's finger.
          onPointerDown={() => setOpen('player')}
          onFocus={() => setOpen('player')}
        >
          {/* `off` means no third-party artwork at all, so there is nothing to
              choose between and the panel is the setting alone. A general with
              no artwork gets the same treatment, and says nothing about it. */}
          {general && offered.length
            ? <SkinGrid general={general} mode={mode} offered={offered} onFail={fail} />
            : null}

          <div className="fk-skins__modes" role="radiogroup" aria-label={lua.tr('Settings')}>
            {SKIN_MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                className={cls('fk-skins__mode', mode === m && 'fk-skins__mode--on')}
                onClick={() => setMode(m)}
              >
                {label(lang, MODE_LABEL[m])}
              </button>
            ))}
          </div>

          <p className="fk-skins__note">{label(lang, 'skins.hint')}</p>
          {/* The cost of the setting above, stated where the setting is. See
              `policy.ts`: the default changed; the reason it is a choice did not. */}
          <p className="fk-skins__note fk-skins__note--cost">{label(lang, 'skins.note')}</p>
        </div>
      ) : null}
    </div>
  );
});

/**
 * The artwork this general can wear, with the game's own portrait first.
 *
 * Picking is the whole interaction: a click writes one `localStorage` key and
 * every `SkinLayer` for that general -- this seat's and, if two people are
 * somehow playing the same character, theirs on this screen too -- picks it up
 * on the next render. There is no OK button because there is nothing to commit
 * and nothing to cancel: the table changes under the panel while it is open,
 * which is what "switch freely" has to mean.
 */
export function SkinGrid(
  { general, mode, offered, onFail }:
  {
    general: string; mode: SkinMode;
    /** The general's skins, minus any whose file has already refused to load. */
    offered: readonly ResolvedSkin[];
    onFail: (url: string) => void;
  },
) {
  const lang = useLanguage();
  const { lua } = useRoom();
  const [choices, choose] = useSkinChoices();
  /** The tile the pointer is on: the only tile allowed to be a live video. */
  const [preview, setPreview] = useState<string | undefined>(undefined);
  useEffect(() => { setPreview(undefined); }, [general]);

  const pinned = choices[general];
  /** What the seat is actually wearing right now, mode and host health included. */
  const worn = pickSkin(general, mode, pinned)?.url;
  if (!offered.length) return null;

  const live = preview ?? worn;

  return (
    <div className="fk-skins__grid" onPointerLeave={() => setPreview(undefined)}>
      {/* The way back to the game's own art, for this general only. Not the same
          answer as turning skins off, which is every general at once. */}
      <Tile
        caption={lua.tr('default')}
        on={pinned === NO_SKIN}
        onPick={() => choose(general, NO_SKIN)}
        onEnter={() => setPreview(undefined)}
      >
        <DefaultArt general={general} />
      </Tile>

      {offered.map((skin, i) => (
        <Tile
          key={skin.url}
          caption={skinName(skin, general) ?? `#${i + 1}`}
          badge={label(lang, skin.kind === 'video' ? 'skins.video' : 'skins.still')}
          on={worn === skin.url && pinned !== NO_SKIN}
          // `static` is a bandwidth answer, so the videos it excludes are shown
          // greyed rather than hidden: a tier the player turned down should be
          // visible as a thing they turned down.
          disabled={mode === 'static' && skin.kind === 'video'}
          onPick={() => choose(general, skin.url)}
          onEnter={() => setPreview(skin.url)}
        >
          {skin.kind === 'video'
            ? <TileVideo url={skin.url} live={live === skin.url} onFail={onFail} />
            : <img src={skin.url} alt="" loading="lazy" decoding="async" onError={() => onFail(skin.url)} />}
        </Tile>
      ))}
    </div>
  );
}

/** The engine's own portrait for this general -- what `Photo` draws underneath. */
function DefaultArt({ general }: { general: string }) {
  const { lua, assets } = useRoom();
  let pack: string | undefined;
  try { pack = lua.getGeneralData(general)?.extension; } catch { pack = undefined; }
  const art = assets.generalPortrait(general, pack);
  return art ? <img src={art} alt="" draggable={false} /> : null;
}

/**
 * A video tile, which is an element only while it is the live one.
 *
 * `preload="none"` would not be enough on its own: an element with a `src` still
 * opens a connection, and eight of them open eight. The tile that is not live
 * has no `<video>` behind it at all, so it costs a `<span>`.
 */
function TileVideo({ url, live, onFail }: { url: string; live: boolean; onFail: (url: string) => void }) {
  if (!live) return <span className="fk-skins__ghost" aria-hidden />;
  return (
    <video src={url} autoPlay loop muted playsInline preload="metadata" onError={() => onFail(url)} aria-hidden />
  );
}

function Tile(
  { caption, badge, on, disabled, onPick, onEnter, children }:
  {
    caption: string; badge?: string; on?: boolean; disabled?: boolean;
    onPick: () => void; onEnter: () => void; children: React.ReactNode;
  },
) {
  return (
    <button
      type="button"
      className={cls('fk-skins__tile', on && 'fk-skins__tile--on', disabled && 'fk-skins__tile--off')}
      aria-pressed={on}
      disabled={disabled}
      onClick={onPick}
      onPointerEnter={onEnter}
      onFocus={onEnter}
    >
      <span className="fk-skins__art">{children}</span>
      {badge ? <span className="fk-skins__badge">{badge}</span> : null}
      <span className="fk-skins__cap">{caption}</span>
    </button>
  );
}

/** Inline rather than an asset: three paths, and it must recolour with the theme. */
function PortraitIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.6 19.4a5.7 5.7 0 0 1 10.8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
