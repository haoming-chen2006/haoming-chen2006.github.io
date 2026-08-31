/**
 * The `LTKLuaUtil` equivalent, against a fixture-backed fake `LuaClient`.
 *
 * The facade is deliberately thin: its job is to be the single door, not to add
 * behaviour. These tests assert the door opens onto the right function names and
 * that nothing is answered locally.
 */
import { describe, expect, it, vi } from 'vitest';
import type { LuaClient } from '../../contract/engine';
import { FixtureLuaClient } from '../fixture/FixtureLuaClient';
import { LtkLua } from '../ltk/LtkLua';
import { processPrompt, seatChar } from '../ltk/prompt';
import { notifyFrames } from '../harness/fixtureStream';

function fixture() {
  const client = new FixtureLuaClient({ frames: notifyFrames });
  return { client, lua: new LtkLua(client) };
}

describe('LtkLua', () => {
  it('translates through the client, both languages', () => {
    const { client, lua } = fixture();
    expect(lua.tr('slash')).toBe('杀');
    client.language = 'en_US';
    expect(lua.tr('slash')).toBe('Slash');
  });

  it('returns the key unchanged for an unknown string, as Fk:translate does', () => {
    const { lua } = fixture();
    expect(lua.tr('__not_a_key__')).toBe('__not_a_key__');
  });

  it('reads real card data out of the engine dump', () => {
    const { lua } = fixture();
    const c = lua.getCardData(1);
    expect(c).toMatchObject({ cid: 1, name: 'slash', suit: 'spade', number: 7 });
    expect(lua.tr(c.name!)).toBe('杀');
  });

  it('reads real general data and the inline artist credit', () => {
    const { lua } = fixture();
    expect(lua.getGeneralData('huatuo')).toMatchObject({ kingdom: 'qun', hp: 3, maxHp: 3 });
    // The packages ship `illustrator:<general>` in their i18n tables; the spec
    // asks for those credits to reach the UI.
    expect(lua.getIllustrator('caocao')).toBe('KayaK');
    expect(lua.getIllustrator('anjiang')).toBeUndefined();
  });

  it('sends interactions as UpdateRequestUI(elemType, id, action, data)', () => {
    const { client, lua } = fixture();
    lua.interact('CardItem', 25, 'click', { selected: true });
    lua.interact('Button', 'OK');
    lua.interact('Interaction', '1', 'update', 'nose');
    expect(client.interactions).toEqual([
      { elemType: 'CardItem', id: 25, action: 'click', data: { selected: true } },
      { elemType: 'Button', id: 'OK', action: 'click', data: undefined },
      { elemType: 'Interaction', id: '1', action: 'update', data: 'nose' },
    ]);
  });

  it('resolves a tagged card reference instead of walking it', () => {
    const { lua } = fixture();
    // `{__tag: 33002}` means "the Card with this id" and reaches the whole
    // engine object graph if dereferenced in Lua; the client resolves it.
    expect(lua.resolve({ __tag: 33002, value: 1 })).toMatchObject({ name: 'slash' });
  });

  it('does not answer a rules question locally', () => {
    const call = vi.fn((..._args: unknown[]) => true);
    const client = { call, interact: vi.fn() } as unknown as LuaClient;
    const lua = new LtkLua(client);
    lua.cardFitPattern('slash', 'slash');
    lua.distanceTo(1, 5);
    lua.getSkillStatus('jizhi');
    lua.getCardProhibitReason(7);
    expect(call.mock.calls.map((c: unknown[]) => c[0])).toEqual([
      'CardFitPattern', 'DistanceTo', 'GetSkillStatus', 'GetCardProhibitReason',
    ]);
  });

  /**
   * The arity matters, and this test used to hide that it was wrong.
   *
   * `contract/engine.ts` declares `replyToServer(command, reply)`. Asserting
   * `toHaveBeenCalledWith(['zhouyu'])` against a `vi.fn()` accepted a one-arg
   * call happily — and against the real client VM that put the payload in the
   * command slot and sent `null` as the answer, so a player who chose a general
   * silently never answered and the room hung. A mock cannot check an arity its
   * assertion does not name.
   */
  it('answers a dialog through the contract s two-argument replyToServer', () => {
    const replyToServer = vi.fn();
    const call = vi.fn((..._args: unknown[]) => undefined);
    const lua = new LtkLua({ call, replyToServer, interact: vi.fn() } as unknown as LuaClient);
    lua.replyToServer(['zhouyu']);
    expect(replyToServer).toHaveBeenCalledWith('ReplyToServer', ['zhouyu']);
    expect(replyToServer.mock.calls[0]).toHaveLength(2);
    expect(call).not.toHaveBeenCalled();
  });
});

describe('prompt formatting', () => {
  const naming = {
    seatNumber: (p: number) => p,
    general: (p: number) => (p === 5 ? 'huatuo' : 'anjiang'),
    deputyGeneral: () => '',
    selfId: () => 1,
  };

  it('substitutes %src from a real prompt key in the recording', () => {
    const { lua } = fixture();
    // `#slash-jink:5` — "%src used a Slash against you"
    const out = processPrompt(lua, naming, '#slash-jink:5');
    expect(out).toContain('华佗');
    expect(out).not.toContain('%src');
  });

  it('substitutes %arg positions', () => {
    const { lua } = fixture();
    const out = processPrompt(lua, naming, '#AskForDiscard:::3:3');
    expect(out).not.toContain('%arg');
    expect(out).toContain('3');
  });

  it('falls back to seat wording while a general is face down', () => {
    const { lua } = fixture();
    const out = processPrompt(lua, naming, '#fire_attack-show:8');
    expect(out).not.toContain('%src');
  });

  it('numbers seats the way the Qt client does', () => {
    expect(seatChar(1)).toBe('一');
    expect(seatChar(8)).toBe('八');
  });
});

describe('FixtureLuaClient', () => {
  it('reports the calls it could not answer instead of returning silence', () => {
    const { client, lua } = fixture();
    lua.distanceTo(1, 2);
    lua.getCardProhibitReason(1);
    expect([...client.unanswered.values()].map((u) => u.fn).sort())
      .toEqual(['DistanceTo', 'GetCardProhibitReason']);
  });

  it('replays deterministically from the top', () => {
    const a = new FixtureLuaClient({ frames: notifyFrames });
    const b = new FixtureLuaClient({ frames: notifyFrames });
    const seenA: string[] = [];
    const seenB: string[] = [];
    a.onNotifyUI((c) => seenA.push(c as string));
    b.onNotifyUI((c) => seenB.push(c as string));
    while (a.step()) { /* run */ }
    while (b.step()) { /* run */ }
    expect(seenA).toEqual(seenB);
    expect(seenA.length).toBe(notifyFrames.length + 1); // + the synthetic UpdateDrawPile
  });
});
