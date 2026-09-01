/**
 * Every request that does not come through the scene model.
 *
 * `contract/scene.ts` records what the spike found: across 16 full games the
 * only scene `_type` was `Room`. Choose-general, guanxing, card-chosen, poxi,
 * amazing-grace and the choice boxes arrive as their own `AskFor*` commands with
 * their own payloads, exactly as the QML client renders them.
 *
 * Every dialog here answers by handing a plain value back to the client — the
 * same value the QML `replyToServer(...)` call passes. Where a dialog needs to
 * know whether a selection is legal it asks the client (`ChooseGeneralFeasible`,
 * `PoxiFeasible`); it never decides.
 */
import { useMemo, useState } from 'react';
import { useRoom, useRoomState, usePrompt } from '../RoomContext';
import { CardItem, cls } from '../components/CardItem';
import { FreeAssign, freeAssignEnabled } from './FreeAssign';
import { GeneralDetail } from './GeneralDetail';
import { Btn, Dialog, GeneralCard, Panel } from './parts';

export interface DialogHostProps {
  readonly onReply: (value: unknown) => void;
  readonly interactive: boolean;
}

/**
 * The amazing-grace board is not a request, and must not be drawn like one.
 *
 * `FillAG` puts it on every seat's screen at once and `CloseAG` only takes it
 * down when the last player has taken a card — 五谷丰登 asks eight seats in
 * turn, so the board is up for the whole resolution. In between, the room goes
 * on asking *this* seat things: a nullification for every one of those eight
 * targets. Returning it here as the room's only dialog did two things wrong.
 * It hid whatever else the seat was being asked, and — because `Dialog` is a
 * full-screen modal — it swallowed every click meant for the board underneath,
 * so a seat holding a 无懈可击 could not play it, could not decline it, and
 * spent the request's whole 30-second timeout looking at an amazing-grace box
 * it had already taken its card from. Measured over one audited game: three
 * consecutive nullification asks, 29.5s, 30.0s and 30.2s, every click landing
 * on the overlay.
 *
 * QML keeps the two apart by construction: the board is `manualBox`, a floating
 * `GraphicsBox` (`RoomLogic.js:1453`), and the request dialogs are `popupBox`.
 * Both are on screen at once when both apply.
 */
export function DialogHost({ onReply, interactive }: DialogHostProps) {
  const state = useRoomState();
  if (state.gameOver) return <GameOverBox winner={state.gameOver} />;
  // The request first, so the modal is the first `.fk-dialog` in the document
  // for anything reading "what is this seat being asked" out of the DOM. Which
  // of the two is on top is settled by `z-index` (40 over 30), not by order.
  return (
    <>
      <RequestDialog onReply={onReply} interactive={interactive} />
      {state.ag ? <AgBox onReply={onReply} interactive={interactive} /> : null}
    </>
  );
}

function RequestDialog({ onReply, interactive }: DialogHostProps) {
  const state = useRoomState();
  const req = state.request;
  if (req.kind !== 'dialog') return null;

  switch (req.command) {
    case 'AskForGeneral': return <ChooseGeneralBox data={req.data} onReply={onReply} interactive={interactive} />;
    case 'AskForGuanxing': return <ArrangeBox data={req.data} onReply={onReply} interactive={interactive} kind="guanxing" />;
    case 'AskForArrangeCards': return <ArrangeBox data={req.data} onReply={onReply} interactive={interactive} kind="arrange" />;
    case 'AskForExchange': return <ExchangeBox data={req.data} onReply={onReply} interactive={interactive} />;
    case 'AskForCardChosen': return <PlayerCardBox data={req.data} onReply={onReply} interactive={interactive} multi={false} />;
    case 'AskForCardsChosen': return <PlayerCardBox data={req.data} onReply={onReply} interactive={interactive} multi />;
    case 'AskForChoice': return <ChoiceBox data={req.data} onReply={onReply} interactive={interactive} multi={false} />;
    case 'AskForChoices': return <ChoiceBox data={req.data} onReply={onReply} interactive={interactive} multi />;
    case 'AskForPoxi': return <PoxiBox data={req.data} onReply={onReply} interactive={interactive} />;
    case 'AskForAG':
      // Normally `FillAG` has already built `state.ag` and `DialogHost` is
      // drawing the board; this is the case where the ask arrives without a
      // fill, which leaves the seat nothing to pick from.
      return state.ag ? null : <UnknownRequest command={req.command} data={req.data} />;
    default:
      return <UnknownRequest command={req.command} data={req.data} />;
  }
}

