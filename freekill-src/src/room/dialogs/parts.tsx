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
  { title, prompt, children, actions }:
  { title: string; prompt?: string; children: ReactNode; actions?: ReactNode },
) {
  return (
    <div className="fk-modal">
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

/** A general card with its portrait, kingdom/hp line and the inline artist credit
 *  the packages ship as `illustrator:<name>` (KayaK on 25 standard portraits). */
export function GeneralCard(
  { name, selected, disabled, onClick }:
  { name: string; selected?: boolean; disabled?: boolean; onClick?: () => void },
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
      title={name}
    >
      {art ? <img src={art} alt="" draggable={false} /> : <div style={{ height: 170 }} />}
      <div className="fk-general__cap">
        {lua.tr(name)}
        <span className="fk-general__hp">{data?.hp ?? '?'}/{data?.maxHp ?? '?'}</span>
        {credit ? <span className="fk-general__credit">{lua.tr('Illustrator')}: {credit}</span> : null}
      </div>
    </div>
  );
}
