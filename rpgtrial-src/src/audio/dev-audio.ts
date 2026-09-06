// Audio test bench (dev-audio.html): instantiates AudioSystem, emits sample bus events, drives moods.
// Exposes window.__audioDev { runAll(), stress(), report } and window.__audioReport for e2e/shot.cjs.
import { bus, type Events } from '../core/events.ts';
import { AudioSystem } from './audio.ts';
import { AUDIO_FILES } from './manifest.generated.ts';
import { LANDMARKS } from '../content/level.ts';

const audio = new AudioSystem();
const $ = (id: string) => document.getElementById(id)!;
const logEl = $('log');
const log = (s: string) => { logEl.textContent = `${new Date().toISOString().slice(11, 19)} ${s}\n` + (logEl.textContent ?? '').slice(0, 6000); };
const P = (x = 0, y = 0, z = 0) => ({ x, y, z });
let listener = { pos: P(LANDMARKS.start.x, 0, LANDMARKS.start.z), yaw: LANDMARKS.start.yaw, camPos: P(LANDMARKS.start.x, 3, LANDMARKS.start.z + 5) };
const near = (r = 2) => P(listener.pos.x + (Math.random() - 0.5) * r * 2, 0, listener.pos.z + (Math.random() - 0.5) * r * 2);

const emit = <K extends keyof Events>(k: K, p: Events[K]) => { bus.emit(k, p); log(`bus ${k} ${JSON.stringify(p).slice(0, 90)}`); };
const roll = (d20: number, success: boolean): Events['check']['roll'] => ({ kind: 'check', label: 'Perception check', d20, bonus: 3, total: d20 + 3, dc: 12, success, crit: d20 === 20 ? 'hit' : d20 === 1 ? 'miss' : null });

