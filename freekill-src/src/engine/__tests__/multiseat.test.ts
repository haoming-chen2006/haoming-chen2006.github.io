import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { PlayerState } from '../types.ts';
import { bundle } from './support.ts';

const LONG = 300_000;

/** Requests the `ui_emu` scene answers. Everything else is dialog-shaped. */
const SCENE_REQUESTS = new Set([
  'PlayCard', 'AskForUseCard', 'AskForResponseCard', 'AskForUseActiveSkill',
]);

/**
 * Panel-shaped answers for the dialogs the room does not draw yet, in the shape
 * `Room:askToMoveCardInBoard` / `Room:askToChooseCardsAndChoice` read back out
 * of `req:getResult` (`lua/lunarltk/server/room.lua:2963`, `:984`).
 */
const DIALOG_ANSWERS: Record<string, (data: unknown) => unknown> = {
  AskForMoveCardInBoard: (data) => {
    const d = data as { cards: number[]; cardsPosition: number[] };
    return { cardId: d.cards[0], pos: d.cardsPosition[0] };
  },
  AskForCardsAndChoice: (data) => {
    // `min` is 0 for the view-only form — `Room:askToViewCardsAndChoice` pins
    // `min_num = max_num = 0` (`room.lua:930`) and reads only the choice back.
    // Sending a card there would answer a question that was never asked.
    const d = data as { cards: number[]; choices: string[]; min?: number };
    return { cards: d.cards.slice(0, d.min ?? 1), choice: d.choices[0] };
  },
};

interface Seat {
  id: number;
  client: MainThreadLuaClient;
  /** Everything this seat's VM pushed to the UI, in the order it arrived. */
  uiCommands: string[];
  items: Map<string, Map<string, Record<string, unknown>>>;
  pending: { command: string; data: unknown } | null;
  /** Drains whose JSON the client could not parse. Must stay empty. */
  badDrains: string[];
}

interface Played {
  seats: Seat[];
  over: boolean;
  asked: Map<string, number>;
  payloads: Map<string, unknown>;
  answered: Map<string, number>;
  dispose(): void;
}

/**
 * A room where every seat is a person, each with its own client VM, each
 * applying envelopes in the order they arrive off the wire — which is the one
 * thing a `streamFor`-based test cannot check, because that function sorts.
 *
 * `generals` pins the pool by disabling everything else, so a skill that only
 * four generals in the whole roster can produce actually fires. With
 * `generalNum: 1` and as many generals as seats, every seat is seated with one
 * of them.
 */
