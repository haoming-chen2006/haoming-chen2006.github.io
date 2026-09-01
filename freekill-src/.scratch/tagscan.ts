/** Which commands carry CBOR tags 33001..33005 on the wire? */
import { InProcessLuaHost, allBotSeats } from '../src/engine/luaHost.ts';
import { buildBundle } from '../src/engine/node/buildBundle.ts';
import { RoomSession } from '../src/engine/roomSession.ts';

const seed = Number(process.argv[2] ?? 20260828);
const bundle = buildBundle();
const host = await InProcessLuaHost.create(bundle, {});
const counts = new Map<string, number>();
const TAGS: Record<string, number> = { d980e9: 33001, d980ea: 33002, d980eb: 33003, d980ec: 33004, d980ed: 33005 };

const session = await RoomSession.start(host, {
  roomId: 'tagscan', seed, seats: allBotSeats(8), ownerId: 1, timeout: 15,
  settings: { gameMode: 'aaa_role_mode' },
}, {
  onEnvelope: (e) => {
    for (const m of e.messages) {
      const p = (m as { payload?: string }).payload;
      if (!p) continue;
      const hex = Buffer.from(p, 'base64').toString('hex');
      for (const [needle, tag] of Object.entries(TAGS)) {
        if (hex.includes(needle)) {
          const k = `${m.command} tag=${tag}`;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      }
    }
  },
});
const res = await session.advance();
console.log('over', res.over, res.err ?? '');
for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1])) console.log(`${v}\t${k}`);
host.dispose();
