/**
 * 替换武将 — swapping an offered general for another printing of the same man.
 *
 * `Fk/Components/LunarLTK/Cheat/SameConvert.qml`, reached from
 * `ChooseGeneralBox.qml:119-126`'s `Same General Convert` button. Every general
 * carries a `trueName` — the last segment of its id, so `guanyu`, `ex__guanyu`
 * and `js__guanyu` are all 关羽 (`general.lua:56`) — and `Engine:getSameGenerals`
 * returns the other printings of that man which this room may actually use,
 * having already dropped the general itself and anything `canUseGeneral` bans
 * (`engine.lua:333-340`).
 *
 * IT IS AVAILABLE IN AN ORDINARY 身份局, and that is the point. `no_convert`
 * defaults to false (`room.lua:1166`, `:1192`), so this is not a 国战 feature —
 * it is offered on every deal, and with 标/界/谋/新杀 printings in the loaded
 * roster most standard names have at least one alternative. The port dropped
 * `data[2]` on the floor and had no button, so a player dealt 关羽 could not
 * reach 界关羽 at all.
 *
 * WHY IT IS SAFE, in the engine's own terms. `askToChooseGeneral` never
 * validates the reply against the offer — `req:getResult` hands back whatever
 * the seat sent and `Room:prepareGeneral` assigns it (see the header of
 * `FreeAssign.tsx`, which depends on the same fact for the same reason). So a
 * conversion is a substitution in the offer, exactly as upstream implements it:
 * `SameConvert.qml:49` writes the new name into `extra_data.cards` and the box
 * reads `choices` back off the current names.
 *
 * READ-ONLY UNTIL IT IS PRESSED. It never calls `onReply`; the pick is still
 * made in the 选将 box behind it, through the same `ChooseGeneralFilter` and
 * `ChooseGeneralFeasible` every other pick goes through.
 */
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useRoom } from '../RoomContext';
import { Btn, Dialog, GeneralCard } from './parts';

/**
 * The offered generals that have another printing, and what those are.
 *
 * Asked once per offer rather than once per render: the answer is a function of
 * the loaded packages and the room's bans, neither of which moves while a
 * choose-general box is open.
 */
export function conversionsFor(
  lua: { getSameGenerals: (name: string) => readonly string[] },
  offer: readonly string[],
): readonly (readonly [string, readonly string[]])[] {
  const out: (readonly [string, readonly string[]])[] = [];
  for (const name of offer) {
    let same: readonly string[] = [];
    try { same = lua.getSameGenerals(name); } catch { same = []; }
    if (same.length) out.push([name, same]);
  }
  return out;
}

const SECTION: CSSProperties = {
  margin: '0 0 6px',
  color: 'var(--fk-gold)',
  fontSize: 14,
};

export function SameConvert(
  { offer, onPick, onClose }:
  {
    offer: readonly string[];
    /** Put `to` in the slot `from` occupies. */
    onPick: (from: string, to: string) => void;
    onClose: () => void;
  },
) {
  const { lua } = useRoom();
  const groups = useMemo(() => conversionsFor(lua, offer), [lua, offer]);

  // Escape closes it, the same as `GeneralDetail`: this box sits over a live
  // request and a player must never be trapped in front of the question.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <Dialog
      // Over the 选将 box it was opened from, like `GeneralDetail`.
      layer={45}
      title={lua.tr('Same General Convert')}
      actions={<Btn onClick={onClose}>{lua.tr('Cancel')}</Btn>}
    >
      <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
        {groups.map(([name, same]) => (
          <div key={name}>
            <h4 style={SECTION}>{lua.tr(name)}</h4>
            <div className="fk-generals">
              {same.map((alt) => (
                <GeneralCard
                  key={alt}
                  name={alt}
                  onClick={() => onPick(name, alt)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