async function playEveryoneHuman(opts: {
  generals?: readonly string[];
  seatCount?: number;
  seed?: number;
  maxResumes?: number;
}): Promise<Played> {
  const seatCount = opts.seatCount ?? 4;
  const host = await InProcessLuaHost.create(bundle(), {});
  const seats: Seat[] = [];
  const asked = new Map<string, number>();
  const answered = new Map<string, number>();
  const payloads = new Map<string, unknown>();

  const dispose = () => {
    host.dispose();
    for (const s of seats) s.client.dispose();
  };

  try {
    const pool = JSON.parse(String(host.lua.doStringSync(`
      local out = {}
      for name, g in pairs(Fk.generals) do
        if not g.hidden and not g.total_hidden then out[#out + 1] = name end
      end
      table.sort(out); return json.encode(out)
    `))) as string[];
    const wanted = opts.generals ?? [];
    for (const g of wanted) {
      expect(pool, `${g} is not in this build's roster`).toContain(g);
    }
    const disabledGenerals = wanted.length ? pool.filter((g) => !wanted.includes(g)) : [];

    for (let id = 1; id <= seatCount; id++) {
      const client = await MainThreadLuaClient.create(bundle(), { playerId: id, screenName: `p${id}` });
      const seat: Seat = { id, client, uiCommands: [], items: new Map(), pending: null, badDrains: [] };
      // Read the raw drain so a batch whose JSON is malformed is recorded
      // rather than thrown - a thrown one would end the game and hide the rest.
      const raw = () => String(client.lua.doStringSync(`return FKClient.drainUI()`));
      (client as unknown as { drainUI(): unknown[] }).drainUI = () => {
        const s = raw();
        try { return JSON.parse(s) as unknown[]; } catch { seat.badDrains.push(s.slice(0, 200)); return []; }
      };
      client.onNotifyUI((command, data) => {
        seat.uiCommands.push(command);
        if (command === 'UpdateRequestUI') {
          for (const [elemType, list] of Object.entries(data as Record<string, unknown>)) {
            if (!Array.isArray(list)) continue;
            let bucket = seat.items.get(elemType);
            if (!bucket) { bucket = new Map(); seat.items.set(elemType, bucket); }
            for (const r of list as Record<string, unknown>[]) {
              const key = String(r.id);
              bucket.set(key, { ...(bucket.get(key) ?? {}), ...r });
            }
          }
        } else if (command === 'CancelRequest') {
          seat.pending = null;
          seat.items.clear();
        } else if (command === 'PlayCard' || command.startsWith('AskFor')) {
          seat.pending = { command, data };
          if (!payloads.has(command)) payloads.set(command, data);
        }
      });
      seats.push(seat);
    }

    const enabled = (s: Seat, t: string): string[] =>
      [...(s.items.get(t) ?? new Map<string, Record<string, unknown>>()).entries()]
        .filter(([, v]) => v.enabled && !v.selected)
        .map(([k]) => k);
    const isEnabled = (s: Seat, t: string, id: string): boolean =>
      (s.items.get(t)?.get(id) as { enabled?: boolean } | undefined)?.enabled === true;

    const answer = (s: Seat): void => {
      const p = s.pending;
      if (p && !SCENE_REQUESTS.has(p.command)) {
        s.pending = null;
        if (p.command === 'AskForGeneral') {
          const [generals, n] = p.data as [string[], number];
          s.client.replyToServer('AskForGeneral', generals.slice(0, n));
          return;
        }
        const panel = DIALOG_ANSWERS[p.command];
        if (panel) {
          answered.set(p.command, (answered.get(p.command) ?? 0) + 1);
          // The call the room makes for every dialog-shaped request
          // (`src/room/ltk/LtkLua.ts:401`). The command is only a label — the
          // host matches a reply to the outstanding request, not to a name.
          s.client.replyToServer('ReplyToServer', panel(p.data));
          return;
        }
        s.client.replyToServer('ReplyToServer', '');
        return;
      }
      // Click what the scene enabled, never what the test thinks is legal.
      for (let i = 0; i < 4; i++) {
        if (isEnabled(s, 'Button', 'OK')) break;
        const card = enabled(s, 'CardItem')[0];
        if (card !== undefined) {
          s.client.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: true } });
          continue;
        }
        const target = enabled(s, 'Photo')[0];
        if (target !== undefined) {
          s.client.interact({ elemType: 'Photo', id: Number(target), action: 'click', data: { selected: true } });
          continue;
        }
        break;
      }
      for (const button of ['OK', 'End', 'Cancel']) {
        if (button === 'Cancel' || isEnabled(s, 'Button', button)) {
          s.client.interact({ elemType: 'Button', id: button, action: 'click' });
          return;
        }
      }
    };

    const online = allBotSeats(seatCount).map((s) => ({ ...s, state: PlayerState.Online as 1 }));
    const session = await RoomSession.start(host, {
      roomId: 'multiseat', seed: opts.seed ?? 1, seats: online, ownerId: 1, timeout: 15,
      settings: { gameMode: 'aaa_role_mode', generalNum: 1, disabledGenerals },
    }, {
      // Straight off the wire, in arrival order. No sorting, no buffering: this
      // is what a client that trusts the envelope stream actually sees.
      onEnvelope: (e: Envelope) => {
        for (const s of seats) if (e.to === null || e.to === s.id) s.client.deliverEnvelope(e);
      },
    });

    let over = false;
    for (let i = 0; i < (opts.maxResumes ?? 3000) && !over; i++) {
      const res = await session.advance();
      if (res.err) throw new Error(res.err);
      if (res.over) { over = true; break; }
      let progressed = false;
      for (const id of res.waitingOn) {
        const s = seats.find((x) => x.id === id);
        if (!s) continue;
        if (s.pending) asked.set(s.pending.command, (asked.get(s.pending.command) ?? 0) + 1);
        answer(s);
        const outbound = s.client.drainOutbound().filter((o) => o.kind === 'reply');
        for (const o of outbound) await host.pushReplyRaw(s.id, o.payload);
        if (outbound.length > 0) progressed = true;
      }
      if (!progressed) {
        throw new Error(`no seat could answer at resume ${i}: waitingOn ${JSON.stringify(res.waitingOn)}, `
          + `pending ${JSON.stringify(seats.map((s) => s.pending?.command ?? null))}`);
      }
    }
    return { seats, over, asked, payloads, answered, dispose };
  } catch (e) {
    dispose();
    throw e;
  }
}

/**
 * Ordering between the public channel and a seat's private one.
 *
 * `routeFlush` recovers a broadcast by noticing that some messages are
 * byte-identical for every member. That is only safe if a recipient still ends
 * up applying its messages in the order the engine emitted them, and the
 * envelope is the unit of application — so a batch that put every public
 * message in one envelope and every private one in another lost the ordering
 * between them.
 *
 * The join preamble is where that becomes fatal. `EnterRoom` and `RoomOwner`
 * are the same bytes for everyone, `AddPlayer` is not, and in a room where
 * every seat is a person the seats were told to arrange themselves before they
 * had been told who was in the room. One nil index later
 * (`lua/client/clientbase.lua:413`) the seat's VM was dead. A room with one
 * human and seven robots never shows it: nothing in the preamble is public
 * there, because the robots are members too and are sent nothing.
 */