interface Btn { label: string; fn: () => void }
const sections: { title: string; buttons: Btn[]; extra?: (el: HTMLElement) => void }[] = [
  { title: 'Moods', buttons: (['menu', 'explore', 'camp', 'tension', 'combat', 'boss', 'victory', 'ending', 'death'] as const).map((m) => ({ label: m, fn: () => audio.setMood(m) })) },
  { title: 'Area / time / volume', buttons: [
    { label: 'shore', fn: () => audio.setArea('shore') }, { label: 'crypt', fn: () => audio.setArea('crypt') },
    { label: 'to campfire', fn: () => { listener = { ...listener, pos: P(LANDMARKS.campfire.x + 2, 0, LANDMARKS.campfire.z + 2) }; } },
    { label: 'to lake edge', fn: () => { listener = { ...listener, pos: P(0, 0, 16) }; } },
    { label: 'to chapel', fn: () => { listener = { ...listener, pos: P(LANDMARKS.chapel.x, 0, LANDMARKS.chapel.z) }; } },
    { label: 'to crypt', fn: () => { listener = { ...listener, pos: P(LANDMARKS.cryptEntrance.x, 0, LANDMARKS.cryptEntrance.z) }; audio.setArea('crypt'); } },
    { label: 'pause on', fn: () => audio.setPaused(true) }, { label: 'pause off', fn: () => audio.setPaused(false) },
    { label: 'stinger bighit', fn: () => audio.playStinger('sting_bighit_1') }, { label: 'stinger victory', fn: () => audio.playStinger('sting_victory') },
  ], extra: (el) => {
    const mk = (name: string, min: number, max: number, val: number, step: number, on: (v: number) => void) => { const l = document.createElement('label'); l.textContent = name + ' '; const i = document.createElement('input'); i.type = 'range'; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(val); i.oninput = () => on(Number(i.value)); l.appendChild(i); el.appendChild(l); };
    mk('time', 0, 1, 0.78, 0.01, (v) => audio.setTimeOfDay(v));
    mk('master', 0, 1, 1, 0.05, (v) => audio.setVolumes({ master: v })); mk('music', 0, 1, 1, 0.05, (v) => audio.setVolumes({ music: v })); mk('sfx', 0, 1, 1, 0.05, (v) => audio.setVolumes({ sfx: v }));
    mk('yaw', -3.14, 3.14, listener.yaw, 0.05, (v) => { listener = { ...listener, yaw: v }; });
  } },
  { title: 'Movement', buttons: [
    ...(['grass', 'dirt', 'stone', 'wood', 'water'] as const).map((s) => ({ label: `step ${s}`, fn: () => emit('footstep', { actorId: 'player', pos: listener.pos, surface: s, running: Math.random() < 0.5 }) })),
    { label: 'skeleton steps', fn: () => emit('footstep', { actorId: 'sk1', pos: near(4), surface: 'stone', running: true }) },
    { label: 'dodge', fn: () => emit('dodge', { actorId: 'player', pos: listener.pos }) },
    { label: 'stamina empty', fn: () => emit('staminaEmpty', { actorId: 'player' }) },
    { label: 'lock on', fn: () => emit('lockOn', { actorId: 'player', targetId: 'sk1' }) },
  ] },
  { title: 'Melee', buttons: [
    { label: 'swing light', fn: () => emit('swing', { actorId: 'player', kind: 'light', pos: listener.pos }) },
    { label: 'swing heavy', fn: () => emit('swing', { actorId: 'player', kind: 'heavy', pos: listener.pos }) },
    { label: 'charge + charged', fn: () => { emit('chargeStart', { actorId: 'player' }); setTimeout(() => emit('swing', { actorId: 'player', kind: 'charged', pos: listener.pos }), 500); } },
    { label: 'hit skeleton (slash)', fn: () => emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 6, type: 'slashing', crit: false, pos: near(2), blocked: false, killingBlow: false }) },
    { label: 'crit skeleton', fn: () => emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 14, type: 'slashing', crit: true, pos: near(2), blocked: false, killingBlow: false }) },
    { label: 'player hit (bludgeon)', fn: () => emit('damage', { sourceId: 'sk1', targetId: 'player', amount: 5, type: 'bludgeoning', crit: false, pos: listener.pos, blocked: false, killingBlow: false }) },
    { label: 'player blocked', fn: () => emit('damage', { sourceId: 'sk1', targetId: 'player', amount: 2, type: 'slashing', crit: false, pos: listener.pos, blocked: true, killingBlow: false }) },
    { label: 'fire dmg', fn: () => emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 7, type: 'fire', crit: false, pos: near(3), blocked: false, killingBlow: false }) },
    { label: 'cold dmg', fn: () => emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 5, type: 'cold', crit: false, pos: near(3), blocked: false, killingBlow: false }) },
    { label: 'radiant dmg', fn: () => emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 5, type: 'radiant', crit: false, pos: near(3), blocked: false, killingBlow: false }) },
    { label: 'necrotic dmg', fn: () => emit('damage', { sourceId: 'boss', targetId: 'player', amount: 5, type: 'necrotic', crit: false, pos: listener.pos, blocked: false, killingBlow: false }) },
    { label: 'miss dodge', fn: () => emit('miss', { attackerId: 'sk1', targetId: 'player', pos: listener.pos, reason: 'dodge' }) },
    { label: 'miss block', fn: () => emit('miss', { attackerId: 'sk1', targetId: 'player', pos: listener.pos, reason: 'block' }) },
    { label: 'parry', fn: () => emit('parry', { defenderId: 'player', attackerId: 'sk1', pos: listener.pos }) },
    { label: 'stagger skeleton', fn: () => emit('stagger', { actorId: 'sk1', pos: near(2), seconds: 1 }) },
    { label: 'telegraph heavy', fn: () => emit('telegraph', { actorId: 'sk1', kind: 'heavy', pos: near(3), duration: 0.8 }) },
    { label: 'telegraph light', fn: () => emit('telegraph', { actorId: 'sk1', kind: 'light', pos: near(3), duration: 0.4 }) },
    { label: 'death skeleton', fn: () => emit('death', { actorId: 'sk1', pos: near(3), killerId: 'player' }) },
    { label: 'death player', fn: () => emit('death', { actorId: 'player', pos: listener.pos }) },
    { label: 'death boss', fn: () => emit('death', { actorId: 'boss', pos: near(4) }) },
    { label: 'hitStop', fn: () => emit('hitStop', { seconds: 0.12 }) },
  ] },
  { title: 'Spells (cast → release → impact)', buttons: ['fireBolt', 'rayOfFrost', 'magicMissile', 'thunderwave', 'sacredFlame', 'healingWord', 'secondWind', 'rage', 'smokeBomb', 'huntersMark', 'shield', 'shieldBash', 'throwDagger', 'whirlwind', 'actionSurge', 'necroticBolt', 'summonMinions', 'unknownSpell'].map((id) => ({ label: id, fn: () => {
    const from = listener.pos, to = P(from.x + 6, 0, from.z - 6);
    emit('castStart', { actorId: 'player', spellId: id, pos: from });
    setTimeout(() => { emit('castRelease', { actorId: 'player', spellId: id, from, to }); emit('projectile', { id: 1, kind: id, from, to, speed: 18 }); }, 450);
    setTimeout(() => emit('spellImpact', { spellId: id, pos: to, targetId: 'sk1' }), 950);
  } })) },
  { title: 'Rolls / progression', buttons: [
    { label: 'check success', fn: () => emit('check', { roll: roll(14, true), pos: listener.pos, actorId: 'player' }) },
    { label: 'check fail', fn: () => emit('check', { roll: roll(6, false), pos: listener.pos, actorId: 'player' }) },
    { label: 'nat 20', fn: () => emit('check', { roll: roll(20, true), pos: listener.pos, actorId: 'player' }) },
    { label: 'nat 1', fn: () => emit('check', { roll: roll(1, false), pos: listener.pos, actorId: 'player' }) },
    { label: 'heal', fn: () => emit('heal', { sourceId: 'ilyra', targetId: 'player', amount: 6, pos: listener.pos }) },
    { label: 'levelUp', fn: () => emit('levelUp', { actorId: 'player', level: 2 }) },
    { label: 'xp', fn: () => emit('xp', { amount: 25, total: 125 }) },
    { label: 'questStep complete', fn: () => emit('questStep', { id: 'q1', title: 'Find the sword', hint: '', state: 'complete' }) },
    { label: 'condition rage on', fn: () => emit('condition', { actorId: 'player', condition: 'rage', on: true }) },
    { label: 'condition guidance', fn: () => emit('condition', { actorId: 'player', condition: 'guidance', on: true }) },
    { label: 'damageMod vulnerable', fn: () => emit('damageMod', { targetId: 'sk1', type: 'bludgeoning', mod: 'vulnerable', pos: near(2) }) },
  ] },
  { title: 'Items / world', buttons: [
    { label: 'loot potion', fn: () => emit('loot', { itemId: 'potionHealing', qty: 1, name: 'Potion of Healing' }) },
    { label: 'loot sword', fn: () => emit('loot', { itemId: 'longsword', qty: 1, name: 'Longsword' }) },
    { label: 'loot key (quest)', fn: () => emit('loot', { itemId: 'cryptKey', qty: 1, name: 'Crypt Key' }) },
    { label: 'gold', fn: () => emit('gold', { amount: 15, total: 40 }) },
    { label: 'use potion', fn: () => emit('itemUsed', { itemId: 'potionHealing', actorId: 'player' }) },
    { label: 'use scroll', fn: () => emit('itemUsed', { itemId: 'scrollMagicMissile', actorId: 'player' }) },
    { label: 'equip weapon', fn: () => emit('equip', { itemId: 'longsword', slot: 'mainHand' }) },
    { label: 'equip armor', fn: () => emit('equip', { itemId: 'chainShirt', slot: 'armor' }) },
    { label: 'rest short', fn: () => emit('rest', { kind: 'short' }) }, { label: 'rest long', fn: () => emit('rest', { kind: 'long' }) },
    { label: 'interact chest', fn: () => emit('interact', { id: 'chest', actorId: 'player' }) },
    { label: 'interact gate', fn: () => emit('interact', { id: 'gate', actorId: 'player' }) },
    { label: 'interact boulder', fn: () => emit('interact', { id: 'boulder', actorId: 'player' }) },
    { label: 'interact sword', fn: () => emit('interact', { id: 'sword', actorId: 'player' }) },
    { label: 'areaEnter chapel', fn: () => emit('areaEnter', { id: 'chapel', name: 'Ruined Chapel' }) },
    { label: 'teleport crypt', fn: () => emit('teleport', { to: LANDMARKS.cryptEntrance, area: 'crypt' }) },
    { label: 'teleport shore', fn: () => emit('teleport', { to: LANDMARKS.start, area: 'shore' }) },
    { label: 'play chest_open', fn: () => audio.play('chest_open') }, { label: 'play gate_open', fn: () => audio.play('gate_open') },
    { label: 'play owl', fn: () => audio.play('owl', { pos: near(15) }) }, { label: 'play whisper', fn: () => audio.play('whisper', { pos: near(6) }) },
    { label: 'play thunder', fn: () => audio.play('thunder') },
  ] },
  { title: 'Story / encounters', buttons: [
    { label: 'dialogueStart', fn: () => emit('dialogueStart', { id: 'd1', speakerId: 'ilyra' }) },
    { label: 'dialogueLine', fn: () => emit('dialogueLine', { speakerId: 'ilyra', text: 'You are awake.' }) },
    { label: 'dialogueEnd', fn: () => emit('dialogueEnd', { id: 'd1' }) },
    { label: 'encounterStart', fn: () => emit('encounterStart', { id: 'chapel' }) },
    { label: 'encounterEnd', fn: () => emit('encounterEnd', { id: 'chapel' }) },
    { label: 'bossStart', fn: () => emit('bossStart', { actorId: 'boss', name: 'The Hollow Knight', subtitle: 'Warden of the Mere' }) },
    { label: 'bossEnd', fn: () => emit('bossEnd', { actorId: 'boss' }) },
    { label: 'gameOver (death)', fn: () => emit('gameOver', { victory: false }) },
    { label: 'prologueComplete', fn: () => emit('prologueComplete', { stats: {} }) },
    { label: 'ui screen inventory', fn: () => emit('ui', { screen: 'inventory' }) }, { label: 'ui screen null', fn: () => emit('ui', { screen: null }) },
    { label: 'respawn', fn: () => emit('respawn', { pos: listener.pos }) },
  ] },
  { title: 'ui:sfx CustomEvents', buttons: ['click', 'hover', 'open', 'close', 'dice', 'success', 'fail', 'nat20', 'levelup', 'loot', 'equip', 'error', 'page'].map((k) => ({ label: k, fn: () => { document.dispatchEvent(new CustomEvent('ui:sfx', { detail: k })); log('ui:sfx ' + k); } })) },
  { title: 'Samples (raw families)', buttons: [...new Set(AUDIO_FILES.map((f) => f.id.replace(/_\d+$/, '')))].map((fam) => ({ label: fam, fn: () => audio.play(fam) })) },
];

