/** Pieces shared by the request dialogs. */
import type { ReactNode } from 'react';
import { useRoom } from '../RoomContext';
import { cls } from '../components/CardItem';

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
