// Headless end-to-end run of the whole Hollowmere prologue against the REAL sim. No three, no DOM.
//   node --experimental-strip-types scripts/test-prologue.ts        (VERBOSE=1 prints every line)
// A bot drives World.step() with real intents where that is meaningful (movement, sprint, dodge, jump,
// lock-on, light attack, abilities, interact/E), and fakes what depends on enemy timing (dodged/blocked
// blows) or would take minutes (kills via world.killActor). A fake UI auto-advances dialogue, rolls and
// the level-up choice the way ui/index.ts does. Scenarios cover: four classes, three dialogue policies,
// three RNG policies (nat-20 everything / fail-then-succeed / seeded), deaths in the chapel and the boss
// fight (respawn + encounter reset), both key routes, Ilyra's chat hub, the brazier rest, and dev skip().
import { World } from '../src/sim/world.ts';
import { bus, type Events, type RollResult } from '../src/core/events.ts';
import { LANDMARKS } from '../src/content/level.ts';
import { startPrologue, type Prologue, type PrologueContext } from '../src/content/prologue.ts';
import { emptyIntent, type ClassId, type DialogueChoice, type DialogueNode, type PlayerIntent, type QuestStep } from '../src/sim/types.ts';
import type { WorldAPI } from '../src/sim/quest.ts';

// Node globals (no @types/node in this project; tsc still checks scripts/).
declare const process: { on(ev: string, fn: (e: unknown) => void): void; env: Record<string, string | undefined>; exit(code: number): void };
declare function setImmediate(fn: () => void): void;

const DT = 1 / 60;
const MAX_TICKS = 60 * 60 * 25; // 25 sim-minutes
const tickAsync = () => new Promise<void>((r) => setImmediate(r));
let failures = 0;
const fail = (msg: string) => { failures++; console.error('  FAIL:', msg); };
const ok = (cond: unknown, msg: string) => { if (!cond) fail(msg); };
process.on('unhandledRejection', (e: unknown) => { fail('unhandled rejection: ' + ((e as Error)?.stack ?? e)); });

interface Scenario {
  name: string; classId: ClassId; policy: 'first' | 'last' | 'checks'; rng: 'lucky' | 'failFirst' | 'seeded';
  deaths: boolean; keyRoute: 'corpse' | 'altar'; chat: boolean; brazier: boolean; skipTo?: string; seed: number;
}
const SCENARIOS: Scenario[] = [
  { name: 'fighter / nat-20s / checks-first / corpse key / chat / brazier', classId: 'fighter', policy: 'checks', rng: 'lucky', deaths: false, keyRoute: 'corpse', chat: true, brazier: true, seed: 1 },
  { name: 'wizard / fail-then-succeed / last choice / altar key / deaths', classId: 'wizard', policy: 'last', rng: 'failFirst', deaths: true, keyRoute: 'altar', chat: true, brazier: false, seed: 2 },
  { name: 'barbarian / seeded random / first choice / altar key', classId: 'barbarian', policy: 'first', rng: 'seeded', deaths: false, keyRoute: 'altar', chat: false, brazier: true, seed: 7 },
  { name: 'rogue / skip(move → chapel) / seeded / deaths', classId: 'rogue', policy: 'checks', rng: 'seeded', deaths: true, keyRoute: 'corpse', chat: false, brazier: true, skipTo: 'chapel', seed: 11 },
];

const STAGE_STEPS = ['lockOn', 'lightAttack', 'dodgeAttack', 'block', 'heavyAttack', 'ability', 'finishChapel'];
// The order every run must produce (fast-forwarded beats appear as completes only).
const EXPECTED_ORDER = [
  'wake', 'move', 'sprint', 'dodge', 'jump', 'sword', 'inventory', 'equip', 'sheet', 'cardAbilities', 'cardAC', 'cardProf',
  'cache', 'cacheLoot', 'potion', 'talk', 'camp', 'rest', 'chest', 'hotbar', 'boulder', 'chapel',
  ...STAGE_STEPS, 'levelUp', 'captain', 'key', 'gate', 'crypt', 'cryptHall', 'brazier', 'boss', 'ending',
];

