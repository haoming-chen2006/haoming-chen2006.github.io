/**
 * One card.
 *
 * Face data comes from `GetCardData` in the client VM. Whether it may be clicked
 * comes from the scene's `CardItem` entry and from nowhere else — there is no
 * "is this card playable" check in this file or any other file in `src/room`.
 */
import { memo } from 'react';
import type { ItemData } from '../../contract/scene';
import { rankText, SUIT_GLYPH, SUIT_IS_RED } from '../assets/assets';
import { useLanguage } from '../../i18n';
import { localize, type Localized } from '../../i18n/localized';
import { useRoom } from '../RoomContext';
import type { CardState } from '../state/types';
import { cardStage } from './anim/bus';
import { EffectStage } from './anim/Stage';

export interface CardItemProps {
  readonly cid: number;
  /** From the room store: whether the viewer may see the face. */
  readonly known?: boolean;
  /** The matching `CardItem` in the scene, if the request offers this card. */
  readonly item?: ItemData;
  /** Engine-rendered markup, already translated — one string per language. */
  readonly footnote?: Localized | string;
  readonly virtName?: string;
  readonly expired?: boolean;
  readonly delayedTrick?: boolean;
  readonly onClick?: (cid: number, selected: boolean) => void;
  readonly onDoubleClick?: (cid: number) => void;
  readonly title?: string;
}

export const CardItem = memo(function CardItem(props: CardItemProps) {
  const { cid, known = true, item, virtName, expired, delayedTrick, onClick, onDoubleClick, title } = props;
  const { lua, assets } = useRoom();
  const lang = useLanguage();
  const footnote = localize(props.footnote, lang);

  // `known === false` from the engine means the same thing as the caller saying
  // so: this seat may not see the card's face. A card whose data cannot be
  // resolved at all lands here too, so an id the client VM has not learned yet
  // draws a card back instead of throwing in the middle of a render.
  const data = known && cid >= 0 ? lua.getCardData(cid, true) : null;
  if (!data || data.known === false) {
    return (
      <div className={cls('fk-card fk-card--back', expired && 'fk-card--expired')} title={title}>
        {virtName ? <span className="fk-card__virt">{lua.tr(virtName)}</span> : null}
        {footnote ? <span className="fk-card__foot" dangerouslySetInnerHTML={{ __html: footnote }} /> : null}
      </div>
    );
  }

  const name = data.virt_name ?? virtName ?? data.name ?? 'unknown';
  const suit = data.suit ?? 'nosuit';
  const red = SUIT_IS_RED[suit];
  const art = delayedTrick
    ? assets.delayedTrick(name, data.extension)
    : assets.cardFace(name, data.extension);

  // enabled / selected are the scene's words, mirrored verbatim.
  const enabled = item?.enabled === true;
  const selected = item?.selected === true;
  const offered = item !== undefined;

  return (
    <div
      className={cls(
        'fk-card',
        red ? 'fk-card--red' : 'fk-card--black',
        offered && (enabled ? 'fk-card--enabled' : 'fk-card--disabled'),
        selected && 'fk-card--selected',
        expired && 'fk-card--expired',
      )}
      title={title ?? lua.tr(name)}
      onClick={enabled && onClick ? () => onClick(cid, !selected) : undefined}
      onDoubleClick={enabled && onDoubleClick ? () => onDoubleClick(cid) : undefined}
    >
      {art ? <img className="fk-card__art" src={art} alt="" draggable={false} /> : null}
      <span className="fk-card__corner">
        <span className="fk-card__rank">{rankText(data.number)}</span>
        <span className="fk-card__suit">{SUIT_GLYPH[suit]}</span>
      </span>
      {data.virt_name ? <span className="fk-card__virt">{lua.tr(data.virt_name)}</span> : null}
      {art ? null : <span className="fk-card__name">{lua.tr(name)}</span>}
      {footnote ? <span className="fk-card__foot" dangerouslySetInnerHTML={{ __html: footnote }} /> : null}
    </div>
  );
});

export function cls(...parts: readonly (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Convenience for table cards, which carry their own footnote/expiry — and
 * which are the only cards the engine plays an effect ON.
 *
 * `Room:setCardEmotion` (`room.lua:524`) sends `Animate{type:"Emotion",
 * is_card:true, player:<card id>}`, and the judge event uses it for every
 * judgement in the game: `judgegood` or `judgebad` over the card that was
 * flipped (`events/judge.lua:96`). Rendering that on the card is the whole
 * difference between a judgement you watch and a line in the log you missed.
 */
export function TableCard({ card }: { card: CardState }) {
  return (
    <div className="fk-table-card">
      <CardItem
        cid={card.cid}
        known={card.known}
        footnote={card.footnote}
        virtName={card.virtName}
        expired={card.expired}
      />
      <EffectStage stage={cardStage(card.cid)} host=".fk-table-card" />
    </div>
  );
}