describe('a room where every seat is a person', () => {
  it('tells every seat who the others are before it arranges the seats', async () => {
    const g = await playEveryoneHuman({ seatCount: 4, maxResumes: 4 });
    try {
      for (const s of g.seats) {
        expect(s.client.errors(), `seat ${s.id}`).toEqual([]);
        expect(s.badDrains, `seat ${s.id}`).toEqual([]);

        const lastAdd = s.uiCommands.lastIndexOf('AddPlayer');
        const arrange = s.uiCommands.indexOf('ArrangeSeats');
        expect(lastAdd, `seat ${s.id} never saw AddPlayer`).toBeGreaterThanOrEqual(0);
        expect(arrange, `seat ${s.id} never saw ArrangeSeats`).toBeGreaterThanOrEqual(0);
        expect(lastAdd, `seat ${s.id}: AddPlayer must precede ArrangeSeats`).toBeLessThan(arrange);

        // And the VM really does hold all four, which is what `arrangeSeats`
        // was indexing into.
        const seen = s.client.call<unknown[]>('GetPlayersAndObservers');
        expect(Array.isArray(seen) ? seen.length : 0, `seat ${s.id}`).toBe(4);
      }
    } finally {
      g.dispose();
    }
  }, LONG);

  it('plays a whole game out with four people at the table', async () => {
    const g = await playEveryoneHuman({ seatCount: 4 });
    try {
      expect(g.over).toBe(true);
      for (const s of g.seats) {
        expect(s.client.errors(), `seat ${s.id}`).toEqual([]);
        expect(s.badDrains, `seat ${s.id}`).toEqual([]);
      }
    } finally {
      g.dispose();
    }
  }, LONG);
});

/**
 * The two requests the campaign reports as unanswerable.
 *
 * The panel is another lane's; what is checked here is the half underneath it.
 * The question has to arrive with the data a panel could draw from, and the
 * answer a panel would produce has to be accepted by the engine and move the
 * game on. Both are driven with the generals `scripts/audit/catalogue.mjs`
 * names as their only producers.
 */
describe('the dialog requests only the mobile pack produces', () => {
  it('carries AskForMoveCardInBoard to the seat and takes its answer', async () => {
    const g = await playEveryoneHuman({
      generals: ['mobile__lvfan', 'mobile__yanghong', 'mobile__cuiyan', 'm_ex__lingtong'],
      seatCount: 4,
    });
    try {
      expect(g.asked.get('AskForMoveCardInBoard') ?? 0).toBeGreaterThan(0);
      expect(g.answered.get('AskForMoveCardInBoard') ?? 0).toBeGreaterThan(0);
      const payload = g.payloads.get('AskForMoveCardInBoard') as Record<string, unknown>;
      expect(Array.isArray(payload.cards)).toBe(true);
      expect((payload.cards as number[]).length).toBeGreaterThan(0);
      expect((payload.cardsPosition as number[]).length).toBe((payload.cards as number[]).length);
      expect((payload.generalNames as string[]).length).toBe(2);
      expect((payload.playerIds as number[]).length).toBe(2);
      // Answering it has to keep the game moving, not merely be accepted.
      expect(g.over).toBe(true);
      for (const s of g.seats) {
        expect(s.client.errors(), `seat ${s.id}`).toEqual([]);
        expect(s.badDrains, `seat ${s.id}`).toEqual([]);
      }
    } finally {
      g.dispose();
    }
  }, LONG);

  it('carries AskForCardsAndChoice to the seat and takes its answer', async () => {
    const g = await playEveryoneHuman({
      generals: ['m_shi__xinxianying', 'm_sp__simazhao', 'ruanhui', 'mobile__chengui'],
      seatCount: 4,
    });
    try {
      expect(g.asked.get('AskForCardsAndChoice') ?? 0).toBeGreaterThan(0);
      expect(g.answered.get('AskForCardsAndChoice') ?? 0).toBeGreaterThan(0);
      const payload = g.payloads.get('AskForCardsAndChoice') as Record<string, unknown>;
      expect(Array.isArray(payload.cards)).toBe(true);
      expect((payload.choices as string[]).length).toBeGreaterThan(0);
      expect(typeof payload.min).toBe('number');
      expect(typeof payload.max).toBe('number');
      expect(g.over).toBe(true);
      for (const s of g.seats) {
        expect(s.client.errors(), `seat ${s.id}`).toEqual([]);
        expect(s.badDrains, `seat ${s.id}`).toEqual([]);
      }
    } finally {
      g.dispose();
    }
  }, LONG);
});