const main = $('main');
for (const s of sections) {
  const sec = document.createElement('section'); const h = document.createElement('h3'); h.textContent = s.title; sec.appendChild(h);
  for (const b of s.buttons) { const el = document.createElement('button'); el.textContent = b.label; el.onclick = () => { audio.engine.resume(); b.fn(); }; sec.appendChild(el); }
  s.extra?.(sec); main.appendChild(sec);
}
$('resume').onclick = () => audio.engine.resume();

/** Every event in sequence (≈ 45 s). Used by the e2e harness to look for runtime errors. */
async function runAll(stepMs = 350) {
  audio.engine.resume();
  const all = sections.filter((s) => s.title !== 'Samples (raw families)').flatMap((s) => s.buttons);
  for (const b of all) { try { b.fn(); } catch (e) { console.error('[dev-audio] button failed', b.label, e); } await new Promise((r) => setTimeout(r, stepMs)); }
  log('runAll done');
  return { buttons: all.length, voices: audio.engine.activeCount() };
}
async function playAllSamples(stepMs = 250) {
  audio.engine.resume();
  const fams = [...new Set(AUDIO_FILES.filter((f) => f.group !== 'music').map((f) => f.id.replace(/_\d+$/, '')))];
  for (const f of fams) { audio.play(f, { volume: 0.7 }); await new Promise((r) => setTimeout(r, stepMs)); }
  return fams.length;
}
async function stress(n = 120) {
  audio.engine.resume();
  const all = sections.filter((s) => /Movement|Melee|Spells/.test(s.title)).flatMap((s) => s.buttons);
  for (let i = 0; i < n; i++) { all[Math.floor(Math.random() * all.length)].fn(); await new Promise((r) => setTimeout(r, 25)); }
  const peak = audio.engine.activeCount(); log(`stress done, active voices ${peak}`); return peak;
}
/** Record the master output (post-compressor) while `script` runs; resolves to base64 webm/opus. */
async function record(script: () => Promise<void>): Promise<string> {
  const e = audio.engine; audio.engine.resume();
  const dest = e.ctx.createMediaStreamDestination(); e.outGain.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
  const chunks: Blob[] = []; rec.ondataavailable = (ev) => chunks.push(ev.data);
  const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: 'audio/webm' })); });
  rec.start(250);
  await script();
  rec.stop(); const blob = await done; try { e.outGain.disconnect(dest); } catch { /* */ }
  return new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res((fr.result as string).split(',')[1]); fr.readAsDataURL(blob); });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const btn = (label: string) => sections.flatMap((s) => s.buttons).find((b) => b.label === label)!.fn();
