/**
 * 自由选将 — picking the character you actually want to play.
 *
 * WHAT THE ENGINE PROVIDES, AND WHAT IT DOES NOT. `enableFreeAssign` is a real
 * setting with a real i18n entry (`lua/client/i18n/zh_CN.lua:108`,
 * "自由选将"), declared on the board game at `lua/lunarltk/init.lua:32`. But it
 * is not enforcement, and it is worth being exact about that before building on
 * it: the setting is read in exactly one place server-side,
 * `ServerRoomBase:shouldUpdateWinRate` (`lua/server/roombase.lua:298`), where
 * its only effect is that a free-assign game does not count towards win rates.
 *
 * The reply to `AskForGeneral` is never validated against the offer. `Request`
 * cbor-decodes it (`lua/server/request.lua:180`) and stores it; `askToChooseGeneral`
 * returns it verbatim (`lua/lunarltk/server/room.lua:1199`); `Room:findGeneral`
 * is a pile *removal* that returns nil for an off-pile name and whose return
 * nobody checks (`room.lua:1948`); `Room:prepareGeneral` then assigns whatever
 * it was given (`room.lua:418`). `Engine:canUseGeneral` — the ban check — runs
 * only while building the pile, never on a reply.
 *
 * So free assign is an honour-system client affordance, upstream and here. The
 * Qt client shows the door when the setting is on (`ChooseGeneralBox.qml:176`)
 * and hides it when it is off; a hand-rolled client could walk through the wall
 * in either case. This build behaves exactly like the Qt client: the switch
 * decides whether the UI is offered, and the room asks the engine for the
 * roster rather than keeping one.
 *
 * TWO DEPARTURES FROM `FreeAssign.qml`, both forced.
 *
 *   The gesture. Upstream opens this by right-clicking or long-pressing an
 *   unselected card in the offer. This build already spends right-click on a
 *   general card opening `<GeneralDetail>` (`parts.tsx:118`), which is a
 *   reading affordance every viewer wants and which predates this. So there are
 *   two doors instead, and the difference between them is the whole lesson: a
 *   ⇄ badge on each card, which is a shortcut for someone who already knows the
 *   feature exists, and a NAMED BUTTON in the choose-general action row, which
 *   is how anyone else finds out that it does. The badge alone was not enough —
 *   the person who asked for this feature had it, shipped, and could not see
 *   it. Upstream has the same failure and the same evidence: its help string
 *   has to spell the gesture out ("启用后在选将界面长按或右键武将牌") because
 *   nothing on screen does.
 *
 *   The roster. Upstream offers a pack grid *and* a search box.  This offers
 *   the search box over the whole roster, because `SearchAllGenerals("")`
 *   already returns every general in every loaded general pack — the pack grid
 *   is a way to narrow 319 names without typing, and a filter box does that
 *   better in a browser.
 *
 * What it does NOT do is decide anything. The list comes from the engine, the
 * substitution goes back through the same `ChooseGeneralFilter` /
 * `ChooseGeneralFeasible` predicates every other pick goes through, and the
 * reply is the same array of names the QML sends.
 */
import { useDeferredValue, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRoom } from '../RoomContext';
import { fillArgs } from '../ltk/prompt';
import { Dialog, GeneralCard } from './parts';

const BAR: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 8px' };

const SEARCH: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  padding: '6px 10px',
  border: '1px solid var(--fk-line)',
  borderRadius: 4,
  background: 'rgba(0, 0, 0, 0.35)',
  color: 'var(--fk-ink)',
  font: 'inherit',
};

const COUNT: CSSProperties = { fontSize: 12, color: 'var(--fk-ink-dim)', flex: '0 0 auto' };

/**
 * Is this room offering free assign?
 *
 * `ClientInstance:getSettings("enableFreeAssign")`, which is what
 * `ChooseGeneralBox.qml:29` and `:176` both call. The web room holds the same
 * blob — `EnterRoom`'s third element — rather than reaching into the VM, so
 * this is a read of `RoomState.settings` and nothing more.
 */
export function freeAssignEnabled(settings: Readonly<Record<string, unknown>>): boolean {
  return settings.enableFreeAssign === true;
}

/** Beyond this many results the grid is asking the browser to lay out several
 *  hundred portraits for a list nobody reads past the first row. Typing is
 *  faster than scrolling at that size, and the count tells you it is capped. */
const SHOWN = 60;

export interface FreeAssignProps {
  /** What this slot currently holds, so the box can say what it is replacing. */
  readonly current: string;
  /** Names already in the offer; picking one of them would be a no-op. */
  readonly offer: readonly string[];
  readonly onPick: (general: string) => void;
  readonly onClose: () => void;
}

export function FreeAssign({ current, offer, onPick, onClose }: FreeAssignProps) {
  const { lua } = useRoom();
  const [word, setWord] = useState('');
  // 274 portraits re-filtered on every keystroke is the one place this dialog
  // can feel slow. The input stays live; the grid catches up.
  const deferred = useDeferredValue(word);

  const found = useMemo(() => lua.searchGenerals(deferred.trim()), [lua, deferred]);
  const shown = found.slice(0, SHOWN);

  return (
    <Dialog
      // Over `<ChooseGeneralBox>`, which is a plain `.fk-modal` at 40, and
      // under nothing: this is the box the player is working in.
      layer={45}
      title={lua.tr('Enable free assign')}
      /*
       * NOT `help: Enable free assign`, which used to be here.
       *
       * That string is the *setting's* help text and it describes upstream's
       * gesture verbatim — "启用后在选将界面长按或右键武将牌" / "press and hold
       * or right-click a character on the selection screen". Neither works in
       * this client: right-click on a general card opens `<GeneralDetail>`, and
       * the way in is the labelled button in `ChooseGeneralBox`'s action row.
       * Printing an instruction that does nothing, inside the panel it claims
       * to open, is worse than printing nothing. `$ChooseGeneral` is the
       * engine's own name for what this box is for.
       */
      prompt={fillArgs(lua.tr('$ChooseGeneral'), '1')}
      actions={<button type="button" className="fk-btn" onClick={onClose}>{lua.tr('Cancel')}</button>}
    >
      {/* Inline for the same reason `parts.tsx`'s badges are: three rules that
          exist nowhere else, in a stylesheet four other lanes are editing. */}
      <div style={BAR}>
        <input
          style={SEARCH}
          value={word}
          autoFocus
          maxLength={24}
          placeholder={lua.tr('Search')}
          onChange={(e) => setWord(e.target.value)}
        />
        <span style={COUNT}>
          {found.length > SHOWN ? `${shown.length} / ${found.length}` : String(found.length)}
        </span>
      </div>

      <div className="fk-generals" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
        {shown.map((g) => (
          <GeneralCard
            key={g}
            name={g}
            selected={g === current}
            // Already in the offer, and not the slot being replaced: picking it
            // would put the same general in twice. Upstream lets you do it and
            // the server takes it; there is no reason to help.
            disabled={g !== current && offer.includes(g)}
            onClick={() => onPick(g)}
          />
        ))}
      </div>
    </Dialog>
  );
}
