/**
 * Scripted player conversations: every villager × every intent (+ free text), printing the lines and
 * asserting non-empty, varied output. node scripts/talk_test.ts [seed] [--fake]
 */
import { createLocalBrain } from '../src/agents/index.ts';
import type { World } from '../src/core/index.ts';
import { createSim, createTestWorld } from '../src/sim/index.ts';

declare const process: { argv: string[]; exit(code?: number): never };
const argv: string[] = process.argv.slice(2);
const SEED = Number(argv.find((a) => /^\d+$/.test(a)) ?? 77);
const FAKE = argv.includes('--fake');

async function buildWorld(): Promise<World> {
  if (!FAKE) { try { const mod = await import('../src/world/index.ts'); const w = mod.generateWorld(SEED); if (w.places.length) return w; } catch { /* fall back */ } }
  return createTestWorld(SEED);
}

const world = await buildWorld();
const sim = createSim(world, SEED, { local: createLocalBrain(SEED), llm: null });
// let a day pass so everyone has memories to talk about
sim.update(60 * 30);

const INTENTS = ['greet', 'day', 'gossip', 'help', 'joke', 'compliment', 'trade', 'ask_about:cerys', 'ask_about:hal', 'goodbye'];
const FREE = ['What do you think of the weather today?', 'Have you seen Bram around?', 'Tell me about your work.', 'I love this village!', 'Any rumours going round?', 'I need to buy some seeds.', 'Do you ever dream about leaving?'];

let failures = 0;
const allLines: string[] = [];
for (const v of sim.villagers) {
  console.log(`\n=== ${v.name} (${v.profession}) — mood ${v.mood.toFixed(2)}, ${v.action?.label ?? 'idle'} ===`);
  const seen = new Set<string>();
  for (const intent of INTENTS) {
    const turn = await sim.playerTalk(v, intent);
    const line = turn.text.trim();
    console.log(`  [${intent.padEnd(14)}] ${line}${turn.tone ? '  (' + turn.tone + ')' : ''}${turn.emote ? ' *' + turn.emote + '*' : ''}`);
    if (!line) { console.log('   FAIL empty line'); failures++; }
    if (seen.has(line)) { console.log('   FAIL duplicate line within one villager'); failures++; }
    seen.add(line);
    allLines.push(line);
    if (intent === 'goodbye' && !turn.end) { console.log('   FAIL goodbye did not end the conversation'); failures++; }
  }
  for (const line of FREE) {
    const turn = await sim.playerTalk(v, 'free', line);
    console.log(`  [free] "${line}" → ${turn.text}`);
    if (!turn.text.trim()) { console.log('   FAIL empty free reply'); failures++; }
    allLines.push(turn.text);
  }
  sim.endPlayerConversation();
  const rel = v.relationships.player;
  console.log(`  → relationship with player: ${rel?.label} (affinity ${rel?.affinity.toFixed(1)}, familiarity ${rel?.familiarity.toFixed(1)})`);
  if (!rel || rel.familiarity <= 0) { console.log('   FAIL no relationship formed'); failures++; }
}

// gift reactions
console.log('\n=== Gifts ===');
sim.player.inventory.push({ id: 'sweet_roll', qty: 3 }, { id: 'gem', qty: 2 }, { id: 'ale', qty: 3 }, { id: 'wildflower', qty: 3 }, { id: 'book', qty: 2 });
for (const [id, gift] of [['cerys', 'sweet_roll'], ['bram', 'ale'], ['elin', 'ale'], ['greta', 'gem'], ['ines', 'book'], ['jory', 'wildflower'], ['ada', 'gem'], ['hal', 'wildflower']]) {
  const v = sim.villager(id)!;
  const r = sim.playerGift(v, gift);
  console.log(`  ${v.name.split(' ')[0]} ← ${gift}: ${r.reaction}`);
  if (!r.ok || !r.reaction) { console.log('   FAIL gift'); failures++; }
}

// variety across villagers: the same intent should not produce identical lines for everyone
const distinct = new Set(allLines).size;
console.log(`\n${allLines.length} lines, ${distinct} distinct (${Math.round((100 * distinct) / allLines.length)}%)`);
if (distinct < allLines.length * 0.85) { console.log('FAIL not varied enough'); failures++; }
if (failures) { console.log(`\n${failures} failure(s).`); process.exit(1); }
console.log('\nAll talk checks passed.');
