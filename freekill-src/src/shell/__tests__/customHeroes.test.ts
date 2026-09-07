/**
 * Designed heroes, on their way from a browser into a room.
 *
 * Two contracts are asserted here and both are load-bearing. The wire shape
 * (`customHeroes` in the settings row) is read by every seat, so junk in it
 * must be dropped rather than repaired, and the cap must hold, because the row
 * rides in every lobby refresh and every resync. And `withHeroFiles` must hand
 * back the SAME object when there is nothing to add: the base bundle is
 * memoised and shared, and the common case has to be byte-identical to the
 * world before this feature.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_ART_CHARS,
  MAX_ROOM_HEROES,
  asSavedHero,
  clearSavedHeroes,
  deleteSavedHero,
  heroArtOf,
  heroFilesOf,
  heroKeyOf,
  importSavedHeroes,
  roomHeroesFromSaved,
  readSavedHeroes,
  roomHeroesOf,
  toRoomHero,
  upsertSavedHero,
  withHeroFiles,
  type SavedHero,
} from '../customHeroes';

const hero = (id: string, lua = `return function(extension) end -- ${id}`) => ({ id, name: `名${id}`, lua });

describe('what a room carries', () => {
  it('reads a well-formed list and nothing else', () => {
    const settings = { gameMode: 'x', customHeroes: [hero('a'), hero('b')] };
    expect(roomHeroesOf(settings).map((h) => h.id)).toEqual(['a', 'b']);
    expect(roomHeroesOf({})).toEqual([]);
    expect(roomHeroesOf(null)).toEqual([]);
    expect(roomHeroesOf({ customHeroes: 'nope' })).toEqual([]);
  });

  it('drops junk rather than repairing it', () => {
    const settings = {
      customHeroes: [
        hero('ok'),
        { id: 'Bad Id', name: 'x', lua: 'return 1' },
        { id: 'nolua', name: 'x' },
        { id: 'toolong', name: 'x', lua: 'x'.repeat(70_000) },
        { id: 'ok', name: 'dup', lua: 'return 2' },
        'string',
        null,
      ],
    };
    expect(roomHeroesOf(settings).map((h) => h.id)).toEqual(['ok']);
  });

  it('caps the list, because the row rides in every resync', () => {
    const many = Array.from({ length: MAX_ROOM_HEROES + 3 }, (_, i) => hero(`h${i}`));
    expect(roomHeroesOf({ customHeroes: many })).toHaveLength(MAX_ROOM_HEROES);
  });

  it('keeps a small portrait and drops a big one', () => {
    const small = `data:image/jpeg;base64,${'A'.repeat(200)}`;
    const big = `data:image/jpeg;base64,${'A'.repeat(MAX_ART_CHARS + 1)}`;
    const [a, b] = roomHeroesOf({ customHeroes: [{ ...hero('a'), art: small }, { ...hero('b'), art: big }] });
    expect(a.art).toBe(small);
    expect(b.art).toBeUndefined();
    expect(heroArtOf({ customHeroes: [{ ...hero('a'), art: small }] })).toEqual({ a: small });
  });
});

describe('the bundle a room boots on', () => {
  const base = { 'lua/freekill.lua': 'return 1', 'packages/custom/init.lua': 'return {}' };

  it('is the very same object when there is nothing to add', () => {
    expect(withHeroFiles(base, {})).toBe(base);
    expect(withHeroFiles(base, undefined)).toBe(base);
    expect(withHeroFiles(base, { customHeroes: [] })).toBe(base);
  });

  it('lays each hero over the base at the path init.lua lists', () => {
    const out = withHeroFiles(base, { customHeroes: [hero('a'), hero('b')] });
    expect(out).not.toBe(base);
    expect(Object.keys(out).sort()).toEqual([
      'lua/freekill.lua', 'packages/custom/generals/a.lua', 'packages/custom/generals/b.lua', 'packages/custom/init.lua',
    ]);
    expect(out['packages/custom/generals/a.lua']).toContain('-- a');
    // The base was not touched.
    expect(Object.keys(base)).toHaveLength(2);
    expect(heroFilesOf({ customHeroes: [hero('a')] })).toEqual({ 'packages/custom/generals/a.lua': hero('a').lua });
  });

  it('keys on the set and the text, and on nothing else about the settings', () => {
    const k1 = heroKeyOf({ customHeroes: [hero('a')], gameMode: 'x', chatty: 1 });
    const k2 = heroKeyOf({ customHeroes: [hero('a')], gameMode: 'y', chatty: 2 });
    const k3 = heroKeyOf({ customHeroes: [hero('a', 'return 42')] });
    const k4 = heroKeyOf({ customHeroes: [hero('a'), hero('b')] });
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1).not.toBe(k4);
    expect(heroKeyOf({})).toBe('');
  });
});

describe('this browser\'s list', () => {
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

  const saved = (id: string, at = '2026-09-06T00:00:00.000Z'): SavedHero => ({
    ...hero(id), title: '称号', kingdom: 'wei', spec: { id }, at,
    test: { ok: true, fired: true, log: ['ok'] },
  });

  it('round-trips, newest first, replacing by id', () => {
    upsertSavedHero(saved('a'));
    upsertSavedHero(saved('b'));
    expect(readSavedHeroes().map((h) => h.id)).toEqual(['b', 'a']);
    upsertSavedHero({ ...saved('a'), name: '改名' });
    expect(readSavedHeroes().map((h) => [h.id, h.name])).toEqual([['a', '改名'], ['b', '名b']]);
    deleteSavedHero('b');
    expect(readSavedHeroes().map((h) => h.id)).toEqual(['a']);
  });

  it('survives a corrupt blob and a store that throws', () => {
    store.set('fk.designer.heroes', '{not json');
    expect(readSavedHeroes()).toEqual([]);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} },
    });
    expect(readSavedHeroes()).toEqual([]);
    expect(() => upsertSavedHero(saved('a'))).not.toThrow();
  });

  it('imports somebody else\'s export, theirs winning on a clash', () => {
    upsertSavedHero(saved('a'));
    const out = importSavedHeroes([{ ...saved('a'), name: '他们的' }, saved('c'), { id: 'Bad' }]);
    expect(out).toEqual({ added: 2, total: 2 });
    expect(readSavedHeroes().map((h) => [h.id, h.name])).toEqual([['a', '他们的'], ['c', '名c']]);
  });

  it('sends a room every hero that passed, newest first, and not one that failed', () => {
    upsertSavedHero(saved('a'));
    upsertSavedHero({ ...saved('failed'), test: { ok: false, fired: false, log: ['FAIL'] } });
    upsertSavedHero(saved('b'));
    upsertSavedHero({ ...saved('untested'), test: undefined });
    expect(roomHeroesFromSaved(readSavedHeroes()).map((h) => h.id)).toEqual(['untested', 'b', 'a']);
    const many = Array.from({ length: MAX_ROOM_HEROES + 4 }, (_, i) => saved(`h${i}`));
    expect(roomHeroesFromSaved(many)).toHaveLength(MAX_ROOM_HEROES);
  });

  it('sends a room only what a room needs', () => {
    const h = { ...saved('a'), art: 'data:image/jpeg;base64,AAAA' };
    expect(toRoomHero(h)).toEqual({ id: 'a', name: '名a', lua: h.lua, art: h.art });
    expect(Object.keys(toRoomHero(saved('b')))).toEqual(['id', 'name', 'lua']);
    expect(asSavedHero({ id: 'x' })).toBeNull();
  });
});
