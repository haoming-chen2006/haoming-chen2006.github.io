/**
 * Headless test for src/events: the director over a full year on the fake sim (every festival, every
 * season) and a 60-day smoke run on the real sim when it can be built.
 *   node scripts/events_test.ts [seed]        → exit 1 on any failure
 */
import type { Sim } from '../src/core/app.ts';
import { bus, type BusEvent } from '../src/core/bus.ts';
import { item } from '../src/core/items.ts';
import { fmtClock, fmtDate, timeFromMinute } from '../src/core/time.ts';
import type { Brain, ConversationTurn, Decision, DecisionContext, Request, World } from '../src/core/types.ts';
import { CHAIN_LENGTH, createDirector, createFakeSim, EVENTS, EVENT_BY_ID, FESTIVAL_IDS, type PebbleDirector } from '../src/events/index.ts';
import { generateWorld } from '../src/world/index.ts';

declare const process: { argv: string[]; exit(code: number): never };

const seed = Number(process.argv[2] ?? 1) || 1;
let failures = 0;
const fail = (msg: string): void => { failures++; console.log(`  FAIL ${msg}`); };
const ok = (cond: boolean, msg: string): void => { if (cond) console.log(`  ok   ${msg}`); else fail(msg); };

interface Counters { starts: number; ends: number; toasts: number; eventMemories: number; tagged: number; wedding: Set<string>; posted: number; expired: number; done: number; sickSeen: Set<string> }
function counters(): Counters { return { starts: 0, ends: 0, toasts: 0, eventMemories: 0, tagged: 0, wedding: new Set(), posted: 0, expired: 0, done: 0, sickSeen: new Set() }; }

function listen(c: Counters): () => void {
  return bus.onAny((e: BusEvent) => {
    if (e.type === 'event') { if (e.phase === 'start') c.starts++; else c.ends++; }
    else if (e.type === 'toast') c.toasts++;
    else if (e.type === 'memory' && e.memory.kind === 'event') { c.eventMemories++; if (e.memory.tags.some((t) => EVENT_BY_ID[t])) c.tagged++; if (e.memory.tags.includes('wedding')) c.wedding.add(e.who); }
    else if (e.type === 'request') { if (e.phase === 'posted') c.posted++; else if (e.phase === 'expired') c.expired++; else if (e.phase === 'done') c.done++; }
  });
}

/** Seed one couple so the proposal trigger has something to work with. */
function seedRomance(sim: Sim): void {
  const a = sim.villager('jory'), b = sim.villager('cerys');
  if (!a || !b) return;
  for (const [x, y] of [[a, b], [b, a]] as const) { const r = x.relationships[y.id]; if (r) { r.romance = 70; r.affinity = 62; r.familiarity = 50; r.trust = 60; } }
}

/** Play the player's side of the story chain whenever its request is on the board. */
function playChain(sim: Sim, director: PebbleDirector, log: string[]): void {
  const r = sim.requests.find((x) => !x.done && !x.expired && !x.acceptedBy && x.expiresAt > sim.world.time.minute && ['ines', 'greta'].includes(x.by) && /other half of the old map|a lantern — to search|candles for a remembrance/.test(x.text));
  if (!r) return;
  for (const n of r.needs) sim.give(sim.player, { ...n });
  if (!sim.playerAcceptRequest(r.id)) { fail(`could not accept chain request ${r.id}`); return; }
  const res = sim.playerCompleteRequest(r.id);
  ok(res.ok, `player completed chain request "${r.text.slice(0, 40)}…" → ${res.message}`);
  log.push(`${stamp(sim)} player completed chain step ${director.requests.state.chain.step}: ${r.text}`);
}

const stamp = (sim: Sim): string => { const t = sim.world.time; return `[d${String(t.dayIndex).padStart(3)} ${t.season.padEnd(6)} ${fmtClock(t).padStart(8)}]`; };

interface RunResult { director: PebbleDirector; c: Counters; extra: string[] }

