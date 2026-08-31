/**
 * Does a real client VM, fed a real seat's stream, get a selectable hand?
 *
 * Agent 3 found that in the spike's single-VM recording every `#PlayCard`
 * scene enabled only the End button and never a card. If that reproduces with
 * two real VMs, no human can play a card.
 */
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { MainThreadLuaClient } from '../luaClient.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';

const bundle = buildBundle();
const host = await InProcessLuaHost.create(bundle, {});
const client = await MainThreadLuaClient.create(bundle, { playerId: 1, screenName: 'player1' });

const scenes: { i: number; type: unknown; elems: Record<string, number>; enabledCards: number }[] = [];
let n = 0;
client.onNotifyUI((command, data) => {
  if (command !== 'UpdateRequestUI') return;
  n += 1;
  const d = data as Record<string, unknown>;
  const elems: Record<string, number> = {};
  let enabledCards = 0;
  for (const [k, v] of Object.entries(d)) {
    if (k === '_type') continue;
    if (Array.isArray(v)) {
      elems[k] = v.length;
      if (k === 'CardItem') {
        for (const item of v as { enabled?: boolean }[]) if (item.enabled) enabledCards += 1;
      }
    }
  }
  scenes.push({ i: n, type: d._type, elems, enabledCards });
});

const session = await RoomSession.start(host, {
  roomId: 'h', seed: Number(process.argv[2] ?? 20260828), seats: allBotSeats(8),
  ownerId: 1, timeout: 15, settings: { gameMode: 'aaa_role_mode' },
}, {
  onEnvelope: (e) => {
    if (e.to === null || e.to === 1) client.deliverEnvelope(e);
  },
});
await session.advance();

console.log(`client errors: ${JSON.stringify(client.errors()).slice(0, 500)}`);
console.log(`scenes: ${scenes.length}`);
const withCards = scenes.filter((s) => (s.elems.CardItem ?? 0) > 0);
const withEnabled = scenes.filter((s) => s.enabledCards > 0);
console.log(`scenes carrying CardItem entries: ${withCards.length}`);
console.log(`scenes with at least one ENABLED card: ${withEnabled.length}`);
for (const s of scenes.slice(0, 12)) console.log(`  ${JSON.stringify(s)}`);
console.log('  ...');
for (const s of withEnabled.slice(0, 6)) console.log(`  enabled: ${JSON.stringify(s)}`);

// What does the client think seat 1 is holding?
console.log(`GetPlayerHandcards(1) = ${JSON.stringify(client.call('GetPlayerHandcards', 1))}`);
host.dispose();
client.dispose();
