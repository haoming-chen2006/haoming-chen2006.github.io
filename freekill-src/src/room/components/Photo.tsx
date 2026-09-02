/**
 * A player seat.
 *
 * The web counterpart of `Fk/Components/LunarLTK/Photo.qml` (528 lines) plus its
 * `Photo/` sub-items — portrait, name, kingdom, role, hp bar, equipment, judge
 * area, marks, hand count, thinking ring.
 *
 * Selectability is `scene.items.Photo[id]`, verbatim. A click sends
 * `UpdateRequestUI("Photo", id, "click", { selected })` — the same call the QML
 * `onSelectedChanged` handler makes.
 */
import { memo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ItemData } from '../../contract/scene';
import { ChatText, useEmoji } from '../chat';
import { useRoom, usePrompt } from '../RoomContext';
import type { LtkLua } from '../ltk/LtkLua';
import { seatChar } from '../ltk/prompt';
import { CARD_TYPE, PHASE, type TargetTip } from '../ltk/types';
import { SkinLayer, useSkinChoices, useSkinMode } from '../skins';
import type { FocusState, PlayerState } from '../state/types';
import { seatStage } from './anim/bus';
import { DAOXIN_MARK, DAOXIN_MAX, DAOXIN_STEPS } from './anim/spectacle/cutscene';
import { EffectStage, useAnimBus } from './anim/Stage';
import { cls } from './CardItem';
import { pileCounts } from './marks';
import { HpReadout } from '../seat/HpReadout';

/**
 * Everything here is a primitive or a reference the store keeps stable across
 * commits, so `memo` below can do its job. It is deliberately NOT the whole
 * `RoomState`: the table commits five times a second on `refreshStatusSkills`
 * whether or not the game moved, and a seat that re-renders on every one of
 * those is eight portraits, eight hp bars and eight equipment rows reconciled
 * for nothing.
 */
export interface PhotoProps {
  readonly player: PlayerState;
  readonly equips?: readonly number[];
  readonly judge?: readonly number[];
  /**
   * This seat's private piles, pile name -> cards. `Photo.qml:174-208` keeps a
   * counter for each in the mark row; see `marks.ts`'s `pileCounts`.
   *
   * A reference the store keeps stable between commits, like `equips` — it is
   * rebuilt only by a `MoveCards` that touched this seat's `PlayerSpecial`, so
   * `memo` below still bails out on the 5 Hz status poll.
   */
  readonly piles?: Readonly<Record<string, readonly number[]>>;
  readonly item?: ItemData;
  readonly isCurrent: boolean;
  readonly handCount: number;
  readonly focus: FocusState | null;
  readonly bubble?: string;
  /**
   * What the engine wants said about targeting THIS seat with what is currently
   * selected — `Ltk.getTargetTip(pid)`, refreshed on every scene change the way
   * `Room.qml:751` refreshes it.
   */
  readonly targetTips?: readonly TargetTip[];
  readonly onClick?: (pid: number, selected: boolean) => void;
  /** Tapping a mark or a pile counter. See `MarkArea.qml`'s `TapHandler`. */
  readonly onInspect?: (playerId: number, key: string, value: unknown) => void;
}

