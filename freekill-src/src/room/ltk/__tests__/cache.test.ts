/**
 * What `LtkLua` is allowed to remember, and what it must ask again.
 *
 * The facade answers the same few hundred questions tens of thousands of times
 * a game — 132,676 translations on a profiled host seat over three games — so
 * the ones whose answers cannot change are answered once. These tests are the
 * other half of that bargain: they pin the invalidation, because a cache that
 * hands back the previous language, or the previous card, is a worse bug than
 * the round trip it saved.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LuaClient } from '../../../contract/engine';
import { MainThreadLuaClient } from '../../../engine/luaClient';
import { bundle } from '../../../engine/__tests__/support';
import { getLanguage, resetLanguage, setLanguage, withLanguage } from '../../../i18n';
import { FixtureLuaClient } from '../../fixture/FixtureLuaClient';
import { notifyFrames } from '../../harness/fixtureStream';
import { LtkLua } from '../LtkLua';

afterEach(() => { resetLanguage(); });

/** A client that counts what it was asked and answers from a table it owns. */
function spyClient(table: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const answers: Record<string, unknown> = { ...table };
  const client = {
    call: vi.fn((fn: string, ...args: unknown[]) => {
      calls.push(`${fn}(${args.join(',')})`);
      return answers[`${fn}:${args[0]}`];
    }),
    interact: vi.fn(),
    replyToServer: vi.fn(),
  } as unknown as LuaClient;
  const countOf = (prefix: string) => calls.filter((c) => c.startsWith(prefix)).length;
  return { client, calls, answers, countOf, lua: new LtkLua(client) };
}

describe('translation caching', () => {
  it('asks the VM once for a key and answers the rest from memory', () => {
    const { lua, countOf } = spyClient({ 'Translate:slash': '杀' });
    expect(lua.tr('slash')).toBe('杀');
    for (let i = 0; i < 50; i++) expect(lua.tr('slash')).toBe('杀');
    expect(countOf('Translate(slash)')).toBe(1);
  });

  it('remembers a key that translates to itself, which is most of them', () => {
    // `Fk:translate` returns the key unchanged when it does not know it, and
    // that is an answer — re-asking for it is the same round trip for the same
    // "no". This is the case that would silently stay uncached if the cache
    // used a falsy check instead of a real miss.
    const { lua, countOf } = spyClient({ 'Translate:__nope__': '__nope__' });
    expect(lua.tr('__nope__')).toBe('__nope__');
    expect(lua.tr('__nope__')).toBe('__nope__');
    expect(countOf('Translate(__nope__)')).toBe(1);
  });

  it('never calls the VM for the empty key', () => {
    const { lua, calls } = spyClient();
    expect(lua.tr('')).toBe('');
    expect(calls).toEqual([]);
  });

  it('keeps asking a client that cannot answer, rather than caching silence', () => {
    const { lua, countOf } = spyClient(); // every answer is undefined
    lua.tr('slash');
    lua.tr('slash');
    expect(countOf('Translate(slash)')).toBe(2);
  });
});

describe('a language toggle', () => {
  /**
   * The production seam. `withLanguage` reads `getLanguage()` at call time, so
   * the store moving is the only signal that the answers changed — nothing
   * about the client itself is different.
   */
  it('answers in the newly selected language, not the one before it', () => {
    const { lua, answers } = spyClient({ 'Translate:slash': '杀' });
    expect(lua.tr('slash')).toBe('杀');

    // What `withLanguage` does on a toggle: the same client, same key, a
    // different answer. Nothing about the client's identity changed.
    setLanguage('en_US');
    answers['Translate:slash'] = 'Slash';
    expect(lua.tr('slash')).toBe('Slash');

    setLanguage('zh_CN');
    answers['Translate:slash'] = '杀';
    expect(lua.tr('slash')).toBe('杀');
  });

  it('reaches the client again on a switch back, so the VM is told its language', () => {
    // `withLanguage` pushes `FkWebSetLanguage` into the VM on the first `call`
    // after a switch, and `tr` is by far the most frequent call. A cache that
    // served a warm hit on a switch *back* would leave the VM rendering its own
    // finished prompts in the language the player just left.
    const { lua, countOf } = spyClient({ 'Translate:slash': '杀' });
    lua.tr('slash');
    setLanguage('en_US');
    lua.tr('slash');
    setLanguage('zh_CN');
    lua.tr('slash');
    expect(countOf('Translate(slash)')).toBe(3);
  });

  it('follows a switch made on the client instead of the store', () => {
    // The harness and `ltk.test.ts` flip `FixtureLuaClient.language` directly.
    // That is a second language authority and the cache has to watch it too.
    const client = new FixtureLuaClient({ frames: notifyFrames });
    const lua = new LtkLua(client);
    expect(lua.tr('slash')).toBe('杀');
    client.language = 'en_US';
    expect(lua.tr('slash')).toBe('Slash');
    client.language = 'zh_CN';
    expect(lua.tr('slash')).toBe('杀');
  });

  it('re-reads the artist credit in the new language too', () => {
    const client = new FixtureLuaClient({ frames: notifyFrames });
    const lua = new LtkLua(client);
    expect(lua.getIllustrator('caocao')).toBe('KayaK');
    // Upstream's `en_US` carries no `illustrator:` keys, so the credit really
    // does disappear in English. A cache that ignored the switch would keep
    // showing "KayaK" — and, worse, keep hiding a credit that came back.
    client.language = 'en_US';
    expect(lua.getIllustrator('caocao')).toBeUndefined();
    client.language = 'zh_CN';
    expect(lua.getIllustrator('caocao')).toBe('KayaK');
  });
});

