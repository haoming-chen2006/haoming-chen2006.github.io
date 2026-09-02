/**
 * The six panels a `CustomDialog` request can ask for.
 *
 * WHAT THIS REQUEST IS. Everything else the engine asks names a widget the
 * client owns. `CustomDialog` ships the widget instead: a QML component path
 * and its properties, straight out of the package (`Room:askToCustomDialog`,
 * `lua/lunarltk/server/room.lua:2832`). `RoomLogic.js:1478` loads the file and
 * calls `loadData` on it; a browser cannot, so the path is read as the NAME of a
 * panel and each panel below is a reading of the `.qml` it is named after —
 * cited per panel, the way every other dialog in this directory is.
 *
 * WHY IT WAS WORTH DOING. Eight skills in the shipped roster raise it, and every
 * one of them was a dead seat: no case in `DialogHost`, so the box was
 * `UnknownRequest` — the words "No dialog is implemented for this request type"
 * over a dump of the payload. 清正 is the one a player reported, and it is the
 * worst of the eight because 曹髦's 〖潜龙〗 grants it at 25 道心值 and the
 * skill then asks at the start of EVERY play phase: one measured four-seat game
 * raised it five times, five dead boxes, five turns where the skill did nothing.
 *
 * WHAT EACH ONE REPLIES, and why the shape matters more than usual: `CustomDialog`
 * sets `receive_decode = false` and hands the reply back to the package verbatim
 * (`room.lua:2836`), so there is no engine-side schema to catch a wrong shape.
 * Each panel below states the line of Lua that consumes its answer.
 *
 * NO RULES HERE. Selection bounds are the payload's own numbers, the reply is
 * handed back, and the engine decides. `custom.ts` holds the state machines so
 * they can be measured against the QML on their own.
 */
import { useMemo, useState } from 'react';
import { useRoom, useRoomState, usePrompt } from '../RoomContext';
import { CardItem, cls } from '../components/CardItem';
import { rankText, SUIT_GLYPH, SUIT_IS_RED } from '../assets/assets';
import { sanitizeMarkup } from '../components/markup';
import { describe } from '../ltk/prompt';
import { Btn, Dialog, GeneralCard, useAskingSkill } from './parts';
import {
  cardListProps, cardNamesProps, componentName, daoshuCardId, daoshuProps,
  nameEnabled, namesAutoAccept, shiftAt, swapSeats, toggleList, toggleName,
  WULING_CARDS, type CustomDialogSpec, type DaoshuFace,
} from './custom';

export interface CustomPanelProps {
  readonly spec: CustomDialogSpec;
  readonly onReply: (value: unknown) => void;
  readonly interactive: boolean;
}

/**
 * Which components have a panel. Anything else is honestly declined rather than
 * drawn wrong — see `UnsupportedDialog` in `DialogHost`.
 *
 * The list is closed on purpose. A `CustomDialog` whose component we have not
 * read is a payload of unknown shape with an unknown reply contract, and
 * guessing at one is how a seat sends an answer the package then mis-reads.
 */
const PANELS: Record<string, (p: CustomPanelProps) => React.JSX.Element> = {
  ChooseCardListBox: CardListBox,
  ChooseCardNamesBox: CardNamesBox,
  JieDangBox,
  TaMoBox,
  WuLingBox,
  DaoShuBox,
};

export function customPanelFor(path: string): ((p: CustomPanelProps) => React.JSX.Element) | null {
  return PANELS[componentName(path)] ?? null;
}

export function CustomDialogBox(props: CustomPanelProps) {
  const Panel = customPanelFor(props.spec.path);
  return Panel ? <Panel {...props} /> : null;
}

/* ------------------------------------------------------------- shared bits */

/**
 * A card with no id: a name, and optionally the suit and rank printed on it.
 *
 * Three of these panels draw one. 五灵's five tokens are not cards at all
 * (`WuLingBox.qml:14` names them and `Ltk.createCardModelFromName` draws them),
 * 盗书's disguised card is a real card wearing another card's name
 * (`DaoShuBox.qml:38`), and 共损/星启/谋立 choose between card NAMES rather than
 * between cards. `CardItem` cannot serve any of them — it starts from a card id
 * and asks the VM — so this is the same `.fk-card` markup driven by a name.
 */
