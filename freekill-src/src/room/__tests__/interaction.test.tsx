/**
 * A skill's inline chooser, against the spec the engine actually builds.
 *
 * `UI.CardNameBox` does not hand over a flat list of card names. It wraps
 * whatever it was given in one more table — `spec.all_choices =
 * {spec.all_choices}` (`lua/ui-util.lua:44-50`) — because `CardNamesBox.qml`
 * draws one grid per group. The room read it flat, so it rendered a single
 * button whose label was the whole group and whose click sent that *array*
 * back as `UpdateRequestUI("Interaction", "1", "update", <array>)`.
 *
 * `interaction.data` is what a 泛转化技 turns into a card. 急筹 does
 * `Fk:cloneCard(self.interaction.data)` with no type guard
 * (`packages/mobile/pkg/mobile_sp/skills/jichou.lua:37`), so the answer being a
 * table threw inside `UpdateRequestUI` and took that seat's UI down for the
 * rest of the game. Seen once in fourteen audited games, on mobile__jiangji.
 *
 * The spec below is not written by hand: it is built by the engine's own
 * `UI.CardNameBox` in a real client VM, so if that normalisation ever changes
 * this test changes with it.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AssetManifest } from '../../contract/manifest';
import { MainThreadLuaClient } from '../../engine/luaClient';
import { buildBundle } from '../../engine/node/buildBundle';
import { Assets } from '../assets/assets';
import { InteractionWidget, flatChoices } from '../components/Interaction';
import type { LtkLua } from '../ltk/LtkLua';
import { makeNaming, RoomProvider, type RoomServices } from '../RoomContext';
import { RoomStore } from '../state/store';

const EMPTY_MANIFEST: AssetManifest = { version: 1, base: '', entries: [], totals: {} };
const LONG = 300_000;

let cached: Record<string, string> | null = null;
function bundle(): Record<string, string> {
  cached ??= buildBundle();
  return cached;
}

/** The exact spec `UI.CardNameBox` produces for a two-name泛转化技. */
async function realCardNameSpec(): Promise<Record<string, unknown>> {
  const c = await MainThreadLuaClient.create(bundle(), { playerId: 1, screenName: 'p1' });
  try {
    return JSON.parse(String(c.lua.doStringSync(`
      return FKClient.canon.encode(UI.CardNameBox {
        choices = { "slash", "jink" },
        all_choices = { "slash", "jink", "peach" },
      })
    `))) as Record<string, unknown>;
  } finally {
    c.dispose();
  }
}

function draw(spec: Record<string, unknown>): { html: string; sent: unknown[] } {
  const sent: unknown[] = [];
  const store = new RoomStore(1);
  const services: RoomServices = {
    store,
    lua: {
      tr: (key: string) => key,
      interact: (...args: unknown[]) => { sent.push(args); },
    } as unknown as LtkLua,
    assets: new Assets(EMPTY_MANIFEST),
    mode: 'play',
    meId: 1,
    naming: makeNaming(store),
  };
  const html = renderToStaticMarkup(
    <RoomProvider value={services}>
      <InteractionWidget item={{ id: '1', spec } as never} />
    </RoomProvider>,
  );
  return { html, sent };
}

describe('the card-name chooser', () => {
  it('is handed groups, not names, and must flatten them', async () => {
    const spec = await realCardNameSpec();
    // The shape this widget exists to cope with. If upstream stops nesting,
    // this line fails first and says so.
    expect(spec.all_choices).toEqual([['slash', 'jink', 'peach']]);
    expect(flatChoices(spec.all_choices as never)).toEqual(['slash', 'jink', 'peach']);
    // A combo's is already flat, and flattening must leave it alone.
    expect(flatChoices(['a', 'b'])).toEqual(['a', 'b']);
  }, LONG);

  it('offers one button per name, and only the legal ones', async () => {
    const spec = await realCardNameSpec();
    const { html } = draw(spec);

    const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons).toHaveLength(3);
    // No button may carry a whole group: that is the value that reached
    // `Fk:cloneCard` as a table.
    for (const b of buttons) expect(b).not.toMatch(/slash,jink/);
    expect(buttons.map((b) => b.replace(/<[^>]*>/g, ''))).toEqual(['slash', 'jink', 'peach']);

    // `choices` is the enabled set; `all_choices` is only what is shown.
    // `CardNamesBox.qml:95` greys the rest out rather than hiding them.
    const disabled = buttons.filter((b) => b.includes('disabled'));
    expect(disabled).toHaveLength(1);
    expect(disabled[0]).toContain('peach');
  }, LONG);

  it('starts on the engine s default_choice, not on `default`', async () => {
    const spec = await realCardNameSpec();
    expect(spec.default_choice).toBe('slash');
    const { html } = draw(spec);
    // The chip the widget marks as chosen is the engine's default.
    const on = (html.match(/<button[^>]*fk-chip--on[\s\S]*?<\/button>/g) ?? []);
    expect(on).toHaveLength(1);
    expect(on[0]).toContain('slash');
  }, LONG);
});