function run(label: string, world: World, sim: Sim, days: number, opts: { saveLoad: boolean; makeSim: (w: World) => Sim }): RunResult {
  console.log(`\n=== ${label}: ${days} days at 30-minute steps, seed ${seed}`);
  const c = counters();
  let off = listen(c);
  seedRomance(sim);
  let director = createDirector(sim, seed);
  const extra: string[] = [];
  let merchantSeen = false, merchantStallOk = false, stallGoneOk = true;
  let roundTripped = false;
  let caveInBefore: Record<string, number> | null = null;
  const t0 = performance.now();
  const steps = days * 48;
  for (let i = 0; i < steps; i++) {
    sim.update(30);
    director.update(30);
    for (const v of sim.villagers) if (v.status.includes('sick')) c.sickSeen.add(v.id);
    const live = director.mine();
    const merchant = live.find((e) => e.data.def === 'merchant');
    if (merchant) { merchantSeen = true; const stock = sim.shopStock('square'); if (stock.some((s) => s.id === 'pearl') || stock.some((s) => s.id === 'gem') || (merchant.data.stock as { id: string }[]).some((s) => s.id === 'pearl')) merchantStallOk = true; }
    else if (merchantSeen && sim.shopStock('square').length) stallGoneOk = false;
    const cave = live.find((e) => e.data.def === 'cave_in');
    if (cave && !caveInBefore) { const g = sim.villager('greta')!; caveInBefore = { bram: g.relationships.bram?.trust ?? 0, jory: g.relationships.jory?.trust ?? 0 }; }
    if (!cave && caveInBefore && !extra.some((x) => x.startsWith('cave-in'))) { const g = sim.villager('greta')!; const after = (g.relationships.bram?.trust ?? 0) + (g.relationships.jory?.trust ?? 0); extra.push(`cave-in: Greta's trust in Bram+Jory ${caveInBefore.bram + caveInBefore.jory} → ${after}`); ok(after > caveInBefore.bram + caveInBefore.jory, 'cave-in rescue raised Greta\'s trust in her rescuers'); }
    if (i % 4 === 0) playChain(sim, director, extra);
    // save/load round trip in the middle of an event, once
    if (opts.saveLoad && !roundTripped && i > steps / 4 && live.length > 0) {
      roundTripped = true;
      const snapshot = JSON.parse(JSON.stringify({ world: world.save(), sim: sim.save(), director: director.save() }));
      const world2 = generateWorld(seed, { bus });
      world2.load(snapshot.world);
      const sim2 = opts.makeSim(world2);
      sim2.load(snapshot.sim);
      const director2 = createDirector(sim2, seed);
      director2.load(snapshot.director);
      const ids = (d: PebbleDirector) => d.mine().map((e) => e.id).sort().join(',');
      ok(ids(director2) === ids(director) && ids(director).length > 0, `save/load mid-event keeps active events (${ids(director)})`);
      ok(JSON.stringify(director2.forecast()) === JSON.stringify(director.forecast()), 'save/load keeps the forecast');
      ok(JSON.stringify(director2.save()) === JSON.stringify(snapshot.director), 'director.save() round-trips byte for byte');
      if (director.mine().some((e) => e.data.def === 'merchant')) ok(sim2.shopStock('square').some((s) => s.id === 'pearl' || s.id === 'gem' || s.id === 'poetry'), 'merchant stall re-registered after load');
      // continue on the loaded copies so the rest of the run proves they keep working
      off();
      world = world2; sim = sim2; director = director2;
      extra.push(`${stamp(sim)} save/load round trip with ${ids(director)} active`);
      off = listen(c);
    }
  }
  const active = director.mine().length;
  const ms = performance.now() - t0;
  console.log(`  ran in ${(ms / 1000).toFixed(1)} s; ${c.starts} starts, ${c.ends} ends, ${c.toasts} toasts, ${c.eventMemories} event memories, requests posted ${c.posted} / done ${c.done} / expired ${c.expired}`);

  const log = director.log;
  const starts = log.filter((l) => l.phase === 'start');
  const randomStarts = starts.filter((l) => l.source === 'random');
  const distinctRandom = new Set(randomStarts.map((l) => l.id));
  ok(distinctRandom.size >= 15, `≥ 15 distinct random events fired (${distinctRandom.size}: ${[...distinctRandom].join(', ')})`);
  ok(starts.length >= 40, `plenty happened (${starts.length} event starts)`);
  const outOfSeason = starts.filter((l) => l.source !== 'director' && EVENT_BY_ID[l.id]?.seasons && !EVENT_BY_ID[l.id].seasons!.includes(l.season));
  ok(outOfSeason.length === 0, `no event fired outside its season${outOfSeason.length ? ': ' + outOfSeason.map((l) => `${l.id}@${l.season}`).join(', ') : ''}`);
  const now = sim.world.time.minute;
  const ends = log.filter((l) => l.phase === 'end').length;
  const overdue = director.mine().filter((e) => e.endsAt <= now);
  ok(overdue.length === 0 && ends === starts.length - active, `active events end (${active} live now, ${starts.length} starts / ${ends} ends, ${overdue.length} overdue)`);
  ok(c.ends === c.starts - active, `every start has a bus end (${c.starts} / ${c.ends})`);
  ok(c.eventMemories >= 150, `memories were written (${c.eventMemories} event memories)`);
  ok(c.posted >= 25, `requests posted (${c.posted})`);
  ok(c.expired >= 5, `requests expired (${c.expired})`);
  ok(director.requests.state.mine.length >= 15, `generator posted ${director.requests.state.mine.length} requests`);
  ok(director.requests.state.chain.done && director.requests.state.chain.step === CHAIN_LENGTH, `story chain completed all ${CHAIN_LENGTH} steps (${director.requests.state.chain.step})`);
  // festival days
  for (const id of FESTIVAL_IDS) {
    const def = EVENT_BY_ID[id];
    if (def.when.kind !== 'calendar') continue;
    const inRun = starts.find((l) => l.id === id && l.source === 'calendar');
    const expectedDay = ['spring', 'summer', 'autumn', 'winter'].indexOf(def.when.season as string) * 28 + (def.when.day ?? 0);
    if (expectedDay <= days) ok(!!inRun && inRun.dayIndex === expectedDay && timeFromMinute(inRun.t).hour === def.when.hour, `${def.name} fired on day ${expectedDay} at ${def.when.hour}:00${inRun ? ` (day ${inRun.dayIndex}, ${fmtClock(timeFromMinute(inRun.t))})` : ' (never fired)'}`);
    else console.log(`  skip ${def.name}: day ${expectedDay} is beyond this run`);
  }
  const birthdays = starts.filter((l) => l.id === 'birthday' && l.source === 'calendar');
  const expectedBirthdays = sim.villagers.filter((v) => ['spring', 'summer', 'autumn', 'winter'].indexOf(v.birthday.season) * 28 + v.birthday.day <= days).length;
  ok(birthdays.length === expectedBirthdays, `birthdays fired on their days (${birthdays.length} / ${expectedBirthdays})`);
  const taxDays = starts.filter((l) => l.id === 'tax_collector').map((l) => l.dayIndex);
  ok(taxDays.every((d) => timeFromMinute((d - 1) * 1440).day === 26), `tax collector came on the 26th (${taxDays.join(', ') || 'never'})`);
  const markets = starts.filter((l) => l.id === 'market_day');
  ok(markets.length >= Math.floor(days / 7) - 2 && markets.every((l) => timeFromMinute(l.t).weekday === 5), `market day every Saturday (${markets.length})`);
  ok(merchantSeen ? merchantStallOk && stallGoneOk : true, merchantSeen ? `merchant stall stocked while present and gone after (${merchantStallOk}/${stallGoneOk})` : 'merchant never came (no stall check)');
  const sickStarts = starts.filter((l) => l.id === 'cold');
  if (sickStarts.length) ok(c.sickSeen.size >= 2, `the cold made villagers sick (${[...c.sickSeen].join(', ')})`);
  const proposal = starts.find((l) => l.id === 'proposal'), wed = starts.find((l) => l.id === 'wedding');
  ok(!!proposal && proposal.source === 'trigger', `proposal fired from the trigger${proposal ? ` on day ${proposal.dayIndex}` : ''}`);
  ok(!!wed && !!proposal && wed.dayIndex === proposal.dayIndex + 2, `wedding followed two days later${wed ? ` (day ${wed.dayIndex})` : ''}`);
  if (wed) { const a = sim.villager('jory')!, b = sim.villager('cerys')!; ok(a.relationships.cerys.label === 'partner' && b.relationships.jory.label === 'partner', 'the couple are partners'); ok(sim.villagers.every((v) => c.wedding.has(v.id)), `everyone remembers the wedding (${c.wedding.size} villagers wrote a wedding memory)`); }
  // memories carry the event id tag
  ok(c.tagged >= 100, `event memories are tagged with their event id (${c.tagged} of ${c.eventMemories})`);
  // forecast
  const fc = director.forecast();
  ok(fc.length > 0 && fc.every((f) => f.dayIndex >= sim.world.time.dayIndex && f.dayIndex < sim.world.time.dayIndex + 14), `forecast covers the next 14 days (${fc.map((f) => `${f.name}@${f.dayIndex}`).join('; ')})`);
  ok(director.calendar.filter((x) => FESTIVAL_IDS.includes(x.defId)).length === 4 && director.calendar.filter((x) => x.defId === 'birthday').length === sim.villagers.length, 'calendar has four festivals and every birthday');
  // reward rule
  const mine = sim.requests.filter((r): r is Request => director.requests.state.mine.includes(r.id));
  ok(mine.every((r) => !r.needs.length || (r.reward.money ?? 0) >= Math.round(r.needs.reduce((s, n) => s + item(n.id).price * n.qty, 0) * 1.5)), `rewards are ≥ item value × 1.5 (${mine.length} on the board now)`);
  const open = sim.requests.filter((r) => !r.done && !r.expired && r.expiresAt > sim.world.time.minute);
  ok(sim.villagers.every((v) => open.filter((r) => r.by === v.id).length <= 3), 'at most ~2 open requests per villager (+1 for event requests)');

  // director override: every id with canFire, in passes so exclusive ones get their turn; mid-morning so nobody is asleep
  const firedByOverride = new Set<string>();
  const toWeekdayMorning = (): void => { while (sim.world.time.hour !== 10 || sim.world.time.weekday === 5) { sim.update(30); director.update(30); } };
  for (let pass = 0; pass < 3; pass++) {
    toWeekdayMorning();
    for (const def of EVENTS) {
      const e = director.list().find((x) => x.id === def.id)!;
      if (!e.canFire || firedByOverride.has(e.id)) continue;
      const ev = director.fire(e.id);
      if (ev) firedByOverride.add(e.id); else fail(`fire(${e.id}) returned null although canFire was true`);
    }
    for (let i = 0; i < 4 * 48; i++) { sim.update(30); director.update(30); }
  }
  const never = EVENTS.filter((d) => !firedByOverride.has(d.id)).map((d) => d.id);
  ok(firedByOverride.size >= EVENTS.length - 3, `fire() worked for ${firedByOverride.size} / ${EVENTS.length} ids${never.length ? ` (preconditions not met now: ${never.join(', ')})` : ''}`);
  ok(director.fire('no_such_event') === null, 'fire() of an unknown id returns null');
  ok(director.mine().every((e) => e.endsAt > sim.world.time.minute), 'override events all ended on time');
  off();
  return { director, c, extra };
}

