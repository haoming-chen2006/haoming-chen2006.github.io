/** Repro: find UI events whose canon JSON is invalid / carries live engine objects. */
import { MainThreadLuaClient } from '../src/engine/luaClient.ts';
import { InProcessLuaHost, allBotSeats } from '../src/engine/luaHost.ts';
import { buildBundle } from '../src/engine/node/buildBundle.ts';
import { RoomSession } from '../src/engine/roomSession.ts';
import { PlayerState } from '../src/engine/types.ts';
import type { Envelope } from '../src/contract/protocol.ts';

const SCAN = `
function __fk_scan()
  local hits = {}
  local seen = {}
  local function walk(x, depth, cmd, path)
    if depth > 12 then return end
    if type(x) ~= "table" then return end
    if seen[x] then return end
    seen[x] = true
    local mt = getmetatable(x)
    if mt and rawget(mt, "__tocbor") then
      local cls = rawget(x, "class")
      local nm = cls and rawget(cls, "name") or "?"
      hits[#hits+1] = cmd .. " | " .. path .. " | " .. tostring(nm)
        .. " | tag=" .. type(rawget(x, "tag")) .. " name=" .. type(rawget(x,"name")) .. " value=" .. type(rawget(x,"value"))
      return
    end
    for k, v in pairs(x) do walk(v, depth + 1, cmd, path .. "." .. tostring(k)) end
  end
  for i = FKClient.sink.uiCursor + 1, #FKClient.sink.ui do
    local e = FKClient.sink.ui[i]
    walk(e.data, 0, e.command, "$")
  end
  return json.encode(hits)
end
`;

const seed = Number(process.argv[2] ?? 20260828);
const bundle = buildBundle();
const host = await InProcessLuaHost.create(bundle, {});
const client = await MainThreadLuaClient.create(bundle, { playerId: 1, screenName: 'p1' });
client.lua.doStringSync(SCAN);

const bad: string[] = [];
const live = new Map<string, number>();
const raw = () => String(client.lua.doStringSync(`return FKClient.drainUI()`));
(client as unknown as { drainUI(): unknown[] }).drainUI = () => {
  for (const h of JSON.parse(String(client.lua.doStringSync('return __fk_scan()'))) as string[]) {
    live.set(h, (live.get(h) ?? 0) + 1);
  }
  const s = raw();
  try { return JSON.parse(s) as unknown[]; } catch { bad.push(s.slice(0, 300)); return []; }
};

const items = new Map<string, Map<string, Record<string, unknown>>>();
let pending: { command: string; data: unknown } | null = null;
const uiCounts = new Map<string, number>();
client.onNotifyUI((command, data) => {
  uiCounts.set(command, (uiCounts.get(command) ?? 0) + 1);
  if (command === 'UpdateRequestUI') {
    for (const [elemType, list] of Object.entries(data as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      let b = items.get(elemType);
      if (!b) { b = new Map(); items.set(elemType, b); }
      for (const r of list as Record<string, unknown>[]) b.set(String(r.id), { ...(b.get(String(r.id)) ?? {}), ...r });
    }
  } else if (command === 'CancelRequest') { pending = null; items.clear(); }
  else if (command === 'PlayCard' || command.startsWith('AskFor')) pending = { command, data };
});

const SCENE_REQUESTS = new Set(['PlayCard', 'AskForUseCard', 'AskForResponseCard', 'AskForUseActiveSkill']);
const enabled = (t: string) => [...(items.get(t) ?? new Map()).entries()]
  .filter(([, v]) => (v as { enabled?: boolean; selected?: boolean }).enabled && !(v as { selected?: boolean }).selected)
  .map(([k]) => k);
const isEnabled = (t: string, id: string) => (items.get(t)?.get(id) as { enabled?: boolean } | undefined)?.enabled === true;

function answer(): void {
  const p = pending;
  if (p && !SCENE_REQUESTS.has(p.command)) {
    pending = null;
    if (p.command === 'AskForGeneral') {
      const [generals, n] = p.data as [string[], number];
      client.replyToServer('AskForGeneral', generals.slice(0, n));
      return;
    }
    client.replyToServer('ReplyToServer', '');
    return;
  }
  if (isEnabled('Button', 'OK')) { client.interact({ elemType: 'Button', id: 'OK', action: 'click' }); return; }
  const card = enabled('CardItem')[0];
  if (card !== undefined) {
    client.interact({ elemType: 'CardItem', id: Number(card), action: 'click', data: { selected: true } });
    if (isEnabled('Button', 'OK')) { client.interact({ elemType: 'Button', id: 'OK', action: 'click' }); return; }
    const target = enabled('Photo')[0];
    if (target !== undefined) {
      client.interact({ elemType: 'Photo', id: Number(target), action: 'click', data: { selected: true } });
      if (isEnabled('Button', 'OK')) { client.interact({ elemType: 'Button', id: 'OK', action: 'click' }); return; }
    }
  }
  if (isEnabled('Button', 'End')) { client.interact({ elemType: 'Button', id: 'End', action: 'click' }); return; }
  client.interact({ elemType: 'Button', id: 'Cancel', action: 'click' });
}

const seats = allBotSeats(8).map((s) => (s.playerId === 1 ? { ...s, state: PlayerState.Online as 1 } : s));
const deliver = (e: Envelope) => { if (e.to === null || e.to === 1) client.deliverEnvelope(e); };
const session = await RoomSession.start(host, {
  roomId: 'repro', seed, seats, ownerId: 1, timeout: 15,
  settings: { gameMode: 'aaa_role_mode' },
}, { onEnvelope: deliver, keepRaw: true });

let over = false;
let answered = 0;
for (let i = 0; i < 400 && !over; i++) {
  const res = await session.advance();
  if (res.err) { console.log('ERR', res.err); break; }
  if (res.over) { over = true; break; }
  answer();
  const outbound = client.drainOutbound().filter((o) => o.kind === 'reply');
  if (outbound.length === 0) { console.log('stuck: no reply; pending=', JSON.stringify(pending)?.slice(0, 200)); break; }
  for (const o of outbound) await host.pushReplyRaw(1, o.payload);
  answered++;
}

console.log(`seed=${seed} over=${over} answered=${answered}`);
console.log('ui commands:', JSON.stringify([...uiCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)));
console.log('live objects in UI data:');
for (const [k, v] of [...live.entries()].sort((a, b) => b[1] - a[1])) console.log('  ' + v + '  ' + k);
console.log('bad batches:', bad.length);
for (const b of bad.slice(0, 5)) console.log('---\n' + b);
console.log('client errors:', JSON.stringify(client.errors().slice(0, 10), null, 1));
host.dispose(); client.dispose();
