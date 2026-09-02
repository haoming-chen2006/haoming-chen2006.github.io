/**
 * The wiring between the notify stream and the four cutscenes.
 *
 * WHY THIS CAN RUN WITHOUT A BROWSER, given that `AnimBus` paints DOM nodes.
 * `Sky.play` asks the document for `.fk-room` and returns silently when there
 * is none — a seat that has unmounted or a layout that has not happened yet is
 * not worth an exception on the notify path — so with a `document` that answers
 * nothing, everything up to and including the decision runs and nothing is
 * painted. What is left is exactly the half worth testing: which messages are a
 * scene, how many times one may fire, and whether the music was asked for.
 *
 * `roomAudio.log` is the observable. It records what every cue decided,
 * including the ones that decided to stay silent, and it is the same record the
 * audit reads off a real game — see the header of `audio/bus.ts`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { roomAudio } from '../../../audio';
import { AnimBus } from '../bus';

/** Enough of a document for `Sky.ensure` to answer "there is no room". */
const NO_DOM = { querySelector: () => null } as unknown as Document;

let bus: AnimBus;

beforeEach(() => {
  (globalThis as unknown as { document: Document }).document = NO_DOM;
  roomAudio.log.length = 0;
  bus = new AnimBus((s) => s);
  bus.replaying = false;
});

afterEach(() => {
  bus.dispose();
  Reflect.deleteProperty(globalThis, 'document');
});

/** The themes asked for since the last reset, in order. */
const themes = () => roomAudio.log.filter((e) => e.command === 'Cutscene').map((e) => e.cue);

/** `zhongao.lua` / `juejin.lua`'s `broadcastProperty(player, "general")`. */
const seat = (id: number, general: string) => bus.notify('PropertyUpdate', [id, 'general', general]);