export const Photo = memo(function Photo(props: PhotoProps) {
  const {
    player, equips, judge, piles, item, isCurrent, handCount, focus, bubble,
    targetTips, onClick, onInspect,
  } = props;
  const { lua, assets } = useRoom();
  const emoji = useEmoji();
  const [skinMode] = useSkinMode();
  // Both hooks are window-event subscriptions over one `localStorage` key, not
  // store reads, so neither puts this seat back in the path of the 5 Hz commit
  // that `memo` above exists to bail out of. See `skins/choice.ts`.
  const [skinChoices] = useSkinChoices();

  const general = player.general;
  const art = general ? assets.generalPortrait(general, generalPack(lua, general)) : undefined;
  const displayName = general ? lua.tr(general) : (player.screenName || `#${player.id}`);
  const illustrator = general ? lua.getIllustrator(general) : undefined;

  // `state` on a Photo item is the engine's word: "normal" or "candidate".
  const photoState = typeof item?.state === 'string' ? item.state : 'normal';
  const candidate = photoState === 'candidate';
  const enabled = item?.enabled === true;
  const selected = item?.selected === true;

  const roleKnown = player.roleShown || player.dead || player.role === 'lord';
  const roleIcon = assets.role(roleKnown ? player.role : 'unknown');

  const thinking = focus?.ids.includes(player.id) ? focus : null;

  // The two states the notify stream never carries, because selectability is
  // the scene's business: this seat is a legal target, and this seat is picked.
  // Both are read straight off the scene item — `enabled` and `selected` — and
  // the engine ships art for both.
  const bus = useAnimBus();
  const targetable = candidate && enabled && !selected;
  useEffect(() => {
    if (targetable) bus?.pulse(seatStage(player.id), 'selectable');
  }, [targetable, bus, player.id]);
  useEffect(() => {
    if (selected) bus?.pulse(seatStage(player.id), 'selected');
  }, [selected, bus, player.id]);

  return (
    <div
      className={cls(
        'fk-seat',
        candidate && 'fk-seat--candidate',
        candidate && enabled && !selected && 'fk-seat--selectable',
        selected && 'fk-seat--selected',
        candidate && !enabled && 'fk-seat--disabled',
      )}
    >
      {bubble ? <div className="fk-bubble"><ChatText text={bubble} resolve={emoji.resolve} /></div> : null}
      <div
        className={cls(
          'fk-photo',
          player.dead && 'fk-photo--dead',
          isCurrent && 'fk-photo--current',
          player.chained && 'fk-photo--chained',
          player.drank > 0 && 'fk-photo--drank',
        )}
        onClick={enabled && onClick ? () => onClick(player.id, !selected) : undefined}
        title={illustrator ? `${displayName} — ${lua.tr('Illustrator')}: ${illustrator}` : displayName}
      >
        {art
          ? <img className="fk-photo__art" src={art} alt="" draggable={false} />
          : <div className="fk-photo__art fk-photo__art--none">{displayName.slice(0, 1) || '?'}</div>}
        {/* Alternate artwork, on by default and switchable from the picker in
            the corner. `preferred` is this browser's pin for this general and
            reaches nothing but the overlay: no other seat sees it, and it never
            leaves the tab. See `src/room/skins/`. */}
        <SkinLayer
          general={player.general}
          mode={skinMode}
          preferred={skinChoices[player.general]}
          className="fk-photo__art"
        />

        <div className="fk-photo__scrim" />

        {player.kingdom && player.kingdom !== 'unknown'
          ? <span className="fk-photo__kingdom">{lua.tr(player.kingdom)}</span> : null}

        {roleIcon
          ? <img className="fk-photo__role" src={roleIcon} alt={player.role} />
          : <span className="fk-photo__role--text">{lua.tr(roleKnown ? player.role : 'unknown')}</span>}

        {player.seat ? <span className="fk-photo__seat">{seatChar(player.seat)}</span> : null}

        <HpReadout hp={player.hp} maxHp={player.maxHp} shield={player.shield} />

        <span className="fk-photo__name">
          {displayName}
          <span className="fk-photo__screenname">{player.screenName}</span>
        </span>

        {/* How many cards this seat is holding, drawn on a card rather than
            beside one. See `showsLimit` for why the limit is not drawn next to
            it except when the seat is over it. */}
        <span
          className={cls('fk-photo__hand', showsLimit(handCount, player.maxCards) && 'fk-photo__hand--over')}
          title={handTitle(handCount, player.maxCards)}
        >
          <b className="fk-photo__hand-n">{handCount}</b>
          {showsLimit(handCount, player.maxCards)
            ? <span className="fk-photo__hand-max">/{player.maxCards}</span>
            : null}
        </span>

        {player.dead
          ? <span className="fk-photo__dead-mark">{lua.tr(roleKnown ? player.role : 'unknown')}</span>
          : null}

        {thinking ? (
          <div className="fk-photo__thinking">
            <i style={{ animationDuration: `${thinking.timeout}ms` }} />
          </div>
        ) : null}

        {thinking ? <span className="fk-photo__tip">{lua.tr(thinking.command)}</span> : null}

        <TargetTips tips={targetTips} />

        {/* The engine's own effect art, played straight off the notify stream.
            Last child so it draws over the portrait and its overlays, and
            unclipped so a 杀 can spill past the frame the way it does in the
            Qt client. Nothing React renders into it — see `anim/bus.ts`. */}
        <EffectStage stage={seatStage(player.id)} />
      </div>

      <EquipRow ids={equips} />
      <JudgeRow ids={judge} />
      <MarkRow player={player} piles={piles} onInspect={onInspect} />
    </div>
  );
});

/**
 * The engine's word on what targeting this seat will do.
 *
 * `Room.qml:751` re-asks `Ltk.getTargetTip` for every seat on every scene
 * change and `Photo.qml:399-450` draws the answers across the middle of the
 * portrait: `normal` tips in glowing `#FEFE84`, `warning` tips in snow with a
 * red outline.
 *
 * THIS IS NOT DECORATION. 离间 is the whole reason it exists in the shipped
 * roster: 貂蝉 picks two men and the skill's own `target_tip`
 * (`packages/standard/pkg/skills/lijian.lua:36-43`) writes 先出杀 over the one
 * who will Slash first and 后出杀 over the one who answers — which is the only
 * thing that distinguishes the two clicks, and which the port drew nowhere.
 * The same channel carries every `TargetModSkill`'s tip and whatever a card's
 * own `skill:targetTip` says.
 *
 * `processPrompt` because the content is an i18n key with `%arg` slots, exactly
 * as `Util.processPrompt(modelData.content)` upstream.
 */
