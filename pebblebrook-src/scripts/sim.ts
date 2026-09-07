/**
 * Headless chronicle: node scripts/sim.ts [days] [seed] [--fake] [--quiet] [--verbose]
 * Runs N days with local brains and prints per day: notable chronicle lines, per-villager action histogram,
 * conversations, relationship changes, money. Then asserts the "they actually do whatever they want" claims.
 */
import { createLocalBrain } from '../src/agents/index.ts';
import { bus } from '../src/core/bus.ts';
import { fmtClock } from '../src/core/time.ts';
import type { BusEvent, RelationLabel, Villager, VillagerId, World } from '../src/core/index.ts';
import { TOOLS, createSim, createTestWorld } from '../src/sim/index.ts';

declare const process: { argv: string[]; exit(code?: number): never };
const argv: string[] = process.argv.slice(2);
const nums = argv.filter((a) => /^\d+$/.test(a)).map(Number);
const DAYS = nums[0] ?? 7;
const SEED = nums[1] ?? 1234;
const FAKE = argv.includes('--fake');
const QUIET = argv.includes('--quiet');
const VERBOSE = argv.includes('--verbose');

async function buildWorld(): Promise<{ world: World; kind: string }> {
  if (!FAKE) {
    try {
      const mod = await import('../src/world/index.ts');
      const world = mod.generateWorld(SEED);
      // sanity: the sim needs places and a clock
      if (!world.places.length) throw new Error('empty world');
      return { world, kind: 'real' };
    } catch (e) {
      if (!QUIET) console.log(`(generateWorld unavailable: ${(e as Error).message.split('\n')[0]} — using the fake world)`);
    }
  }
  return { world: createTestWorld(SEED), kind: 'fake' };
}

const { world, kind } = await buildWorld();
const local = createLocalBrain(SEED);
const sim = createSim(world, SEED, { local, llm: null });
const names = Object.fromEntries(sim.villagers.map((v) => [v.id, v.name.split(' ')[0]]));
const name = (id: VillagerId | 'player'): string => (id === 'player' ? 'Newcomer' : names[id] ?? id);

// ---- collectors
interface DayStats { tools: Record<VillagerId, Record<string, number>>; convs: number; convPairs: string[]; labelChanges: string[]; moneyStart: Record<VillagerId, number>; lines: { t: number; text: string; importance: number }[]; buys: number; sells: number; requests: number; fails: Record<string, number> }
const newDay = (): DayStats => ({ tools: {}, convs: 0, convPairs: [], labelChanges: [], moneyStart: Object.fromEntries(sim.villagers.map((v) => [v.id, v.money])), lines: [], buys: 0, sells: 0, requests: 0, fails: {} });
let day = newDay();
const days: DayStats[] = [];
const totalTools: Record<VillagerId, Set<string>> = Object.fromEntries(sim.villagers.map((v) => [v.id, new Set<string>()]));
const categoriesUsed = new Set<string>();
const catOf = Object.fromEntries(TOOLS.map((t) => [t.name, t.category]));
let totalConvs = 0, totalBuys = 0, totalSells = 0, totalRequests = 0, totalCompleted = 0, totalGossip = 0;
const longestIdle: Record<VillagerId, number> = {};
const needZero: Record<VillagerId, Record<string, number>> = {};
const sleptHome: Record<VillagerId, number> = Object.fromEntries(sim.villagers.map((v) => [v.id, 0]));
const failCounts: Record<string, number> = {};
const sampleSpeech: string[] = [];

