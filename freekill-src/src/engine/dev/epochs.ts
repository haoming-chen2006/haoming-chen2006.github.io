/** Same process, several hash seeds. Prints the shape of each resulting game. */
import { InProcessLuaHost, allBotSeats } from '../luaHost.ts';
import { buildBundle } from '../node/buildBundle.ts';
import { RoomSession } from '../roomSession.ts';

const bundle = buildBundle();
const spec = {
  roomId: 'e', seed: 20260828, seats: allBotSeats(8), ownerId: 1, timeout: 15,
  settings: { gameMode: 'aaa_role_mode' },
};
for (const epoch of [1700000000000, 1234567890123, 999000111222, 42424242, 7]) {
  const host = await InProcessLuaHost.create(bundle, { hashSeedEpoch: epoch });
  const s = await RoomSession.start(host, spec);
  await s.advance();
  const stats = await host.stats();
  const order = String(host.lua.doStringSync(`
    local names = {}
    local n = 0
    for k in pairs(Fk.generals) do n = n + 1; if n <= 5 then names[#names+1] = k end end
    return table.concat(names, ",")`));
  console.log(
    `epoch ${String(epoch).padStart(14)}  decisions=${String(stats.decisions).padStart(4)} ` +
      `messages=${String(stats.messages).padStart(6)} digest=${await host.stateDigest()} pairs=${order.slice(0, 44)}`,
  );
  host.dispose();
}
