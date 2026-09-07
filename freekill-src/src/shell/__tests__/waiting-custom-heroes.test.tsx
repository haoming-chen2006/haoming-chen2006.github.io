/**
 * Designed heroes, from inside the room.
 *
 * The host's browser holds the list (`customHeroes.ts`); every hero in it
 * rides along in every room that browser opens, and the waiting room is where
 * the host decides whether they are DEALT — the `custom` pack switch, off by
 * default. Rendered rather than reasoned about, the way
 * `waiting-free-assign.test.tsx` does it: the markup a host and a guest would
 * each be looking at, and the patches the host's tab writes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WaitingRoomView } from '../pages/WaitingRoom';
import type { WaitingRoomViewProps } from '../../contract/views';
import { clearSavedHeroes, upsertSavedHero, withCustomPack, customPackEnabled } from '../customHeroes';

vi.mock('../session', () => ({
  useSession: () => ({ loaded: { overview: { translations: {} } } }),
}));
vi.mock('../boot', () => ({ generalAvatar: () => '' }));

function props(over: Partial<WaitingRoomViewProps> = {}): WaitingRoomViewProps {
  return {
    roomId: 'r1', joinCode: 'ABCD', joinUrl: 'https://example/#/room/r1',
    seats: [{ seat: 1, playerId: 1, displayName: '房主', isBot: false, isHost: true, ready: true } as never],
    capacity: 8, settings: { gameMode: 'aaa_role_mode', disabledPack: ['custom'] }, meId: 1, isHost: true,
    onLeave: () => {}, onChat: () => {}, chat: [],
    ...over,
  } as WaitingRoomViewProps;
}

const draw = (p: WaitingRoomViewProps) => renderToStaticMarkup(<WaitingRoomView {...p} />);

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
afterEach(() => { Reflect.deleteProperty(globalThis, 'localStorage'); });

const jianbi = { id: 'dsgn_jianbi', name: '坚壁客', title: '受创而立', kingdom: 'wei', lua: 'return function(e) end', spec: {}, at: '2026-09-06T00:00:00Z', test: { ok: true, fired: true, log: [] } };
const carried = [{ id: 'dsgn_jianbi', name: '坚壁客', lua: jianbi.lua }];

describe('designed heroes, from inside the room', () => {
  it('shows the host the pack switch, off, and where to make a hero', () => {
    const html = draw(props({ onChangeSettings: () => {} }));
    expect(html).toContain('自制武将');
    expect(html).toContain('本局启用');
    expect(html).toContain('还没有自制武将');
    expect(html).toContain('designer.html');
    // The free-assign switch and the pack switch; neither checked.
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).not.toContain('checked=""');
  });

  it('names what the room carries beside the switch, and shows it on when the pack is', () => {
    upsertSavedHero(jianbi);
    const html = draw(props({ onChangeSettings: () => {}, settings: { gameMode: 'aaa_role_mode', disabledPack: [], customHeroes: carried } }));
    expect(html).toContain('共 1 个：坚壁客');
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain('会自动带进你开的每一局');
  });

  it('tells a guest whether the table deals them, and which, with no switch', () => {
    const off = draw(props({ isHost: false, onChangeSettings: undefined, settings: { disabledPack: ['custom'], customHeroes: carried } }));
    expect(off).toContain('未启用（房主带来了 坚壁客）');
    expect(off).not.toContain('designer.html');
    const on = draw(props({ isHost: false, onChangeSettings: undefined, settings: { disabledPack: [], customHeroes: carried } }));
    expect(on).toContain('已启用 · 坚壁客');
    const none = draw(props({ isHost: false, onChangeSettings: undefined }));
    expect(none).toContain('本局没有自制武将');
  });

  it('flips only the custom pack, leaving the other packs as the host set them', () => {
    expect(withCustomPack(['custom', 'mobile'], true)).toEqual(['mobile']);
    expect(withCustomPack(['mobile'], false)).toEqual(['mobile', 'custom']);
    expect(withCustomPack(['mobile', 'custom'], false)).toEqual(['mobile', 'custom']);
    expect(customPackEnabled({ disabledPack: ['custom'] })).toBe(false);
    expect(customPackEnabled({ disabledPack: [] })).toBe(true);
    // A room made before this existed carries no `disabledPack` at all: on.
    expect(customPackEnabled({})).toBe(true);
  });
});
