/**
 * The token bucket that stops the chat channel becoming a weapon.
 *
 * TWO FEATURES RIDE THE CHAT CHANNEL and neither is an engine event: a thrown
 * flower (`components/present.ts`) and a quick chat (`quickchat.ts`). Both are
 * a `$`-prefixed string the server relays without understanding, both are drawn
 * or spoken by every receiving client, and both are therefore one console away
 * from a hundred a second. They want the same defence, so they share one, and
 * it lives here rather than inside either of them.
 *
 * IT EXISTS TWICE PER FEATURE, ON PURPOSE, and the two copies are not the same
 * mechanism.
 *
 * The SEND side is manners: it greys the button out so a player can see they
 * are going too fast, and it is the only one a player can feel.
 *
 * The RECEIVE side is the defence, and it is the one that matters. The send
 * limit lives in the sender's own browser, which means it is advice — anybody
 * who can open a console can send a hundred chat lines a second. A table where
 * that turns into a hundred animations, or a hundred overlapping shouts, is a
 * table you cannot play at, so every client independently refuses to act on
 * more than one message per sender per gap, whatever arrives. The griefer's
 * flood is then a flood of chat rows nobody draws and nobody hears.
 */
export class ChatBudget {
  /** When each key's bucket was last full, in the token-bucket sense. */
  private readonly at = new Map<string, number>();

  constructor(
    /** Milliseconds a single token takes to refill. */
    private readonly gapMs: number,
    /** How many may be spent back to back before the gap bites. */
    private readonly burst: number,
  ) {}

  /** Milliseconds until `key` may act again; 0 when it may act now. */
  waitMs(key: string, now: number): number {
    const floor = now - this.gapMs * this.burst;
    const last = Math.max(this.at.get(key) ?? floor, floor);
    return Math.max(0, last + this.gapMs - now);
  }

  /** Spend a token if there is one. False means refused, and nothing changed. */
  take(key: string, now: number): boolean {
    if (this.waitMs(key, now) > 0) return false;
    const floor = now - this.gapMs * this.burst;
    const last = Math.max(this.at.get(key) ?? floor, floor);
    this.at.set(key, last + this.gapMs);
    return true;
  }

  forget(key: string): void { this.at.delete(key); }
}
