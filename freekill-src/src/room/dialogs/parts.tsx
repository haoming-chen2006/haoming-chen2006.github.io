/** Pieces shared by the request dialogs. */
import type { CSSProperties, ReactNode } from 'react';
import { useRoom } from '../RoomContext';
import { cls } from '../components/CardItem';

/**
 * A box that owns the screen until it is answered — `RoomLogic.js`'s `popupBox`
 * (`Room.qml:543`). Everything behind it is dimmed and unclickable, which is
 * right for a question the seat has to answer before anything else can happen.
 */
export function Dialog(
  { title, prompt, children, actions, layer }:
  { title: string; prompt?: string; children: ReactNode; actions?: ReactNode; layer?: number },
) {
  return (
    // `layer` raises one box over another of the same kind. `.fk-modal` is
    // z-index 40 in `room.css`, and two of them can legitimately be up at once:
    // the choose-general question, and the read-only general-detail box a player
    // opens off one of its cards. Equal z-index would leave the winner to DOM
    // order, which is a fragile thing for a click target to depend on.
    <div className="fk-modal" style={layer == null ? undefined : { zIndex: layer }}>
      <div className="fk-dialog">
        <h3 className="fk-dialog__title">{title}</h3>
        {prompt ? <p className="fk-dialog__prompt" dangerouslySetInnerHTML={{ __html: prompt }} /> : null}
        {children}
        {actions ? <div className="fk-dialog__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

/**
 * A box that floats over the table without taking the table away —
 * `manualBox` (`Room.qml:522`), the loader the amazing-grace board lives in.
 *
 * The difference from `Dialog` is not decoration. `manualBox` holds a
 * `GraphicsBox` parked over the lower part of the table (`Room.qml:538` centres
 * it on 0.67 of the height) and everything around it stays live, because the
 * room goes on asking this seat questions while the box is up. `AG.qml` is the
 * only thing that has ever been in it, and it is up from `FillAG` — which every
 * seat receives — until `CloseAG`, which arrives only once the last player has
 * taken a card. Drawing it as a modal made every question asked in between
 * unanswerable.
 */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fk-float" style={FLOAT}>
      <div className="fk-dialog" style={{ pointerEvents: 'auto' }}>
        <h3 className="fk-dialog__title">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const FLOAT: CSSProperties = {
  position: 'absolute',
  // The ring, not the whole room: the side panel to the right is a live chat
  // box and the dashboard below is the hand this seat may still have to play a
  // 无懈可击 out of.
  inset: '0 calc(var(--fk-side-w) + 16px) 0 0',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  paddingBottom: '22%',
  // Under `.fk-modal` (40), so a request that really is modal still wins.
  zIndex: 30,
  // Everything the box does not itself cover stays clickable. This is the point.
  pointerEvents: 'none',
};

export function Btn(
  { children, onClick, disabled, primary }:
  { children: ReactNode; onClick?: () => void; disabled?: boolean; primary?: boolean },
) {
  return (
    <button type="button" className={cls('fk-btn', primary && 'fk-btn--primary')} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * A general card with its portrait, kingdom/hp line and the inline artist credit
 * the packages ship as `illustrator:<name>` (KayaK on 25 standard portraits).
 *
 * `onDetail` adds the "what does this one actually do" affordance: the ⓘ badge
 * in the portrait's top corner, and a right-click anywhere on the card. Both
 * open the read-only `<GeneralDetail>` box.
 *
 * THE BADGE IS A SEPARATE TARGET ON PURPOSE, and this is the one design
 * decision in the feature worth defending. The obvious reading of "click a
 * general to see its skills" is to put the box on the card's own click — but
 * that click is already the answer to `AskForGeneral`. Taking it would leave
 * the seat no way to pick, and it would put a full-screen `.fk-modal` over the
 * remaining cards after the first click, which is the exact shape of the bug
 * that made the amazing-grace board unanswerable (`dialogs/__tests__/ag-board`).
 * `ChooseGeneralBox.qml:127` reaches the same conclusion and hangs the detail
 * page off its own `Show General Detail` button rather than the card.
 *
 * So: left-click still selects, and the badge — 26px in the corner, clear of
 * the card's centre, `stopPropagation` on the way out — is what opens the box.
 * 26 rather than the 16 an icon wants: this is a landscape-tablet target too,
 * and at 319 generals it is the control people reach for most in this dialog.
 */
export function GeneralCard(
  { name, selected, disabled, onClick, onDetail, onSwap }:
  {
    name: string; selected?: boolean; disabled?: boolean;
    onClick?: () => void; onDetail?: () => void;
    /** Free assign only: swap this slot for any general in the roster. Sits
     *  opposite the ⓘ badge and for the same reason — the card's own click is
     *  the answer to the request and cannot be spent on anything else. See
     *  `dialogs/FreeAssign.tsx` for why it is a badge and not a right-click. */
    onSwap?: () => void;
  },
) {
  const { lua, assets } = useRoom();
  const data = lua.getGeneralData(name);
  const art = assets.generalPortrait(name, data?.extension);
  const credit = lua.getIllustrator(name);
  return (
    <div
      className={cls('fk-general', selected && 'fk-general--on')}
      style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      onClick={disabled ? undefined : onClick}
      onContextMenu={onDetail ? (e) => { e.preventDefault(); onDetail(); } : undefined}
      title={name}
    >
      {art ? <img src={art} alt="" draggable={false} /> : <div style={{ height: 170 }} />}
      {onDetail ? (
        <button
          type="button"
          className="fk-general__info"
          style={INFO_BADGE}
          title={lua.tr('Show General Detail')}
          aria-label={lua.tr('Show General Detail')}
          onClick={(e) => { e.stopPropagation(); onDetail(); }}
        >
          ⓘ
        </button>
      ) : null}
      {onSwap ? (
        <button
          type="button"
          className="fk-general__swap"
          style={SWAP_BADGE}
          title={lua.tr('Enable free assign')}
          aria-label={lua.tr('Enable free assign')}
          onClick={(e) => { e.stopPropagation(); onSwap(); }}
        >
          ⇄
        </button>
      ) : null}
      <div className="fk-general__cap">
        {lua.tr(name)}
        <span className="fk-general__hp">{data?.hp ?? '?'}/{data?.maxHp ?? '?'}</span>
        {credit ? <span className="fk-general__credit">{lua.tr('Illustrator')}: {credit}</span> : null}
      </div>
    </div>
  );
}

/** Inline rather than in `room.css`: the badge is the only thing that needs it,
 *  and `.fk-general` is already `position: relative` for it to hang off. */
const INFO_BADGE: CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 4,
  width: 26,
  height: 26,
  padding: 0,
  lineHeight: '24px',
  fontSize: 15,
  borderRadius: '50%',
  border: '1px solid var(--fk-gold)',
  background: 'rgba(18, 15, 11, 0.82)',
  color: 'var(--fk-gold)',
  cursor: 'pointer',
};

/** The free-assign badge, opposite ⓘ so the two never overlap at any card size
 *  and neither is near the middle of the card, which is the select target. */
const SWAP_BADGE: CSSProperties = { ...INFO_BADGE, right: undefined, left: 4 };
