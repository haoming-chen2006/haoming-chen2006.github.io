/**
 * The designer's back end, over real HTTP, with the model mocked.
 *
 * The model is mocked for one reason and it is not speed: the only budget for
 * this feature is somebody's OpenAI key, and a test suite that spends it every
 * run is a test suite nobody runs. What is worth testing about the agent path
 * is not the model's prose anyway — it is the loop: that a spec which fails
 * gets the failure back in words that name the block, and that the loop stops
 * when the engine says the general works.
 *
 * Everything else here is real: a real server, real files written under
 * `packages/custom`, and a real engine booted on what was written.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { JIANBI } from '../../src/designer/spec.example.ts';
import type { HeroSpec } from '../../src/designer/spec.ts';
import { createDesignerServer, runChat } from './server.mjs';
import { resolveKey } from './openai.mjs';
import { buildLuaBundle } from '../build-lua-bundle.mjs';

const LONG = 300_000;
const CUSTOM = join(import.meta.dirname, '..', '..', 'packages', 'custom');

/** Heroes this suite writes, swept up afterwards so the tree is as it was. */
const MADE = new Set<string>();
const made = <T extends HeroSpec>(spec: T): T => {
  MADE.add(spec.id);
  return spec;
};

afterAll(async () => {
  for (const id of MADE) {
    rmSync(join(CUSTOM, 'generals', `${id}.lua`), { force: true });
    rmSync(join(CUSTOM, 'specs', `${id}.json`), { force: true });
  }
  if (MADE.size) await buildLuaBundle({ quiet: true });
}, LONG);

async function withServer<T>(
  opts: Parameters<typeof createDesignerServer>[0],
  fn: (base: string) => Promise<T>,
): Promise<T> {
  const server = createDesignerServer(opts);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
}

const post = (base: string, path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json() as Promise<Record<string, unknown>>);

describe('the designer endpoints', () => {
  it('compiles a valid spec without writing anything', async () => {
    await withServer({}, async (base) => {
      const out = await post(base, '/api/designer/validate', { spec: JIANBI });
      expect(out.ok).toBe(true);
      expect(out.errors).toEqual([]);
      expect(String(out.lua)).toContain('General:new(extension, "dsgn_jianbi", "wei", 4, 4, General.Male)');
    });
  }, LONG);

  it('reports the compiler\'s sentence, with the path, for a spec it cannot build', async () => {
    await withServer({}, async (base) => {
      const spec = {
        ...JIANBI,
        skills: [{
          ...JIANBI.skills[0],
          effects: [{
            trigger: { block: 'fk.Damaged', params: {} },
            actions: [{ block: 'pindian', params: { from: 'self', tos: 'others' } }],
          }],
        }],
      };
      const out = await post(base, '/api/designer/validate', { spec });
      expect(out.ok).toBe(false);
      expect(out.errors).toEqual([{
        path: 'skills[0].effects[0].actions[0]',
        message: 'the compiler does not support the "pindian" block yet',
      }]);
    });
  }, LONG);

  it('writes a hero, rebuilds the bundle, and boots the engine on it', async () => {
    const spec = made({ ...JIANBI, id: 'dsgn_t_write', skills: [{ ...JIANBI.skills[0], id: 'dsgn_t_write_skill' }] });
    await withServer({}, async (base) => {
      const out = await post(base, '/api/designer/create', { spec }) as {
        ok: boolean; general: string; test: { ok: boolean; fired: boolean; log: string[] };
      };
      expect(out.test.log.join('\n')).not.toContain('FAIL');
      expect(out.ok).toBe(true);
      expect(out.general).toBe('dsgn_t_write');
      expect(out.test.ok).toBe(true);
      // The whole point: the trigger was driven in a scripted room and the
      // engine's own use history says the skill ran.
      expect(out.test.fired).toBe(true);

      const listed = await fetch(`${base}/api/designer/heroes`).then((r) => r.json()) as {
        heroes: { spec: { id: string } }[];
      };
      expect(listed.heroes.map((h) => h.spec.id)).toContain('dsgn_t_write');
    });
  }, LONG);

  it('refuses the chat endpoint rather than pretending, with no key', async () => {
    await withServer({}, async (base) => {
      const res = await fetch(`${base}/api/designer/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
      });
      expect(res.status).toBe(503);
      expect(String((await res.json()).error)).toMatch(/--key-file/);
    });
  }, LONG);
});

describe('the revision loop', () => {
  it('feeds the compiler\'s refusal back and stops when the engine agrees', async () => {
    const good = made({
      ...JIANBI, id: 'dsgn_t_loop',
      skills: [{ ...JIANBI.skills[0], id: 'dsgn_t_loop_skill' }],
    });
    // Round one names a block this compiler does not emit. Round two is the
    // hero above. Nothing else about the model is simulated.
    const bad = {
      ...good,
      skills: [{
        ...good.skills[0],
        effects: [{
          trigger: { block: 'fk.Damaged', params: {} },
          conditions: [{ block: 'self-is-subject', params: {} }],
          actions: [{ block: 'judge', params: { who: 'self', pattern: '.|.|spade', reason: 'x' } }],
        }],
      }],
    };
    const seen: string[] = [];
    let round = 0;
    const callModel = async (messages: { role: string; content: string }[]) => {
      seen.push(messages[messages.length - 1].content);
      round += 1;
      return { reply: round === 1 ? '第一版' : '改好了', spec: round === 1 ? bad : good };
    };

    const out = await runChat({ messages: [{ role: 'user', content: '做一个受伤就摸牌的武将' }], callModel });
    expect(out.status).toBe('created');
    expect(out.attempts).toHaveLength(2);
    expect(out.reply).toBe('改好了');
    // The second prompt has to contain the block's name, or the model is being
    // asked to guess what went wrong.
    expect(seen[1]).toContain('"judge"');
    expect(seen[1]).toContain('skills[0].effects[0].actions[0]');
  }, LONG);

  it('gives up after five revisions rather than looping', async () => {
    const callModel = async () => ({
      reply: 'nope',
      spec: { ...JIANBI, id: 'dsgn_t_never', kingdom: 'atlantis' },
    });
    const out = await runChat({ messages: [{ role: 'user', content: 'x' }], callModel });
    expect(out.status).toBe('failed');
    expect(out.attempts).toHaveLength(6);
    expect(JSON.stringify(out.attempts[0].errors)).toContain('kingdom');
  }, LONG);
});

describe('the key', () => {
  it('refuses to guess which of two candidate files to spend', () => {
    const r = resolveKey([]);
    // The suite must not depend on the developer's environment either way.
    if (process.env.OPENAI_API_KEY || process.env.DESIGNER_KEY_FILE) {
      expect(r.from).not.toBe('nowhere');
    } else {
      expect(r.key).toBe(null);
      expect(r.why).toMatch(/--key-file/);
    }
  });

  it('reads a dotenv file when told which one, and reports only its path', () => {
    const f = join(import.meta.dirname, '..', '..', 'node_modules', '.cache', 'designer-key-test.env');
    rmSync(f, { force: true });
    mkdirSync(join(f, '..'), { recursive: true });
    writeFileSync(f, '# a comment\nexport OPENAI_API_KEY="sk-not-a-real-key"\nOTHER=1\n');
    try {
      const r = resolveKey(['--key-file', f]);
      expect(r.key).toBe('sk-not-a-real-key');
      expect(r.from).toBe(f);
      expect(r.why).toBeUndefined();
    } finally {
      rmSync(f, { force: true });
    }
  });
});