// ---------------------------------------------------------------- fake UI
function makeFakeUI(policy: Scenario['policy'], log: string[]) {
  const pending: (() => void)[] = [];
  const later = (fn: () => void, ticks = 2) => { let n = ticks; const wrap = () => { if (--n <= 0) fn(); else pending.push(wrap); }; pending.push(wrap); };
  const rolls: RollResult[] = []; const screens: string[] = []; const tutorials: string[] = [];
  const noVars = (s: string, what: string) => ok(!/\{\w+\}/.test(s), `unsubstituted var in ${what}: '${s}'`);
  return {
    dialogue: {
      present(node: DialogueNode, choices: DialogueChoice[], onPick: (i: number) => void, onContinue: () => void) {
        log.push(`  [${node.speaker}] ${node.text}`); noVars(node.text, 'node');
        if (!choices.length) { later(onContinue); return; }
        for (const c of choices) noVars(c.text, 'choice');
        let i = 0;
        if (policy === 'last') i = choices.length - 1;
        else if (policy === 'checks') { const j = choices.findIndex((c) => c.check); i = j >= 0 ? j : 0; }
        log.push(`    > ${choices[i].text}`);
        later(() => onPick(i));
      },
      hide() {},
      showRoll(roll: RollResult, onDone: () => void) {
        rolls.push(roll);
        log.push(`    🎲 ${roll.label}: d20=${roll.d20}${roll.advantage ? ' (' + roll.advantage + ')' : ''} +${roll.bonus} = ${roll.total} vs DC ${roll.dc} → ${roll.success ? 'SUCCESS' : 'FAIL'}${roll.bonusDice?.length ? ' [' + roll.bonusDice.map((b) => b.label + ' ' + b.value).join(', ') + ']' : ''}`);
        later(onDone);
      },
    },
    tutorial: { show(step: QuestStep) { tutorials.push(step.id); noVars(step.hint, 'step hint'); noVars(step.title, 'step title'); }, complete(id: string) { tutorials.push('✓' + id); } },
    showScreen(name: string | null) { screens.push(String(name)); },
    isBlocking: () => false,
    later, flush() { const fns = pending.splice(0); for (const f of fns) f(); },
    rolls, screens, tutorials,
  };
}

