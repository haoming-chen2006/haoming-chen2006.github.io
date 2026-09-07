/**
 * The panel's calls, on both lanes.
 *
 * Validating is local now and never touches the network; creating and the AI
 * lane run in the tab and ALSO talk to the dev back end when one answers. So
 * what is asserted is the routing — which lane a call takes given what
 * `/api/designer/heroes` says — and the failures that actually bite on the
 * server lane: a 502 from a proxy is an HTML page, a validator's complaints
 * come back on a 400, and a listing that returns `{heroes: […]}` one week and
 * `[…]` the next should not blank the panel.
 *
 * The browser lane's engine work is stubbed here (`../../browser/build`,
 * `../../browser/agent`); `browser/__tests__/build.test.ts` runs it for real.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeroSpec } from '../../spec';
import { clearSavedHeroes, upsertSavedHero } from '../../../shell/customHeroes';

vi.mock('../../browser/build', () => ({
  buildInBrowser: vi.fn(async (spec: HeroSpec, opts: { save?: boolean }) => ({
    ok: true, spec, general: spec.id, lua: `-- ${spec.id}`, errors: [], warnings: ['慢'],
    test: { ok: true, fired: true, log: ['ok   fired'] },
    saved: opts.save ? { id: spec.id } : undefined,
  })),
}));
vi.mock('../../browser/agent', () => ({
  NeedKeyError: class NeedKeyError extends Error {},
  chatInBrowser: vi.fn(async () => ({
    reply: '浏览器里做好了', spec: null, status: 'created',
    attempts: [{ spec: undefined, errors: [], testLog: ['ok'] }],
  })),
}));

import { ApiError, chat, createHero, listHeroes, resetBackendProbe, validateHero } from '../api';
import { buildInBrowser } from '../../browser/build';
import { chatInBrowser } from '../../browser/agent';

const SPEC: HeroSpec = {
  id: 'dsgn_x', name: '测试将', title: '试作', kingdom: 'wei', hp: 4,
  skills: [{
    id: 'dsgn_x_s', name: '试技', description: '当你受到伤害后，你摸一张牌。',
    effects: [{
      trigger: { block: 'fk.Damaged', params: {} },
      conditions: [{ block: 'self-is-subject', params: {} }],
      actions: [{ block: 'draw', params: { who: 'self', count: 1 } }],
    }],
  }],
};

interface Call {
  url: string;
  init?: RequestInit;
}

/** A fake server: the first `/heroes` call is the probe; every later call gets `reply`. */
const server = (probe: { status: number; body: string }, reply?: { status: number; body: string }): Call[] => {
  const calls: Call[] = [];
  let probed = false;
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const isProbe = url.endsWith('/heroes') && !init?.method && !probed;
    if (isProbe) probed = true;
    const r = isProbe ? probe : (reply ?? probe);
    return Promise.resolve(new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json' } }));
  });
  return calls;
};

const BACKEND = { status: 200, body: JSON.stringify({ heroes: [] }) };
const NO_BACKEND = { status: 404, body: '<!doctype html><html><body>Not Found</body></html>' };

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  clearSavedHeroes();
  resetBackendProbe();
  vi.mocked(buildInBrowser).mockClear();
  vi.mocked(chatInBrowser).mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('validateHero', () => {
  it('validates and compiles in the tab, touching no server', async () => {
    const calls = server(NO_BACKEND);
    const result = await validateHero(SPEC);
    expect(calls).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.lua).toContain('General:new(extension, "dsgn_x"');
  });

  it('reports the validator\'s own paths', async () => {
    const result = await validateHero({ ...SPEC, hp: 99 });
    expect(result.ok).toBe(false);
    expect(result.errors[0].path).toBe('hp');
  });
});

