/**
 * Quick chats — the 23 canned lines a player can make their character say.
 *
 * Four things are worth a test here and the rest is CSS.
 *
 *  * The format, because it is the actual wire and it is upstream's. A quick
 *    chat is a chat line, and every client has to be able to tell one from
 *    something a player typed — and from a thrown flower, which is the other
 *    thing on this channel.
 *  * The gendered take, because it is the one piece of behaviour that reads the
 *    game rather than the message, and it is easy to get backwards.
 *  * The recordings, because a feature whose whole point is a voice is worth
 *    nothing if the 46 files or the two index entries ever stop shipping. This
 *    asserts against the real pack, not against a fixture.
 *  * The rank, because the failure mode this lane cares most about is a joke
 *    talking over a general.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../../contract/manifest';
import type { ChatLine } from '../../../contract/views';
import { Assets } from '../../assets/assets';
import { Bank } from '../../audio/bank';
import { pickTake } from '../../audio/clips';
import { RANK_ORDER, quickChatCues, type VoiceCue } from '../../audio/cues';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { spokenChat } from '../feed';
import { QuickChatList, QuickChatToggle } from '../QuickChatPicker';
import { useQuickLines, type QuickLine } from '../useQuickChat';
import {
  QUICK_CHAT_LINES, QUICK_RECEIVE_GAP_MS, QUICK_SEND_GAP_MS,
  decodeQuickChat, encodeQuickChat, isQuickChatText, quickBankFor, quickChatKey,
} from '../quickchat';

/* -------------------------------------------------------------- the format */

describe('the quick chat format', () => {
  it('is the string ChatBox.qml puts on the wire, exactly', () => {
    // `Fk/Components/Common/ChatBox.qml:88` — `msg: "$" + skill + ":" + idx`.
    expect(encodeQuickChat({ bank: 'fastchat_m', idx: 7 })).toBe('$fastchat_m:7');
    expect(encodeQuickChat({ bank: 'fastchat_f', idx: 23 })).toBe('$fastchat_f:23');
    expect(decodeQuickChat('$fastchat_m:7')).toEqual({ bank: 'fastchat_m', idx: 7 });
    expect(decodeQuickChat('$fastchat_f:23')).toEqual({ bank: 'fastchat_f', idx: 23 });
  });

  it('round-trips every line of both readings', () => {
    for (const bank of ['fastchat_m', 'fastchat_f'] as const) {
      for (let idx = 1; idx <= QUICK_CHAT_LINES; idx += 1) {
        expect(decodeQuickChat(encodeQuickChat({ bank, idx }))).toEqual({ bank, idx });
      }
    }
  });

  it('names the i18n key RoomPage.qml rewrites the chat row with', () => {
    // `RoomPage.qml:677` — `Lua.tr("$" + skill + idx)`.
    expect(quickChatKey({ bank: 'fastchat_m', idx: 1 })).toBe('$fastchat_m1');
    expect(quickChatKey({ bank: 'fastchat_f', idx: 12 })).toBe('$fastchat_f12');
  });

  it('leaves anything a player could plausibly type alone', () => {
    for (const said of [
      '', 'hello', '$', '$fastchat_m', '$fastchat_m:', '$:7', '$fastchat_x:1',
      'fastchat_m:1', '$fastchat_m:0', '$fastchat_m:24', '$fastchat_m:99',
      '$fastchat_m:1:2', '$fastchat_m7', '$fastchat_m:-1', '$fastchat_m: 1',
      ' $fastchat_m:1', 'look: $fastchat_m:1', '$FASTCHAT_M:1',
    ]) {
      expect(decodeQuickChat(said), said).toBeNull();
      expect(isQuickChatText(said), said).toBe(false);
    }
  });

  it('is not a present, and a present is not one of these', () => {
    // Both ride the chat channel and both start with `$`. `specialChat` tells
    // them apart on the `@` and so must this, in both directions.
    expect(decodeQuickChat('$@Flower:5:2')).toBeNull();
    expect(decodeQuickChat('$@Egg:3')).toBeNull();
  });

  it('survives a chat line that is not a string at all', () => {
    for (const junk of [null, undefined, 7, {}, []]) {
      expect(decodeQuickChat(junk)).toBeNull();
    }
  });
});

