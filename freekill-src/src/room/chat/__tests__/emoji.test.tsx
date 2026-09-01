/**
 * Chat emoji, from the wire format up.
 *
 * The format is not ours. `{emoji12}` inside the text of a chat message is what
 * the Qt client writes and what it reads, and the whole point of this feature is
 * that a web player and a Qt player see the same thing. So the first test here
 * reads the pattern out of the engine checkout rather than trusting a
 * transcription of it, and the rest are the two surfaces it has to appear on —
 * the chat panel, and the bubble over the speaker's seat.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import devManifest from '../../dev/data/asset-manifest.dev.json';
import type { AssetManifest } from '../../../contract/manifest';
import { Assets } from '../../assets/assets';
import type { LtkLua } from '../../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../../RoomContext';
import { RoomStore } from '../../state/store';
import { Photo } from '../../components/Photo';
import { ChatText } from '../ChatText';
import { EmojiGrid, EmojiToggle } from '../EmojiPicker';
import { emojiAssetKey, emojiToken, hasEmoji, insertToken, parseChat } from '../emoji';

const assets = new Assets(devManifest as unknown as AssetManifest);
const resolve = (id: string) => assets.emoji(id);

/* ------------------------------------------------------------- the format */

describe('the engine s emoji token', () => {
  /**
   * `Fk/Pages/Common/RoomPage.qml:691` and `Fk/Components/Common/ChatBox.qml:60`
   * are the two halves of the contract — the reader and the writer. If either
   * moves, this build starts speaking a dialect of the protocol and the failure
   * shows up as raw `{emoji3}` in somebody else's chat log, which nothing else
   * in this suite would catch.
   *
   * Skipped when the engine checkout is not beside us; it is an input to the
   * asset build (`scripts/build-assets.mjs`), not a dependency of the app.
   */
  const root = process.env.FK_ROOT || '/Users/haoming/FreeKill';
  const roomPage = join(root, 'Fk/Pages/Common/RoomPage.qml');
  const chatBox = join(root, 'Fk/Components/Common/ChatBox.qml');
  const haveEngine = existsSync(roomPage) && existsSync(chatBox);

  it.runIf(haveEngine)('matches the pattern the Qt client reads', () => {
    const qml = readFileSync(roomPage, 'utf8');
    expect(qml).toContain(String.raw`msg.replace(/\{emoji([0-9]+)\}/g,`);
    expect(qml).toContain('/image/emoji/$1.png');

    // Ours, over the same input the QML regex is handed.
    expect(parseChat('a{emoji7}b')).toEqual([
      { kind: 'text', text: 'a' },
      { kind: 'emoji', id: '7', token: '{emoji7}' },
      { kind: 'text', text: 'b' },
    ]);
  });

  it.runIf(haveEngine)('writes the token the Qt client writes', () => {
    const qml = readFileSync(chatBox, 'utf8');
    expect(qml).toContain('"{emoji" + index + "}"');
    expect(emojiToken(12)).toBe('{emoji12}');
    // ChatBox offers `model: 59` cells, indexed from zero.
    expect(qml).toContain('model: 59');
  });

  it.runIf(haveEngine)('resolves a token to the file the Qt client would load', () => {
    expect(emojiAssetKey('12')).toBe('image/emoji/12.png');
    expect(existsSync(join(root, 'image/emoji/12.png'))).toBe(true);
  });
});

/* -------------------------------------------------------------- the parser */

describe('splitting a chat line', () => {
  it('finds a token anywhere, and every one of them', () => {
    expect(parseChat('{emoji0}')).toEqual([{ kind: 'emoji', id: '0', token: '{emoji0}' }]);
    expect(parseChat('{emoji1}{emoji2}').filter((s) => s.kind === 'emoji')).toHaveLength(2);
    expect(parseChat('hi {emoji5} there {emoji6}').filter((s) => s.kind === 'emoji')).toHaveLength(2);
  });

  it('leaves a line with no token as one run of text', () => {
    expect(parseChat('打得好')).toEqual([{ kind: 'text', text: '打得好' }]);
    expect(parseChat('')).toEqual([{ kind: 'text', text: '' }]);
    expect(hasEmoji('打得好')).toBe(false);
    expect(hasEmoji('打得好{emoji3}')).toBe(true);
  });

  it('does not invent tokens out of things that merely look like one', () => {
    for (const s of ['{emoji}', '{emojiX}', '{ emoji1 }', 'emoji1', '{EMOJI1}', '{emoji-1}']) {
      expect(parseChat(s), s).toEqual([{ kind: 'text', text: s }]);
    }
  });

  it('reproduces its input exactly', () => {
    // The total that makes the fallback honest: an unrecognised token can be
    // rendered as its own literal text because the parser never lost it.
    for (const line of ['', 'a', '{emoji1}', 'a{emoji1}b{emoji2}', '{emoji007}x', '你好{emoji58}']) {
      const back = parseChat(line).map((s) => (s.kind === 'text' ? s.text : s.token)).join('');
      expect(back, line).toBe(line);
    }
  });

  it('keeps the digits verbatim, because they are a filename', () => {
    // Qt substitutes `$1` straight into the path, so `{emoji007}` asks for
    // `007.png`. Normalising it to `7` would answer a question nobody asked.
    const [seg] = parseChat('{emoji007}');
    expect(seg).toEqual({ kind: 'emoji', id: '007', token: '{emoji007}' });
    expect(resolve('007')).toBeUndefined();
  });

  it('does not carry regex state between lines', () => {
    // A module-level /g regex would skip every other call. This is the guard.
    for (let i = 0; i < 3; i++) expect(parseChat('{emoji4}')).toHaveLength(1);
  });
});

