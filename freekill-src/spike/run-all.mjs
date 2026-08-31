// Agent 0 spike driver: boots the engine, plays, proves determinism and replay,
// measures the wire, and cuts the fixtures. Everything here runs the same
// engine.js the browser page uses.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildBundle, ENGINE_ROOT } from './build-bundle.mjs';
import { createVm, installHost } from './engine.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIX = join(here, '..', 'fixtures');
mkdirSync(FIX, { recursive: true });

const SEED = Number(process.env.FK_SEED ?? 20260828);
const bundle = buildBundle();
const bundleHash = createHash('sha256').update(JSON.stringify(bundle)).digest('hex').slice(0, 16);
const report = { seed: SEED, engineRoot: ENGINE_ROOT, bundleHash, luaFiles: Object.keys(bundle).length };

async function boot({ trace = false } = {}) {
  const t0 = performance.now();
  const { lua, FS } = await createVm(bundle, { traceAllocations: trace });
  const host = installHost({ lua, FS }, { logLevels: new Set(['error']) });
  const tMount = performance.now();
  lua.doStringSync(`dofile('web/boot.lua'); assert(FKWeb.boot())`);
  const tBoot = performance.now();
  return { lua, host, mountMs: tMount - t0, loadMs: tBoot - tMount };
}

/** One full game. seats: 'one-human' or 'all-human'. */
async function play({ seed = SEED, trustAll = false, clientSeat = null, replay = null, trace = false } = {}) {
  const vm = await boot({ trace });
  const { lua } = vm;
  if (replay) {
    lua.global.set('__replay_src', replay);
    lua.doStringSync(`FKWeb.installHook(); FKWeb.setReplay(load(__replay_src)())`);
  } else {
    lua.doStringSync(`FKWeb.installHook()`);
  }
  const t0 = performance.now();
  lua.doStringSync(
    `assert(FKWeb.newRoom(${seed}, 8, nil, ${trustAll}, ${clientSeat ?? 'nil'}))`
  );
  const resumes = lua.doStringSync(`return FKWeb.run()`);
  const gameMs = performance.now() - t0;
  const summary = JSON.parse(lua.doStringSync(`return FKWeb.summary()`));
  return { ...vm, resumes, gameMs, summary, lua };
}

const line = (s) => console.log(s);

// ---------------------------------------------------------------- 0.5 full game
line('== 0.5  all-bot 8-player standard 身份局 ==');
const g = await play({ trustAll: false, trace: true });
line(`  mount ${g.mountMs.toFixed(0)}ms | engine load ${g.loadMs.toFixed(0)}ms | game ${g.gameMs.toFixed(0)}ms`);
line(`  resumes ${g.resumes} | decisions ${g.summary.steps} | messages ${g.summary.messages}`);
line(`  lua heap after game: ${(g.lua.global.getMemoryUsed() / 1048576).toFixed(1)} MiB`);
const gameOver = g.lua.doStringSync(`
  for i = #fk._websink.stream, 1, -1 do
    if fk._websink.stream[i].command == "GameOver" then return tostring(fk._websink.stream[i].data) end
  end
  return "NONE"`);
line(`  GameOver winner: ${gameOver}`);
report.game = {
  mountMs: +g.mountMs.toFixed(1), engineLoadMs: +g.loadMs.toFixed(1), gameMs: +g.gameMs.toFixed(1),
  resumes: g.resumes, decisions: g.summary.steps, messages: g.summary.messages,
  luaHeapMiB: +(g.lua.global.getMemoryUsed() / 1048576).toFixed(2),
  winner: String(gameOver),
};