function NamedCard(
  { name, suit, number, selected, disabled, count, onClick }:
  {
    name: string; suit?: string; number?: number;
    selected?: boolean; disabled?: boolean;
    /** Repeat count, for the one box that lets a name be taken twice. */
    count?: number;
    onClick?: () => void;
  },
) {
  const { lua, assets } = useRoom();
  const art = assets.cardFace(name, lua.getCardExtensionByName(name));
  const red = suit ? SUIT_IS_RED[suit] : false;
  return (
    <div
      className={cls(
        'fk-card',
        red ? 'fk-card--red' : 'fk-card--black',
        onClick && !disabled ? 'fk-card--enabled' : disabled && 'fk-card--disabled',
        selected && 'fk-card--selected',
      )}
      title={lua.tr(name)}
      style={{ cursor: onClick && !disabled ? 'pointer' : 'default' }}
      onClick={onClick && !disabled ? onClick : undefined}
    >
      {art ? <img className="fk-card__art" src={art} alt="" draggable={false} /> : null}
      {suit ? (
        <span className="fk-card__corner">
          <span className="fk-card__rank">{rankText(number)}</span>
          <span className="fk-card__suit">{SUIT_GLYPH[suit]}</span>
        </span>
      ) : null}
      <span className="fk-card__name">{lua.tr(name)}</span>
      {count ? <span className="fk-card__foot">×{count}</span> : null}
    </div>
  );
}

/**
 * What a card-picking box is called when its payload carries no prompt.
 *
 * Both `ChooseCardListModel` and `ChooseCardNamesModel` fall back to
 * `"#ChooseCardNames"`, and no package defines that key — so upstream's own
 * fallback puts a literal `#ChooseCardNames` on the title bar. Every caller in
 * this roster does send a prompt, so this is the path nothing takes; it still
 * has to be engine text rather than an identifier, and the skill that raised
 * the question is the honest thing to name.
 */
function boxTitle(
  lua: { tr(k: string): string }, prompt: (k: string) => string, key: string, skill: string,
): string {
  return (key && prompt(key)) || (skill && lua.tr(skill)) || lua.tr('$ChooseCard');
}

/** The reorder pair `ArrangeBox` draws under a card, for the one box that
 *  orders things that are not cards. */
function ShiftChips({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
      <button type="button" className="fk-chip" onClick={onLeft}>◀</button>
      <button type="button" className="fk-chip" onClick={onRight}>▶</button>
    </div>
  );
}

/* ------------------------------------------------------- 清正: ChooseCardList */

/**
 * `packages/utility/qml/ChooseCardListBox.qml` — pick whole GROUPS of cards.
 *
 * 清正 is the only caller in the roster and it groups 曹髦's hand by suit: four
 * lists, `log_spade`/`log_club`/`log_heart`/`log_diamond`, and the answer is
 * which suit to discard. It asks twice per use — once for the seat's own hand
 * and once for the target's (`qingzheng.lua:44` and `:81`).
 *
 * A GROUP IS THE CLICK TARGET, and the cards in it are how you read it. The QML
 * puts one `MouseArea` over each list area (`:99`) and shows the cards inside
 * purely so you can see what taking that list costs. So the whole zone answers
 * to a click here — its caption and any card in it — and every card in a taken
 * list is marked, because the unit being selected is the list.
 *
 * The reply is the list of names (`ChooseCardListModel.qml:result`), which
 * `askForChooseCardList` returns straight to the skill
 * (`packages/utility/utility.lua:623`). Cancel replies `''`, which that helper
 * reads as "choose nothing" — and for 清正 that is a real answer: `#choices == 1`
 * fails and the skill is simply not used.
 */