/* ------------------------------------------------------- inserting a token */

describe('inserting an emoji into a draft', () => {
  it('inserts at the caret rather than appending', () => {
    expect(insertToken('ab', '{emoji1}', 1, 1, 300)).toEqual({ text: 'a{emoji1}b', caret: 9 });
  });

  it('replaces the selection', () => {
    expect(insertToken('abcd', '{emoji1}', 1, 3, 300)).toEqual({ text: 'a{emoji1}d', caret: 9 });
  });

  it('refuses rather than clipping a token in half', () => {
    // `ChatBox.qml` lets `maximumLength: 300` truncate, which leaves `{emo` in
    // the message. A full draft keeps the words the player actually typed.
    const full = 'x'.repeat(295);
    expect(insertToken(full, '{emoji1}', 295, 295, 300)).toEqual({ text: full, caret: 295 });
  });

  it('survives a caret the browser has not caught up with', () => {
    expect(insertToken('abc', '{emoji1}', 99, 99, 300).text).toBe('abc{emoji1}');
    expect(insertToken('abc', '{emoji1}', -4, -4, 300).text).toBe('{emoji1}abc');
  });
});

/* ------------------------------------------------------- the shipped set */

describe('the artwork the build carries', () => {
  it('comes through the same content-hashed manifest as every other image', () => {
    expect(assets.emojiIds()).toHaveLength(59);
    expect(assets.emojiIds().slice(0, 3)).toEqual(['0', '1', '2']);
    // Numeric order, not the manifest's lexicographic one ("10" before "2").
    expect(assets.emojiIds().at(-1)).toBe('58');
    expect(resolve('12')).toBeDefined();
    expect(resolve('59')).toBeUndefined();
  });
});

/* ------------------------------------------------------------- the surfaces */

describe('rendering a line of chat', () => {
  it('draws a known token as artwork, at text size', () => {
    const html = renderToStaticMarkup(<ChatText text="打得好{emoji3}" resolve={resolve} />);
    expect(html).toContain('打得好');
    expect(html).toContain('class="fk-emoji"');
    expect(html).toContain(assets.emoji('3') as string);
    // No width/height attribute: `chat.css` sizes it in `em` so it matches
    // whatever text it sits in, unlike the QML's hardcoded 16 px.
    expect(html).not.toMatch(/height="\d+"/);
  });

  it('draws an unknown token as its own text, not a broken image', () => {
    // What a newer client's emoji looks like here. It is not an error.
    const html = renderToStaticMarkup(<ChatText text="nice {emoji9001}" resolve={resolve} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('{emoji9001}');
    expect(html).toContain('fk-emoji-unknown');
  });

  it('renders the message as text, never as markup', () => {
    // Chat is the one surface a stranger types the bytes of.
    const html = renderToStaticMarkup(
      <ChatText text={'<img src=x onerror=alert(1)>{emoji1}'} resolve={resolve} />,
    );
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html.match(/<img/g)).toHaveLength(1);
  });
});

describe('the bubble over a seat', () => {
  it('draws the emoji the speaker sent, not the token they sent it as', () => {
    const html = seat('哈哈{emoji8}');
    expect(html).toContain('fk-bubble');
    expect(html).toContain('哈哈');
    expect(html).toContain(assets.emoji('8') as string);
    // The token survives only as the picture's `alt`, never as visible text.
    expect(html).not.toContain('fk-emoji-unknown');
    expect(html).not.toMatch(/>[^<]*\{emoji8\}/);
  });

  it('says nothing at all when the seat has not spoken', () => {
    expect(seat(undefined)).not.toContain('fk-bubble');
  });
});

