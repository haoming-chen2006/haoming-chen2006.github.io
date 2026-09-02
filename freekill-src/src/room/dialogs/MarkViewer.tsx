/**
 * What is in that pile.
 *
 * `Fk/Components/LunarLTK/Cheat/ViewPile.qml` and `ViewGeneralPile.qml`: a
 * title and a grid of cards, or of general portraits. Upstream opens them in the
 * room's right drawer (`Room.qml:692` `startCheat`), reached by tapping a mark
 * or a pile counter on a seat.
 *
 * IT IS A DRAWER AND NOT A MODAL, and that is load-bearing rather than
 * cosmetic. The room goes on asking this seat questions while a player is
 * reading — a 无懈可击 for each of eight targets, say — and this project has
 * already paid once for putting a full-screen `.fk-modal` over a live table:
 * the amazing-grace board swallowed every click meant for the request
 * underneath it and three consecutive asks timed out at 30 s each. So this
 * takes no clicks it is not itself under, dims nothing, and closes on Escape.
 *
 * READ-ONLY. It never replies, never touches the store and holds no state. A
 * general card taps through to `GeneralDetail`, which is the one thing upstream
 * does from here too (`ViewGeneralPile.qml:40`).
 */
import { useEffect } from 'react';
import type { Inspect } from '../components/marks';
import { CardItem } from '../components/CardItem';
import { useRoom } from '../RoomContext';

export function MarkViewer(
  { spec, onClose, onGeneral }:
  { spec: Inspect; onClose: () => void; onGeneral?: (name: string) => void },
) {
  const { lua, assets } = useRoom();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div className="fk-drawer">
      <div className="fk-drawer__box">
        <div className="fk-drawer__head">
          <h3 className="fk-drawer__title">{lua.tr(spec.title)}</h3>
          <button
            type="button"
            className="fk-chip"
            onClick={onClose}
            aria-label={lua.tr('OK')}
          >✕</button>
        </div>

        <div className="fk-drawer__grid">
          {spec.kind === 'cards'
            ? spec.ids.map((cid) => <CardItem key={cid} cid={cid} known />)
            : null}

          {spec.kind === 'cardNames'
            // No id, so no face to fetch: upstream builds a `CardItem` with
            // `cid = 0` and only a name (`ViewPile.qml:44-48`), which draws the
            // card back with the name over it. A chip says the same thing
            // without pretending to be a card that exists.
            ? spec.names.map((name, i) => (
              <span className="fk-drawer__name" key={`${name}-${i}`}>{lua.tr(name)}</span>
            ))
            : null}

          {spec.kind === 'generals'
            ? spec.names.map((name, i) => {
              const art = assets.generalPortrait(name, lua.getGeneralData(name)?.extension);
              return (
                <button
                  type="button"
                  className="fk-drawer__general"
                  key={`${name}-${i}`}
                  onClick={onGeneral ? () => onGeneral(name) : undefined}
                  title={lua.tr('Show General Detail')}
                >
                  {art ? <img src={art} alt="" draggable={false} /> : <span className="fk-drawer__noart" />}
                  <span className="fk-drawer__cap">{lua.tr(name)}</span>
                </button>
              );
            })
            : null}
        </div>
      </div>
    </div>
  );
}
