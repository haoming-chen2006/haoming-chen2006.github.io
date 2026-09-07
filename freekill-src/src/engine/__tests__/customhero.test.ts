/**
 * A designed hero, laid over the bundle, is a general the host's engine has.
 *
 * This is the whole mechanism by which a room carries a hero
 * (`shell/customHeroes.ts`): one more key in the bundle object, at the path
 * `packages/custom/init.lua` lists with `FileIO.ls`. The worker's `init` and
 * the client VM both do exactly this, so it is asserted once, on the host
 * engine, against the real compiler's output — and its absence is asserted
 * too, because the common case must stay the world as it was.
 */
import { describe, expect, it } from 'vitest';
import { compileHero } from '../../designer/compile/index.ts';
import { JIANBI } from '../../designer/spec.example.ts';
import { heroPath, withHeroFiles } from '../../shell/customHeroes.ts';
import { InProcessLuaHost } from '../luaHost.ts';
import { buildBundle, WEB_PACKAGES } from '../node/buildBundle.ts';

// The shipped configuration: `scripts/build-lua-bundle.mjs` lists `custom`
// among the site packages, the engine lane's builder does not by default.
let cached: ReturnType<typeof buildBundle> | null = null;
const bundle = () => (cached ??= buildBundle({ sitePackages: [...WEB_PACKAGES, 'custom'] }));

const LONG = 120_000;

describe('a room\'s designed hero, on the host engine', () => {
  it('is registered, in packages/custom, with its skill resolving', async () => {
    const { lua } = compileHero(JIANBI);
    const settings = { customHeroes: [{ id: JIANBI.id, name: JIANBI.name, lua }] };
    const tree = withHeroFiles(bundle(), settings);
    expect(tree).not.toBe(bundle());
    expect(tree[heroPath(JIANBI.id)]).toBe(lua);

    const host = await InProcessLuaHost.create(tree, {});
    try {
      expect(host.lua.doStringSync(`return Fk.generals[${JSON.stringify(JIANBI.id)}] ~= nil`)).toBe(true);
      expect(host.lua.doStringSync(`return Fk.generals[${JSON.stringify(JIANBI.id)}].package.name`)).toBe('custom');
      expect(host.lua.doStringSync(`return Fk.skills[${JSON.stringify(JIANBI.skills[0].id)}] ~= nil`)).toBe(true);
      // Not hidden by roster.lua: it is in the pool a seat can be dealt from.
      expect(host.lua.doStringSync(`return Fk.generals[${JSON.stringify(JIANBI.id)}].hidden ~= true`)).toBe(true);
      expect(host.lua.doStringSync(`return Fk:translate(${JSON.stringify(JIANBI.id)})`)).toBe(JIANBI.name);
    } finally {
      host.dispose();
    }
  }, LONG);

  it('is absent when the room carries none, and the bundle is untouched', async () => {
    expect(withHeroFiles(bundle(), {})).toBe(bundle());
    const host = await InProcessLuaHost.create(bundle(), {});
    try {
      expect(host.lua.doStringSync(`return Fk.generals[${JSON.stringify(JIANBI.id)}] == nil`)).toBe(true);
      expect(host.lua.doStringSync(`return table.contains(Fk.extension_names, "custom")`)).toBe(true);
    } finally {
      host.dispose();
    }
  }, LONG);
});