// ---------------------------------------------------------------- one scenario
async function runScenario(sc: Scenario): Promise<void> {
  console.log(`\n=== ${sc.name} ===`);
  bus.clear();
  const world = new World(sc.seed) as WorldAPI;
  world.setPlayerClass(sc.classId);
  const p = world.player; p.name = 'Wren';
  p.invulnerable = true;            // the real AI fights back; deaths in this test are scripted
  world.spawn({ id: 'ilyra', kind: 'companion', name: 'Ilyra', model: 'Rogue_Hooded', faction: 'party', pos: LANDMARKS.ilyraStart, yaw: LANDMARKS.ilyraStart.yaw, weapon: 'staff', abilities: { str: 10, dex: 14, con: 12, int: 12, wis: 17, cha: 14 }, maxHp: 17, ac: 15 });
  const startWeapon = world.equipment?.mainHand ?? null;

  const log: string[] = [];
  const ui = makeFakeUI(sc.policy, log);
  const calls = { shots: 0, endShot: 0, snap: 0, chest: 0, boulder: 0, gate: 0, fades: 0, timeScales: [] as number[] };
  const ctx: PrologueContext = {
    world, ui,
    cam: { playShot: () => { calls.shots++; }, endShot: () => { calls.endShot++; }, snapBehind: () => { calls.snap++; } },
    props: { openChest: () => { calls.chest++; }, pushBoulder: () => { calls.boulder++; }, openGate: () => { calls.gate++; }, openCryptExit: () => {} },
    fade: async () => { calls.fades++; },
    setTimeScale: (s) => { calls.timeScales.push(s); },
  };

  // --- event capture ---
  const starts: string[] = []; const completes: string[] = []; const events: Record<string, number> = {};
  const result: { stats: Record<string, number> | null } = { stats: null }; const areas: string[] = []; const bossStarts: string[] = [];
  const count = (k: string) => { events[k] = (events[k] ?? 0) + 1; };
  bus.on('questStep', (e) => { if (e.state === 'start') { starts.push(e.id); log.push(`▶ ${e.id} — ${e.title}: ${e.hint}`); } else completes.push(e.id); });
  bus.on('prologueComplete', (e) => { result.stats = e.stats; });
  bus.on('areaEnter', (e) => areas.push(e.id));
  bus.on('bossStart', (e) => bossStarts.push(e.name));
  bus.on('dialogueLine', (e) => { count('line'); if (!e.text) fail('empty dialogue line'); if (/\{\w+\}/.test(e.text)) fail('unsubstituted var in line: ' + e.text); if (process.env.VERBOSE) log.push(`  (${e.speakerId}) ${e.text}`); });
  for (const k of ['dialogueStart', 'dialogueEnd', 'check', 'encounterStart', 'encounterEnd', 'loot', 'levelUp', 'rest', 'teleport', 'bossEnd', 'toast', 'questLog', 'death', 'respawn', 'equip'] as (keyof Events)[]) bus.on(k, () => count(k));
  // like ui/index.ts: the level-up screen opens on `levelUp` and calls world.chooseLevelUp
  bus.on('levelUp', () => ui.later(() => { ui.showScreen('levelUp'); world.chooseLevelUp(p.feats?.includes('tough') ? 'mobile' : 'tough'); ui.showScreen(null); bus.emit('ui', { screen: null }); }, 6));

  // --- RNG policy ---
  const realNext = world.rng.next.bind(world.rng);
  if (sc.rng === 'lucky') world.rng.next = () => 0.97;
  const prologue: Prologue = startPrologue(ctx);
  if (sc.rng === 'failFirst') {
    const inner = world.skillCheck; const attempts = new Map<string, number>();
    world.skillCheck = (a, skill, dc, opts) => {
      const n = attempts.get(skill) ?? 0; attempts.set(skill, n + 1);
      world.rng.next = () => (n % 2 === 0 ? 0.0 : 0.97); // first attempt of each skill: d20=1; second: 20
      const r = inner.call(world, a, skill, dc, opts);
      world.rng.next = realNext;
      return r;
    };
  }

  // --- bot ---
  let intent: PlayerIntent = emptyIntent(0);
  // never teleport mid-jump: World.teleport() sets onGround and the jump state would never land
  const at = (x: number, z: number, yaw?: number) => { if (p.state === 'jump') return; world.teleport(p, { x, y: 0, z }, yaw); };
  const inter = (id: string) => world.interactables.find((i) => i.id === id);
  const kill = (id: string) => { const a = world.actors.get(id); if (!a || a.dead) return; world.killActor!(id); };
  const killEncounter = () => { for (const a of world.actors.values()) if (a.kind === 'enemy' && a.encounterId === encounter && !a.dead) kill(a.id); };
  let dialogueActive = false; const trees: string[] = [];
  bus.on('dialogueStart', (e) => { dialogueActive = true; trees.push(e.id); }); bus.on('dialogueEnd', () => { dialogueActive = false; });
  let encounter: string | null = null; let encounterAt = 0;
  bus.on('encounterStart', (e) => {
    encounter = e.id; encounterAt = tick;
    // the bot's real swings must not end a fight before the lesson does; kills go through killActor
    for (const a of world.actors.values()) if (a.kind === 'enemy' && a.encounterId === e.id) { a.maxHp = 9999; a.hp = 9999; }
  });
  bus.on('encounterEnd', () => { encounter = null; });
  let diedAt = -1; bus.on('death', (e) => { if (e.actorId === 'player') diedAt = tick; });
  let diedChapel = false; let diedBoss = false; let chatted = false; let lockTries = 0;
  let tick = 0;
  const free = () => !dialogueActive && p.state !== 'cinematic' && !p.dead;
  const current = () => prologue.currentStep?.id ?? '';
  // two-phase like a real player: walk there first (the sim resolves the focused interactable at the end of
  // the step), press E on a later tick — pressing in the teleport tick would fire the *previous* focus.
  const pressE = (id: string) => {
    const i = inter(id); if (!i) return;
    // stand a step off-centre (actor separation would push us off an NPC anyway) and press once focused
    if (Math.hypot(p.pos.x - i.x, p.pos.z - i.z) > Math.max(1.2, i.r * 0.6)) { at(i.x + 0.6, i.z + 0.6, Math.atan2(-0.6, -0.6)); return; }
    if (world.focusInteractable?.id === id) intent.interact = true;
  };
  const every = (n: number) => tick % n === 0;

  const bot = () => {
    intent = emptyIntent(0);
    if (diedAt >= 0 && tick - diedAt > 40) { diedAt = -1; prologue.respawn(); }
    if (!free()) return;
    const step = current();
    switch (step) {
      case 'move': intent.move = { x: 0, z: 1 }; break;
      case 'sprint': intent.move = { x: 1, z: 0 }; intent.sprint = true; break;
      case 'dodge': if (every(40)) intent.dodge = true; break;
      case 'jump': if (every(40)) intent.jump = true; break;
      case 'sword': if (every(10)) pressE('sword'); break;
      case 'inventory': if (every(10)) bus.emit('ui', { screen: 'inventory' }); break;
      case 'equip': if (every(10)) world.equip(startWeapon ?? 'longsword'); break;
      case 'sheet': if (every(10)) bus.emit('ui', { screen: 'character' }); break;
      case 'cache': if (every(10)) at(LANDMARKS.cache.x + 1, LANDMARKS.cache.z + 1); break;
      case 'cacheLoot': if (every(10)) pressE('cache'); break;
      case 'potion': if (every(10)) intent.useItem = true; break;
      case 'talk': if (every(10)) pressE('ilyra'); break;
      case 'camp': if (sc.chat && !chatted && every(10)) { chatted = true; pressE('ilyra'); } else if (every(10)) at(LANDMARKS.camp.x, LANDMARKS.camp.z); break;
      case 'rest': if (every(10)) pressE('campfire'); break;
      case 'chest': if (every(10)) pressE('chest'); break;
      case 'hotbar': if (every(10)) intent.ability = 0; break;
      case 'boulder': case 'boulderHelp': if (every(20)) pressE('boulder'); break;
      case 'chapel': if (every(10)) at(LANDMARKS.chapel.x - 4, LANDMARKS.chapel.z + 4); break;
      case 'lockOn': if (every(15)) { lockTries++; intent.lockOn = true; if (lockTries > 6) { p.targetId = 'minion_1'; bus.emit('lockOn', { actorId: 'player', targetId: 'minion_1' }); } } break;
      case 'lightAttack': if (every(15)) intent.lightAttack = true; break;
      case 'dodgeAttack':
        if (sc.deaths && !diedChapel && every(10)) { diedChapel = true; p.invulnerable = false; kill('player'); p.invulnerable = true; break; }
        if (every(10)) { bus.emit('telegraph', { actorId: 'minion_1', kind: 'light', pos: { ...p.pos }, duration: 0.5 }); bus.emit('miss', { attackerId: 'minion_1', targetId: 'player', pos: { ...p.pos }, reason: 'dodge' }); }
        break;
      case 'block': if (every(10)) bus.emit('miss', { attackerId: 'minion_2', targetId: 'player', pos: { ...p.pos }, reason: sc.classId === 'wizard' ? 'block' : 'parry' }); break;
      case 'heavyAttack': if (every(10)) bus.emit('swing', { actorId: 'player', kind: 'charged', pos: { ...p.pos } }); break;
      case 'ability': if (every(10)) intent.ability = 0; break;
      case 'finishChapel': if (every(10)) killEncounter(); break;
      case 'levelUp': break;
      case 'captain': if (every(10) && encounter === 'captain') killEncounter(); break;
      case 'key': if (every(20)) pressE(sc.keyRoute === 'corpse' ? 'captainKey' : 'altar'); break;
      case 'gate': if (every(20)) pressE('gate'); break;
      case 'crypt': if (every(10)) at(0, -499.5, Math.PI); break;
      case 'cryptHall': if (every(10) && encounter === 'cryptHall') killEncounter(); break;
      case 'brazier': if (every(10)) { if (sc.brazier) pressE('brazier'); else at(0, -530, Math.PI); } break;
      case 'boss':
        // let the Warden wake and take aim (the AI emits bossStart on first aggro) before doing anything to him
        if (encounter === 'boss' && every(10) && (bossStarts.length >= (diedBoss ? 2 : 1) || tick - encounterAt > 400)) {
          const b = world.actors.get('boss');
          if (sc.deaths && !diedBoss) { diedBoss = true; p.invulnerable = false; kill('player'); p.invulnerable = true; }
          else if (b && !b.dead && b.hp > b.maxHp / 2) b.hp = Math.floor(b.maxHp / 2) - 1;
          else killEncounter();
        }
        break;
      case 'ending': break;
      default: if (completes.includes('brazier') && !starts.includes('boss') && every(10)) at(0, -530, Math.PI); break;
    }
  };

  if (sc.skipTo) bus.on('questStep', (e) => { if (e.id === 'move' && e.state === 'start') setImmediate(() => prologue.skip(sc.skipTo!)); });

  // --- loop ---
  const t0 = Date.now();
  for (tick = 0; tick < MAX_TICKS && !prologue.finished; tick++) {
    bot();
    world.step(DT, intent);
    prologue.update(DT);
    ui.flush();
    await tickAsync();
  }
  const secs = (Date.now() - t0) / 1000;

  // --- assertions ---
  ok(prologue.finished, `prologue finished (ticks=${tick}, sim ${(tick * DT / 60).toFixed(1)} min) — stuck at step '${current()}'`);
  ok(result.stats !== null, 'prologueComplete fired');
  const expectedSeq = sc.skipTo ? EXPECTED_ORDER.slice(EXPECTED_ORDER.indexOf(sc.skipTo)) : EXPECTED_ORDER;
  const seen = new Set<string>();
  for (const id of starts) { if (seen.has(id) && !STAGE_STEPS.includes(id) && id !== 'boulder' && id !== 'captain') fail(`step '${id}' started twice`); seen.add(id); }
  for (const id of expectedSeq) ok(seen.has(id), `step '${id}' started`);
  let last = -1;
  for (const id of starts) { const i = EXPECTED_ORDER.indexOf(id); if (i < 0) continue; if (i < last && !STAGE_STEPS.includes(id) && id !== 'boulder') fail(`step '${id}' out of order (after ${EXPECTED_ORDER[last]})`); last = Math.max(last, i); }
  for (const s of prologue.steps) ok(s.done, `step '${s.id}' is done at the end`);
  ok(EXPECTED_ORDER.every((id) => completes.includes(id)), 'every step completed (incl. fast-forwarded)');
  ok((events.dialogueStart ?? 0) >= (sc.skipTo ? 3 : 5), `dialogue trees ran (${events.dialogueStart})`);
  ok(ui.rolls.length >= 1, 'at least one dialogue roll shown');
  ok((events.check ?? 0) >= (sc.skipTo ? 2 : 3), `checks rolled (${events.check})`);
  ok((events.line ?? 0) >= 20, `Ilyra spoke (${events.line} lines)`);
  ok(areas.join(',').includes('crypt'), `areas entered: ${areas.join(',')}`);
  ok(bossStarts.length >= 1, `bossStart emitted (${bossStarts.length})`);
  ok((events.bossEnd ?? 0) === 1, `bossEnd emitted once (${events.bossEnd})`);
  ok(p.level >= 2 && (events.levelUp ?? 0) >= 1, `levelled up (level ${p.level})`);
  ok((p.pendingLevelUps ?? 0) === 0, 'no pending level-up left');
  ok(world.hasItem!('cryptKey'), 'crypt key obtained');
  ok(world.equipment?.ring === 'ringProtection', `ring equipped (${world.equipment?.ring})`);
  ok(world.equipment?.mainHand === (startWeapon ?? 'longsword'), `class weapon back in hand (${world.equipment?.mainHand})`);
  ok(calls.boulder === 1 && calls.gate === 1 && (sc.skipTo ? true : calls.chest === 1), `props called (chest ${calls.chest}, boulder ${calls.boulder}, gate ${calls.gate})`);
  ok(calls.shots >= (sc.skipTo ? 2 : 4) && calls.endShot >= 1, `camera shots (${calls.shots})`);
  if (sc.deaths) { ok((result.stats?.deaths ?? 0) === 2, `two deaths recorded (${result.stats?.deaths})`); ok(bossStarts.length === 2, `boss reset → second bossStart (${bossStarts.length})`); ok((events.respawn ?? 0) === 2, `respawned twice (${events.respawn})`); }
  if (sc.rng === 'lucky') { ok((result.stats?.nat20 ?? 0) >= 3, `nat 20s counted (${result.stats?.nat20})`); ok(world.flags.has('ilyraConfessed'), 'Ilyra confessed on the lucky run'); ok(world.flags.has('bossHesitated'), 'boss hesitated on the lucky run'); }
  if (sc.rng === 'failFirst') { ok((result.stats?.checksFailed ?? 0) >= 3, `failed checks retried (${result.stats?.checksFailed})`); ok(trees.includes('boulderHelp'), `boulderHelp dialogue ran after the failed push (${trees.join(',')})`); if (sc.policy !== 'last') ok(world.flags.has('boulderHelp'), 'Help action taken'); }
  if (sc.chat) ok(world.flags.has('askedMoon') || world.flags.has('askedMarrow') || world.flags.has('refusedGuidance') || (events.dialogueStart ?? 0) >= 7, 'Ilyra chat hub visited');
  if (sc.brazier && !sc.skipTo) ok((events.rest ?? 0) >= 2, `rested at the fire and the brazier (${events.rest})`);
  ok(prologue.codex.length >= 4, `codex unlocked (${prologue.codex.map((c) => c.id).join(', ')})`);
  ok(!calls.timeScales.length || calls.timeScales[calls.timeScales.length - 1] === 1, 'time scale restored to 1');
  ok(['endingAbbey', 'endingSecret', 'endingOwed', 'endingAlone'].some((f) => world.flags.has(f)), 'an ending flag was set');
  console.log(`  ${tick} ticks (${(tick * DT / 60).toFixed(1)} sim-min) in ${secs.toFixed(1)}s · level ${p.level} · stats: ${JSON.stringify(result.stats)}`);
  console.log(`  flags: ${[...world.flags].filter((f) => !f.startsWith('codex:')).join(', ')}`);
  if (process.env.VERBOSE) console.log(log.join('\n'));
  else console.log('  sample:\n' + log.filter((l) => l.startsWith('  [') || l.startsWith('    🎲')).slice(0, 8).join('\n'));
  prologue.dispose();
}

// ---------------------------------------------------------------- go
(async () => {
  for (const sc of SCENARIOS) {
    try { await runScenario(sc); } catch (e) { fail(`scenario '${sc.name}' threw: ${(e as Error).stack}`); }
  }
  console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PROLOGUE TESTS PASSED');
  process.exit(failures ? 1 : 0);
})();
