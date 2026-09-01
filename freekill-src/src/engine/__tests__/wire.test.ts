import { describe, expect, it } from 'vitest';
import { CBOR_TAG, isTaggedRef, type TaggedRef } from '../../contract/protocol.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { RoomSession } from '../roomSession.ts';
import { bundle, SEED } from './support.ts';

const LONG = 300_000;

/**
 * What `canon.encode` is allowed to put on the wire.
 *
 * The audit caught a seat rejecting 137 envelopes in one game with
 * `SyntaxError: Unexpected token 'a', "{"__tag":table: 0xd7"...`. A live
 * `Player` had reached the encoder, which identified cbor wrappers by field
 * shape — and `Player` has a raw `tag` field that is a table
 * (`lua/lunarltk/core/player.lua:107`). `tostring()` on it produced a Lua
 * address inside what was supposed to be JSON, so `drainUI` threw, the whole
 * batch of UI events was lost, and the seat stopped rendering.
 *
 * Everything below is about the same guarantee: whatever the engine hands the
 * encoder, the string that comes out is JSON, and a live object comes out as
 * the `TaggedRef` `contract/protocol.ts` promises.
 */
describe('what the client VM puts on the wire', () => {
  /** A booted client with no room. `Self` exists from `attach()` onward. */
  async function client(): Promise<MainThreadLuaClient> {
    return MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
  }

  const encode = (c: MainThreadLuaClient, luaExpr: string): string =>
    String(c.lua.doStringSync(`return FKClient.canon.encode(${luaExpr})`));

  it('never stringifies a Lua table address into an envelope', async () => {
    const c = await client();
    try {
      // `Self` is a live ClientPlayer: exactly the object the engine's own
      // `cbor.tagged_decoders[33001]` hands back when a payload names a player.
      const raw = encode(c, '{ mark = Self }');
      expect(raw).not.toMatch(/table: 0x/);
      expect(() => JSON.parse(raw)).not.toThrow();
      expect(JSON.parse(raw)).toEqual({ mark: { __tag: CBOR_TAG.PLAYER, value: 1 } });
    } finally {
      c.dispose();
    }
  }, LONG);

  it('encodes every live engine object as the TaggedRef the contract promises', async () => {
    const c = await client();
    try {
      const got = JSON.parse(encode(c, `{
        player  = Self,
        real    = Fk:getCardById(1),
        virtual = Fk:cloneCard("slash"),
        skill   = Fk.skills["jianxiong"],
        general = Fk.generals["caocao"],
      }`)) as Record<string, unknown>;

      for (const [what, ref] of Object.entries(got)) {
        expect(isTaggedRef(ref), `${what} -> ${JSON.stringify(ref)}`).toBe(true);
      }
      expect((got.player as TaggedRef).__tag).toBe(CBOR_TAG.PLAYER);
      expect(got.real).toEqual({ __tag: CBOR_TAG.REAL_CARD, value: 1 });
      expect((got.virtual as TaggedRef).__tag).toBe(CBOR_TAG.VIRTUAL_CARD);
      expect(got.skill).toEqual({ __tag: CBOR_TAG.SKILL, value: 'jianxiong' });
      expect(got.general).toEqual({ __tag: CBOR_TAG.GENERAL, value: 'caocao' });
    } finally {
      c.dispose();
    }
  }, LONG);

  it('still folds cbor s own simple and tagged wrappers', async () => {
    const c = await client();
    try {
      const got = JSON.parse(encode(c, `{
        n = cbor.null, u = cbor.undefined, t = cbor.tagged(33001, 5),
      }`));
      expect(got).toEqual({ n: '__null', u: '__undefined', t: { __tag: 33001, value: 5 } });
    } finally {
      c.dispose();
    }
  }, LONG);

  it('keeps a non-finite number JSON-legal, and round-trips it', async () => {
    const c = await client();
    try {
      const raw = encode(c, '{ inf = math.huge, ninf = -math.huge, nan = 0/0 }');
      expect(() => JSON.parse(raw)).not.toThrow();
      expect(JSON.parse(raw)).toEqual({ inf: '__inf', ninf: '__-inf', nan: '__nan' });
      // `revive` is the inverse the reply path uses; a marker must not survive
      // as a string, or a reply would carry the word "__inf" where a number was.
      const back = String(c.lua.doStringSync(
        `local v = FKClient.canon.revive(json.decode('{"a":"__inf","b":"__-inf"}'))
         return tostring(v.a) .. "," .. tostring(v.b)`,
      ));
      expect(back).toBe('inf,-inf');
    } finally {
      c.dispose();
    }
  }, LONG);

  /**
   * The production path, end to end.
   *
   * `AskForCardsAndChoice` has no client callback, so `ClientCallback` falls
   * through to `notifyUI(command, data)` with the CBOR-decoded payload
   * (`lua/client/client.lua:52`). Its `extra_data` is whatever the skill put
   * there, and a `ServerPlayer` in there arrives as a live `ClientPlayer` on
   * this side. The bytes below are the engine's own encoder emitting the same
   * `cbor.tagged(33001, id)` that `Player:__tocbor` emits.
   */
  it('delivers a request payload naming a player without losing the batch', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const c = await client();
    try {
      const session = await RoomSession.start(host, {
        roomId: 'wire-1', seed: SEED, seats: allBotSeats(8), ownerId: 1, timeout: 15,
        settings: { gameMode: 'aaa_role_mode' },
      }, {
        onEnvelope: (e) => {
          if (e.to === null || e.to === 1) c.deliverEnvelope(e);
        },
      });
      // Far enough for the client to hold a room with players in it.
      await session.advance({ maxResumes: 3 });
      expect(c.call<unknown>('GetPlayerGameData', 1)).toBeTruthy();

      const payload = String(c.lua.doStringSync(
        `return FKClient.b64.encode(cbor.encode({
           cards = { 1, 2 },
           extra_data = { who = cbor.tagged(33001, 1) },
         }))`,
      ));

      const seen: { command: string; data: unknown }[] = [];
      c.onNotifyUI((command, data) => seen.push({ command, data }));
      expect(() => c.deliverAll([
        { command: 'AskForCardsAndChoice', kind: 'request', payload } as never,
      ])).not.toThrow();

      const ask = seen.find((e) => e.command === 'AskForCardsAndChoice');
      expect(ask, `only saw ${seen.map((e) => e.command).join(',')}`).toBeTruthy();
      const extra = (ask!.data as { extra_data: { who: unknown } }).extra_data;
      expect(extra.who).toEqual({ __tag: CBOR_TAG.PLAYER, value: 1 });
      expect(c.errors()).toEqual([]);
    } finally {
      host.dispose();
      c.dispose();
    }
  }, LONG);

  /**
   * 锁定技, on the wire.
   *
   * `Animate{type="InvokeSkill"}` carried `name`, `player` and `skill_type`
   * and nothing else, and `GetSkillData` reported `active`/`notactive`,
   * `limit`, `wake`, `quest` and the switch-skill name but not
   * `Skill.Compulsory` (`lua/client/client_util.lua:421`). The only signal
   * left was the prefix of the *translated* description — 「锁定技，」 in
   * zh_CN, "(forced)" in en_US — which makes a rendering decision depend on
   * which language table is loaded. `lua/web/skillwire.lua` puts the engine's
   * own predicate on both instead.
   */
  it('says whether an invoked skill is compulsory, in both places it is asked', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const c = await client();
    try {
      // 马术 is a 锁定技; 奸雄 is not. Both are standard-pack, so this does not
      // move when the mobile roster does.
      expect(c.call<{ compulsory?: boolean }>('GetSkillData', 'mashu').compulsory).toBe(true);
      expect(c.call<{ compulsory?: boolean }>('GetSkillData', 'jianxiong').compulsory).toBe(false);

      const invoked: { name: string; compulsory: unknown }[] = [];
      c.onNotifyUI((command, data) => {
        if (command !== 'Animate') return;
        const d = data as { type?: string; name?: string; compulsory?: unknown };
        if (d.type === 'InvokeSkill' || d.type === 'InvokeUltSkill') {
          invoked.push({ name: String(d.name), compulsory: d.compulsory });
        }
      });
      const session = await RoomSession.start(host, {
        roomId: 'wire-3', seed: SEED, seats: allBotSeats(8), ownerId: 1, timeout: 15,
        settings: { gameMode: 'aaa_role_mode' },
      }, {
        onEnvelope: (e) => {
          if (e.to === null || e.to === 1) c.deliverEnvelope(e);
        },
      });
      expect((await session.advance()).over).toBe(true);

      expect(invoked.length).toBeGreaterThan(0);
      for (const inv of invoked) {
        expect(typeof inv.compulsory, `${inv.name} -> ${JSON.stringify(inv.compulsory)}`).toBe('boolean');
        // The host computed it and the client can compute it: one predicate,
        // two VMs, and they have to agree or there are two sources of truth.
        const asked = c.call<{ compulsory?: boolean } | undefined>('GetSkillData', inv.name);
        if (asked) expect(asked.compulsory, inv.name).toBe(inv.compulsory);
      }
      // A real game invokes both kinds; a run that only ever saw one would pass
      // the loop above while proving nothing.
      expect(new Set(invoked.map((i) => i.compulsory)).size).toBe(2);
    } finally {
      host.dispose();
      c.dispose();
    }
  }, LONG);

  /**
   * The naturally occurring case, with nothing hand-built.
   *
   * `Client:showVirtualCard` hands the UI a live `Card` (the web overlay wraps
   * it in a list, `lua/web/client.lua:195`). Every standard game produces a
   * few. They used to reach the room as the string `"<obj:BasicCard>"` — valid
   * JSON, and no way to tell which card it was; `src/room/state/store.ts:485`
   * has always documented them as TaggedRefs.
   */
  it('names the card in every ShowVirtualCard a real game emits', async () => {
    const host = await InProcessLuaHost.create(bundle(), {});
    const c = await client();
    try {
      const shown: unknown[][] = [];
      c.onNotifyUI((command, data) => {
        if (command === 'ShowVirtualCard') shown.push((data as unknown[][])[0] ?? []);
      });
      const session = await RoomSession.start(host, {
        roomId: 'wire-2', seed: SEED, seats: allBotSeats(8), ownerId: 1, timeout: 15,
        settings: { gameMode: 'aaa_role_mode' },
      }, {
        onEnvelope: (e) => {
          if (e.to === null || e.to === 1) c.deliverEnvelope(e);
        },
      });
      const res = await session.advance();
      expect(res.over).toBe(true);
      expect(c.errors()).toEqual([]);

      const cards = shown.flat();
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) {
        expect(isTaggedRef(card), `ShowVirtualCard carried ${JSON.stringify(card)}`).toBe(true);
      }
    } finally {
      host.dispose();
      c.dispose();
    }
  }, LONG);
});
