/**
 * One line of chat, with its emoji tokens drawn as artwork.
 *
 * The Qt client's counterpart is the pair of `msg.replace` calls in
 * `Fk/Pages/Common/RoomPage.qml:691`; see `./emoji.ts` for why this returns
 * elements instead of a string of HTML.
 *
 * DEGRADING. A token this build has no picture for is a newer client saying
 * something we have not shipped yet, not a bug and not an attack. It renders as
 * its own literal text — `{emoji120}` — which is what the player would have
 * seen before any of this existed, dimmed so it reads as a stand-in. The same
 * fallback catches a picture that is in the manifest but fails to decode, so a
 * torn asset never leaves a broken-image glyph in the middle of a sentence.
 */
import { Fragment, memo, useState } from 'react';
import { parseChat, type EmojiResolver } from './emoji';
import './chat.css';

export const ChatText = memo(function ChatText(
  { text, resolve, className }: {
    text: string;
    resolve: EmojiResolver;
    className?: string;
  },
) {
  const segments = parseChat(text);
  return (
    <span className={className}>
      {segments.map((s, i) => (s.kind === 'text'
        ? <Fragment key={i}>{s.text}</Fragment>
        : <EmojiGlyph key={i} id={s.id} token={s.token} resolve={resolve} />))}
    </span>
  );
});

function EmojiGlyph(
  { id, token, resolve }: { id: string; token: string; resolve: EmojiResolver },
) {
  const [broken, setBroken] = useState(false);
  const src = resolve(id);
  if (!src || broken) return <span className="fk-emoji-unknown">{token}</span>;
  return (
    <img
      className="fk-emoji"
      src={src}
      alt={token}
      draggable={false}
      onError={() => setBroken(true)}
    />
  );
}
