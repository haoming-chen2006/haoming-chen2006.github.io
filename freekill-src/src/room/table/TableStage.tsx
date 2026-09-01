/**
 * The middle of the table: what is being played, what was just played, and the
 * pile counters.
 *
 * This replaces `components/TablePile.tsx`, which drew only the processing area
 * as the store hands it over. That was faithful to `TablePile.qml` and it was
 * not legible: measured over the recorded game, a played card is deleted
 * mid-fade 69% of the time and the processing area is empty for 54% of the
 * game's frames. See `plays.ts` for the numbers and the reasoning.
 *
 * Three surfaces, in one column, in the band between the seat columns:
 *
 *   1. the pile counters,
 *   2. the current play — or, when the engine has taken it away, the last one,
 *      receded so "just happened" never reads as "still happening",
 *   3. a strip of the plays before it, each with the engine's own footnote
 *      saying who used what on whom.
 *
 * The whole thing inherits `pointer-events: none` from `.fk-table` and takes no
 * clicks, which is what keeps the audit's `controls reachable` check green: it
 * hit-tests every enabled control with `elementFromPoint`, and an element that
 * does not take pointer events is invisible to that test. Two dialogs in this
 * project have shipped covering the table; this surface cannot.
 */
import { memo, useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n';
import { localize } from '../../i18n/localized';
import { CardItem, cls, TableCard } from '../components/CardItem';
import { fillArgs } from '../ltk/prompt';
import { useRoom, useRoomState } from '../RoomContext';
import type { CardState } from '../state/types';
import { EMPTY_PLAYS, rememberPlays, type PlayMemory } from './plays';

export const TableStage = memo(function TableStage() {
  const state = useRoomState();
  const { lua, store } = useRoom();

  // Expired cards linger for one beat, then leave the *store* — unchanged from
  // `TablePile`, deliberately. Holding a card visible for longer is this file's
  // job and it does it with its own copy; the store's table keeps exactly the
  // timing it always had, so the derived discard count (`countDiscarded`) and
  // the card-conservation invariant behind it are untouched.
  useEffect(() => {
    if (!state.table.some((c) => c.expired)) return;
    const t = setTimeout(() => store.pruneTable(), 1200);
    return () => clearTimeout(t);
  }, [state.table, store]);

  const memory = usePlayMemory(state.table);

  // "Something is happening" is a card the engine has not finished with. An
  // expired card is still in `state.table` until the prune above, but it is
  // already history, and history is what the held play draws better.
  const acting = state.table.some((c) => !c.expired);
  const current = memory.plays[0];
  const shown: readonly CardState[] = acting ? state.table : (current?.cards ?? []);
  const held = !acting && shown.length > 0;
  const recent = memory.plays.slice(1);

  return (
    <div className="fk-table">
      <div className="fk-piles">
        <span>{lua.tr('pile_draw')} <b>{state.drawPileCount}</b></span>
        <span>{lua.tr('pile_discard')} <b>{state.discardCount}</b></span>
        {state.round > 0
          ? <span>{fillArgs(lua.tr('#currentRoundNum'), String(state.round))}</span>
          : null}
      </div>

      {/* One element in both states, and cards keyed the same way in both, so
          the swap from "being played" to "just played" reuses the same DOM
          nodes and reads as the card settling rather than as a new card
          landing. A remount here would replay `fk-land` and look like a second
          play of the same card.

          The key dropped the array index `TablePile` used, because the held
          list is not the live list — it also holds cards the engine has already
          taken back — so a positional key would remount everything on the swap.
          `cid:eventId` identifies a card on the table uniquely: a card is only
          ever in one place, and `MoveCards` removes before it adds. Checked
          against the whole recorded game: no two table cards ever shared it. */}
      <div className={cls('fk-table__cards', held && 'fk-table__cards--held')}>
        {shown.map((c) => <TableCard key={`${c.cid}:${c.eventId ?? 0}`} card={c} />)}
      </div>

      {recent.length ? (
        <div className="fk-recent">
          {recent.map((p) => (
            <div className="fk-recent__play" key={p.id}>
              <div className="fk-recent__cards">
                {p.cards.map((c) => (
                  <CardItem
                    key={`${c.cid}:${c.eventId ?? 0}`}
                    cid={c.cid}
                    known={c.known}
                    virtName={c.virtName}
                  />
                ))}
              </div>
              <Caption cards={p.cards} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
});

/**
 * The engine's own sentence for the play — `SetCardFootnote`, which renders as
 * `<b>用者</b>对<b>目标</b>`: who used it, on whom. It is already translated,
 * one rendering per language, and it is exactly the thing that makes a card
 * sitting on the table afterwards mean something. One per play rather than one
 * per card: every card of a play carries the same sentence.
 */
function Caption({ cards }: { cards: readonly CardState[] }) {
  const lang = useLanguage();
  const note = cards.map((c) => localize(c.footnote, lang)).find(Boolean);
  if (!note) return null;
  return <span className="fk-recent__note" dangerouslySetInnerHTML={{ __html: note }} />;
}

/**
 * The rolling memory of recent plays.
 *
 * Folded during render against the table's own identity rather than in an
 * effect: an effect would publish a frame late, so the card would blink out and
 * back in. `rememberPlays` is idempotent — folding the same table twice is the
 * same as folding it once — which is what makes that safe under StrictMode's
 * double render and under a concurrent render that is thrown away.
 *
 * The identity guard is not just an optimisation. `refreshStatusSkills` commits
 * five times a second whether or not the game moved, and `state.table` keeps
 * its reference across a commit that did not touch it.
 */
function usePlayMemory(table: readonly CardState[]): PlayMemory {
  const seen = useRef<readonly CardState[] | null>(null);
  const memory = useRef<PlayMemory>(EMPTY_PLAYS);
  if (seen.current !== table) {
    seen.current = table;
    memory.current = rememberPlays(memory.current, table);
  }
  return memory.current;
}
