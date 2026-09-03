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
import { describe, fillArgs } from '../ltk/prompt';
import { moveOut, shift, tap, zoneWithRoom, type ArrangeState } from './arrange';
import { componentName, readCustomDialog } from './custom';
import { CustomDialogBox, customPanelFor } from './CustomDialogs';
import { FreeAssign, freeAssignEnabled } from './FreeAssign';
import { GeneralDetail } from './GeneralDetail';
import { conversionsFor, SameConvert } from './SameConvert';
import { Btn, Dialog, GeneralCard, OptionBtn, Panel, useAskingSkill } from './parts';

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
    case 'AskForCardsAndChoice': return <CardsAndChoiceBox data={req.data} onReply={onReply} interactive={interactive} />;
    case 'AskForMoveCardInBoard': return <MoveInBoardBox data={req.data} onReply={onReply} interactive={interactive} />;
    case 'CustomDialog': return <CustomRequest data={req.data} onReply={onReply} interactive={interactive} />;
    case 'AskForAG':
      // Normally `FillAG` has already built `state.ag` and `DialogHost` is
      // drawing the board; this is the case where the ask arrives without a
      // fill, which leaves the seat nothing to pick from.
      return state.ag ? null : <UnsupportedRequest command={req.command} onReply={onReply} interactive={interactive} />;
    default:
      return <UnsupportedRequest command={req.command} onReply={onReply} interactive={interactive} />;
  }
}

/**
 * `CustomDialog` — the request that names its own widget.
 *
 * The panels live in `./CustomDialogs`, one per QML component, and `./custom`
 * reads the payload. Both shapes of it: `askToCustomDialog` sends `{path, data}`
 * and 盗书 posts `{component}` itself. What lands here is either a component we
 * have read the `.qml` for, or an honest refusal.
 */
