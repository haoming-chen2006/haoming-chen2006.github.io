/**
 * The game log, and the quadratic that was hiding in it.
 *
 * `sanitizeMarkup` is not a string function. It builds a `<template>`, assigns
 * `innerHTML` — a full HTML parse — walks the result against a tag allowlist,
 * and serialises it back out. That is the right way to handle engine markup
 * carrying player screen names, and it costs what a parse costs.
 *
 * `SidePanel` used to run it over the whole scrollback every time one line
 * arrived. The store caps the log at 600 lines, so a game whose triggers
 * cascade — 6,002 `GameLog` messages across two audited games — asked for three
 * and a half million parses, and the audit found it as a single 16.9-second
 * freeze on the seat running the engine.
 *
 * The property that fixes it is the one asserted here: **a line is built once.**
 * A line's markup never changes after the engine sends it, so the element is
 * kept and reused, and appending is O(1) in the work it adds rather than O(n).
 */
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import type { LogLine } from '../../state/types';
import { foldLog } from '../SidePanel';

// The engine renders every line in both languages and the store keeps both —
// see `Localized`. The fold reads one of them; which one is `lang`'s business.
const line = (id: number, text: string): LogLine => ({ id, html: { zh_CN: text, en_US: text } });

/** What the store does: append, and drop from the front past the cap. */
function append(log: readonly LogLine[], id: number, cap = 600): LogLine[] {
  const next = [...log, line(id, `<b>turn ${id}</b>`)];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

describe('the log scrollback', () => {
  it('builds each line exactly once, however many arrive after it', () => {
    const held = new Map<number, ReactElement>();
    let log: LogLine[] = [];
    let first: ReactElement | undefined;

    for (let i = 1; i <= 50; i += 1) {
      log = append(log, i);
      const out = foldLog(held, log, 'zh_CN');
      expect(out).toHaveLength(i);
      // The oldest line's element is the same object it was on the first fold.
      first ??= out[0];
      expect(out[0]).toBe(first);
    }
    // Fifty folds over a growing list, and fifty elements built — not 1,275.
    expect(held.size).toBe(50);
  });

  it('re-folds an unchanged log into the identical elements', () => {
    // The panel subscribes to the whole room state, so it re-renders on every
    // committed burst while the log changes on a fraction of them. React skips
    // a child whose element is referentially unchanged.
    const held = new Map<number, ReactElement>();
    const log = [line(1, 'a'), line(2, 'b'), line(3, 'c')];
    const a = foldLog(held, log, 'zh_CN');
    const b = foldLog(held, log, 'zh_CN');
    expect(b.map((_, i) => b[i] === a[i])).toEqual([true, true, true]);
  });

  it('forgets the lines the store has dropped', () => {
    // Otherwise a long game keeps every line it ever showed, and the cache is
    // the leak the 600-line cap exists to prevent.
    const held = new Map<number, ReactElement>();
    let log: LogLine[] = [];
    for (let i = 1; i <= 12; i += 1) {
      log = append(log, i, 5);
      foldLog(held, log, 'zh_CN');
    }
    expect(log.map((l) => l.id)).toEqual([8, 9, 10, 11, 12]);
    expect([...held.keys()]).toEqual([8, 9, 10, 11, 12]);
  });

  it('keeps the line ids as its keys, so React never remounts the list', () => {
    const held = new Map<number, ReactElement>();
    const out = foldLog(held, [line(7, 'x'), line(8, 'y')], 'zh_CN');
    expect(out.map((el) => el.key)).toEqual(['7', '8']);
  });
});