bus.on('action', (e) => {
  if (e.phase === 'fail') { failCounts[e.tool] = (failCounts[e.tool] ?? 0) + 1; day.fails[e.tool] = (day.fails[e.tool] ?? 0) + 1; if (VERBOSE) console.log(`   ! ${name(e.who)} ${e.tool}: ${e.message}`); return; }
  if (e.phase !== 'start' || e.tool === 'go_to' && e.label.startsWith('walking')) return;
  if (e.tool === 'think') return;
  const t = e.tool;
  day.tools[e.who] = day.tools[e.who] ?? {};
  day.tools[e.who][t] = (day.tools[e.who][t] ?? 0) + 1;
  if (t !== 'go_to' && t !== 'idle') totalTools[e.who]?.add(t);
  if (catOf[t]) categoriesUsed.add(catOf[t]);
  if (t === 'buy') { day.buys++; totalBuys++; }
  if (t === 'sell') { day.sells++; totalSells++; }
  if (t === 'gossip') totalGossip++;
});
bus.on('conversation', (e) => {
  if (e.phase === 'end') { const turns = e.state.turns.length; if (turns > 0) { day.convs++; totalConvs++; day.convPairs.push(`${e.state.participants.map(name).join('↔')}[${e.state.topic?.split(':')[0] ?? 'chat'}×${turns}]`); if (sampleSpeech.length < 40 && turns >= 2) sampleSpeech.push(`${fmtClock(world.time)} ${e.state.participants.map(name).join(' & ')} (${e.state.topic}):\n` + e.state.turns.map((tt) => `      ${name(tt.speaker)}: ${tt.text}`).join('\n')); } }
});
bus.on('relationship', (e) => { if (e.label) day.labelChanges.push(`${name(e.a)}→${name(e.b)}: ${e.label}`); });
bus.on('chronicle', (e) => { day.lines.push({ t: world.time.minute, text: e.text, importance: e.importance }); });
bus.on('request', (e) => { if (e.phase === 'posted') { day.requests++; totalRequests++; } if (e.phase === 'done') totalCompleted++; });
bus.on('say', (e: Extract<BusEvent, { type: 'say' }>) => { if (VERBOSE) console.log(`   ${fmtClock(world.time)} ${name(e.who)}${e.to ? ' → ' + name(e.to) : ''}: ${e.text}`); });

// ---- run
const t0 = performance.now();
const startDay = world.time.dayIndex;
let lastDay = startDay;
let minutesRun = 0;
const totalMinutes = DAYS * 1440 - (world.time.minute % 1440) + 0; // run until the start of day (startDay + DAYS)
const sampleNeeds = () => { for (const v of sim.villagers) { needZero[v.id] = needZero[v.id] ?? {}; for (const [k, val] of Object.entries(v.needs)) { const key = `${world.time.dayIndex}:${k}`; needZero[v.id][key] = Math.max(needZero[v.id][key] ?? 0, val); } } };
while (minutesRun < totalMinutes) {
  sim.update(1);
  minutesRun++;
  if (minutesRun % 10 === 0) sampleNeeds();
  if (world.time.dayIndex !== lastDay) {
    // day rollover: record sleeping-at-home for the night just ended
    for (const v of sim.villagers) { const rt = (sim as unknown as { rt(v: Villager): { sleptAtHome: Record<number, boolean>; longestIdle: number } }).rt(v); if (rt.sleptAtHome[lastDay]) sleptHome[v.id]++; longestIdle[v.id] = Math.max(longestIdle[v.id] ?? 0, rt.longestIdle); }
    days.push(day);
    report(day, lastDay);
    day = newDay();
    lastDay = world.time.dayIndex;
  }
}
const elapsed = (performance.now() - t0) / 1000;

function report(d: DayStats, dayIndex: number): void {
  if (QUIET) return;
  console.log(`\n=== Day ${dayIndex} (${world.time.season}) ===`);
  const notable = d.lines.filter((l) => l.importance >= 4).slice(0, 14);
  for (const l of notable) console.log(`  ${fmtClock({ ...world.time, hour: Math.floor((l.t % 1440) / 60), min: Math.floor(l.t % 60) })}  ${l.text}`);
  console.log(`  conversations: ${d.convs}  buys: ${d.buys}  sells: ${d.sells}  requests: ${d.requests}${Object.keys(d.fails).length ? '  fails: ' + Object.entries(d.fails).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k}×${n}`).join(' ') : ''}`);
  if (d.labelChanges.length) console.log(`  relationships: ${d.labelChanges.slice(0, 8).join(', ')}`);
  for (const v of sim.villagers) {
    const tools = d.tools[v.id] ?? {};
    const hist = Object.entries(tools).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}${n > 1 ? '×' + n : ''}`).join(' ');
    const dm = Math.round(v.money - d.moneyStart[v.id]);
    console.log(`  ${name(v.id).padEnd(6)} ${String(Math.round(v.money)).padStart(4)}c (${dm >= 0 ? '+' : ''}${dm})  mood ${v.mood.toFixed(2)}  ${hist}`);
  }
  if (VERBOSE) console.log('  talks: ' + d.convPairs.join(' '));
}