/* --------------------------------------------------------- choose general */

/**
 * 选将. Which generals are offered, whether a pick is legal and whether the set
 * is finished are all the engine's answers (`ChooseGeneralFilter` /
 * `ChooseGeneralFeasible`); the box picks nothing for itself.
 *
 * READING BEFORE PICKING. A player choosing between three names they have never
 * seen is guessing, and with a 319-general pool that is nearly always. Every
 * card therefore carries a ⓘ badge, and there is a `Show General Detail` button
 * for whatever is selected — the same two routes `ChooseGeneralBox.qml` offers.
 * Both open `<GeneralDetail>`, which is read-only and can page across the whole
 * offer, so the shortlist is read in one sitting rather than one box at a time.
 *
 * The detail box lives in local state, next to `picked` and torn down with it.
 * That matters more than it looks: this component unmounts the moment the
 * request is answered (`RequestDialog` returns null once `state.request` is no
 * longer a dialog), so there is no path where the popup outlives the question
 * it was opened from, and nothing about it can leave a request live after a
 * reply. It also never calls `onReply`, so it cannot answer one either.
 */
function ChooseGeneralBox(
  { data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean },
) {
  const { lua } = useRoom();
  const state = useRoomState();
  const [generals, n, , heg, rule, extra] = data as [string[], number?, boolean?, boolean?, string?, unknown?];
  const count = n ?? 1;
  const ruleName = rule ?? (heg ? 'heg_general_choose' : 'askForGeneralsChosen');
  const extraData = extra ?? { n: count };
  const [picked, setPicked] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);

  /**
   * The offer, which is normally the engine's and under free assign is the
   * engine's with slots substituted.
   *
   * `FreeAssign.qml:135` does the identical thing by mutating the offered
   * card's `name` in place, and `ChooseGeneralBox.qml:219` then reads `choices`
   * back off the *current* names. Holding the offer in state rather than
   * reading the prop straight through is what lets a substitution behave like
   * any other card: the same `ChooseGeneralFilter` and `ChooseGeneralFeasible`
   * see it, and the reply is still the array of names the QML would send.
   *
   * Keyed on the wire's own array so a *new* question resets it. Two
   * `AskForGeneral`s in one game is not hypothetical — 国战 asks again on a
   * change of generals — and a stale substitution would answer the second
   * question with the first one's picks.
   */
  const [swapped, setSwapped] = useState<{ key: readonly string[]; offer: string[] } | null>(null);
  const offer = swapped && swapped.key === generals ? swapped.offer : generals;
  /** Which slot the free-assign box is open for; -1 for closed. */
  const [assigning, setAssigning] = useState(-1);
  const freeAssign = freeAssignEnabled(state.settings);

  const prompt = lua.chooseGeneralPrompt(ruleName, offer, extraData) || '#AskForGeneral';
  const feasible = lua.chooseGeneralFeasible(ruleName, picked, offer, extraData);

  const toggle = (g: string) => {
    if (picked.includes(g)) { setPicked(picked.filter((x) => x !== g)); return; }
    if (!lua.chooseGeneralFilter(ruleName, g, picked, offer, extraData)) return;
    setPicked(picked.length >= count ? [...picked.slice(1), g] : [...picked, g]);
  };

  /** Put `g` in slot `i`, and carry the selection across if that slot was
   *  picked — otherwise choosing your general would silently unpick it. */
  const assign = (i: number, g: string) => {
    const was = offer[i];
    const next = offer.slice();
    next[i] = g;
    setSwapped({ key: generals, offer: next });
    setPicked((p) => (p.includes(was) ? p.map((x) => (x === was ? g : x)) : p));
    setAssigning(-1);
  };

  return (
    <>
      <Dialog
        // `ChooseGeneralBox.qml:29` appends the same suffix, and it is the only
        // thing that tells a player this room is not a normal one.
        title={freeAssign ? `${lua.tr('#AskForGeneral')} (${lua.tr('Enable free assign')})` : lua.tr('#AskForGeneral')}
        prompt={prompt === '#AskForGeneral' ? undefined : lua.tr(prompt)}
        actions={<>
          {/* `ChooseGeneralBox.qml:123` — enabled once something is selected,
              and deliberately NOT primary: the audit driver and every player
              read the primary button in a request dialog as "answer it". */}
          <Btn disabled={!picked.length} onClick={() => setDetail(picked[picked.length - 1] ?? null)}>
            {lua.tr('Show General Detail')}
          </Btn>
          <Btn primary disabled={!interactive || !feasible} onClick={() => onReply(picked)}>{lua.tr('OK')}</Btn>
        </>}
      >
        {/* The offer is whatever the mode hands over — three in 身份, the whole
            of a 319-general pool under free assign. The grid scrolls inside the
            box so a long one cannot push OK off the bottom of the screen. */}
        <div className="fk-generals" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {offer.map((g, i) => (
            <GeneralCard
              key={`${i}:${g}`}
              name={g}
              selected={picked.includes(g)}
              onClick={interactive ? () => toggle(g) : undefined}
              // Not gated on `interactive`: an observer and a replay viewer want
              // to read a general's skills as much as the seat picking one does,
              // and reading answers nothing.
              onDetail={() => setDetail(g)}
              // Gated on both the room's setting and on actually holding this
              // seat: an observer has nothing to assign.
              onSwap={freeAssign && interactive ? () => setAssigning(i) : undefined}
            />
          ))}
        </div>
      </Dialog>
      {assigning >= 0 && offer[assigning] !== undefined ? (
        <FreeAssign
          current={offer[assigning]}
          offer={offer}
          onPick={(g) => assign(assigning, g)}
          onClose={() => setAssigning(-1)}
        />
      ) : null}
      {detail ? (
        <GeneralDetail
          name={detail}
          pool={offer}
          onShow={setDetail}
          selected={picked.includes(detail)}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </>
  );
}

/* --------------------------------------------- guanxing / arrange cards */

interface ArrangePayload {
  cards?: number[][];
  prompt?: string;
  is_free?: boolean;
  min_top_cards?: number; max_top_cards?: number;
  min_bottom_cards?: number; max_bottom_cards?: number;
  top_area_name?: string; bottom_area_name?: string;
  capacities?: number[]; limits?: number[]; names?: string[];
  cancelable?: boolean;
}

/**
 * `GuanxingBox.qml` / `ArrangeCardsBox.qml`. Both are the same widget: n zones
 * with a capacity and a minimum, and a reply of `[[cid…], [cid…]]`.
 *
 * Click-to-move rather than drag-and-drop — it works on a tablet and it makes
 * the reply order explicit, which is the whole point of guanxing.
 */
function ArrangeBox(
  { data, onReply, interactive, kind }:
  { data: unknown; onReply: (v: unknown) => void; interactive: boolean; kind: 'guanxing' | 'arrange' },
) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const d = data as ArrangePayload;
  const rows = d.cards ?? [];

  const { names, capacities, limits } = useMemo(() => {
    if (kind === 'arrange') {
      return {
        names: (d.names ?? []).map((x) => lua.tr(x)),
        capacities: d.capacities ?? rows.map((c) => c.length),
        limits: d.limits ?? rows.map(() => 0),
      };
    }
    // `RoomLogic.js:861` collapses a zero-capacity half away.
    const maxTop = d.max_top_cards ?? 0;
    const maxBottom = d.max_bottom_cards ?? 0;
    if (maxTop === 0) {
      return { names: [lua.tr(d.bottom_area_name ?? 'Bottom')], capacities: [maxBottom], limits: [d.min_bottom_cards ?? 0] };
    }
    if (maxBottom === 0) {
      return { names: [lua.tr(d.top_area_name ?? 'Top')], capacities: [maxTop], limits: [d.min_top_cards ?? 0] };
    }
    return {
      names: [lua.tr(d.top_area_name ?? 'Top'), lua.tr(d.bottom_area_name ?? 'Bottom')],
      capacities: [maxTop, maxBottom],
      limits: [d.min_top_cards ?? 0, d.min_bottom_cards ?? 0],
    };
  }, [data]);

  const [zones, setZones] = useState<number[][]>(() => {
    const initial = names.map((_, i) => [...(rows[i] ?? [])]);
    return initial.length ? initial : [[...rows.flat()]];
  });

  const move = (from: number, cid: number, to: number) => {
    if (from === to) return;
    if (zones[to].length >= (capacities[to] ?? 99)) return;
    setZones(zones.map((z, i) => (i === from ? z.filter((c) => c !== cid) : i === to ? [...z, cid] : z)));
  };
  const shift = (zone: number, cid: number, delta: number) => {
    const z = [...zones[zone]];
    const i = z.indexOf(cid);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= z.length) return;
    [z[i], z[j]] = [z[j], z[i]];
    setZones(zones.map((x, k) => (k === zone ? z : x)));
  };

  // The zone minimums are the request's own arity, stated in its payload.
  const ok = zones.every((z, i) => z.length >= (limits[i] ?? 0) && z.length <= (capacities[i] ?? 99));

  return (
    <Dialog
      title={lua.tr(kind === 'guanxing' ? 'AskForGuanxing' : 'AskForArrangeCards')}
      prompt={d.prompt ? prompt(d.prompt) : undefined}
      actions={<>
        {d.cancelable ? <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn> : null}
        <Btn primary disabled={!interactive || !ok} onClick={() => onReply(zones)}>{lua.tr('OK')}</Btn>
      </>}
    >
      <div className="fk-dialog__row">
        {zones.map((z, zi) => (
          <div className="fk-zone" key={zi}>
            <div className="fk-zone__title">
              {names[zi] ?? `#${zi + 1}`} — {z.length}/{capacities[zi] ?? '∞'}
              {limits[zi] ? ` (\u2265 ${limits[zi]})` : ''}
            </div>
            <div className="fk-zone__cards">
              {z.map((cid) => (
                <div key={cid} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <CardItem cid={cid} known />
                  {interactive ? (
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <button type="button" className="fk-chip" onClick={() => shift(zi, cid, -1)}>◀</button>
                      {zones.length > 1 ? (
                        <button type="button" className="fk-chip" onClick={() => move(zi, cid, (zi + 1) % zones.length)}>⇄</button>
                      ) : null}
                      <button type="button" className="fk-chip" onClick={() => shift(zi, cid, 1)}>▶</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function ExchangeBox({ data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean }) {
  const d = data as { piles?: number[][]; piles_name?: string[] };
  const piles = d.piles ?? [];
  return (
    <ArrangeBox
      kind="arrange"
      interactive={interactive}
      onReply={onReply}
      data={{
        cards: piles,
        names: d.piles_name ?? [],
        capacities: piles.map((p) => p.length),
        limits: piles.map(() => 0),
      } satisfies ArrangePayload}
    />
  );
}

/* -------------------------------------------------------- player cards */

function PlayerCardBox(
  { data, onReply, interactive, multi }:
  { data: unknown; onReply: (v: unknown) => void; interactive: boolean; multi: boolean },
) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const d = data as {
    _id: number; _reason: string; _prompt: string; _min?: number; _max?: number;
    card_data?: [string, number[]][];
    visible_data?: Record<string, boolean>;
  };
  const zones = d.card_data ?? [];
  const [picked, setPicked] = useState<number[]>([]);
  const min = d._min ?? 1;
  const max = d._max ?? 1;

  const toggle = (cid: number) => {
    if (!multi) { onReply(cid); return; }
    setPicked(picked.includes(cid)
      ? picked.filter((c) => c !== cid)
      : picked.length >= max ? picked : [...picked, cid]);
  };

  const header = d._prompt
    ? prompt(d._prompt)
    : `${lua.tr('$ChooseCard')} — ${lua.tr(d._reason)}`;

  return (
    <Dialog
      title={lua.tr(d._reason || '$ChooseCard')}
      prompt={header}
      actions={multi
        ? <Btn primary disabled={!interactive || picked.length < min} onClick={() => onReply(picked)}>{lua.tr('OK')}</Btn>
        : undefined}
    >
      {zones.map(([area, ids]) => (
        <div className="fk-zone" key={area} style={{ marginBottom: 8 }}>
          <div className="fk-zone__title">{lua.tr(area)}</div>
          <div className="fk-zone__cards">
            {ids.map((cid) => (
              <div
                key={cid}
                className={cls(picked.includes(cid) && 'fk-card--selected')}
                onClick={interactive ? () => toggle(cid) : undefined}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
              >
                <CardItem cid={cid} known={d.visible_data?.[String(cid)] !== false} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Dialog>
  );
}

/* -------------------------------------------------------------- choices */

function ChoiceBox(
  { data, onReply, interactive, multi }:
  { data: unknown; onReply: (v: unknown) => void; interactive: boolean; multi: boolean },
) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const [choices, allChoices, a, b, c, e] = data as [string[], string[], unknown, unknown, unknown, unknown];
  const skillName = multi ? String(e ?? '') : String(a ?? '');
  const promptKey = multi ? String((data as unknown[])[5] ?? '') : String(b ?? '');
  const range = multi ? ((data as unknown[])[2] as [number, number]) : [1, 1];
  const cancelable = multi ? Boolean((data as unknown[])[3]) : false;
  void c;
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (choice: string) => {
    if (!multi) { onReply(choice); return; }
    setPicked(picked.includes(choice) ? picked.filter((x) => x !== choice) : [...picked, choice]);
  };

  return (
    <Dialog
      title={lua.tr('$Choice').replace('%1', lua.tr(skillName))}
      prompt={promptKey ? prompt(promptKey) : undefined}
      actions={multi ? <>
        {cancelable ? <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn> : null}
        <Btn primary disabled={!interactive || picked.length < range[0] || picked.length > range[1]} onClick={() => onReply(picked)}>
          {lua.tr('OK')}
        </Btn>
      </> : undefined}
    >
      <div className="fk-dialog__row">
        {(allChoices ?? choices).map((choice) => (
          <Btn
            key={choice}
            primary={picked.includes(choice)}
            disabled={!interactive || !choices.includes(choice)}
            onClick={() => toggle(choice)}
          >{lua.tr(choice)}</Btn>
        ))}
      </div>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- poxi */

function PoxiBox({ data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean }) {
  const { lua } = useRoom();
  const d = data as { type: string; data?: [string, number[]][]; extra_data: unknown; cancelable?: boolean };
  const zones = d.data ?? [];
  const [picked, setPicked] = useState<number[]>([]);

  /**
   * What this seat may actually see.
   *
   * `Room:askToChooseCards` writes `visible_data[id] = false` for every card
   * the chooser cannot see and hands it over inside `extra_data`
   * (`lua/lunarltk/server/room.lua:1364-1372`). The engine reads the same map
   * back when it renders a log line (`lunarltk/client/client.lua:158`), the Qt
   * client reads it to decide `known` (`PoxiBox.qml:77-81`), and
   * `PlayerCardBox` above reads its own copy of it. This panel did not, and
   * drew every card face-up.
   *
   * It is not a corner: `askToChooseCards` sends `AskForPoxi` with
   * `poxi_type = "AskForCardsChosen"`, so every multi-card steal in the game
   * arrives here. A player picking two cards out of an opponent's hand could
   * read both of them first.
   */
  const visible = (typeof d.extra_data === 'object' && d.extra_data !== null
    ? (d.extra_data as { visible_data?: Record<string, boolean> }).visible_data
    : undefined);

  // Both the prompt and the legality of a pick are the engine's answer.
  const promptText = lua.poxiPrompt(d.type, zones, d.extra_data);
  const feasible = lua.poxiFeasible(d.type, picked, zones, d.extra_data);

  const toggle = (cid: number) => {
    if (picked.includes(cid)) { setPicked(picked.filter((c) => c !== cid)); return; }
    if (!lua.poxiFilter(d.type, cid, picked, zones, d.extra_data)) return;
    setPicked([...picked, cid]);
  };

  return (
    <Dialog
      title={lua.tr(d.type)}
      prompt={promptText ? lua.tr(promptText) : undefined}
      actions={<>
        {d.cancelable ? <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn> : null}
        <Btn primary disabled={!interactive || !feasible} onClick={() => onReply(picked)}>{lua.tr('OK')}</Btn>
      </>}
    >
      {zones.map(([area, ids]) => (
        <div className="fk-zone" key={area} style={{ marginBottom: 8 }}>
          <div className="fk-zone__title">{lua.tr(area)}</div>
          <div className="fk-zone__cards">
            {ids.map((cid) => (
              <div
                key={cid}
                className={cls(picked.includes(cid) && 'fk-card--selected')}
                onClick={interactive ? () => toggle(cid) : undefined}
              >
                <CardItem cid={cid} known={visible?.[String(cid)] !== false} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Dialog>
  );
}

/* ------------------------------------------------------- amazing grace */

function AgBox({ onReply, interactive }: { onReply: (v: unknown) => void; interactive: boolean }) {
  const { lua } = useRoom();
  const state = useRoomState();
  const ag = state.ag!;
  /**
   * Whether this seat is the one being asked, right now.
   *
   * `AG.qml:41` drops `root.interactive` on the click itself, before the server
   * has said anything back. `state.ag.interactive` cannot do that job on its
   * own: it is raised by `AskForAG` and only lowered by `TakeAG`, which is the
   * host's echo of the answer and arrives whenever it arrives — 60 seconds
   * later in one measured game, all of it spent looking at a board whose cards
   * still looked pickable. The room's own record of the open request is lowered
   * on every edge that ends one, the reply included (`RoomStore.closeRequest`),
   * so asking it is the same question QML asks and gets the same answer sooner.
   */
  const asked = state.request.kind === 'dialog' && state.request.command === 'AskForAG';
  return (
    <Panel title={lua.tr('Please choose cards')}>
      <div className="fk-ag">
        {ag.ids.map((cid) => {
          const taker = ag.taken[cid];
          const pickable = interactive && asked && ag.interactive
            && taker == null && !ag.disabled.includes(cid);
          return (
            /* One handler, on the slot. It used to be on the slot *and* on the
               card inside it, so every click bubbled through both and sent the
               answer twice — 70 of 270 replies in an audited run, identical
               payload, same millisecond, every one of them an `AskForAG`. The
               slot is the right one of the two to keep: it is the whole click
               target, footnote included, and it does not depend on `CardItem`
               finding face data for the id. */
            <div className="fk-ag__slot" key={cid} onClick={pickable ? () => onReply(cid) : undefined}>
              <CardItem cid={cid} known item={{ id: cid, enabled: pickable, selected: false }} />
              {taker != null ? (
                <span className="fk-ag__taker">{lua.tr(state.players[taker]?.general ?? String(taker))}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------- results */

function GameOverBox({ winner }: { winner: string }) {
  const { lua } = useRoom();
  const state = useRoomState();
  const winners = winner.split('+');
  return (
    <Dialog title={lua.tr('$GameOver')}>
      <div className="fk-gameover__winner">{winners.map((w) => lua.tr(w)).join(' / ')}</div>
      <div className="fk-gameover__list">
        {state.circle.map((pid) => {
          const p = state.players[pid];
          if (!p) return null;
          const won = winners.includes(p.role) || winner === 'draw';
          return (
            <div key={pid} className={cls('fk-gameover__row', won ? 'fk-gameover__row--won' : 'fk-gameover__row--lost')}>
              <span style={{ width: 26 }}>{p.seat}</span>
              <span style={{ width: 90 }}>{lua.tr(p.general || p.screenName)}</span>
              <span style={{ width: 70 }}>{lua.tr(p.role)}</span>
              <span>{lua.tr(won ? 'Game Win' : 'Game Lose')}</span>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

/**
 * A request type the room has no dialog for. The spec calls this out as a thing
 * to report rather than paper over, so it renders the payload instead of an
 * empty box.
 */
function UnknownRequest({ command, data }: { command: string; data: unknown }) {
  return (
    <Dialog title={command} prompt="No dialog is implemented for this request type.">
      <pre style={{ maxWidth: 640, whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(data, null, 2)}</pre>
    </Dialog>
  );
}