describe('a scene fires once, on the message that means it happened', () => {
  it('answers 忠傲 succeeding and 忠傲 failing with different music', () => {
    seat(1, 'm_shi__weiyan');
    seat(1, 'm_shi2__weiyan');
    seat(2, 'm_shi__weiyan');
    seat(2, 'm_shi3__weiyan');
    expect(themes()).toEqual(['theme/oath-kept', 'theme/oath-broken']);
  });

  it('answers 决进 — which is 曹髦 becoming somebody else, not a counter moving', () => {
    seat(3, 'mobile__caomao');
    // The counter climbing past every threshold it hands a skill over at.
    for (const n of [25, 50, 75, 99]) {
      bus.notify('SetPlayerMark', [3, '@mobile__qianlong_daoxin', n]);
    }
    expect(themes()).toEqual([]);
    // 决进 being used is what changes the picture.
    seat(3, 'mobile2__caomao');
    expect(themes()).toEqual(['theme/daoxin']);
  });

  it('answers 雄姿 on the branch, and only the first time it is told', () => {
    seat(4, 'm_shi__zhouyu');
    // The engine's own order: the limited-skill banner on the 2 000 ms pause,
    // then `on_use` swaps the portrait and writes the branch.
    bus.notify('Animate', { type: 'InvokeUltSkill', player: 4, name: 'xiongzi' });
    expect(themes()).toEqual([]);
    seat(4, 'm_shi2__zhouyu');
    expect(themes()).toEqual([]);
    bus.notify('SetPlayerMark', [4, '@xiongzi-noclear', 'xiongzi_2']);
    expect(themes()).toEqual(['theme/river-fire']);
    // The status poll resends every visible `@` mark five times a second for
    // the rest of the game.
    for (let i = 0; i < 20; i += 1) {
      bus.notify('SetPlayerMark', [4, '@xiongzi-noclear', 'xiongzi_2']);
    }
    expect(themes()).toEqual(['theme/river-fire']);
  });

  it('answers 神霈 on the pause the engine already took', () => {
    seat(5, 'mobile__godjiangwei');
    bus.notify('Animate', { type: 'InvokeUltSkill', player: 5, name: 'shenpeij' });
    expect(themes()).toEqual(['theme/rain-owed']);
  });

  it('stands the limited-skill banner down when a scene answers the same message', () => {
    // 神霈 is the one scene that fires on `InvokeUltSkill` itself, so the
    // banner and the scene would otherwise scroll the same skill name across
    // the same room in the same 1.9 s. `ultBurst` is `scope: 'sky'` too — the
    // observable is that only one thing was drawn.
    const drawn: string[] = [];
    const spec = (bus as unknown as { spec: { ult: unknown; cutscene: unknown } }).spec;
    const ult = spec.ult as (...a: unknown[]) => void;
    const cut = spec.cutscene as (...a: unknown[]) => boolean;
    spec.ult = (...a: unknown[]) => { drawn.push('ult'); return ult.apply(spec, a); };
    spec.cutscene = (...a: unknown[]) => { drawn.push('cutscene'); return cut.apply(spec, a); };

    // Enough of an element for `Sky.ensure` to ask the document and be told
    // there is no room; nothing gets painted and the decisions still run.
    const host = { closest: () => null } as unknown as HTMLElement;
    bus.registerStage('seat:5', host, host);
    seat(5, 'mobile__godjiangwei');
    bus.notify('Animate', { type: 'InvokeUltSkill', player: 5, name: 'shenpeij' });
    expect(drawn).toEqual(['cutscene']);

    // A limited skill with no scene still gets its banner, which is most of them.
    bus.notify('Animate', { type: 'InvokeUltSkill', player: 5, name: 'jieming' });
    expect(drawn).toEqual(['cutscene', 'ult']);

    // 雄姿 and 决进 send this message too and keep the banner: an announcement,
    // and then, two seconds later, the thing it announced.
    bus.notify('Animate', { type: 'InvokeUltSkill', player: 5, name: 'xiongzi' });
    expect(drawn).toEqual(['cutscene', 'ult', 'ult']);
  });

  it('refuses to play the same seat’s scene twice however it is told to', () => {
    // The braces are the per-trigger comparisons; this is the belt. A package
    // that resends a property, or a client that reconnects and is caught up,
    // must not turn the biggest moment in the game into a stutter.
    seat(6, 'm_shi__weiyan');
    seat(6, 'm_shi2__weiyan');
    seat(6, 'm_shi__weiyan');
    seat(6, 'm_shi2__weiyan');
    expect(themes()).toEqual(['theme/oath-kept']);
  });

  it('does not spend a seat’s one showing on a scene that was not drawn', () => {
    // `?pace=0` is the audit playing a whole game in two minutes: every budget
    // resolves to 0 and nothing is painted. Marking the seat as having had its
    // moment then would mean that if the table were ever paced again — a
    // remount, a URL change — the biggest moment in the game had been silently
    // used up while nobody was looking at it.
    const spec = (bus as unknown as { spec: { cutscene: unknown } }).spec;
    const real = spec.cutscene as (...a: unknown[]) => number;
    spec.cutscene = () => 0;
    seat(1, 'mobile__caomao');
    seat(1, 'mobile2__caomao');
    expect(themes()).toEqual([]);

    spec.cutscene = (...a: unknown[]) => real.apply(spec, a);
    seat(1, 'mobile__caomao');
    seat(1, 'mobile2__caomao');
    expect(themes()).toEqual(['theme/daoxin']);
  });

  it('lets two seats each have their own', () => {
    for (const id of [7, 8]) {
      seat(id, 'm_shi__weiyan');
      seat(id, 'm_shi2__weiyan');
    }
    expect(themes()).toEqual(['theme/oath-kept', 'theme/oath-kept']);
  });

  it('draws nothing while a remount is replaying a game into it', () => {
    // `retainingClient` hands a new subscriber every message the table has ever
    // seen, synchronously, before `onNotifyUI` returns. A seat that transformed
    // an hour ago must not transform again for somebody who just refreshed.
    bus.replaying = true;
    seat(9, 'm_shi__weiyan');
    seat(9, 'm_shi2__weiyan');
    expect(themes()).toEqual([]);
  });

  it('is not confused by an ordinary general arriving at a seat', () => {
    seat(1, 'zhangfei');
    seat(1, 'guanyu');
    bus.notify('SetPlayerMark', [1, '@yijue', 2]);
    bus.notify('Animate', { type: 'InvokeUltSkill', player: 1, name: 'guanxing' });
    expect(themes()).toEqual([]);
  });

  it('reads the deputy half of the pair as well as the main one', () => {
    // 忠傲 checks `general` and then `deputyGeneral`, and writes whichever one
    // it found. A scene keyed on `general` alone would never fire for a seat
    // playing 势魏延 as its deputy.
    bus.notify('PropertyUpdate', [2, 'deputyGeneral', 'm_shi__weiyan']);
    bus.notify('PropertyUpdate', [2, 'deputyGeneral', 'm_shi3__weiyan']);
    expect(themes()).toEqual(['theme/oath-broken']);
  });
});