function TargetTips({ tips }: { tips?: readonly TargetTip[] }) {
  const prompt = usePrompt();
  if (!tips?.length) return null;
  return (
    <div className="fk-photo__targets">
      {tips.map((t, i) => (
        <span
          key={`${t.content}-${i}`}
          className={cls('fk-target-tip', t.type === 'warning' && 'fk-target-tip--warn')}
        >
          {prompt(t.content)}
        </span>
      ))}
    </div>
  );
}

function generalPack(lua: { getGeneralData: (n: string) => { extension?: string } }, name: string): string | undefined {
  try { return lua.getGeneralData(name)?.extension; } catch { return undefined; }
}

/**
 * Whether the hand limit is worth drawing under the count.
 *
 * This used to be "whenever the limit is not the seat's hp", which sounds rare
 * and is not: `RefreshStatusSkills` reports `MaxCard` against the seat's
 * *maximum* hp and whatever skills have done to it, so in a real eight-seat
 * game almost every portrait carried a second number. Measured on a live table:
 * 刘璋 3/7, 神孙策 4/5, 星董卓 4/4, 的卢 3/4 — four seats, four limits, none of
 * them information anyone was going to act on.
 *
 * The one moment the limit *is* actionable is when the hand is over it, because
 * then the seat is going to discard. That is when it appears, and the tooltip
 * carries it the rest of the time.
 */
function showsLimit(handCount: number, maxCards: number): boolean {
  return maxCards > 0 && maxCards < 900 && handCount > maxCards;
}

/** Numbers only, so the tooltip needs no translation and no new i18n key. */
function handTitle(handCount: number, maxCards: number): string {
  return maxCards > 0 && maxCards < 900 ? `${handCount} / ${maxCards}` : String(handCount);
}

function EquipRow({ ids = [] }: { ids?: readonly number[] }) {
  const { lua, assets } = useRoom();
  if (!ids.length) return null;
  return (
    <div className="fk-equips">
      {ids.map((cid) => {
        const d = lua.getCardData(cid, true);
        const name = d.virt_name ?? d.name ?? 'unknown';
        const icon = assets.equipIcon(name, d.extension);
        const red = d.color === 'red';
        return (
          <div className="fk-equip" key={cid} title={lua.tr(name)}>
            {icon ? <img className="fk-equip__icon" src={icon} alt="" /> : null}
            <span className={cls('fk-equip__suit', red ? 'fk-equip__suit--red' : 'fk-equip__suit--black')}>
              {d.number ?? ''}
            </span>
            <span>{lua.tr(name)}</span>
          </div>
        );
      })}
    </div>
  );
}

function JudgeRow({ ids = [] }: { ids?: readonly number[] }) {
  const { lua } = useRoom();
  if (!ids.length) return null;
  return (
    <div className="fk-judge">
      {ids.map((cid) => {
        const d = lua.getCardData(cid, true);
        return <span className="fk-judge__chip" key={cid}>{lua.tr(d.virt_name ?? d.name ?? '?')}</span>;
      })}
    </div>
  );
}

/**
 * What a mark shows beside its name, following the four shapes the engine
 * documents at `lua/core/player.lua:44-54` and the Qt client implements across
 * `RoomLogic.js:1286` and `Photo/MarkArea.qml:135-152`.
 *
 * This used to be `String(v)` for everything, which is right only for a plain
 * number. A `@$`/`@&` mark carries an array — a card pile or a list of general
 * names — and printed as `1,2,3` instead of its count. A `@[type]name` mark is
 * a package-supplied display whose text comes from `GetQmlMark`; that call
 * existed on `LtkLua` with no caller, so those marks rendered their own raw
 * key. And a string-valued mark is a translation key, not a literal.
 */
function markValue(
  lua: LtkLua, key: string, value: unknown, playerId: number,
): string {
  // `@@` is documented as "mark with invisible extra data": name only.
  if (key.startsWith('@@')) return '';
  // `@$` is card data and `@&` is general names; both display as a count.
  if (key.startsWith('@$') || key.startsWith('@&')) {
    return Array.isArray(value) ? String(value.length) : String(value ?? '');
  }
  if (key.startsWith('@[')) {
    const close = key.indexOf(']');
    if (close !== -1) {
      const spec = lua.getQmlMark(key.slice(2, close), key, playerId) as
        { text?: unknown } | null;
      // A package with no `how_to_show` returns `{}`; showing the raw key then
      // is worse than showing nothing, since the key is not prose.
      return spec && spec.text != null ? String(spec.text) : '';
    }
  }
  if (Array.isArray(value)) return value.map((x) => lua.tr(String(x))).join(' ');
  return lua.tr(String(value));
}