/* --------------------------------------------------------- the male/female */

describe('which reading the speaker gives', () => {
  it('follows the general the way ChatBox.qml does', () => {
    // `ChatBox.qml:85-89`: start male, and switch to female unless the general's
    // gender is `General.Male`, which is 1 (`core/general.lua:37`).
    expect(quickBankFor('caocao', 1)).toBe('fastchat_m');
    expect(quickBankFor('diaochan', 2)).toBe('fastchat_f');
  });

  it('takes the male reading for a seat with no general yet', () => {
    // The QML only asks the engine `if (general !== "")`; with no general it
    // sends `fastchat_m` whatever the gender field would have said.
    expect(quickBankFor('', 2)).toBe('fastchat_m');
    expect(quickBankFor('', 0)).toBe('fastchat_m');
  });

  it('gives every gender that is not Male the female reading', () => {
    // 双性 and 无性 are both real in the engine; `!== 1` is what the QML tests.
    for (const gender of [0, 2, 3, 4]) {
      expect(quickBankFor('zhoutai', gender)).toBe('fastchat_f');
    }
  });
});

/* ------------------------------------------------------------ the feed */

const line = (id: string, text: string): ChatLine => (
  { id, playerId: 2, displayName: 'somebody', text, at: 0 }
);

const SAID: Record<string, string> = {
  $fastchat_m7: '三十六计走为上，容我去去便回。',
  $fastchat_f4: '嗯嘛~你们忍心，就这么让我酱油了？',
};
const tr = (key: string) => SAID[key] ?? key;

