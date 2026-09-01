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
import type { ItemData } from '../../contract/scene';
import { useRoom } from '../RoomContext';
import { seatChar } from '../ltk/prompt';
import { CARD_TYPE, PHASE } from '../ltk/types';
import { SkinLayer, useSkinMode } from '../skins';
import type { FocusState, PlayerState } from '../state/types';
import { seatStage } from './anim/bus';
import { EffectStage, useAnimBus } from './anim/Stage';
import { cls } from './CardItem';
import { HpBar } from './HpBar';

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
  readonly item?: ItemData;
  readonly isCurrent: boolean;
  readonly handCount: number;
  readonly focus: FocusState | null;
  readonly bubble?: string;
  readonly onClick?: (pid: number, selected: boolean) => void;
}

export const Photo = memo(function Photo(props: PhotoProps) {
  const { player, equips, judge, item, isCurrent, handCount, focus, bubble, onClick } = props;
  const { lua, assets } = useRoom();
  const [skinMode] = useSkinMode();

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
      {bubble ? <div className="fk-bubble">{bubble}</div> : null}
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
        {/* Ships defaulted to `off` for licensing reasons: this renders nothing
            until a player opts in. See `src/room/skins/policy.ts`. */}
        <SkinLayer general={player.general} mode={skinMode} className="fk-photo__art" />

        <div className="fk-photo__scrim" />

        {player.kingdom && player.kingdom !== 'unknown'
          ? <span className="fk-photo__kingdom">{lua.tr(player.kingdom)}</span> : null}

        {roleIcon
          ? <img className="fk-photo__role" src={roleIcon} alt={player.role} />
          : <span className="fk-photo__role--text">{lua.tr(roleKnown ? player.role : 'unknown')}</span>}

        {player.seat ? <span className="fk-photo__seat">{seatChar(player.seat)}</span> : null}

        <HpBar hp={player.hp} maxHp={player.maxHp} shield={player.shield} />

        <span className="fk-photo__name">
          {displayName}
          <span className="fk-photo__screenname">{player.screenName}</span>
        </span>

        <span className="fk-photo__hand">
          {player.maxCards > 0 && player.maxCards !== player.hp
            ? `${handCount}/${player.maxCards < 900 ? player.maxCards : '∞'}`
            : handCount}
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

        {/* The engine's own effect art, played straight off the notify stream.
            Last child so it draws over the portrait and its overlays, and
            unclipped so a 杀 can spill past the frame the way it does in the
            Qt client. Nothing React renders into it — see `anim/bus.ts`. */}
        <EffectStage stage={seatStage(player.id)} />
      </div>

      <EquipRow ids={equips} />
      <JudgeRow ids={judge} />
      <MarkRow player={player} />
    </div>
  );
});

function generalPack(lua: { getGeneralData: (n: string) => { extension?: string } }, name: string): string | undefined {
  try { return lua.getGeneralData(name)?.extension; } catch { return undefined; }
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

function MarkRow({ player }: { player: PlayerState }) {
  const { lua } = useRoom();
  const entries = Object.entries(player.marks);
  if (!entries.length) return null;
  return (
    <div className="fk-marks">
      {entries.map(([k, v]) => (
        <span className="fk-mark" key={k}>
          {lua.tr(k)}{k.startsWith('@@') ? '' : ` ${String(v)}`}
        </span>
      ))}
    </div>
  );
}

export const IS_EQUIP = CARD_TYPE.EQUIP;
export const NOT_ACTIVE = PHASE.NotActive;