/**
 * 曹髦's 道心值, drawn as the gauge it is upstream instead of as a text chip.
 *
 * A PORT OF `packages/mobile/qml/personalMark/qianlong.qml`, the one piece of
 * bespoke per-general UI in the whole FreeKill checkout: a bar in `#6dffcd`
 * with four notches over it and the number in `#f5ca53`, on a painted plate.
 * The plate is not in this build's asset pipeline (the mark images are not
 * `image/generals/` and nothing else references them) so the frame is drawn
 * rather than fetched; the colours, the four notches and the proportions are
 * the QML's.
 *
 * ONE DELIBERATE DEVIATION. The QML lights its notches at `index * 33` — 0, 33,
 * 66, 99, four evenly spaced marks along the bar. The numbers a player actually
 * needs are 25, 50, 75 and 99, because those are where `qianlong.lua` hands
 * over 清正, 酒诗, 放逐 and 决进, and a gauge whose marks are not the thresholds
 * is a gauge that answers the wrong question. `DAOXIN_STEPS` is the engine's
 * own list, read from the same file the skill is.
 *
 * It is a bar and not a cutscene on purpose: see the note in `cutscene.ts` on
 * why nothing fires at 25, 50 or 75.
 */
function Daoxin({ value }: { value: unknown }) {
  const n = Math.max(0, Math.min(DAOXIN_MAX, Number(value) || 0));
  return (
    <span className="fk-daoxin" title={String(n)}>
      <span className="fk-daoxin__track">
        <span className="fk-daoxin__fill" style={{ width: `${(n / DAOXIN_MAX) * 100}%` }} />
        {DAOXIN_STEPS.map((step) => (
          <span
            key={step}
            className={`fk-daoxin__notch${n >= step ? ' fk-daoxin__notch--lit' : ''}`}
            style={{ left: `${(step / DAOXIN_MAX) * 100}%` }}
          />
        ))}
      </span>
      <b className="fk-daoxin__num">{n}</b>
    </span>
  );
}

/**
 * The mark row, which upstream also uses as the seat's pile row.
 *
 * `Photo.qml:186-193` puts each private pile into the SAME list as the marks —
 * `markArea.setMark(areaName, count)` — so 锦帆 4 and 屯田 3 read exactly like
 * 〖忍戒〗2 does, and one tap handler covers both. That is why the piles are
 * merged in here rather than given a row of their own, and why a pile whose
 * name collides with a mark wins: upstream writes into the same slot.
 *
 * Every chip is a button, as every row upstream is a tap target. A chip whose
 * branch resolves to nothing simply does not open anything (`MarkArea.qml:107`
 * returns on an empty pile) — a `$`-prefixed private pile on somebody else's
 * seat is the ordinary case, and the engine's answer there is "no".
 *
 * ONE DELIBERATE DIFFERENCE. Upstream disables the tap while the seat is a live
 * target (`MarkArea.qml:67`), because there the mark area is a CHILD of the
 * photo and would otherwise swallow the click that picks the target. Here the
 * row is a sibling of `.fk-photo`, so there is no click to swallow — and being
 * able to look inside somebody's pile while deciding whether to target them is
 * exactly when you want to.
 */
function MarkRow(
  { player, piles, onInspect }:
  {
    player: PlayerState;
    piles?: Readonly<Record<string, readonly number[]>>;
    onInspect?: (playerId: number, key: string, value: unknown) => void;
  },
) {
  const { lua } = useRoom();
  const marks = Object.entries(player.marks);
  const pileRows = pileCounts(piles);
  if (!marks.length && !pileRows.length) return null;

  const shownPiles = new Set(pileRows.map(([name]) => name));
  const chip = (key: string, label: string, value: unknown, extra?: ReactNode) => (
    <button
      type="button"
      className={cls('fk-mark', extra ? 'fk-mark--gauge' : undefined)}
      key={key}
      onClick={onInspect ? () => onInspect(player.id, key, value) : undefined}
    >
      {label}{extra}
    </button>
  );

  return (
    <div className="fk-marks">
      {marks.map(([k, v]) => {
        if (shownPiles.has(k)) return null;
        if (k === DAOXIN_MARK) return chip(k, lua.tr(k), v, <Daoxin value={v} />);
        const shown = markValue(lua, k, v, player.id);
        return chip(k, `${lua.tr(k)}${shown ? ` ${shown}` : ''}`, v);
      })}
      {pileRows.map(([name, count]) => chip(name, `${lua.tr(name)} ${count}`, null))}
    </div>
  );
}

export const IS_EQUIP = CARD_TYPE.EQUIP;
export const NOT_ACTIVE = PHASE.NotActive;
