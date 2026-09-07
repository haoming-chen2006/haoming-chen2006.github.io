/**
 * 创建武将 with nothing but the tab, against the real engine.
 *
 * The browser fetches `lua-bundle.json` and `lua-probe.json`; here the same
 * tree is built off disk and handed to the probe through its test seam, so
 * what is exercised is exactly the published page's path minus the network:
 * validate, compile, boot, probe, and then keep — in the browser's own list,
 * in the shape a room carries.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildBundle, WEB_PACKAGES } from '../../../engine/node/buildBundle.ts';
import { clearSavedHeroes, readSavedHeroes, roomHeroesOf, toRoomHero } from '../../../shell/customHeroes.ts';
import { JIANBI, SHEDE } from '../../spec.example.ts';
import { chatInBrowser, NeedKeyError } from '../agent.ts';
import { buildInBrowser } from '../build.ts';
import { useProbeTree } from '../probe.ts';

const LONG = 120_000;

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
});
afterAll(() => { Reflect.deleteProperty(globalThis, 'localStorage'); useProbeTree(null); });

// What the page fetches, built the way `scripts/build-lua-bundle.mjs` does.
useProbeTree(buildBundle({ includeTests: true, sitePackages: [...WEB_PACKAGES, 'custom'] }));

describe('buildInBrowser', () => {
  it('boots the engine on the hero and keeps it, in the shape a room carries', async () => {
    const out = await buildInBrowser(JIANBI, { save: true });
    expect(out.ok).toBe(true);
    expect(out.test?.ok).toBe(true);
    expect(out.test?.fired).toBe(true);
    expect(out.test?.log.join('\n')).toContain('fired on fk.Damaged');
    expect(out.lua).toContain('General:new(extension, "dsgn_jianbi"');

    const [saved] = readSavedHeroes();
    expect(saved.id).toBe('dsgn_jianbi');
    expect(saved.name).toBe('坚壁客');
    expect(saved.test?.ok).toBe(true);
    expect((saved.spec as { id: string }).id).toBe('dsgn_jianbi');
    // The room gets id, name and Lua, and would boot on exactly this file.
    expect(roomHeroesOf({ customHeroes: [toRoomHero(saved)] })).toHaveLength(1);
  }, LONG);

  it('refuses a spec that does not validate, without booting anything', async () => {
    const out = await buildInBrowser({ ...JIANBI, kingdom: 'nowhere' as never }, { save: true });
    expect(out.ok).toBe(false);
    expect(out.errors[0].path).toBe('kingdom');
    expect(readSavedHeroes()).toEqual([]);
  });

  it('does not keep what it was only asked to test', async () => {
    const out = await buildInBrowser(SHEDE, { save: false });
    expect(out.ok).toBe(true);
    expect(readSavedHeroes()).toEqual([]);
  }, LONG);
});

describe('chatInBrowser', () => {
  it('asks for a key before spending anything', async () => {
    await expect(chatInBrowser([{ role: 'user', content: 'x' }], null)).rejects.toBeInstanceOf(NeedKeyError);
  });

  it('runs the loop against the engine and keeps only the hero it accepted', async () => {
    let round = 0;
    const out = await chatInBrowser([{ role: 'user', content: '受伤摸牌' }], null, {
      callModel: async () => {
        round += 1;
        // Round one has the cost where the action should be; the engine's
        // report sends the model back, and round two is the example hero.
        return { reply: round === 1 ? '试试' : '好了', spec: round === 1 ? { ...JIANBI, kingdom: 'nowhere' } : JIANBI };
      },
    });
    expect(out.status).toBe('created');
    expect(out.attempts).toHaveLength(2);
    expect(readSavedHeroes().map((h) => h.id)).toEqual(['dsgn_jianbi']);
  }, LONG);
});