/** A brain that keeps the real sim moving: attend events, treat the sick, sleep at night, else idle. */
function stubBrain(): Brain & { decideSync(ctx: DecisionContext): Decision; reflectSync(): string[]; converseSync(ctx: unknown): ConversationTurn } {
  const decideSync = (ctx: DecisionContext): Decision => {
    const has = (n: string) => ctx.options.some((o) => o.name === n);
    const h = ctx.now.hour;
    if (has('attend_event')) return { tool: 'attend_event', args: {}, thought: 'something is on' };
    if (has('treat')) return { tool: 'treat', args: {}, thought: 'patients' };
    if ((h >= 22 || h < 6) && has('sleep')) return { tool: 'sleep', args: {}, thought: 'bed' };
    if (h >= 12 && h < 13 && has('eat')) return { tool: 'eat', args: {}, thought: 'lunch' };
    return { tool: 'idle', args: { minutes: 20, reason: 'watching the village' }, thought: 'nothing pressing' };
  };
  return { kind: 'local', decideSync, reflectSync: () => [], converseSync: () => ({ speaker: 'player', text: '…', end: true }), decide: async (ctx) => decideSync(ctx), converse: async () => ({ speaker: 'player', text: '…', end: true }), reflect: async () => [] };
}

async function realSimFactory(): Promise<((w: World) => Sim) | null> {
  try {
    const mod = await import('../src/sim/index.ts');
    let brain: Brain;
    try { const agents = await import('../src/agents/index.ts'); brain = agents.createLocalBrain(seed); } catch { brain = stubBrain(); console.log('  (local brain not available yet — using a stub brain that idles, sleeps and attends events)'); }
    const factory = (w: World): Sim => mod.createSim(w, seed, { local: brain, llm: null });
    const probeWorld = generateWorld(seed, { bus });
    const probe = factory(probeWorld);
    probe.update(30);
    return factory;
  } catch (e) {
    console.log(`  (real sim unavailable: ${(e as Error).message.split('\n')[0]})`);
    return null;
  }
}