describe('the picker', () => {
  it('costs nothing until it is opened', () => {
    // 59 pictures the first paint must not fetch. The button is all there is
    // until somebody presses it, so there is no <img> to make a request from —
    // and the panel mounts the grid only while `picking` is true.
    const html = renderToStaticMarkup(
      <EmojiToggle ids={assets.emojiIds()} open={false} onToggle={() => {}} />,
    );
    expect(html).toContain('fk-emoji-toggle');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('<img');

    const composer = readFileSync(new URL('../ChatComposer.tsx', import.meta.url), 'utf8');
    expect(composer).toMatch(/\{picking \? <EmojiGrid/);
  });

  it('offers exactly what the build shipped, once opened', () => {
    const html = renderToStaticMarkup(
      <EmojiGrid ids={assets.emojiIds()} resolve={resolve} onPick={() => {}} />,
    );
    expect(html.match(/<img/g)).toHaveLength(59);
    expect(html).toContain(assets.emoji('0') as string);
    expect(html).toContain('aria-label="{emoji58}"');
  });

  it('is not there at all in a build that shipped no emoji', () => {
    expect(renderToStaticMarkup(
      <EmojiToggle ids={[]} open={false} onToggle={() => {}} />,
    )).toBe('');
    expect(renderToStaticMarkup(
      <EmojiGrid ids={[]} resolve={resolve} onPick={() => {}} />,
    )).toBe('');
  });

  it('is a block in the chat column, not a layer over the table', () => {
    // The regression this feature is one lane away from repeating: a panel that
    // covers the table swallows the click meant for a card. The first cut of
    // this picker floated over the chat scrollback and, measured on a real
    // table, landed 50 px left of the side panel and 58 px above the viewport —
    // an auto-height panel has nothing to float into. In the flow there is no
    // geometry to get wrong: no portal, no fixed layer, no backdrop, and no
    // document listener that could see a press meant for something else.
    //
    // Prose about the rule must not satisfy the rule, so comments come out
    // first — the same trick `no-rules.test.ts` uses on the room's sources.
    const src = readFileSync(new URL('../EmojiPicker.tsx', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    expect(src).not.toMatch(/createPortal|addEventListener|position:\s*['"](fixed|absolute)/);
    // Nothing here stops an event reaching anything else. The one default it
    // declines is its own button's focus transfer, which is what keeps the
    // caret where the player left it — see the header.
    expect(src).not.toMatch(/stopPropagation|capture:\s*true/);
    expect(src.match(/preventDefault/g)).toHaveLength(1);
    expect(src).toMatch(/onMouseDown=\{keepFocus\}/);

    const css = readFileSync(new URL('../chat.css', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(css).not.toMatch(/position:\s*(fixed|absolute)/);
    expect(css).not.toMatch(/inset:\s*0/);
    expect(css).not.toMatch(/z-index/);
  });
});

describe('the chat panel', () => {
  // `SidePanel`'s chat tab is behind a `useState` and this suite has no DOM to
  // click it with, so its wiring is asserted at the source. The pieces are
  // covered above, and the panel is walked end to end in a real browser against
  // the frozen build.
  const panel = readFileSync(new URL('../../components/SidePanel.tsx', import.meta.url), 'utf8');

  it('renders every chat line through the token renderer', () => {
    expect(panel).toMatch(/<ChatText text=\{c\.text\} resolve=\{emoji\.resolve\}/);
    expect(panel).toMatch(/<ChatComposer/);
  });

  it('keeps the message box out of the table s 5 Hz re-render', () => {
    // The table commits five times a second whether or not the game moved and
    // the panel redraws the log each time; the focused chat input has no
    // business being reconciled along with it. `memo` only bails out if every
    // prop is stable, and `onChat` is a fresh closure per room render — hence
    // the ref. See `ChatComposer`'s header.
    const composer = readFileSync(new URL('../ChatComposer.tsx', import.meta.url), 'utf8');
    expect(composer).toMatch(/export const ChatComposer = memo\(/);
    expect(panel).toMatch(/const sendRef = useRef\(onChat\)/);
    expect(panel).toMatch(/const send = useCallback\(\(t: string\) => sendRef\.current\(t\), \[\]\)/);
    expect(panel).toMatch(/onSend=\{send\}/);
    // The draft and the picker's open state belong to the box, not the panel:
    // a panel that held them would re-render the box on every keystroke anyway.
    expect(panel).not.toMatch(/setDraft|setPicking/);
  });

  it('restores the caret in the commit, not in a later frame', () => {
    // A `requestAnimationFrame` was measurably wrong here: instrumenting the
    // input in a real game caught one pick's frame landing after the next thing
    // the player did, replaying a stale `setSelectionRange(8, 8)` onto a
    // two-character draft. A layout effect keyed on the draft cannot arrive
    // late, because it runs inside the commit that carries the new value.
    const composer = readFileSync(new URL('../ChatComposer.tsx', import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    expect(composer).not.toMatch(/requestAnimationFrame|setTimeout/);
    expect(composer).toMatch(/useLayoutEffect\([\s\S]*?\}, \[draft\]\)/);
  });
});

/* ------------------------------------------------------------------ harness */

const stubLua = {
  tr: (key: string) => key,
  getCardData: (cid: number) => ({ cid, name: 'slash', suit: 'spade', number: 7, known: true }),
  getGeneralData: () => null,
  getIllustrator: () => '',
} as unknown as LtkLua;

/** One seat, drawn by the real `Photo`, with whatever it last said over it. */
function seat(bubble: string | undefined): string {
  const store = new RoomStore(1);
  store.applyNotify('MaxCard', { id: 1, pcardMax: 4, php: 4 });
  store.commit();
  const services: RoomServices = {
    store, lua: stubLua, assets, mode: 'play', meId: 1, naming: makeNaming(store),
  };
  return renderToStaticMarkup(
    <RoomProvider value={services}>
      <Photo
        player={store.state.players[1]}
        isCurrent={false}
        handCount={4}
        focus={null}
        bubble={bubble}
      />
    </RoomProvider>,
  );
}