// ---------------------------------------------------------------- 0.6 determinism
line('== 0.6  determinism: same seed twice ==');
const a = await play({ trustAll: false });
const b = await play({ trustAll: false });
const aLog = String(a.lua.doStringSync(`return FKWeb.dumpLogLua()`));
const bLog = String(b.lua.doStringSync(`return FKWeb.dumpLogLua()`));
const aSteps = JSON.stringify(a.summary.step_digests);
const bSteps = JSON.stringify(b.summary.step_digests);
const logsIdentical = aLog === bLog;
const stepsIdentical = aSteps === bSteps;
const streamIdentical = a.summary.stream_digest === b.summary.stream_digest;
line(`  command logs byte-identical: ${logsIdentical} (${aLog.length} bytes)`);
line(`  per-step digests identical:  ${stepsIdentical} (${a.summary.steps} steps)`);
line(`  full message stream digest:  ${streamIdentical} (${a.summary.stream_digest})`);
report.determinism = { logsIdentical, stepsIdentical, streamIdentical, logBytes: aLog.length, steps: a.summary.steps };

// cross-seed sanity: a different seed must produce a different game
const c = await play({ seed: SEED + 1, trustAll: false });
report.determinism.differentSeedDiffers = c.summary.stream_digest !== a.summary.stream_digest;
line(`  different seed differs:      ${report.determinism.differentSeedDiffers}`);

// ---------------------------------------------------------------- 0.7 replay
line('== 0.7  replay from seed + logged replies ==');
const r = await play({ trustAll: false, replay: aLog });
let firstMismatch = null;
const A = a.summary.step_digests, R = r.summary.step_digests;
for (let i = 0; i < Math.max(A.length, R.length); i++) {
  const x = A[i], y = R[i];
  if (!x || !y || x.digest !== y.digest || x.pid !== y.pid || x.command !== y.command) {
    firstMismatch = { i: i + 1, original: x ?? null, replay: y ?? null };
    break;
  }
}
line(`  boundaries compared: ${Math.min(A.length, R.length)} of ${A.length}`);
line(`  first divergence:    ${firstMismatch ? JSON.stringify(firstMismatch) : 'none'}`);
line(`  final state digest:  ${a.summary.final_state_digest} vs ${r.summary.final_state_digest}`);
line(`  replay ran the AI?   ${r.summary.divergence ?? 'no (every reply came from the log)'}`);
report.replay = {
  boundaries: A.length, matchedAll: firstMismatch === null && A.length === R.length,
  firstMismatch, finalDigestMatch: a.summary.final_state_digest === r.summary.final_state_digest,
  divergenceNote: r.summary.divergence ?? null,
};

// ---------------------------------------------------------------- 0.8 the wire
line('== 0.8  wire volume for one full game ==');
const eight = await play({ trustAll: true, clientSeat: 1 });
const oneHuman = a.summary;
const allHuman = eight.summary;
const seat = (s, id) => s.perconn[id] ?? s.perconn[String(id)] ?? { n: 0, bytes: 0, batches: 0 };
report.wire = {
  oneHumanSevenBots: {
    messages: oneHuman.messages, cborBytes: oneHuman.total_cbor_bytes,
    flushBatches: oneHuman.flush_batches,
    humanSeat: seat(oneHuman, 1),
  },
  eightHumans: {
    messages: allHuman.messages, cborBytes: allHuman.total_cbor_bytes,
    flushBatches: allHuman.flush_batches,
    perSeat: allHuman.perconn,
  },
  byCommandTop: Object.entries(allHuman.bycommand).sort((x, y) => y[1].n - x[1].n).slice(0, 12)
    .map(([k, v]) => ({ command: k, n: v.n, bytes: v.bytes })),
};
line(`  1 human + 7 bots : ${oneHuman.messages} msgs, ${oneHuman.total_cbor_bytes} B, ${oneHuman.flush_batches} flush batches`);
line(`  8 humans         : ${allHuman.messages} msgs, ${allHuman.total_cbor_bytes} B, ${allHuman.flush_batches} flush batches`);
line(`  client VM at seat 1: ${allHuman.ui_notifies} notifyUI, ${allHuman.ui_scenes} UpdateRequestUI, ${allHuman.ui_errors} errors`);
report.clientVm = { notifyUI: allHuman.ui_notifies, updateRequestUI: allHuman.ui_scenes, errors: allHuman.ui_errors };

