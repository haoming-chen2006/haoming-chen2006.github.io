/**
 * The general-detail popup — `Fk/Pages/LunarLTK/GeneralDetailPage.qml`, cut down
 * to what a player wants mid-game: the portrait, the stats, every skill with its
 * description, and the artist credit the package ships inline.
 *
 * Descriptions come from `GetGeneralDetail`, which builds them with
 * `Fk:getDescription` — the room does not compose skill text itself.
 */
import { useRoom } from '../RoomContext';
import { Dialog, Btn } from '../dialogs/parts';
import { sanitizeMarkup } from './markup';

export function GeneralDetail({ name, onClose }: { name: string; onClose: () => void }) {
  const { lua, assets } = useRoom();
  const detail = safe(() => lua.getGeneralDetail(name));
  const art = assets.generalPortrait(name, detail?.extension);
  const credit = lua.getIllustrator(name);

  return (
    <Dialog title={lua.tr(name)} actions={<Btn onClick={onClose}>{lua.tr('OK')}</Btn>}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {art ? <img src={art} alt="" style={{ width: 180, borderRadius: 5 }} /> : null}
        <div style={{ maxWidth: 480 }}>
          <p style={{ margin: '0 0 8px', color: 'var(--fk-ink-dim)' }}>
            {lua.tr(detail?.kingdom ?? '')} · {detail?.hp ?? '?'}/{detail?.maxHp ?? '?'}
            {credit ? <> · {lua.tr('Illustrator')}: {credit}</> : null}
          </p>
          {(detail?.skill ?? []).map((s) => (
            <div key={s.name} style={{ marginBottom: 8 }}>
              <b style={{ color: 'var(--fk-gold)' }}>{lua.tr(s.name)}</b>
              <div
                style={{ fontSize: 13, lineHeight: 1.5 }}
                dangerouslySetInnerHTML={{ __html: sanitizeMarkup(s.description ?? '') }}
              />
            </div>
          ))}

        </div>
      </div>
    </Dialog>
  );
}

function safe<T>(fn: () => T): T | undefined {
  try { return fn(); } catch { return undefined; }
}