function CardListBox({ spec, onReply, interactive }: CustomPanelProps) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const skill = useAskingSkill();
  const p = useMemo(() => cardListProps(spec.prop), [spec]);
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (name: string, n: number) => setPicked((r) => toggleList(r, name, n, p));

  return (
    <Dialog
      title={boxTitle(lua, prompt, p.prompt, skill)}
      // The skill is on the REQUEST, not in the payload — `req.focus_text =
      // skill_name` (`room.lua:2835`). Same lookup `CardsAndChoiceBox` makes.
      detail={describe(lua, skill)}
      actions={<>
        <Btn disabled={!interactive || !picked.length} onClick={() => setPicked([])}>
          {lua.tr('Clear All')}
        </Btn>
        {p.cancelable ? (
          <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn>
        ) : null}
        <Btn primary disabled={!interactive || picked.length < p.min} onClick={() => onReply(picked)}>
          {lua.tr('OK')}
        </Btn>
      </>}
    >
      <div className="fk-dialog__row">
        {p.listNames.map((name, i) => {
          const cards = p.listCards[i] ?? [];
          const on = picked.includes(name);
          // The QML greys nothing, but an empty list its own model refuses to
          // take is a click that does nothing, and saying so is cheaper than
          // letting a player find out.
          const takeable = cards.length > 0 || p.allowEmpty;
          const click = interactive && takeable ? () => toggle(name, cards.length) : undefined;
          return (
            <div
              key={`${i}:${name}`}
              className="fk-zone"
              style={{ cursor: click ? 'pointer' : 'default', opacity: takeable ? 1 : 0.5 }}
              onClick={click}
            >
              {/*
                `ChooseCardListBox.qml:117` — the caption is the group's name
                through `processPrompt`, with its size beside it.

                AS MARKUP, because a suit name IS markup: the engine writes
                `log_heart` as `<font color="#CC3131">♥</font>` so a red suit
                comes out red, the same string the battle log carries. Drawn as
                text it reads as a literal `<font color="#CC3131">♥</font> (2)`
                on the caption of every red group, which is what a real browser
                showed. `sanitizeMarkup` is the same allowlist the log uses.
              */}
              <div
                className="fk-zone__title"
                dangerouslySetInnerHTML={{ __html: `${sanitizeMarkup(prompt(name))} (${cards.length})` }}
              />
              <div className="fk-zone__cards">
                {cards.map((cid) => (
                  <div key={cid} className={cls(on && 'fk-card--selected')}>
                    <CardItem cid={cid} known />
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

/* ------------------------------------------------ 共损/星启/谋立: ChooseCardNames */

/**
 * `packages/utility/qml/ChooseCardNamesBox.qml` — pick card NAMES, not cards.
 *
 * Three skills use it: 王凌's 〖星启〗 and 〖谋立〗 pick out of the names on his
 * 「杯」 mark, and 杨仪's 〖共损〗 names a card for somebody else to hand over.
 *
 * `choices` is what may be taken and `allChoices` is what is DRAWN — the two
 * differ, and that difference is the point of the box: 谋立 shows the whole mark
 * and enables only the part that is still legal. A name outside `choices` is
 * greyed, exactly as `isChoiceEnabled` says (`ChooseCardNamesModel.qml:99`).
 *
 * THE FORCED SINGLE PICK ANSWERS ON THE CLICK. When the ask is `min = max = 1`
 * and not cancelable the model fires `accepted()` from inside `toggleChoose`
 * and the box hides its buttons altogether (`ChooseCardNamesBox.qml:220`). All
 * three callers ask exactly that way, so without it the panel would show a name
 * grid with no way to send anything.
 *
 * The reply is the list of names, which `askForChooseCardNames` returns to the
 * skill (`utility.lua:560`).
 */
function CardNamesBox({ spec, onReply, interactive }: CustomPanelProps) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const skill = useAskingSkill();
  const p = useMemo(() => cardNamesProps(spec.prop), [spec]);
  const [picked, setPicked] = useState<string[]>([]);

  const click = (name: string) => {
    const next = toggleName(picked, name, p);
    if (namesAutoAccept(next, p)) { onReply(next); return; }
    setPicked(next);
  };

  const feasible = picked.length >= p.minNum && picked.length <= p.maxNum;

  return (
    <Dialog
      title={boxTitle(lua, prompt, p.prompt, skill)}
      detail={describe(lua, skill)}
      actions={<>
        <Btn disabled={!interactive || !picked.length} onClick={() => setPicked([])}>
          {lua.tr('Clear All')}
        </Btn>
        {p.cancelable ? (
          <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn>
        ) : null}
        <Btn primary disabled={!interactive || !feasible} onClick={() => onReply(picked)}>
          {lua.tr('OK')}
        </Btn>
      </>}
    >
      <div className="fk-dialog__row">
        {p.allChoices.map((row, ri) => (
          <div className="fk-zone" key={ri}>
            <div className="fk-zone__title">{lua.tr('$ChooseCard')}</div>
            <div className="fk-zone__cards">
              {row.map((name, i) => (
                <NamedCard
                  key={`${ri}:${i}:${name}`}
                  name={name}
                  selected={picked.includes(name)}
                  disabled={!interactive || !nameEnabled(picked, name, p)}
                  count={p.repeatable ? picked.filter((x) => x === name).length : undefined}
                  onClick={() => click(name)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

/* ----------------------------------------------------------- 党锢: JieDangBox */

/**
 * `packages/mobile/qml/JieDangBox.qml` — 十常侍's 〖党锢〗 picks a deputy.
 *
 * The main general is dealt and shown; four candidate deputies are offered and
 * one of them may be locked out — 党锢 locks the candidate who hates the main
 * general, and otherwise locks a random one one time in ten (`danggu.lua:66-74`).
 * The QML draws that one with a padlock and a taunt bubble; here it is greyed
 * and unclickable, which says the same thing.
 *
 * NO CANCEL, and that is upstream's design rather than an omission: the box has
 * one button (`JieDangBox.qml:180`). A seat that answers nothing gets a random
 * deputy (`danggu.lua:88`), and four generals are clickable from the moment it
 * opens, so there is never a moment with nothing to press.
 *
 * The reply is `{ general }` — `danggu.lua:86` reads `result.general`.
 */
function JieDangBox({ spec, onReply, interactive }: CustomPanelProps) {
  const { lua } = useRoom();
  const main = typeof spec.prop.mainGeneral === 'string' ? spec.prop.mainGeneral : '';
  const deputies = Array.isArray(spec.prop.deputyGenerals) ? spec.prop.deputyGenerals as string[] : [];
  const locked = typeof spec.prop.disabledGeneral === 'string' ? spec.prop.disabledGeneral : '';
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <Dialog
      title={lua.tr('$JieDang')}
      actions={
        <Btn primary disabled={!interactive || !picked} onClick={() => onReply({ general: picked })}>
          {lua.tr('OK')}
        </Btn>
      }
    >
      <div className="fk-zone" style={{ marginBottom: 8 }}>
        <div className="fk-zone__title">{lua.tr('mainGeneral')}</div>
        <div className="fk-generals">
          {main ? <GeneralCard name={main} /> : null}
        </div>
      </div>
      <div className="fk-zone">
        <div className="fk-zone__title">{lua.tr('deputyGeneral')}</div>
        <div className="fk-generals">
          {deputies.map((g, i) => (
            <GeneralCard
              key={`${i}:${g}`}
              name={g}
              selected={picked === g}
              disabled={g === locked}
              onClick={interactive && g !== locked ? () => setPicked(picked === g ? null : g) : undefined}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------- 榻谟: TaMoBox */

/**
 * `packages/mobile/qml/TaMoBox.qml` — 神鲁肃's 〖榻谟〗 reseats the table.
 *
 * Every living seat is shown in turn order and two of them trade places on a
 * pair of clicks (`TaMoBox.qml:96-118` swaps `seatNumber` and the two photos'
 * x). Some seats are locked: the shown lord in 身份局, seat 3 in 1v2
 * (`tamo.lua:32-40`).
 *
 * THE REPLY IS THE SEATING ITSELF — `playerIds[seatNumber - 1] = playerid`
 * (`TaMoBox.qml:148`), so the array's ORDER is the answer and 榻谟 walks it with
 * `for seat, playerId in pairs(result)` (`tamo.lua:63`). The row below is drawn
 * in that same order, so what a player sees is what gets sent.
 *
 * OK is live from the start because the identity seating is a legal answer, and
 * Cancel replies `''`, which 榻谟 reads as "not this time" (`tamo.lua:53`).
 */
function TaMoBox({ spec, onReply, interactive }: CustomPanelProps) {
  const { lua } = useRoom();
  const state = useRoomState();
  const all = Array.isArray(spec.prop.allPlayerIds) ? spec.prop.allPlayerIds as number[] : [];
  const lockedIds = Array.isArray(spec.prop.disabledPlayerIds) ? spec.prop.disabledPlayerIds as number[] : [];
  const title = typeof spec.prop.titleName === 'string' ? spec.prop.titleName : '$TaMo';
  const [order, setOrder] = useState<number[]>(all);
  const [held, setHeld] = useState<number | null>(null);

  const tap = (pid: number) => {
    if (held === null) { setHeld(pid); return; }
    if (held === pid) { setHeld(null); return; }
    setOrder((o) => swapSeats(o, held, pid));
    setHeld(null);
  };

  return (
    <Dialog
      title={lua.tr(title)}
      detail={interactive ? lua.tr('click to exchange') : undefined}
      actions={<>
        <Btn disabled={!interactive} onClick={() => onReply('')}>{lua.tr('Cancel')}</Btn>
        <Btn primary disabled={!interactive} onClick={() => onReply(order)}>{lua.tr('OK')}</Btn>
      </>}
    >
      <div className="fk-zone">
        <div className="fk-zone__title">{lua.tr('$TaMo')}</div>
        <div className="fk-zone__cards">
          {order.map((pid, i) => {
            const locked = lockedIds.includes(pid);
            const p = state.players[pid];
            return (
              <div
                key={pid}
                className={cls('fk-card', held === pid && 'fk-card--selected', locked && 'fk-card--disabled')}
                style={{
                  cursor: interactive && !locked ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  alignItems: 'center', gap: 4, padding: 4, textAlign: 'center',
                }}
                onClick={interactive && !locked ? () => tap(pid) : undefined}
              >
                {/* The seat this player would end up in, which is the answer. */}
                <span className="fk-card__rank">{i + 1}</span>
                <span className="fk-card__name">{lua.tr(p?.general || String(pid))}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------ 五灵: WuLingBox */

/**
 * `packages/mobile/qml/WuLingBox.qml` — 神华佗's 〖五灵〗 orders five tokens.
 *
 * The payload is empty (`wuling.lua:126` sends `prop = {}`): the five names are
 * the component's own default and the whole question is what order they go in.
 * The QML is a drag-to-arrange row of five slots; this is the same row with the
 * ◀ ▶ chips `ArrangeBox` already uses, which is the same operation without the
 * drag.
 *
 * The reply is `{ sort: [names…] }` — `wuling.lua:143` reads `result.sort` and
 * maps each name to a `wuling<N>` mark. A seat that sends nothing gets
 * 鹤虎熊猿鹿, which is the order this box opens in.
 */
function WuLingBox({ onReply, interactive }: CustomPanelProps) {
  const { lua } = useRoom();
  const [order, setOrder] = useState<string[]>([...WULING_CARDS]);

  return (
    <Dialog
      title={lua.tr('Please arrange WuLing cards')}
      detail={interactive ? lua.tr('Please click to move card') : undefined}
      actions={
        <Btn primary disabled={!interactive} onClick={() => onReply({ sort: order })}>{lua.tr('OK')}</Btn>
      }
    >
      <div className="fk-zone">
        <div className="fk-zone__title">{lua.tr('wuling')}</div>
        <div className="fk-zone__cards">
          {order.map((name, i) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <NamedCard name={name} />
              {interactive ? (
                <ShiftChips
                  onLeft={() => setOrder((o) => shiftAt(o, i, -1))}
                  onRight={() => setOrder((o) => shiftAt(o, i, 1))}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------ 盗书: DaoShuBox */

/**
 * `packages/mobile/qml/DaoShuBox.qml` — 蒋干's 〖盗书〗 guesses the planted card.
 *
 * The target has disguised one of its hand cards as another card's name; this
 * box shows that hand with the disguise in place and asks which one is the
 * fake. `cards` is a list of card ids with ONE object in it — the disguised
 * card's printed suit and rank, its name replaced by `fake_name`
 * (`mobile_daoshu.lua:82-93`).
 *
 * THE FAKE ANSWERS WITH ZERO. `DaoShuBox.qml:38` builds it with `cardId: 0`, and
 * the skill reads a reply of `0` as a correct guess (`mobile_daoshu.lua:126`).
 * So the reply is a card id in both cases and the panel does not have to know
 * which one is the right answer — which is just as well, because it must not.
 *
 * No Cancel: the box has one button (`:120`) and the request carries a default
 * reply of a random hand card (`mobile_daoshu.lua:116`), so a seat that never
 * answers still guesses. Every card is clickable from the moment it opens.
 */
function DaoShuBox({ spec, onReply, interactive }: CustomPanelProps) {
  const { lua } = useRoom();
  const prompt = usePrompt();
  const p = useMemo(() => daoshuProps(spec.prop), [spec]);
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <Dialog
      title={prompt('#mobile__daoshu-guess')}
      detail={describe(lua, 'mobile__daoshu')}
      actions={
        <Btn primary disabled={!interactive || picked === null} onClick={() => onReply(picked)}>
          {lua.tr('OK')}
        </Btn>
      }
    >
      <div className="fk-zone">
        <div className="fk-zone__title">{lua.tr('$Hand')}</div>
        <div className="fk-zone__cards">
          {p.cards.map((entry, i) => {
            const id = daoshuCardId(entry);
            const on = picked === id;
            const click = interactive ? () => setPicked(on ? null : id) : undefined;
            if (typeof entry !== 'number') {
              const face = entry as DaoshuFace;
              return (
                <NamedCard
                  key={`fake:${i}`}
                  name={p.fakeName}
                  suit={face.suit}
                  number={face.number}
                  selected={on}
                  onClick={click}
                />
              );
            }
            return (
              <div
                key={entry}
                className={cls(on && 'fk-card--selected')}
                style={{ cursor: interactive ? 'pointer' : 'default' }}
                onClick={click}
              >
                <CardItem cid={entry} known />
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}
