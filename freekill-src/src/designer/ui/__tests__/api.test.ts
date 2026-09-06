/**
 * The four calls, against a stubbed server — the shape sent and the shape read.
 *
 * The endpoints are the other lane's and are not up while this suite runs, so
 * `fetch` is replaced. That is not a weaker test than hitting a live server: it
 * is the only way to assert the things that actually bite, which are all
 * failures. A 502 from a proxy is an HTML page; a validator's complaints come
 * back on a 400, so a wrapper that throws on `!response.ok` would swallow
 * exactly the payload the player needs; and a listing endpoint that returns
 * `{heroes: […]}` one week and `[…]` the next should not blank the panel.
 *
 * What is asserted about the REQUEST matters as much: `{spec}` and
 * `{spec, image}` and `{messages, spec}` are the contract, and a rename here
 * would otherwise show up as an empty 我的武将 nobody could explain.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HeroSpec } from '../../spec';
import { ApiError, chat, createHero, listHeroes, validateHero } from '../api';

const SPEC: HeroSpec = {
  id: 'x', name: '测试将', title: '试作', kingdom: 'wei', hp: 4,
  skills: [{ id: 's', name: '试技', description: '这是一个用来测试的技能。', effects: [] }],
};

interface Call {
  url: string;
  init?: RequestInit;
}

/** Records what was sent and answers with one canned reply. */
const server = (status: number, body: string): Call[] => {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(body, { status, headers: { 'content-type': 'application/json' } }),
    );
  });
  return calls;
};

afterEach(() => vi.unstubAllGlobals());

describe('POST /api/designer/validate', () => {
  it('sends {spec} and reads back the Lua', async () => {
    const calls = server(200, JSON.stringify({ ok: true, errors: [], lua: 'local x = 1', warnings: ['慢'] }));
    const result = await validateHero(SPEC);
    expect(calls[0].url).toBe('/api/designer/validate');
    expect(calls[0].init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ spec: SPEC });
    expect(result).toEqual({ ok: true, errors: [], lua: 'local x = 1', warnings: ['慢'] });
  });

  /**
   * The whole reason `request` reads the body before it judges the status: the
   * errors ARE the answer, and they arrive on a 400.
   */
  it('keeps the errors that come back on a 400', async () => {
    server(400, JSON.stringify({ ok: false, errors: [{ path: 'hp', message: 'hp must be 1..12' }] }));
    const result = await validateHero(SPEC);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([{ path: 'hp', message: 'hp must be 1..12' }]);
  });

  it('turns a proxy error page into something a player can read', async () => {
    server(502, '<html><body>Bad Gateway</body></html>');
    await expect(validateHero(SPEC)).rejects.toThrow(/HTTP 502/);
    await expect(validateHero(SPEC)).rejects.toBeInstanceOf(ApiError);
  });

  it('says the server is unreachable rather than leaking the fetch error', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(validateHero(SPEC)).rejects.toThrow(/连不上设计器后端/);
    // And says what to do about it: the back end is a local process.
    await expect(validateHero(SPEC)).rejects.toThrow(/npm run designer/);
  });

  /**
   * What the published site answers. There is no back end behind GitHub
   * Pages, so `/api/designer/validate` is a 404 page — and the player should
   * be told the page needs the local back end, not shown a status code.
   */
  it('turns the published site\'s 404 page into the instruction to run the back end locally', async () => {
    server(404, '<!doctype html><html><body>Not Found</body></html>');
    await expect(validateHero(SPEC)).rejects.toThrow(/npm run designer/);
    await expect(validateHero(SPEC)).rejects.toThrow(/404/);
  });

  it('tolerates errors sent as plain strings', async () => {
    server(200, JSON.stringify({ ok: false, errors: ['坏了'] }));
    expect((await validateHero(SPEC)).errors).toEqual([{ path: '', message: '坏了' }]);
  });
});

describe('POST /api/designer/create', () => {
  it('sends the portrait alongside the spec and reads the test result', async () => {
    const calls = server(
      200,
      JSON.stringify({ ok: true, general: 'custom__x', lua: '-- x', test: { ok: false, log: 'boom' } }),
    );
    const result = await createHero(SPEC, { mime: 'image/png', base64: 'AAA' });
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      spec: SPEC,
      image: { mime: 'image/png', base64: 'AAA' },
    });
    expect(result.general).toBe('custom__x');
    expect(result.test).toEqual({ ok: false, log: 'boom' });
  });

  it('omits the image key entirely when there is no portrait', async () => {
    const calls = server(200, JSON.stringify({ ok: true }));
    await createHero(SPEC, null);
    expect(Object.keys(JSON.parse(String(calls[0].init?.body)))).toEqual(['spec']);
  });
});

describe('GET /api/designer/heroes', () => {
  it('reads a bare array', async () => {
    server(200, JSON.stringify([{ id: 'a' }, { id: 'b' }]));
    expect(await listHeroes()).toHaveLength(2);
  });

  it('reads a wrapped array', async () => {
    server(200, JSON.stringify({ heroes: [{ id: 'a' }] }));
    expect((await listHeroes())[0].id).toBe('a');
  });

  it('reads anything else as empty rather than throwing at the player', async () => {
    server(200, JSON.stringify({ nope: true }));
    expect(await listHeroes()).toEqual([]);
  });
});

describe('POST /api/designer/chat', () => {
  it('sends the transcript with the spec on the canvas, so it revises', async () => {
    const calls = server(
      200,
      JSON.stringify({
        reply: '给你写好了',
        status: 'created',
        spec: SPEC,
        attempts: [{ spec: SPEC, errors: [{ path: 'skills[0]', message: '缺少效果' }], testLog: 'FAIL' }],
      }),
    );
    const result = await chat([{ role: 'user', content: '一个吴势力女将' }], SPEC);
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      messages: [{ role: 'user', content: '一个吴势力女将' }],
      spec: SPEC,
    });
    expect(result.status).toBe('created');
    expect(result.spec?.name).toBe('测试将');
    expect(result.attempts?.[0].errors).toHaveLength(1);
    expect(result.attempts?.[0].testLog).toBe('FAIL');
  });

  it('falls back to draft on a status it does not know', async () => {
    server(200, JSON.stringify({ reply: '在想', status: 'thinking' }));
    expect((await chat([])).status).toBe('draft');
  });
});
