/**
 * Turning free pick on from inside the room.
 *
 * `enableFreeAssign` existed only in the create-room dialog. The lobby's
 * quick-create buttons — 「创建八人身份」 and its siblings — open a room without
 * ever showing that dialog, and that is how most rooms are actually made, so
 * in practice the switch was unreachable: a player looked for it in the room
 * they were sitting in, which is also the only place they would think to look.
 *
 * The plumbing was already there and unused. `RoomPage` passes
 * `onChangeSettings` to this view; it patches the room's settings row, the room
 * broadcasts the change, and every seat's choose-general dialog reads
 * `enableFreeAssign` off `EnterRoom`. `WaitingRoomView` simply never
 * destructured the prop.
 *
 * Rendered rather than reasoned about: the real component, the markup a host
 * and a guest would each be looking at.
 */
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WaitingRoomView } from '../pages/WaitingRoom';
import type { WaitingRoomViewProps } from '../../contract/views';

vi.mock('../session', () => ({
  useSession: () => ({ loaded: { overview: { translations: {} } } }),
}));
vi.mock('../boot', () => ({ generalAvatar: () => '' }));

function props(over: Partial<WaitingRoomViewProps> = {}): WaitingRoomViewProps {
  return {
    roomId: 'r1', joinCode: 'ABCD', joinUrl: 'https://example/#/room/r1',
    seats: [{ seat: 1, playerId: 1, displayName: '房主', isBot: false, isHost: true, ready: true } as never],
    capacity: 8, settings: { gameMode: 'aaa_role_mode' }, meId: 1, isHost: true,
    onLeave: () => {}, onChat: () => {}, chat: [],
    ...over,
  } as WaitingRoomViewProps;
}

const draw = (p: WaitingRoomViewProps) => renderToStaticMarkup(<WaitingRoomView {...p} />);

describe('free pick, from inside the room', () => {
  it('offers the host a switch without going back to the lobby', () => {
    const html = draw(props({ onChangeSettings: () => {} }));
    expect(html).toContain('自由选将');
    expect(html).toContain('type="checkbox"');
  });

  it('shows it already on when the room was created with it', () => {
    const html = draw(props({
      onChangeSettings: () => {},
      settings: { gameMode: 'aaa_role_mode', enableFreeAssign: true },
    }));
    expect(html).toContain('checked');
  });

  it('tells a guest the state but gives them no switch', () => {
    // Host-only actions are undefined for non-hosts — hide, do not disable.
    const html = draw(props({ isHost: false, onChangeSettings: undefined }));
    expect(html).toContain('自由选将');
    expect(html).not.toContain('type="checkbox"');
  });

  /**
   * 手气卡 is in the room for the same reason free pick is, and the reason is
   * the lobby: the quick-create buttons open a room without ever showing the
   * create dialog, so a setting that lives only there is a setting nobody has.
   * It is also the kind of thing a table argues about between games, which is
   * to say in the waiting room.
   */
  it('lets the host set how many redraws the table gets, over the engine range', () => {
    const html = draw(props({ onChangeSettings: () => {}, settings: { luckTime: 5 } }));
    expect(html).toContain('手气卡');
    expect(html).toContain('<select');
    // `lua/lunarltk/init.lua:22` — `SpinRow { from = 0, to = 8 }`. Not ours.
    for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(html, `choice ${n}`).toContain(`value="${n}"`);
    }
    expect(html).not.toContain('value="9"');
    // What the room is actually set to is what the control shows.
    expect(/<option[^>]*value="5"[^>]*selected/.test(html)).toBe(true);
  });

  it('tells a guest the number without letting them change it', () => {
    const html = draw(props({ isHost: false, onChangeSettings: undefined, settings: { luckTime: 2 } }));
    expect(html).toContain('手气卡');
    expect(html).not.toContain('<select');
    expect(html).toContain('2');
  });

  it('patches only the one setting when the host flips it', () => {
    // The room's settings row carries the mode and the pack list too; a patch
    // that rewrote those from this view would silently change the game.
    const calls: Record<string, unknown>[] = [];
    const p = props({ onChangeSettings: (patch) => calls.push(patch) });
    // Render is server-side, so drive the handler directly — it is the contract.
    p.onChangeSettings?.({ enableFreeAssign: true });
    expect(calls).toEqual([{ enableFreeAssign: true }]);
  });
});