describe('createHero', () => {
  it('builds in the tab and, with no back end, stops there', async () => {
    const calls = server(NO_BACKEND);
    const result = await createHero(SPEC, null);
    expect(result.ok).toBe(true);
    expect(result.savedInBrowser).toBe(true);
    expect(result.wroteToDisk).toBeUndefined();
    expect(result.test).toEqual({ ok: true, log: 'ok   fired' });
    expect(vi.mocked(buildInBrowser).mock.calls[0][1]).toMatchObject({ save: true, image: null });
    expect(calls.map((c) => c.url)).toEqual(['/api/designer/heroes']);
  });

  it('also writes to disk when the back end answers, sending the portrait along', async () => {
    const calls = server(BACKEND, { status: 200, body: JSON.stringify({ ok: true, general: 'dsgn_x' }) });
    const result = await createHero(SPEC, { mime: 'image/png', base64: 'AAA' });
    expect(result.wroteToDisk).toBe(true);
    const create = calls.find((c) => c.url === '/api/designer/create');
    expect(create?.init?.method).toBe('POST');
    expect(JSON.parse(String(create?.init?.body))).toMatchObject({ image: { mime: 'image/png', base64: 'AAA' } });
  });

  it('keeps the hero when the back end fails to write, and says so', async () => {
    server(BACKEND, { status: 502, body: '<html>Bad Gateway</html>' });
    const result = await createHero(SPEC, null);
    expect(result.ok).toBe(true);
    expect(result.savedInBrowser).toBe(true);
    expect(result.warnings?.some((w) => w.includes('HTTP 502'))).toBe(true);
  });

  it('keeps the back end\'s complaints that come back on a 400', async () => {
    server(BACKEND, { status: 400, body: JSON.stringify({ ok: false, errors: [{ path: 'hp', message: 'hp must be 1..12' }] }) });
    const result = await createHero(SPEC, null);
    expect(result.wroteToDisk).toBe(false);
    expect(result.warnings?.some((w) => w.includes('hp must be 1..12'))).toBe(true);
  });
});

describe('listHeroes', () => {
  const saved = { id: 'dsgn_mine', name: '我的', title: '', kingdom: 'wu', lua: 'return 1', spec: { id: 'dsgn_mine' }, at: '2026-09-06T00:00:00Z' };

  it('is this browser\'s list when there is no back end', async () => {
    server(NO_BACKEND);
    upsertSavedHero(saved);
    const rows = await listHeroes();
    expect(rows.map((r) => [r.id, r.source])).toEqual([['dsgn_mine', 'browser']]);
  });

  it('adds the disk\'s rows after the browser\'s, minus any the browser already has', async () => {
    server(BACKEND, { status: 200, body: JSON.stringify({ heroes: [{ spec: { id: 'dsgn_mine' } }, { spec: { id: 'dsgn_disk', name: '盘上' }, test: { ok: true, log: ['ok'] } }] }) });
    upsertSavedHero(saved);
    const rows = await listHeroes();
    expect(rows.map((r) => [r.id, r.source])).toEqual([['dsgn_mine', 'browser'], ['dsgn_disk', 'disk']]);
    expect(rows[1].test).toEqual({ ok: true, log: 'ok' });
  });

  it('reads a bare array from the back end too, and anything else as nothing', async () => {
    server(BACKEND, { status: 200, body: JSON.stringify([{ spec: { id: 'dsgn_a' } }]) });
    expect((await listHeroes()).map((r) => r.id)).toEqual(['dsgn_a']);
    resetBackendProbe();
    server(BACKEND, { status: 200, body: JSON.stringify({ nope: true }) });
    expect(await listHeroes()).toEqual([]);
  });
});

describe('chat', () => {
  it('goes through the back end when there is one, sending the canvas along', async () => {
    const calls = server(BACKEND, {
      status: 200,
      body: JSON.stringify({
        reply: '给你写好了', status: 'created', spec: SPEC,
        attempts: [{ spec: SPEC, errors: [{ path: 'skills[0]', message: '缺少效果' }], testLog: ['FAIL x'] }],
      }),
    });
    const result = await chat([{ role: 'user', content: '一个吴势力女将' }], SPEC);
    const call = calls.find((c) => c.url === '/api/designer/chat');
    expect(JSON.parse(String(call?.init?.body))).toEqual({ messages: [{ role: 'user', content: '一个吴势力女将' }], spec: SPEC });
    expect(result.status).toBe('created');
    expect(result.attempts?.[0]).toEqual({ spec: SPEC, errors: [{ path: 'skills[0]', message: '缺少效果' }], testLog: 'FAIL x' });
    expect(chatInBrowser).not.toHaveBeenCalled();
  });

  it('runs in the tab when there is not', async () => {
    server(NO_BACKEND);
    const result = await chat([{ role: 'user', content: 'x' }], SPEC);
    expect(chatInBrowser).toHaveBeenCalledTimes(1);
    expect(result.reply).toBe('浏览器里做好了');
    expect(result.attempts?.[0].testLog).toBe('ok');
  });

  it('turns a proxy error page on the back end into something a player can read', async () => {
    server(BACKEND, { status: 502, body: '<html><body>Bad Gateway</body></html>' });
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/HTTP 502/);
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toBeInstanceOf(ApiError);
  });
});
