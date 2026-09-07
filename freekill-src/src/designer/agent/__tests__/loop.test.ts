/**
 * The agent loop, with both of its halves faked.
 *
 * The dev back end's `server.test.ts` runs the same loop against the real
 * engine; this runs it against a scripted model and a scripted build, so the
 * loop's own rules are pinned where they cannot hide behind a slow boot:
 * it stops at the first hero the engine accepts, it tells the model exactly
 * what failed, and it gives up after `MAX_REVISIONS` and says so.
 */
import { describe, expect, it } from 'vitest';
import { JIANBI } from '../../spec.example.ts';
import { MAX_REVISIONS, runAgent, type BuildOutcome } from '../loop.ts';

const good: BuildOutcome = { ok: true, errors: [], test: { ok: true, fired: true, log: ['ok  fired'] } };

describe('runAgent', () => {
  it('stops at the first hero the engine accepts, and hands back every attempt', async () => {
    const seen: string[] = [];
    let round = 0;
    const out = await runAgent({
      messages: [{ role: 'user', content: '做一个受伤就摸牌的武将' }],
      callModel: async (messages) => {
        seen.push(messages[messages.length - 1].content);
        round += 1;
        return { reply: round === 1 ? '第一版' : '改好了', spec: { ...JIANBI, kingdom: round === 1 ? 'nowhere' : 'wei' } };
      },
      build: async (spec) => (spec.kingdom === 'wei'
        ? good
        : { ok: false, errors: [{ path: 'kingdom', message: 'kingdom must be one of wei, shu, wu, qun, jin' }] }),
    });
    expect(out.status).toBe('created');
    expect(out.reply).toBe('改好了');
    expect(out.attempts).toHaveLength(2);
    expect(out.attempts[0].errors[0].path).toBe('kingdom');
    // The second call was told what was wrong, in the validator's own words.
    expect(seen[1]).toContain('kingdom');
    expect(seen[1]).toContain('Fix it and return the whole spec again');
  });

  it('feeds the engine\'s report back when the hero loads but never fires', async () => {
    const seen: string[] = [];
    let round = 0;
    const out = await runAgent({
      messages: [{ role: 'user', content: 'x' }],
      callModel: async (messages) => {
        seen.push(messages[messages.length - 1].content);
        round += 1;
        return { reply: 'ok', spec: JIANBI };
      },
      build: async () => (round >= 2
        ? good
        : { ok: true, errors: [], test: { ok: true, fired: false, log: ['ok   registered', 'FAIL dsgn_jianbi_skill fired on fk.Damaged (0 times)'] } }),
    });
    expect(out.status).toBe('created');
    expect(seen[1]).toContain('The engine was booted on the generated general');
    expect(seen[1]).toContain('0 times');
  });

  it('gives up after the revision budget and says failed', async () => {
    const attempts: number[] = [];
    const out = await runAgent({
      messages: [{ role: 'user', content: 'x' }],
      callModel: async () => ({ reply: '再试', spec: { ...JIANBI, kingdom: 'nowhere' } }),
      build: async () => ({ ok: false, errors: [{ path: 'kingdom', message: 'bad' }] }),
      onAttempt: (_a, i) => attempts.push(i),
    });
    expect(out.status).toBe('failed');
    expect(out.attempts).toHaveLength(MAX_REVISIONS + 1);
    expect(attempts).toEqual([0, 1, 2, 3, 4, 5]);
    expect(out.spec?.id).toBe(JIANBI.id);
  });

  it('carries the hero on the canvas into the first message', async () => {
    let first = '';
    await runAgent({
      messages: [{ role: 'user', content: '把它改成女将' }],
      spec: JIANBI,
      callModel: async (messages) => { first = messages.map((m) => m.content).join('\n'); return { reply: 'ok', spec: JIANBI }; },
      build: async () => good,
    });
    expect(first).toContain('The hero so far:');
    expect(first).toContain(JIANBI.id);
  });
});