// ---------------------------------------------------------------- 0.9 fixtures
line('== 0.9  fixtures ==');
const write = (name, obj) => {
  const p = join(FIX, name);
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
  writeFileSync(p, json);
  line(`  ${name.padEnd(28)} ${(json.length / 1024).toFixed(0)} KiB`);
  return json.length;
};

// the stream one browser actually receives (seat 1 of the 8-human game)
const seatStream = JSON.parse(eight.lua.doStringSync(`
  local out = {}
  for _, m in ipairs(fk._websink.stream) do
    if m.connId == 1 then
      out[#out+1] = { seq = #out + 1, kind = m.kind, command = m.command, data = m.data, bytes = m.nbytes, batch = m.batch }
    end
  end
  return FKWeb.canon.encode(out)`));
write('seat-command-stream.json', seatStream);

// what the client VM handed the UI
const uiStream = JSON.parse(eight.lua.doStringSync(`
  local out = {}
  for i, n in ipairs(FKWeb.client.ui) do out[i] = { seq = i, command = n.command, data = n.data } end
  return FKWeb.canon.encode(out)`));
write('ui-notify-stream.json', uiStream);

// harvest distinct request payloads and UpdateRequestUI scenes across seats and seeds
const scenes = new Map();
const requests = new Map();
const harvest = (vm) => {
  const got = JSON.parse(vm.lua.doStringSync(`
    local sc, rq = {}, {}
    if FKWeb.client then
      for _, s in ipairs(FKWeb.client.scenes) do sc[#sc+1] = s end
    end
    for _, m in ipairs(fk._websink.stream) do
      if m.kind == "request" then rq[#rq+1] = { command = m.command, data = m.data } end
    end
    return FKWeb.canon.encode { scenes = sc, requests = rq }`));
  for (const s of got.scenes) {
    const k = `${s._type}:${Object.keys(s).sort().join(',')}`;
    if (!scenes.has(k)) scenes.set(k, s);
  }
  for (const q of got.requests) {
    if (!requests.has(q.command)) requests.set(q.command, []);
    const arr = requests.get(q.command);
    if (arr.length < 3) arr.push(q.data);
  }
};
harvest(eight);
const HARVEST_SEEDS = [SEED, SEED + 7, SEED + 13, SEED + 29, SEED + 101];
for (const s of HARVEST_SEEDS) {
  for (const seat of [1, 3, 6]) {
    const h = await play({ seed: s, trustAll: true, clientSeat: seat });
    harvest(h);
    h.lua.global.close();
  }
}
write('request-ui-scenes.json', [...scenes.values()]);
write('request-payloads.json', Object.fromEntries([...requests.entries()].sort()));
line(`  distinct request commands: ${[...requests.keys()].sort().join(', ')}`);
report.fixtures = {
  requestCommands: [...requests.keys()].sort(),
  sceneTypes: [...new Set([...scenes.values()].map((s) => s._type))].sort(),
};

// the command log = seed + accepted replies, the thing Agent 2 persists
write('command-log.json', {
  seed: SEED, engineBundleSha256_16: bundleHash,
  note: 'ordered accepted replies; replaying these from the seed rebuilds identical state',
  steps: JSON.parse(a.lua.doStringSync(`return FKWeb.dumpLog()`)).steps,
});
write('command-log.lua', aLog);

// manifests
const luaManifest = {
  version: 1, bundleSha256_16: bundleHash, mountRoot: '/fk',
  entry: 'lua/freekill.lua', overlay: ['web/fkhost.lua', 'web/boot.lua', 'web/canon.lua', 'web/fkclient.lua'],
  files: Object.keys(bundle).length,
  sourceBytes: Object.values(bundle).reduce((n, s) => n + Buffer.byteLength(s), 0),
  packages: ['standard', 'standard_cards', 'maneuvering', 'test'],
};
write('lua-manifest.json', luaManifest);
report.luaManifest = luaManifest;

writeFileSync(join(here, '..', 'fixtures', 'measurements.json'), JSON.stringify(report, null, 2));
line('== done ==');
console.log(JSON.stringify(report, null, 2));