function printLog(director: PebbleDirector, extra: string[], max: number): void {
  console.log('\n--- event log');
  const lines = director.log.filter((l) => l.phase === 'start').map((l) => `${`[d${String(l.dayIndex).padStart(3)} ${l.season.padEnd(6)} ${fmtClock(timeFromMinute(l.t)).padStart(8)}]`} ${l.source.padEnd(9)} ${l.name}`);
  const all = [...lines, ...extra].sort();
  for (const line of all.slice(0, max)) console.log('  ' + line);
  if (all.length > max) console.log(`  … ${all.length - max} more`);
}

async function main(): Promise<void> {
  // 1. the fake sim over a full year: every festival, every season, first snow
  const fakeWorld = generateWorld(seed, { bus });
  const fakeFactory = (w: World): Sim => createFakeSim(w, seed, { bus });
  const fake = run('fake sim (src/events/fakesim.ts)', fakeWorld, fakeFactory(fakeWorld), 112, { saveLoad: true, makeSim: fakeFactory });
  printLog(fake.director, fake.extra, 140);

  // 2. the real sim for 60 days when it builds
  const factory = await realSimFactory();
  if (factory) {
    const world = generateWorld(seed, { bus });
    const real = run('real sim (src/sim via createSim)', world, factory(world), 60, { saveLoad: true, makeSim: factory });
    printLog(real.director, real.extra, 80);
  } else console.log('\n(real sim skipped)');

  console.log(`\n${failures ? `${failures} FAILURES` : 'ALL OK'} — ${fmtDate(fakeWorld.time)}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
