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
import { Btn, Dialog, GeneralCard } from './parts';

export interface DialogHostProps {
  readonly onReply: (value: unknown) => void;
  readonly interactive: boolean;
}

export function DialogHost({ onReply, interactive }: DialogHostProps) {
  const state = useRoomState();
  const req = state.request;

  if (state.gameOver) return <GameOverBox winner={state.gameOver} />;
  if (state.ag) return <AgBox onReply={onReply} interactive={interactive} />;
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
      // Normally `FillAG` has already built `state.ag` and the branch above
      // catches it; this is the case where the ask arrives without a fill.
      return <UnknownRequest command={req.command} data={req.data} />;
    default:
      return <UnknownRequest command={req.command} data={req.data} />;
  }
}

/* --------------------------------------------------------- choose general */

function ChooseGeneralBox(
  { data, onReply, interactive }: { data: unknown; onReply: (v: unknown) => void; interactive: boolean },
) {
  const { lua } = useRoom();
  const [generals, n, , heg, rule, extra] = data as [string[], number?, boolean?, boolean?, string?, unknown?];
  const count = n ?? 1;
  const ruleName = rule ?? (heg ? 'heg_general_choose' : 'askForGeneralsChosen');
  const extraData = extra ?? { n: count };
  const [picked, setPicked] = useState<string[]>([]);

  const prompt = lua.chooseGeneralPrompt(ruleName, generals, extraData) || '#AskForGeneral';
  const feasible = lua.chooseGeneralFeasible(ruleName, picked, generals, extraData);

  const toggle = (g: string) => {
    if (picked.includes(g)) { setPicked(picked.filter((x) => x !== g)); return; }
    if (!lua.chooseGeneralFilter(ruleName, g, picked, generals, extraData)) return;
    setPicked(picked.length >= count ? [...picked.slice(1), g] : [...picked, g]);
  };

  return (
    <Dialog
      title={lua.tr('#AskForGeneral')}
      prompt={prompt === '#AskForGeneral' ? undefined : lua.tr(prompt)}
      actions={<Btn primary disabled={!interactive || !feasible} onClick={() => onReply(picked)}>{lua.tr('OK')}</Btn>}
    >
      <div className="fk-generals">
        {generals.map((g) => (
          <GeneralCard key={g} name={g} selected={picked.includes(g)} onClick={interactive ? () => toggle(g) : undefined} />
        ))}
      </div>
    </Dialog>
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
                <CardItem cid={cid} known />
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
  return (
    <Dialog title={lua.tr('Please choose cards')}>
      <div className="fk-ag">
        {ag.ids.map((cid) => {
          const taker = ag.taken[cid];
          const pickable = interactive && ag.interactive && taker == null && !ag.disabled.includes(cid);
          return (
            <div className="fk-ag__slot" key={cid} onClick={pickable ? () => onReply(cid) : undefined}>
              <CardItem
                cid={cid}
                known
                item={{ id: cid, enabled: pickable, selected: false }}
                onClick={pickable ? () => onReply(cid) : undefined}
              />
              {taker != null ? (
                <span className="fk-ag__taker">{lua.tr(state.players[taker]?.general ?? String(taker))}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Dialog>
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