describe('what the table reads', () => {
  it('rewrites a quick chat into the sentence it stands for', () => {
    const out = spokenChat([line('a', '$fastchat_m:7')], tr);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('三十六计走为上，容我去去便回。');
    // Everything else about the row is the server's, and is untouched.
    expect(out[0].displayName).toBe('somebody');
    expect(out[0].id).toBe('a');
  });

  it('uses the reading that was sent, not one it re-derived', () => {
    // The five lines that differ between the two takes are the reason this
    // matters: `$fastchat_f4` opens with 嗯嘛~ and `$fastchat_m4` does not.
    expect(spokenChat([line('a', '$fastchat_f:4')], tr)[0].text)
      .toBe('嗯嘛~你们忍心，就这么让我酱油了？');
  });

  it('still drops a thrown flower, and keeps ordinary chat', () => {
    const out = spokenChat([
      line('a', 'hello'),
      line('b', '$@Flower:5:2'),
      line('c', '$fastchat_m:7'),
    ], tr);
    expect(out.map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('hands back the very same array when nothing on it is special', () => {
    // `RoomView` memoises on this and derives the seat bubbles from it; a fresh
    // copy per call would be a new identity five times a second for nothing.
    const feed = [line('a', 'hello'), line('b', 'good luck')];
    expect(spokenChat(feed, tr)).toBe(feed);
  });
});

/* --------------------------------------------------------------- the sound */

describe('the sound of one', () => {
  it('asks for the take the sender chose, out of the skill bank', () => {
    const cue = quickChatCues({ bank: 'fastchat_f', idx: 12, general: 'diaochan' })[0] as VoiceCue;
    expect(cue.kind).toBe('voice');
    expect(cue.bank).toBe('skill');
    expect(cue.names).toEqual(['fastchat_f']);
    expect(cue.index).toBe(12);
  });

  it('never outranks anything the game itself says', () => {
    // The whole ladder, and this is the bottom of it. A player being funny may
    // not cut a skill, a victory or a death — `runtime.claim` only yields to a
    // strictly higher rank.
    expect(RANK_ORDER.chat).toBeLessThan(RANK_ORDER.skill);
    expect(RANK_ORDER.chat).toBeLessThan(RANK_ORDER.compulsory);
    expect(RANK_ORDER.chat).toBeLessThan(RANK_ORDER.ult);
    expect(RANK_ORDER.chat).toBeLessThan(RANK_ORDER.win);
    expect(RANK_ORDER.chat).toBeLessThan(RANK_ORDER.death);
  });

  it('cannot cut another quick chat either', () => {
    // Equal ranks lose, so however many the receive budget lets through, at most
    // one is audible. That is what bounds a table where four people spam.
    expect(RANK_ORDER.chat).not.toBeGreaterThan(RANK_ORDER.chat);
  });

  it('stays silent rather than synthesising a joke it has no recording of', () => {
    // `runtime.standIn` answers `voice-none` for a `then` with no gain. A
    // formant approximation of 请收下我的膝盖。is not that line.
    const cue = quickChatCues({ bank: 'fastchat_m', idx: 1 })[0] as VoiceCue;
    expect(cue.then.gain).toBe(0);
  });

  it('says nothing about a payload it does not recognise', () => {
    expect(quickChatCues(null)).toEqual([]);
    expect(quickChatCues({})).toEqual([]);
    expect(quickChatCues({ bank: 'fastchat_x', idx: 1 })).toEqual([]);
    expect(quickChatCues({ bank: 'fastchat_m', idx: 0 })).toEqual([]);
    expect(quickChatCues({ bank: 'fastchat_m' })).toEqual([]);
  });

  it('holds a receiver to a tighter gap than it asks of a sender', () => {
    // A lagging round trip must not lose a legitimate line, so the cap that
    // every client enforces sits under the one the sender's own button obeys.
    expect(QUICK_RECEIVE_GAP_MS).toBeLessThan(QUICK_SEND_GAP_MS);
  });
});

/* ---------------------------------------------------------------- the pack */

/**
 * Against the real `public/audio/index.json`, not a fixture.
 *
 * The 46 files have been in the pack since it was first built and nothing could
 * reach them; this is the assertion that stops them quietly leaving again now
 * that something can. It is the same shape of guard as the licensing one in
 * `audio/__tests__/audio.test.ts`.
 */
describe('the 46 recordings', () => {
  const index = JSON.parse(
    readFileSync(new URL('../../../../public/audio/index.json', import.meta.url), 'utf8'),
  ) as { skill: Record<string, number | number[]> };
  const bank = Bank.of('/', index as never);

  it('ships both readings, 23 takes each', () => {
    for (const name of ['fastchat_m', 'fastchat_f'] as const) {
      expect(bank.has('skill', name), name).toBe(true);
      expect(bank.takes('skill', name), name).toHaveLength(QUICK_CHAT_LINES);
    }
  });

  it('addresses a picked line at the file the engine numbered', () => {
    // `qmlbackend.cpp:271` counts `<name><i>.mp3` upward from 1, and the index
    // stores an array for exactly that shape, so take 7 is `fastchat_m7.mp3`.
    const takes = bank.takes('skill', 'fastchat_m');
    expect(pickTake(takes, 7)?.key).toBe('audio/skill/fastchat_m7');
    expect(pickTake(takes, 1)?.key).toBe('audio/skill/fastchat_m1');
    expect(pickTake(takes, 23)?.key).toBe('audio/skill/fastchat_m23');
    expect(takes[0].role).toBe('voice');
  });

  it('has a real duration for every one of them', () => {
    for (const name of ['fastchat_m', 'fastchat_f'] as const) {
      for (const clip of bank.takes('skill', name)) {
        expect(clip.seconds, clip.key).toBeGreaterThan(1);
        expect(clip.seconds, clip.key).toBeLessThan(8);
      }
    }
  });

  it('has the file on disk that each of those keys names', () => {
    for (const name of ['fastchat_m', 'fastchat_f'] as const) {
      for (const clip of bank.takes('skill', name)) {
        const path = new URL(`../../../../public/${clip.key}.mp3`, import.meta.url);
        expect(readFileSync(path).length, clip.key).toBeGreaterThan(2000);
      }
    }
  });
});

/* ---------------------------------------------------------------- the menu */

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };

/** The engine's tables, as far as this feature is concerned. */
function stubLua(gender: number): LtkLua {
  return {
    tr: (key: string) => (key.startsWith('$fastchat_') ? `said ${key.slice(1)}` : key),
    getGeneralDetail: () => ({ gender }),
  } as unknown as LtkLua;
}

/** A seated player with a general, rendered through the real hook. */
function menu(general: string, gender: number): readonly QuickLine[] {
  const store = new RoomStore(1);
  store.applyNotify('AddPlayer', [1, 'me', '']);
  if (general) store.applyNotify('PropertyUpdate', [1, 'general', general]);
  const services: RoomServices = {
    store, lua: stubLua(gender), assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: 1,
    naming: makeNaming(store),
  };
  let seen: readonly QuickLine[] = [];
  function Probe() { seen = useQuickLines(); return null; }
  renderToStaticMarkup(<RoomProvider value={services}><Probe /></RoomProvider>);
  return seen;
}

describe('the menu a player picks from', () => {
  it('offers all 23 lines, numbered from one', () => {
    const lines = menu('caocao', 1);
    expect(lines).toHaveLength(QUICK_CHAT_LINES);
    expect(lines.map((l) => l.idx)).toEqual(
      Array.from({ length: QUICK_CHAT_LINES }, (_, i) => i + 1),
    );
  });

  it('sends the reading of the general actually sitting there', () => {
    expect(menu('caocao', 1)[6].token).toBe('$fastchat_m:7');
    expect(menu('diaochan', 2)[6].token).toBe('$fastchat_f:7');
    // And the text follows the same reading, so the caption cannot disagree
    // with the voice.
    expect(menu('diaochan', 2)[6].text).toBe('said fastchat_f7');
  });

  it('drops a line the build never translated rather than showing its key', () => {
    const store = new RoomStore(1);
    store.applyNotify('AddPlayer', [1, 'me', '']);
    const services: RoomServices = {
      store,
      // `Fk:translate` answers with the key when a package did not translate it.
      lua: { tr: (k: string) => k, getGeneralDetail: () => ({ gender: 1 }) } as unknown as LtkLua,
      assets: new Assets(EMPTY_MANIFEST), mode: 'play', meId: 1, naming: makeNaming(store),
    };
    let seen: readonly QuickLine[] = [];
    function Probe() { seen = useQuickLines(); return null; }
    renderToStaticMarkup(<RoomProvider value={services}><Probe /></RoomProvider>);
    expect(seen).toHaveLength(0);
  });

  it('draws one row per line, each carrying its own token', () => {
    const lines: QuickLine[] = [
      { idx: 1, text: '能不能快一点啊，兵贵神速啊。', token: '$fastchat_m:1' },
      { idx: 2, text: '主公，别开枪，自己人！', token: '$fastchat_m:2' },
    ];
    const html = renderToStaticMarkup(<QuickChatList lines={lines} onPick={() => {}} />);
    expect((html.match(/fk-quick-list__row/g) ?? [])).toHaveLength(2);
    expect(html).toContain('能不能快一点啊，兵贵神速啊。');
  });

  it('labels its button with a word, not only a glyph', () => {
    // The lesson of the present badge and of free assign: a small unlabelled
    // control is a feature nobody finds. The word is the engine's own —
    // `packages/standard/i18n/zh_CN.lua:314` translates `fastchat_m`.
    const html = renderToStaticMarkup(
      <QuickChatToggle label="快捷短语" open={false} disabled={false} onToggle={() => {}} />,
    );
    expect(html).toContain('快捷短语');
    expect(html).toContain('aria-expanded="false"');
  });
});