/** A ~48 s curated reel: shore explore → fight → spells → victory → crypt → boss → death. */
async function demoReel(): Promise<void> {
  audio.setArea('shore'); audio.setTimeOfDay(0.78); audio.setMood('explore'); await sleep(400);
  for (let i = 0; i < 8; i++) { btn('step grass'); await sleep(420); }
  btn('dialogueStart'); await sleep(900); btn('dialogueLine'); await sleep(900); btn('dialogueEnd'); await sleep(1200);
  btn('check success'); await sleep(1800); btn('loot sword'); await sleep(900);
  btn('encounterStart'); await sleep(1200);
  btn('swing light'); await sleep(350); btn('hit skeleton (slash)'); await sleep(500); btn('swing heavy'); await sleep(400); btn('crit skeleton'); await sleep(700);
  btn('telegraph heavy'); await sleep(800); btn('parry'); await sleep(600); btn('player hit (bludgeon)'); await sleep(700); btn('dodge'); await sleep(600);
  btn('fireBolt'); await sleep(1600); btn('rayOfFrost'); await sleep(1600); btn('thunderwave'); await sleep(1800); btn('sacredFlame'); await sleep(1500);
  btn('death skeleton'); await sleep(900); btn('encounterEnd'); await sleep(3500); btn('xp'); await sleep(300); btn('levelUp'); await sleep(3500);
  btn('teleport crypt'); await sleep(1500); audio.setMood('tension'); btn('play whisper'); await sleep(2500); btn('play whisper'); await sleep(2000);
  btn('bossStart'); await sleep(2500); btn('necrotic dmg'); await sleep(800); btn('necroticBolt'); await sleep(1500);
  btn('death player'); btn('gameOver (death)'); await sleep(5000);
}
$('runAll').onclick = () => { runAll(); };
$('stress').onclick = () => { stress(); };
(window as any).__sid = Math.random().toString(36).slice(2);
(window as any).__audioDev = { audio, runAll, stress, playAllSamples, record, demoReel, emit, btn, listener: () => listener, setListener: (p: { x: number; z: number }) => { listener = { ...listener, pos: P(p.x, 0, p.z) }; } };

// frame loop
let last = performance.now();
function frame() {
  const now = performance.now(); const dt = Math.min(0.1, (now - last) / 1000); last = now;
  audio.update(dt, listener);
  $('ctxState').textContent = audio.engine.ctx.state; $('voices').textContent = String(audio.engine.activeCount());
  $('track').textContent = audio.music.currentTrack ?? '-'; $('mood').textContent = audio.music.mood; $('area').textContent = audio.music.area;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

audio.init((d, t) => { $('loadingText').textContent = `${d}/${t}`; }).then(() => {
  const r = audio.report; $('decoded').textContent = `${r.decoded}/${r.total} in ${r.ms}ms${r.failed.length ? ' FAILED: ' + r.failed.join(',') : ''}`;
  log(`init done: ${JSON.stringify(r)}`);
  $('loading').classList.add('hide');
  if (new URLSearchParams(location.search).get('auto')) { audio.setMood('explore'); runAll(); }
});