describe('the artist credit', () => {
  it('costs one translation however many portraits ask for it', () => {
    const { lua, countOf } = spyClient({ 'Translate:illustrator:caocao': 'KayaK' });
    for (let i = 0; i < 40; i++) expect(lua.getIllustrator('caocao')).toBe('KayaK');
    expect(countOf('Translate(illustrator:caocao)')).toBe(1);
  });

  it('remembers "there is no credit" as well as a credit', () => {
    // `anjiang` has no `illustrator:` key, so the key comes back unchanged and
    // the answer is `undefined`. A cache that only stored strings would ask the
    // VM again on every face-down portrait, which is most of them early on.
    const { lua, countOf } = spyClient({ 'Translate:illustrator:anjiang': 'illustrator:anjiang' });
    expect(lua.getIllustrator('anjiang')).toBeUndefined();
    expect(lua.getIllustrator('anjiang')).toBeUndefined();
    expect(countOf('Translate(illustrator:anjiang)')).toBe(1);
  });

  it('keeps asking a client that could not answer at all', () => {
    // The same rule `tr` follows: silence from the client is not an answer, and
    // must not be frozen in as "this general has no credit".
    const { lua, countOf } = spyClient(); // answers undefined
    lua.getIllustrator('caocao');
    lua.getIllustrator('caocao');
    expect(countOf('Translate(illustrator:caocao)')).toBe(2);
  });
});

describe('general data', () => {
  it('asks the VM once per general', () => {
    const { lua, countOf } = spyClient({ 'GetGeneralData:huatuo': { kingdom: 'qun', hp: 3 } });
    for (let i = 0; i < 20; i++) expect(lua.getGeneralData('huatuo')).toMatchObject({ kingdom: 'qun' });
    expect(countOf('GetGeneralData(huatuo)')).toBe(1);
  });

  it('keeps one general apart from another', () => {
    const { lua } = spyClient({
      'GetGeneralData:huatuo': { kingdom: 'qun', hp: 3 },
      'GetGeneralData:caocao': { kingdom: 'wei', hp: 4 },
    });
    expect(lua.getGeneralData('huatuo').kingdom).toBe('qun');
    expect(lua.getGeneralData('caocao').kingdom).toBe('wei');
    expect(lua.getGeneralData('huatuo').kingdom).toBe('qun');
  });

  it('survives a language switch, because it carries no language', () => {
    // `GetGeneralData` copies raw keys — `wei`, `qun` — and the room translates
    // them itself. Dropping this cache on a toggle would be pure waste.
    const { lua, countOf } = spyClient({ 'GetGeneralData:caocao': { kingdom: 'wei' } });
    expect(lua.getGeneralData('caocao').kingdom).toBe('wei');
    setLanguage('en_US');
    expect(lua.getGeneralData('caocao').kingdom).toBe('wei');
    expect(countOf('GetGeneralData(caocao)')).toBe(1);
  });

  it('hands out a snapshot no caller can edit into the next answer', () => {
    const shared = { kingdom: 'wei', hp: 4 };
    const { lua } = spyClient({ 'GetGeneralData:caocao': shared });
    const first = lua.getGeneralData('caocao') as { kingdom: string };
    expect(() => { (first as { kingdom: string }).kingdom = 'shu'; }).toThrow();
    expect(lua.getGeneralData('caocao').kingdom).toBe('wei');
    // ...and the client's own object was never frozen on its behalf.
    expect(Object.isFrozen(shared)).toBe(false);
  });

  it('passes a client that cannot answer straight through, uncached', () => {
    const { lua, countOf } = spyClient(); // answers undefined
    expect(lua.getGeneralData('caocao')).toBeUndefined();
    expect(lua.getGeneralData('caocao')).toBeUndefined();
    expect(countOf('GetGeneralData(caocao)')).toBe(2);
  });
});

