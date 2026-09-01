/**
 * The middle of the table: cards in the processing area, plus the pile counters.
 *
 * `Fk/Components/LunarLTK/TablePile.qml` keeps a 1.5-second vanish timer and
 * consults Lua for "is this still in the processing area". The web room takes
 * the simpler, equivalent route the stream already gives it:
 * `DestroyTableCardByEvent(n)` marks every card whose holding event is >= n as
 * expired, and expired cards fade out and leave.
 */
import { memo, useEffect } from 'react';
import { fillArgs } from '../ltk/prompt';
import { useRoom, useRoomState } from '../RoomContext';
import { TableCard } from './CardItem';

export const TablePile = memo(function TablePile() {
  const state = useRoomState();
  const { lua, store } = useRoom();

  // Expired cards linger for one beat so the move stays legible — the same
  // 1.5-second grace `TablePile.qml`'s vanish timer gives them — then leave.
  useEffect(() => {
    if (!state.table.some((c) => c.expired)) return;
    const t = setTimeout(() => store.pruneTable(), 1200);
    return () => clearTimeout(t);
  }, [state.table, store]);

  // The counters live inside the table band rather than pinned to the top of
  // the ring: that is where the top row of seats is now, and they were being
  // drawn straight across two portraits.
  return (
    <div className="fk-table">
      <div className="fk-piles">
        <span>{lua.tr('pile_draw')} <b>{state.drawPileCount}</b></span>
        <span>{lua.tr('pile_discard')} <b>{state.discardCount}</b></span>
        {state.round > 0
          ? <span>{fillArgs(lua.tr('#currentRoundNum'), String(state.round))}</span>
          : null}
      </div>
      <div className="fk-table__cards">
        {state.table.map((c, i) => <TableCard key={`${c.cid}:${c.eventId ?? 0}:${i}`} card={c} />)}
      </div>
    </div>
  );
});