function CustomRequest(
  { data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean },
) {
  const spec = readCustomDialog(data);
  if (spec && customPanelFor(spec.path)) {
    return <CustomDialogBox spec={spec} onReply={onReply} interactive={interactive} />;
  }
  return (
    <UnsupportedRequest
      command="CustomDialog"
      // Name the component rather than the command: "CustomDialog is not
      // supported" is true of nothing, since six of them are.
      what={spec ? componentName(spec.path) : undefined}
      onReply={onReply}
      interactive={interactive}
    />
  );
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
  const [generals, n, noConvert, heg, rule, extra] =
    data as [string[], number?, boolean?, boolean?, string?, unknown?];
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

  /**
   * 替换武将 — the other printings of the men on offer.
   *
   * `no_convert` is `data[2]`, and it was being destructured past and dropped.
   * It defaults to false server-side (`room.lua:1192`), so this is offered on
   * an ordinary deal and not only in 国战; see `SameConvert.tsx`. The button is
   * shown only when something on offer actually has an alternative, which is
   * what `ChooseGeneralBox.qml:292-299` computes to enable it.
   */
  const [converting, setConverting] = useState(false);
  const conversions = useMemo(
    () => (noConvert ? [] : conversionsFor(lua, offer)),
    [lua, offer, noConvert],
  );

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
          {/*
            THE DOOR TO THE WHOLE ROSTER, WITH A LABEL ON IT.

            `FreeAssign` has been reachable since it was built, but only through
            a 26px ⇄ badge in the corner of a card — and the room's own host
            could not find it. A corner glyph is a shortcut for someone who
            already knows the feature exists; it is not how you tell a player
            that this room lets them play anybody. `ChooseGeneralBox.qml` has
            the same problem and knows it: free assign is a right-click there,
            and the setting's own help string has to explain the gesture
            ("启用后在选将界面长按或右键武将牌").

            So the badge stays as the per-card shortcut and this is the way in:
            a named button, in the row a player is already reading because OK is
            in it. It opens the search panel on whatever is selected — or on the
            first card when nothing is, which is the slot a single-pick offer
            would have replaced anyway.
          */}
          {freeAssign && interactive ? (
            <Btn
              onClick={() => {
                const at = offer.indexOf(picked[picked.length - 1] ?? '');
                setAssigning(at >= 0 ? at : 0);
              }}
            >{lua.tr('Enable free assign')}</Btn>
          ) : null}
          {/* `ChooseGeneralBox.qml:119` puts it in this row too, beside
              `Show General Detail`, and hides rather than disables it when
              nothing on offer has another printing. */}
          {conversions.length > 0 && interactive ? (
            <Btn onClick={() => setConverting(true)}>{lua.tr('Same General Convert')}</Btn>
          ) : null}
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
      {converting ? (
        <SameConvert
          offer={offer}
          // Straight into the same substitution free assign uses: one slot, one
          // name, and the selection carried across if that slot was picked.
          onPick={(from, to) => {
            const at = offer.indexOf(from);
            if (at >= 0) assign(at, to);
            setConverting(false);
          }}
          onClose={() => setConverting(false)}
        />
      ) : null}
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
 *
 * TWO CLICKS ARE THE DRAG. QML offers one gesture that means two things: drop a
 * card on a slot in a zone with room and it moves there, drop it on a slot in a
 * zone that is full and the two cards trade places (`updateCardReleased`; see
 * `./arrange`). Without the second of those, every zone in 星魂's box is at
 * capacity the moment it opens and no card can go anywhere — which is what
 * 神姜维 shipped with. So a card is picked up by clicking it and put down by
 * clicking where it goes, and `place()` decides which of the two that is,
 * exactly as the drag does. ◀ ▶ stay for fine ordering and ⇄ stays as the
 * one-click move for the common guanxing case, where the far zone starts empty.
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

  // The arrangement and the card picked up out of it, moved only by the three
  // functions in `./arrange` — so what this box lets a player do is one small
  // pure module that can be measured against the QML it came from.
  const [{ zones, picked }, setState] = useState<ArrangeState>(() => {
    const initial = names.map((_, i) => [...(rows[i] ?? [])]);
    return { zones: initial.length ? initial : [[...rows.flat()]], picked: null };
  });

  // The zone minimums are the request's own arity, stated in its payload.
  const ok = zones.every((z, i) => z.length >= (limits[i] ?? 0) && z.length <= (capacities[i] ?? 99));

  return (
    <Dialog
      title={lua.tr(kind === 'guanxing' ? 'AskForGuanxing' : 'AskForArrangeCards')}
      prompt={d.prompt ? prompt(d.prompt) : undefined}
      // The gesture, said out loud: two clicks are not guessable from a card.
      detail={interactive ? lua.tr('Please click to move card') : undefined}
      actions={<>
        {d.cancelable ? <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn> : null}
        <Btn primary disabled={!interactive || !ok} onClick={() => onReply(zones)}>{lua.tr('OK')}</Btn>
      </>}
    >
      <div className="fk-dialog__row">
        {zones.map((z, zi) => {
          // Where ⇄ would send a card out of this zone, if anywhere can take one.
          const dest = zones.length > 1 ? zoneWithRoom(zones, capacities, zi) : null;
          return (
            <div className="fk-zone" key={zi}>
              <div className="fk-zone__title">
                {names[zi] ?? `#${zi + 1}`} — {z.length}/{capacities[zi] ?? '∞'}
                {limits[zi] ? ` (≥ ${limits[zi]})` : ''}
              </div>
              <div className="fk-zone__cards">
                {z.map((cid) => (
                  // The slot, not the card: `fk-card--selected` on the wrapper is
                  // how `PlayerCardBox` marks a pick too, and how the audit probe
                  // reads one back off a zone (`scripts/audit/probe.mjs:862`).
                  <div
                    key={cid}
                    className={cls('fk-zone__slot', picked === cid && 'fk-card--selected')}
                    style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                  >
                    <div
                      onClick={interactive ? () => setState((s) => tap(s, capacities, cid)) : undefined}
                      style={{ cursor: interactive ? 'pointer' : 'default' }}
                    >
                      <CardItem cid={cid} known />
                    </div>
                    {interactive ? (
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <button type="button" className="fk-chip" onClick={() => setState((s) => shift(s, cid, -1))}>◀</button>
                        {dest !== null ? (
                          <button type="button" className="fk-chip" onClick={() => setState((s) => moveOut(s, capacities, cid, dest))}>⇄</button>
                        ) : null}
                        <button type="button" className="fk-chip" onClick={() => setState((s) => shift(s, cid, 1))}>▶</button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
  const state = useRoomState();
  const d = data as {
    _id: number; _reason: string; _prompt: string; _min?: number; _max?: number;
    card_data?: [string, number[]][];
    visible_data?: Record<string, boolean>;
  };
  const zones = d.card_data ?? [];
  /* `_id` is whose cards these are. It arrived on every payload and was read
     off it here from the start, but nothing ever rendered it, so a box opened
     by 42 of the 52 skills that use one asked you to take a card from nobody
     in particular. Named the same way the amazing-grace taker is below. */
  const target = d._id == null ? null : lua.tr(state.players[d._id]?.general ?? String(d._id));
  const [picked, setPicked] = useState<number[]>([]);
  const min = d._min ?? 1;
  const max = d._max ?? 1;

  const toggle = (cid: number) => {
    if (!multi) { onReply(cid); return; }
    setPicked(picked.includes(cid)
      ? picked.filter((c) => c !== cid)
      : picked.length >= max ? picked : [...picked, cid]);
  };

  /**
   * The question, built the way `RoomLogic.js:1010` builds it.
   *
   * QML sends `Lua.tr(processPrompt("#AskForChooseCard:" + data._id))
   * .arg(Lua.tr(reason))` — the target goes in through `%src` and the skill
   * through `%1`, giving "过河拆桥：请选择 貂蝉 的一张卡牌". This box used to
   * write its own `"$ChooseCard — <reason>"`, which is a sentence the engine
   * never wrote, names the skill twice once the title is counted, and — before
   * `card-chosen-target` — named nobody at all.
   *
   * `$ChooseCards` takes the range instead, for the multi-pick box
   * (`PlayerCardBox.qml:14`).
   */
  const header = d._prompt
    ? prompt(d._prompt)
    : fillArgs(prompt(`#AskForChooseCard:${d._id}`), lua.tr(d._reason));
  const title = multi
    ? fillArgs(lua.tr('$ChooseCards'), String(min), String(max))
    : lua.tr('$ChooseCard');

  return (
    <Dialog
      title={target ? `${title} — ${target}` : title}
      prompt={header}
      // What the skill reaching into this hand actually does.
      detail={describe(lua, d._reason)}
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

/**
 * `AskForChoice` / `AskForChoices` — `ChoiceBox.qml`, `CheckBox.qml` and their
 * `Detailed*` siblings. The single most-used dialog in the game, and the one
 * that leaked the most identifiers.
 *
 * THREE FAULTS, ALL VISIBLE TO A PLAYER, ALL FIXED HERE.
 *
 * 1. THE OPTIONS WERE NOT FORMATTED. Every one of the four QML boxes renders an
 *    option through `Util.processPrompt` (`ChoiceBox.qml:33`,
 *    `CheckBox.qml:37`); this box used `tr()`. `tr` does not split on `:`, so
 *    an option a skill built as `"key::"..pid..":"..n` — the ordinary way to
 *    say "give 甄姬 two cards" — reached the button face as the literal string
 *    `key::5:2`. The panel survey counted 39 skills whose options carry
 *    arguments; every one of them printed a colon-string.
 *
 * 2. THE TITLE READ THE WRONG FIELD. `AskForChoices` sends
 *    `[choices, all, [min,max], cancelable, skill, prompt, detailed]`
 *    (`RoomLogic.js:962-972`): the skill is index 4 and the prompt is index 5.
 *    This box put index 5 in `$Choice`'s `%1`, so a multi-choice panel was
 *    headed by a raw prompt key — `#qusheng_3_prompt：请选择` — instead of by
 *    the skill that raised it.
 *
 * 3. NOTHING SAID WHAT AN OPTION DID. Upstream keeps that behind the `detailed`
 *    flag, which arrives false for most skills. The text is the engine's and
 *    costs one lookup (`ltk/prompt.ts:describe`), so it is drawn whenever it
 *    exists — see `OptionBtn`.
 *
 * The reply is unchanged and must stay so: the option's own untranslated
 * string, which is what `all_choices[box.result]` sends.
 */
function ChoiceBox(
  { data, onReply, interactive, multi }:
  { data: unknown; onReply: (v: unknown) => void; interactive: boolean; multi: boolean },
) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const d = data as unknown[];
  const choices = (d[0] ?? []) as string[];
  const allChoices = (d[1] ?? choices) as string[];
  // `RoomLogic.js:931` for the single, `:962` for the multi. The two payloads
  // agree on 0 and 1 and on nothing else, which is what item 2 above was.
  const skillName = String((multi ? d[4] : d[2]) ?? '');
  const promptKey = String((multi ? d[5] : d[3]) ?? '');
  // `[min, max]`. Defended because a payload that omits it would otherwise
  // read `undefined[0]` and take the whole table down mid-request.
  const bounds = (multi ? d[2] : undefined) as [number, number] | undefined;
  const range: [number, number] = Array.isArray(bounds) ? bounds : [1, 1];
  const cancelable = multi ? Boolean(d[3]) : false;
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (choice: string) => {
    if (!multi) { onReply(choice); return; }
    setPicked(picked.includes(choice) ? picked.filter((x) => x !== choice) : [...picked, choice]);
  };

  return (
    <Dialog
      title={fillArgs(lua.tr('$Choice'), lua.tr(skillName))}
      prompt={promptKey ? prompt(promptKey) : undefined}
      // The skill that raised the question, in its own words. `#AskForChoice`
      // names it and nothing else, so without this a player who does not
      // already know the general is choosing between two-character allusions.
      detail={describe(lua, skillName)}
      actions={multi ? <>
        {cancelable ? <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn> : null}
        <Btn primary disabled={!interactive || picked.length < range[0] || picked.length > range[1]} onClick={() => onReply(picked)}>
          {lua.tr('OK')}
        </Btn>
      </> : undefined}
    >
      <div className="fk-dialog__row">
        {allChoices.map((choice, i) => (
          <OptionBtn
            // `all_options` is a list, not a set: 拼点-style skills legitimately
            // offer the same option twice and index alone is what tells them
            // apart. The reply is still the string, as QML's `result` index is.
            key={`${i}:${choice}`}
            label={prompt(choice)}
            detail={describe(lua, choice)}
            selected={picked.includes(choice)}
            disabled={!interactive || !choices.includes(choice)}
            onClick={() => toggle(choice)}
          />
        ))}
      </div>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- poxi */

function PoxiBox({ data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean }) {
  const { lua } = useRoom();
  const prompt = usePrompt();
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

  /**
   * The heading, and why it must go through `processPrompt`.
   *
   * `PoxiPrompt` is `Fk:translate(poxi.prompt(data, extra_data))`
   * (`client_util.lua:1061`) — and a poxi method's `prompt` returns a string
   * that is *already translated and then has arguments appended*. The standard
   * one ends `return ret .. ":" .. extra_data.to` (`aux_poxi.lua`), so what
   * comes back is `"求索：请选择%src的2至3张卡牌:5"`: `Fk:translate` cannot
   * match that as a key and hands it straight back.
   *
   * `PoxiBox.qml:13` therefore runs `Util.processPrompt` on it, which splits the
   * trailing `:5` off, translates the head (a no-op — it is already prose) and
   * puts the player's name where `%src` is. This box ran `tr()` instead, which
   * does none of that: the panel every multi-card steal in the game opens was
   * headed by a literal `%src` and a dangling player id.
   */
  const promptText = prompt(lua.poxiPrompt(d.type, zones, d.extra_data));
  const feasible = lua.poxiFeasible(d.type, picked, zones, d.extra_data);

  const toggle = (cid: number) => {
    if (picked.includes(cid)) { setPicked(picked.filter((c) => c !== cid)); return; }
    if (!lua.poxiFilter(d.type, cid, picked, zones, d.extra_data)) return;
    setPicked([...picked, cid]);
  };

  return (
    <Dialog
      title={lua.tr(d.type)}
      prompt={promptText || undefined}
      // A poxi type is a skill name — `zhenxing`, `changshi__kuiji` — so the
      // engine has a paragraph saying what taking these cards is for.
      detail={describe(lua, d.type)}
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

/* ------------------------------------------------- see cards, then decide */

interface CardsAndChoicePayload {
  cards?: number[];
  choices?: string[];
  cancel_choices?: string[];
  disabled?: number[];
  min?: number;
  max?: number;
  prompt?: string;
  filter_skel?: string;
  extra_data?: unknown;
}

/**
 * `AskForCardsAndChoice` — `ChooseCardsAndChoiceBox.qml`. Look at some cards,
 * then say what you want to do about them.
 *
 * THIS PANEL DID NOT EXIST, AND THAT WAS A HANG, NOT A GAP. `DialogHost` had no
 * case for the command, so the room fell through to the unsupported box — a JSON
 * dump with no buttons at all. `scripts/audit/catalogue.mjs` records the
 * consequence in the campaign log as a liveness FAIL: "SENT AND UNANSWERABLE".
 * Four mobile generals reach it (m_shi__xinxianying, m_sp__simazhao, ruanhui,
 * mobile__chengui), and every time one did, the seat sat looking at a payload
 * for the full 30-second timeout while the engine picked for it.
 *
 * THE SHAPE, off `Room:askToChooseCardsAndChoice` (`room.lua:953`):
 *
 *   cards           what to show. `all_cards` when the skill sent one, so some
 *                   of them may be unselectable — those are in `disabled`.
 *   choices         the "and now do this" buttons. Defaults to `{"OK"}`, and
 *                   `default_choice` is spliced in at index 0 and is ALWAYS
 *                   available (`room.lua:958-961`).
 *   cancel_choices  buttons that answer with no cards at all.
 *   min / max       how many cards the `choices` buttons need. Both 0 for
 *                   `viewCards`, which is how the read-only viewer arrives.
 *
 * The reply is `{ cards, choice }` (`ChooseCardsAndChoiceBox.qml:133`), and a
 * cancel choice replies with an empty card list.
 *
 * THE ONE THING WE CANNOT DO. `filter_skel` names a skill skeleton whose
 * `extra.choiceFilter` decides whether a non-default choice is legal for the
 * current selection; QML asks Lua to evaluate it inline (`:125`). There is no
 * `Lua.evaluate` on this side — `LtkLua` is a fixed set of named calls by
 * design, and adding a string-eval door into the VM to gate a button is not a
 * trade worth making. So every choice is offered once the card count is legal,
 * which is what QML itself falls back to when `filter_skel` is empty. The
 * engine validates the answer; a refused one is a refused answer, not a hang.
 */
function CardsAndChoiceBox(
  { data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean },
) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const d = data as CardsAndChoicePayload;
  const cards = d.cards ?? [];
  const choices = d.choices ?? [];
  const cancelChoices = d.cancel_choices ?? [];
  const disabled = d.disabled ?? [];
  const min = d.min ?? 1;
  const max = d.max ?? 1;
  const [picked, setPicked] = useState<number[]>([]);

  const toggle = (cid: number) => {
    // `max === 0` is the read-only viewer: there is nothing to select, and
    // selecting anyway would answer a question that was never asked.
    if (max === 0 || disabled.includes(cid)) return;
    if (picked.includes(cid)) { setPicked(picked.filter((c) => c !== cid)); return; }
    // `updateCardSelectable` (`:170`) drops the oldest rather than refusing the
    // click, so a full selection still responds to being pointed at.
    setPicked(picked.length >= max ? [...picked.slice(1), cid] : [...picked, cid]);
  };

  const enough = picked.length >= min && picked.length <= max;

  /**
   * Which skill is asking, so the panel can say what it does.
   *
   * The payload does not carry the name — `askToChooseCardsAndChoice` puts it
   * on the REQUEST rather than in the data (`req.focus_text = skillname`,
   * `room.lua:983`). `useAskingSkill` reads it back off `MoveFocus`; see
   * `./parts`.
   */
  const asking = useAskingSkill();
  const skill = String((d.extra_data as { skillName?: unknown } | undefined)?.skillName ?? asking ?? '');

  return (
    <Dialog
      title={d.prompt ? prompt(d.prompt) : lua.tr('$ChooseCard')}
      detail={describe(lua, skill)}
      actions={<>
        {choices.map((choice, i) => (
          <OptionBtn
            key={`ok:${i}:${choice}`}
            // Index 0 is `default_choice` and is what the engine falls back to
            // on a timeout, so it is the one marked primary — which is also the
            // button `scripts/audit/policy.mjs` presses to answer a card box.
            selected={i === 0}
            label={prompt(choice)}
            detail={describe(lua, choice)}
            disabled={!interactive || !enough}
            onClick={() => onReply({ cards: picked, choice })}
          />
        ))}
        {cancelChoices.map((choice, i) => (
          <OptionBtn
            key={`no:${i}:${choice}`}
            label={prompt(choice)}
            detail={describe(lua, choice)}
            disabled={!interactive}
            onClick={() => onReply({ cards: [], choice })}
          />
        ))}
      </>}
    >
      {/* One `.fk-zone`, because that is the selector the audit probe
          enumerates dialog cards through (`probe.mjs`, group `zoneCard`). */}
      <div className="fk-zone">
        <div className="fk-zone__title">
          {lua.tr('$Hand')}{max > 0 ? ` — ${picked.length}/${max}` : ''}
        </div>
        <div className="fk-zone__cards">
          {cards.map((cid) => {
            const off = disabled.includes(cid) || max === 0;
            return (
              <div
                key={cid}
                className={cls(picked.includes(cid) && 'fk-card--selected')}
                style={{ cursor: interactive && !off ? 'pointer' : 'default', opacity: off ? 0.55 : 1 }}
                onClick={interactive && !off ? () => toggle(cid) : undefined}
              >
                <CardItem cid={cid} known />
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

/* --------------------------------------------------- move a card in play */

interface MoveInBoardPayload {
  cards?: number[];
  cardsPosition?: number[];
  generalNames?: string[];
  playerIds?: number[];
}

/**
 * `AskForMoveCardInBoard` — `MoveCardInBoardBox.qml`. Take one equipment or
 * delayed trick off one of two players and give it to the other.
 *
 * ALSO A HANG BEFORE THIS. Same dead end as above and reaching
 * more of the roster — seven mobile generals (mobile__lvfan, mobile__yanghong,
 * mobile__cuiyan, m_ex__lingtong, mxing__zhanghe, pangdegong, yangbiao).
 *
 * THE REPLY IS THE SUBTLE PART. `{ cardId, pos }`, and `pos` is the card's
 * position in the payload — where it is NOW, not where you are sending it.
 * `MoveCardInBoardBox.qml:136` reads it straight out of the unmodified
 * `cardsPosition` array, and the server uses it to pick the two ends of the
 * move: `pos == 0` means "from targetOne to targetTwo" (`room.lua:2945`).
 * Sending the destination instead would move every card the wrong way.
 *
 * `''` is a legal answer — the engine then moves a random one (`room.lua:2941`)
 * — so Cancel is real rather than a way of stalling.
 *
 * Two rows, one per player, drawn as zones. QML animates the card across; a
 * click that re-parents it says the same thing and is honest about being
 * click-driven, which is the same call `ArrangeBox` above makes.
 */
function MoveInBoardBox(
  { data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean },
) {
  const { lua } = useRoom();
  const d = data as MoveInBoardPayload;
  const cards = d.cards ?? [];
  const positions = d.cardsPosition ?? [];
  const playerIds = d.playerIds ?? [];
  /** `"general/deputy"`, each half translated on its own — `RoomLogic.js:1125`. */
  const names = (d.generalNames ?? []).map((n) => n.split('/').map((x) => lua.tr(x)).join('/'));
  const [moved, setMoved] = useState<number | null>(null);

  /** Where a card is drawn: its own side until it is the one being moved. */
  const sideOf = (i: number): number => {
    const home = positions[i] ?? 0;
    return cards[i] === moved ? 1 - home : home;
  };

  /** The name a skill printed onto a card it put into play, if any. Asked of
   *  the card's owner, which is the side the payload started it on. */
  const virtName = (i: number): string | undefined => {
    const owner = playerIds[positions[i] ?? 0];
    if (owner == null) return undefined;
    return lua.getVirtualEquipData(owner, cards[i])?.name;
  };

  return (
    <Dialog
      title={lua.tr('Please click to move card')}
      actions={<>
        <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn>
        <Btn
          primary
          disabled={!interactive || moved == null}
          // `pos` is where the card came FROM. See the note above.
          onClick={() => onReply({ cardId: moved, pos: positions[cards.indexOf(moved as number)] ?? 0 })}
        >{lua.tr('OK')}</Btn>
      </>}
    >
      {names.map((name, side) => (
        <div className="fk-zone" key={`${side}:${playerIds[side] ?? side}`} style={{ marginBottom: 8 }}>
          <div className="fk-zone__title">{name}</div>
          <div className="fk-zone__cards">
            {cards.map((cid, i) => (sideOf(i) !== side ? null : (
              <div
                key={cid}
                className={cls(cid === moved && 'fk-card--selected')}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={interactive ? () => setMoved(moved === cid ? null : cid) : undefined}
              >
                {/*
                  Two engine answers this panel would otherwise invent, and both
                  had zero callers anywhere in `src/room` before it existed.

                  `cardVisibility` — a delayed trick in somebody's judge zone
                  can be face-down, and only the engine knows whether this seat
                  may see it (`MoveCardInBoardBox.qml:108`).

                  `getVirtualEquipData` — a weapon put into play BY a skill is a
                  virtual card whose printed face is not its name; QML overrides
                  `virt_name` from it before drawing (`RoomLogic.js:1114-1119`),
                  keyed on the card's owner, which is its ORIGINAL side.
                */}
                <CardItem cid={cid} known={lua.cardVisibility(cid)} virtName={virtName(i)} />
              </div>
            )))}
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
 * A request the room has no panel for.
 *
 * WHAT IS STILL LEFT HERE, now that the six `CustomDialog` components the
 * roster actually uses have panels: `MiniGame`, which no shipped skill raises,
 * and a `CustomDialog` naming a component nobody has read. Both are "the
 * package brought its own QML", and the honest answer is that we have not read
 * that file — not that the request type is unsupported, which stopped being
 * true.
 *
 * IT HAS TO BE ANSWERABLE, and that is the whole reason it is a box rather than
 * nothing. A panel with no button is a guaranteed thirty-second freeze for the
 * seat and a liveness FAIL for the campaign, and the engine already has a name
 * for "I am not answering this": every `Request:getResult` reads `""` as no
 * answer and applies the caller's own default (`room.lua:2941`, `:989`, and so
 * on down the file). Declining immediately is exactly what the timeout would
 * have done, minus the thirty seconds of a frozen table.
 *
 * IT DOES NOT DUMP THE PAYLOAD. It used to, and a wall of JSON is not something
 * a player can act on — it reads as a crash. The name of the thing we cannot
 * draw is the whole of the useful content, and it is the string worth having in
 * a bug report.
 */
function UnsupportedRequest(
  { command, what, onReply, interactive }:
  { command: string; what?: string; onReply?: (v: unknown) => void; interactive?: boolean },
) {
  const { lua } = useRoom();
  return (
    <Dialog
      title={lua.tr(command)}
      prompt={`This build has no panel for ${what ?? command} yet. Declining it lets the game continue.`}
      actions={onReply
        ? <Btn primary disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn>
        : undefined}
    >
      <div className="fk-dialog__prompt">{what ? `${command} · ${what}` : command}</div>
    </Dialog>
  );
}
