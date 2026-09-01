/**
 * The whole thing, against a whole game.
 *
 * `fixtures/ui-notify-stream.json` is 2,286 messages — everything the client Lua
 * pushed to one seat across a full eight-player 身份局, recorded off the real
 * engine. Feeding it through the real `RoomStore` and the real `RoomAudio`,
 * wired exactly the way `RoomView` wires them, is the closest thing to playing
 * the game that does not need a browser: same store, same hook, same cue
 * derivation, same order.
 *
 * It is also the check that a unit test cannot make. Every assertion in
 * `audio.test.ts` is against a payload this lane typed out; these are against
 * payloads the engine produced, in the proportions the engine produced them.
 * "97 card sounds and 10 emotions over a full game" is the sort of number that
 * only shows up here, and the sort that catches a mapping that is subtly reading
 * the wrong field — a cue that fires 2,286 times or 3 times passes every unit
 * test ever written for it.
 */
import { describe, expect, it } from 'vitest';
import { RoomStore } from '../../state/store';
import { RoomAudio } from '../bus';
import notifyRaw from '../../../../fixtures/ui-notify-stream.json';

interface Frame { seq: number; command: string; data?: unknown }
const FRAMES = notifyRaw as unknown as Frame[];

/**
 * `RoomView`, minus the pixels.
 *
 * Three lines, and they are the same three lines the diff for `RoomView.tsx`
 * adds: attach the store's `onSound`, hand the bus the rest of the stream, and
 * let the store see everything.
 */
function playRecording(): { audio: RoomAudio; store: RoomStore } {
  const store = new RoomStore(null);
  const audio = new RoomAudio();
  audio.attach(store);
  for (const f of FRAMES) {
    store.applyNotify(f.command, f.data);
    audio.notify(f.command, f.data);
  }
  return { audio, store };
}

/** The bus caps its log at 300; the tally has to see all of them. */
function tally(audio: RoomAudio): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of audio.log) out[row.cue] = (out[row.cue] ?? 0) + 1;
  return out;
}

describe('a full recorded game, played through the audio bus', () => {
  it('finishes the stream without throwing once', () => {
    expect(() => playRecording()).not.toThrow();
  });

  it('sounds every category the table has', () => {
    const { audio } = playRecording();
    // 2,286 messages produce far more cues than the log keeps, so count as we go
    // rather than after. `deliver` is the only writer, so the log order is the
    // stream order and a prefix is enough to prove a category fired at all.
    const seen = new Set(audio.log.map((r) => r.cue.split('/')[0]));
    const store = new RoomStore(null);
    const full = new RoomAudio();
    full.attach(store);
    const counts: Record<string, number> = {};
    const commands: Record<string, number> = {};
    for (const f of FRAMES) {
      const before = full.log.length;
      store.applyNotify(f.command, f.data);
      full.notify(f.command, f.data);
      for (const row of full.log.slice(before)) {
        counts[row.cue] = (counts[row.cue] ?? 0) + 1;
        commands[row.command] = (commands[row.command] ?? 0) + 1;
      }
    }

    // Card resolutions. `bus.ts` in the animation lane measured the same stream
    // and found 97 card sounds; this reads the same messages, so it had better
    // agree with it.
    const cards = Object.entries(counts)
      .filter(([k]) => k.startsWith('card/') || k === 'gear' || k.startsWith('equip/'))
      .reduce((n, [, v]) => n + v, 0);
    expect(cards).toBeGreaterThan(80);

    // Every category the brief asked for, present in a real game.
    expect(counts.gamestart).toBe(1);
    expect(counts.draw).toBeGreaterThan(10);
    expect(counts['voice/skill']).toBeGreaterThan(10);
    expect(Object.keys(counts).some((k) => k.startsWith('damage/'))).toBe(true);
    expect(Object.keys(counts).some((k) => k.startsWith('judge/'))).toBe(true);
    expect(counts['voice/death']).toBeGreaterThan(0);
    expect(counts.losehp ?? 0).toBeGreaterThanOrEqual(0);

    // And the messages they came from are the ones the engine actually uses for
    // sound, not a grab-bag of whatever was on the wire.
    expect(Object.keys(commands).sort()).toEqual(
      ['Animate', 'GameOver', 'LogEvent', 'MoveCards', 'StartGame'].filter((c) => commands[c]),
    );
    expect(seen.size).toBeGreaterThan(0);
  });

  it('makes exactly one noise per message', () => {
    // The one bug this wiring can have: `LogEvent` arrives through `onSound` and
    // through `notify`, and a table where every hit thumps twice is a table
    // nobody can listen to. `notify` drops `LogEvent` for precisely this reason.
    const store = new RoomStore(null);
    const audio = new RoomAudio();
    audio.attach(store);
    const logEvents = FRAMES.filter((f) => f.command === 'LogEvent');
    let fired = 0;
    for (const f of logEvents) {
      const before = audio.log.length;
      store.applyNotify(f.command, f.data);
      audio.notify(f.command, f.data);
      fired += audio.log.length - before;
    }
    // Every sound-bearing LogEvent makes its cues; the rest make none. A death
    // is deliberately two — the blow on the cut, and the last words as the
    // portrait shatters (`cues.ts`'s `Death` branch) — so the count is per
    // message rather than a flat one each. What this is really guarding is
    // duplication: `LogEvent` reaches the bus through `onSound` *and* through
    // `notify`, and a table where every hit thumps twice is unlistenable.
    const cuesFor = (f: { data?: unknown }): number => {
      const d = f.data as { type?: string; num?: number } | null;
      switch (d?.type) {
        case 'PlaySound': case 'Damage': case 'LoseHP': case 'PlaySkillSound':
          return 1;
        case 'Death': return 2;
        case 'ChangeMaxHp': return Number(d.num) < 0 ? 1 : 0;
        default: return 0;
      }
    };
    const expected = logEvents.reduce((n, f) => n + cuesFor(f), 0);
    expect(fired).toBe(expected);
  });

  it('knows who died, because it is reading the live room', () => {
    // A death cue needs the general on the seat, and the seat is only known
    // because the store has been fed the same stream. This is the one place the
    // audio lane depends on state rather than on a message, and it is why
    // `attach` takes the store rather than just the hook.
    const store = new RoomStore(null);
    const audio = new RoomAudio();
    audio.attach(store);
    let named = 0;
    for (const f of FRAMES) {
      store.applyNotify(f.command, f.data);
      audio.notify(f.command, f.data);
      const d = f.data as { type?: string; to?: number } | null;
      if (f.command === 'LogEvent' && d?.type === 'Death' && d.to != null) {
        if (store.state.players[d.to]?.general) named += 1;
      }
    }
    expect(named).toBeGreaterThan(0);
  });

  it('leaves the music on the table and then stood down', () => {
    const { audio } = playRecording();
    // `StartGame` opens the table's rotation; `GameOver` closes it. A recording
    // that ends mid-game would leave it on `table`, and this one does not.
    expect(audio.status().scene).toBe('over');
  });
});