describe('what is deliberately not cached', () => {
  /**
   * `GetCardData` reads `Fk:getCardById(id, not filterCard)`, which under
   * `filterCard` is `Fk.filtered_cards[id]` — rewritten mid-game by lock-view
   * skills — and copies `card.mark`, which `Room:setCardMark` changes. Nothing
   * on this side sees either happen, so the question is asked every time.
   */
  it('asks the VM for card data every single time', () => {
    const { lua, answers, countOf } = spyClient({
      'GetCardData:7': { cid: 7, name: 'slash', suit: 'spade' },
    });
    expect(lua.getCardData(7, true).name).toBe('slash');

    // A lock-view skill has since rewritten `Fk.filtered_cards[7]`.
    answers['GetCardData:7'] = { cid: 7, name: 'slash', virt_name: 'fire__slash', suit: 'heart' };
    expect(lua.getCardData(7, true).virt_name).toBe('fire__slash');
    expect(lua.getCardData(7, true).suit).toBe('heart');
    expect(countOf('GetCardData(7,true)')).toBe(3);
  });

  it('asks the VM for skill data every time, because the name is dynamic', () => {
    // `GetSkillData` resolves `Fk:getSkillName(name, nil, Self)`, which is a
    // dynamic name against the viewing player and the current language.
    const { lua, countOf } = spyClient({ 'GetSkillData:zhiheng': { skill: '制衡' } });
    lua.getSkillData('zhiheng');
    lua.getSkillData('zhiheng');
    expect(countOf('GetSkillData(zhiheng)')).toBe(2);
  });

  it('never answers a player-state question from memory', () => {
    const { lua, calls } = spyClient();
    lua.getMySkills();
    lua.getMySkills();
    lua.getPlayerHandcards(3);
    lua.getPlayerHandcards(3);
    lua.distanceTo(1, 2);
    lua.distanceTo(1, 2);
    expect(calls).toEqual([
      'GetMySkills()', 'GetMySkills()',
      'GetPlayerHandcards(3)', 'GetPlayerHandcards(3)',
      'DistanceTo(1,2)', 'DistanceTo(1,2)',
    ]);
  });
});

describe('two rooms', () => {
  it('do not share a cache', () => {
    const a = spyClient({ 'Translate:slash': '杀' });
    const b = spyClient({ 'Translate:slash': 'Slash' });
    expect(a.lua.tr('slash')).toBe('杀');
    expect(b.lua.tr('slash')).toBe('Slash');
  });
});

/**
 * The same toggle, against a real client VM through the real seam.
 *
 * The unit tests above can only prove the cache reacts to the signals it is
 * given. This proves the signals are the right ones: a real `MainThreadLuaClient`,
 * wrapped by `withLanguage(client, getLanguage)` exactly as `RoomPage` wraps it,
 * driven by the app's own language store.
 */
describe('a language toggle through the production seam', () => {
  it('retranslates, and takes the VM with it — in both directions', async () => {
    const raw = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
    try {
      const lua = new LtkLua(withLanguage(raw, getLanguage));

      expect(lua.tr('slash')).toBe('杀');
      expect(lua.tr('slash')).toBe('杀'); // now warm
      expect(raw.call('FkWebSetLanguage')).toBe('zh_CN');

      setLanguage('en_US');
      expect(lua.tr('slash')).toBe('Slash');
      // The first `tr` after the switch had to reach the client, because that
      // is what pushes `FkWebSetLanguage` into the VM — and the VM's own
      // language is what renders the finished prompts JS cannot translate.
      expect(raw.call('FkWebSetLanguage')).toBe('en_US');

      // ...and the switch BACK, where a per-language cache would have served a
      // warm hit, made no call, and left the VM in English.
      setLanguage('zh_CN');
      expect(lua.tr('slash')).toBe('杀');
      expect(raw.call('FkWebSetLanguage')).toBe('zh_CN');
    } finally {
      raw.dispose();
    }
  }, 120_000);

  it('answers a general the same way whatever the language', async () => {
    const raw = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
    try {
      const lua = new LtkLua(withLanguage(raw, getLanguage));
      expect(lua.getGeneralData('caocao').kingdom).toBe('wei');
      expect(lua.getIllustrator('caocao')).toBe('KayaK');

      setLanguage('en_US');
      // Raw keys, not text: the room translates `wei` itself. The cache is
      // right to hold this across a toggle.
      expect(lua.getGeneralData('caocao').kingdom).toBe('wei');
      // The credit is a translation, so it must be whatever a cache that never
      // saw Chinese would say — not what this one was holding.
      const cold = new LtkLua(withLanguage(raw, getLanguage));
      expect(lua.getIllustrator('caocao')).toBe(cold.getIllustrator('caocao'));

      setLanguage('zh_CN');
      expect(lua.getIllustrator('caocao')).toBe('KayaK');
    } finally {
      raw.dispose();
    }
  }, 120_000);
});