// ---- summary + assertions
console.log(`\n=== Summary: ${DAYS} days, seed ${SEED}, ${kind} world, ${elapsed.toFixed(2)}s ===`);
const failures: string[] = [];
const check = (ok: boolean, msg: string) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures.push(msg); };
const weekScale = DAYS / 7;
for (const v of sim.villagers) {
  const n = totalTools[v.id].size;
  check(n >= Math.min(12, Math.round(12 * Math.min(1, weekScale + 0.3))), `${name(v.id)} used ${n} distinct tools: ${[...totalTools[v.id]].join(', ')}`);
}
check(totalConvs >= 40 * weekScale, `${totalConvs} conversations (need ≥ ${Math.round(40 * weekScale)}); ${totalGossip} gossip sessions`);
for (const v of sim.villagers) check((longestIdle[v.id] ?? 0) <= 60, `${name(v.id)} longest awake idle stretch ${Math.round(longestIdle[v.id] ?? 0)} min`);
for (const v of sim.villagers) {
  const pinned: string[] = [];
  for (let dIdx = startDay; dIdx < startDay + DAYS; dIdx++) for (const k of ['energy', 'hunger', 'social', 'fun', 'comfort', 'purpose']) { const mx = needZero[v.id]?.[`${dIdx}:${k}`]; if (mx !== undefined && mx <= 0.5) pinned.push(`${k}@day${dIdx}`); }
  check(pinned.length === 0, `${name(v.id)} needs never pinned at 0 for a day${pinned.length ? ': ' + pinned.join(', ') : ''} (now: ${Object.entries(v.needs).map(([k, x]) => `${k[0]}${Math.round(x)}`).join(' ')})`);
}
for (const v of sim.villagers) check(sleptHome[v.id] >= Math.min(5, DAYS - 2), `${name(v.id)} slept at home ${sleptHome[v.id]} of ${DAYS} nights`);
const allCats = ['move', 'work', 'social', 'economy', 'life', 'craft', 'info', 'meta'];
check(allCats.every((c) => categoriesUsed.has(c)), `tool categories used: ${[...categoriesUsed].join(', ')}`);
check(totalBuys > 0 && totalSells > 0, `money flows: ${totalBuys} buys, ${totalSells} sells, ${totalRequests} requests posted, ${totalCompleted} completed`);
check(elapsed < 20 || DAYS > 7, `runtime ${elapsed.toFixed(2)}s (< 20 s for 7 days)`);
const labels: Record<RelationLabel, number> = { stranger: 0, acquaintance: 0, friend: 0, 'close friend': 0, rival: 0, crush: 0, partner: 0, family: 0 };
for (const v of sim.villagers) for (const [id, r] of Object.entries(v.relationships)) if (id !== 'player') labels[r.label]++;
console.log(`  relationships now: ${Object.entries(labels).filter(([, n]) => n).map(([k, n]) => `${k}:${n}`).join(' ')}`);
const topFails = Object.entries(failCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`  tool failures: ${topFails.map(([k, n]) => `${k}×${n}`).join(' ') || 'none'}`);
const memCounts = sim.villagers.map((v) => `${name(v.id)}:${v.memory.length}(${v.memory.filter((m) => m.kind === 'reflection').length}r,${v.memory.filter((m) => m.kind === 'gossip').length}g)`);
console.log(`  memories: ${memCounts.join(' ')}`);
if (!QUIET) {
  console.log('\n=== Sample conversations ===');
  for (const s of sampleSpeech.slice(0, 8)) console.log('  ' + s);
  console.log('\n=== Sample reflections ===');
  for (const v of sim.villagers) { const r = v.memory.filter((m) => m.kind === 'reflection').slice(-2); if (r.length) console.log(`  ${name(v.id)}: ${r.map((m) => m.text).join(' | ')}`); }
}
if (failures.length) { console.log(`\n${failures.length} assertion(s) failed.`); process.exit(1); }
console.log('\nAll assertions passed.');
