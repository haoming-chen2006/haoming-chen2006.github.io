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
import { memo } from 'react';
import type { ItemData } from '../../contract/scene';
import { useRoom } from '../RoomContext';
import { seatChar } from '../ltk/prompt';
import { CARD_TYPE, PHASE } from '../ltk/types';
import type { PlayerState, RoomState, SeatEffect } from '../state/types';
import { cls } from './CardItem';
import { HpBar } from './HpBar';

export interface PhotoProps {
  readonly player: PlayerState;
  readonly state: RoomState;
  readonly item?: ItemData;
  readonly isCurrent: boolean;
  readonly handCount: number;
  readonly effects: readonly SeatEffect[];
  readonly bubble?: string;
  readonly onClick?: (pid: number, selected: boolean) => void;
}

export const Photo = memo(function Photo(props: PhotoProps) {
  const { player, state, item, isCurrent, handCount, effects, bubble, onClick } = props;
  const { lua, assets } = useRoom();

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

  const thinking = state.focus?.ids.includes(player.id) ? state.focus : null;

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

        {effects.map((e) => (
          <span key={e.id} className="fk-effect">
            {e.kind === 'skill' ? lua.tr(e.value) : effectGlyph(e)}
          </span>
        ))}
      </div>

      <EquipRow player={player} state={state} />
      <JudgeRow player={player} state={state} />
      <MarkRow player={player} />
    </div>
  );
});

function effectGlyph(e: SeatEffect): string {
  if (e.kind === 'damage') return '✷';
  return ({ damage: '✷', slash: '⚔', jink: '≫', peach: '❀', chain: '⛓' } as Record<string, string>)[e.value] ?? '✦';
}

function generalPack(lua: { getGeneralData: (n: string) => { extension?: string } }, name: string): string | undefined {
  try { return lua.getGeneralData(name)?.extension; } catch { return undefined; }
}

function EquipRow({ player, state }: { player: PlayerState; state: RoomState }) {
  const { lua, assets } = useRoom();
  const ids = state.equips[player.id] ?? [];
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

function JudgeRow({ player, state }: { player: PlayerState; state: RoomState }) {
  const { lua } = useRoom();
  const ids = state.judge[player.id] ?? [];
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
