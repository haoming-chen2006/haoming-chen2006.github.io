/**
 * What the thing you are being asked about actually does, in the engine's words.
 *
 * One line of markup with a rule down its left edge, shared by every panel that
 * asks a player to commit to a skill: the choice boxes, the poxi box, the
 * see-cards-then-decide box, and the invoke strip above the hand. The text is
 * always `:<name>` — the paragraph a general's card prints — resolved by
 * `describe` in `../ltk/prompt`, which returns `''` rather than the key when the
 * packages never wrote one. So this renders nothing at all for a genuine gap,
 * which is the point: a panel that says nothing is honest, and one that prints
 * `:mobile__lvfan` is not.
 *
 * IT LIVES HERE RATHER THAN IN `dialogs/parts` because `ConfirmBar` needs it and
 * every other import between the two folders runs dialogs -> components. One
 * shared primitive is not worth turning that into a two-way street.
 */
import { sanitizeMarkup } from './markup';

export function Detail({ text }: { text: string }) {
  if (!text) return null;
  // Engine markup: a skill description routinely carries `<b>` and `<br />`,
  // and `sanitizeMarkup` is the same allowlist the game log goes through.
  return <div className="fk-detail-line" dangerouslySetInnerHTML={{ __html: sanitizeMarkup(text) }} />;
}
