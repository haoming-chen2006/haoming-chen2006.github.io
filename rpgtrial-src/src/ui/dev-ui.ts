// Isolated UI dev page: a REAL World + ThirdPersonCamera over a tiny placeholder three.js landscape, with a fake
// `game` and a toolbar / URL params to open every screen and fire sample bus events.
//   ?screen=inventory   ?fire=damage,crit,heal   ?dev=0 (hide toolbar)   ?loading=1 (keep the loading screen)   ?class=wizard
//   window.__dev.fire('damage'), window.__dev.screen('map')  — for the screenshot harness (eval:)
import * as THREE from 'three';
import { World } from '../sim/world.ts';
import { Input } from '../core/input.ts';
import { ThirdPersonCamera } from '../render/camera.ts';
import { terrainHeight } from '../sim/terrain.ts';
import { LAKE, LANDMARKS } from '../content/level.ts';
import { STEPS } from '../content/story.ts';
import { bus, type RollResult } from '../core/events.ts';
import { emptyIntent, type ClassId, type DialogueNode, type DialogueChoice } from '../sim/types.ts';
import { createUI, INFO_CARDS } from './index.ts';
import type { UIContext, ScreenName } from './types.ts';
import { TIPS } from './menus.ts';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('gl') as HTMLCanvasElement;

// ---- world ----
const world = new World(7);
const P = LANDMARKS.start;
const player = world.spawn({ id: 'player', kind: 'player', name: 'Tav', model: 'Knight', faction: 'party', pos: { x: P.x, y: 0, z: P.z }, yaw: P.yaw, classId: 'fighter',
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 13 }, maxHp: 12, ac: 16, weapon: 'sword_1handed', offhand: 'shield_round' });
const ilyra = world.spawn({ id: 'ilyra', kind: 'companion', name: 'Ilyra', model: 'Rogue_Hooded', faction: 'party', pos: { x: 3, y: 0, z: 24 }, yaw: -2.2, weapon: 'staff', maxHp: 17, ac: 15, abilities: { str: 10, dex: 14, con: 12, int: 12, wis: 17, cha: 14 } });
const sk = world.spawn({ id: 'sk1', kind: 'enemy', name: 'Skeleton', model: 'Skeleton_Warrior', faction: 'undead', pos: { x: -3, y: 0, z: 16 }, yaw: 0.5, weapon: 'Skeleton_Blade', offhand: 'Skeleton_Shield_Small_A', maxHp: 13, ac: 13 });
const boss = world.spawn({ id: 'boss', kind: 'enemy', name: 'The Drowned Abbot', model: 'Skeleton_Mage', faction: 'undead', pos: { x: 4, y: 0, z: 14 }, yaw: 0.2, weapon: 'Skeleton_Staff', maxHp: 60, ac: 14, hidden: true });
try { const cls = params.get('class') as ClassId | null; if (cls) world.setPlayerClass(cls); } catch (e) { console.warn(e); }
for (const [id, qty] of [['longsword', 1], ['shield', 1], ['chainShirt', 1], ['potionHealing', 3], ['rations', 2], ['dagger', 2], ['scrollMagicMissile', 1], ['ringProtection', 1]] as const) { try { world.giveItem(id, qty); } catch (e) { console.warn('giveItem', id, e); } }
try { world.equip('longsword'); world.equip('shield'); } catch {}
world.gold = 64;
const w = world as any;
w.quest = Object.values(STEPS).slice(0, 8).map((s, i) => ({ ...s, done: i < 3 }));
w.flags.add('met:ilyra');
player.resources = { ...player.resources, secondWind: 1, actionSurge: 1 };
player.conditions = { guidance: 60 };

// ---- placeholder scene ----
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x87a6c8); scene.fog = new THREE.Fog(0x9fb4c9, 40, 260);
const cam = new ThirdPersonCamera(innerWidth / innerHeight);
const FLAT = params.get('flat') === '1';   // cheap background for the screenshot harness (SwiftShader)
if (FLAT) { scene.background = new THREE.Color(0x3a4a3a); scene.fog = null; renderer.setPixelRatio(1); }
else {
  const N = 160, S = 320; const geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute; const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); const y = terrainHeight(x, z); pos.setY(i, y);
    const t = Math.max(0, Math.min(1, (y - LAKE.level) / 18));
    if (y < LAKE.level + 0.6) c.setHex(0xb9a67a); else if (t < 0.15) c.setHex(0x6f8a3f).lerp(new THREE.Color(0xb9a67a), 0.35); else c.setHex(0x5c7d38).lerp(new THREE.Color(0x77705a), t);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ color: 0x2f5470, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2; water.position.y = LAKE.level; scene.add(water);
  const sun = new THREE.DirectionalLight(0xffe6c0, 2.2); sun.position.set(-40, 60, 20); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x4a4030, 0.9));
  // a few "trees"
  for (let i = 0; i < 60; i++) { const x = (Math.sin(i * 12.9) * 0.5 + 0.5) * 200 - 100, z = (Math.cos(i * 7.3) * 0.5 + 0.5) * 200 - 60; const y = terrainHeight(x, z); if (y < LAKE.level + 1.5) continue; const t = new THREE.Mesh(new THREE.ConeGeometry(2.2, 7, 7), new THREE.MeshStandardMaterial({ color: 0x2f5a2c, roughness: 1 })); t.position.set(x, y + 3.5, z); scene.add(t); }
}
const actorMeshes = new Map<string, THREE.Object3D>();
function actorMesh(id: string, color: number) {
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.0, 4, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.7 })); body.position.y = 0.9; g.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0xffffff })); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.3, 0.45); g.add(nose);
  scene.add(g); actorMeshes.set(id, g); return g;
}
actorMesh('player', 0xc9a24f); actorMesh('ilyra', 0x6f8cff); actorMesh('sk1', 0xd9d3c4); actorMesh('boss', 0x8a3a3a);

// ---- fake game ----
const input = new Input(canvas);
let paused = false;
const game = {
  pause(on: boolean) { paused = on; world.paused = on; },
  setQuality(t: any) { game.quality = t; console.log('setQuality', t); },
  quality: (params.get('quality') ?? 'medium') as any,   // medium → no backdrop blur (keeps the SwiftShader harness honest)
  input,
  restart() { location.reload(); },
  startGame(classId: ClassId, name: string) { try { world.setPlayerClass(classId); } catch (e) { console.warn(e); } world.player.name = name; game.state = 'playing'; input.uiCapture = false; ui.toast(`Welcome, ${name} the ${classId}`); },
  cam,
  state: (params.get('screen') === 'menu' || params.get('screen') === 'classSelect') ? 'menu' : 'playing',
};
const ctx: UIContext = { world, game: game as any };
const ui = createUI(ctx, { instantText: params.get('type') === '0' });

// ---- loop ----
let last = performance.now();
function frame() {
  const now = performance.now(); const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const it = emptyIntent(cam.moveYaw);
  if (game.state === 'playing' && !input.uiCapture) {
    let x = 0, z = 0; if (input.isDown('forward')) z += 1; if (input.isDown('back')) z -= 1; if (input.isDown('right')) x += 1; if (input.isDown('left')) x -= 1;
    const l = Math.hypot(x, z) || 1; it.move = { x: x / l, z: z / l }; it.sprint = input.isDown('sprint'); it.dodge = input.wasPressed('dodge'); it.jump = input.wasPressed('jump'); it.interact = input.wasPressed('interact');
  }
  if (!paused) { try { world.step(dt, it); } catch (e) { /* the sim may need more setup; the UI is what we test here */ } }
  input.endStep(dt);
  const m = input.takeMouse(); if (!input.uiCapture && !paused) cam.applyMouse(m.dx, m.dy, m.wheel);
  cam.update(world.player, paused ? 0 : dt);
  for (const [id, g] of actorMeshes) { const a = world.actors.get(id); if (!a) continue; g.visible = !a.hidden && !a.dead; g.position.set(a.pos.x, a.pos.y, a.pos.z); g.rotation.y = a.yaw; }
  ui.update(dt);
  renderer.render(scene, cam.camera);
  if (++frames === 3) { ui.warm(); (window as any).__devReady = true; onReady(); }
  requestAnimationFrame(frame);
}
let frames = 0;
function onReady() {
  const s = params.get('screen') as ScreenName | null; if (s) ui.showScreen(s);
  const fire = params.get('fire'); if (fire) fire.split(',').forEach((n, i) => setTimeout(() => ACTIONS[n]?.(), 100 + i * 120));
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.camera.aspect = innerWidth / innerHeight; cam.camera.updateProjectionMatrix(); });

// ---- sample content ----
const roll = (d20: number, bonus: number, dc: number, kind: RollResult['kind'] = 'check', label = 'Persuasion check', bonusDice?: RollResult['bonusDice']): RollResult => {
  const extra = (bonusDice ?? []).reduce((s, d) => s + d.value, 0); const total = d20 + bonus + extra;
  return { kind, label, d20, bonus: bonus + extra, total, dc, success: d20 === 20 ? true : d20 === 1 && kind === 'attack' ? false : total >= dc, crit: d20 === 20 ? 'hit' : d20 === 1 ? 'miss' : null, advantage: null, bonusDice };
};
const sampleNode: DialogueNode = { id: 'x', speaker: 'ilyra', text: 'You were face-down in the shallows when I found you, {name}. The lake was not finished with you — I could see that much. What do you remember of the barge?' };
const sampleChoices: DialogueChoice[] = [
  { text: '[Persuasion] I remember enough. Tell me who you are, and why a cleric is wandering a drowned shore alone.', next: 'a', check: { skill: 'persuasion', dc: 13 } },
  { text: '[Insight] You are lying about something.', next: 'b', check: { skill: 'insight', dc: 15 } },
  { text: 'Nothing. Only the bells.', next: 'c' },
  { text: 'Draw your sword.', next: 'd', tag: 'attack' },
  { text: 'Leave.', next: null, tag: 'leave' },
];
const narratorNode: DialogueNode = { id: 'n', speaker: 'narrator', text: 'The water is black and utterly still. Somewhere beneath it, very faintly, a bell is ringing.' };

const ACTIONS: Record<string, () => void> = {
  damage: () => bus.emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 7, type: 'slashing', crit: false, pos: { ...sk.pos }, blocked: false, killingBlow: false }),
  crit: () => bus.emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 16, type: 'slashing', crit: true, pos: { ...sk.pos }, blocked: false, killingBlow: false }),
  fire: () => bus.emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 9, type: 'fire', crit: false, pos: { ...sk.pos }, blocked: false, killingBlow: false }),
  radiant: () => bus.emit('damage', { sourceId: 'player', targetId: 'sk1', amount: 11, type: 'radiant', crit: false, pos: { ...sk.pos }, blocked: false, killingBlow: false }),
  hurt: () => { player.hp = Math.max(0, player.hp - 4); bus.emit('damage', { sourceId: 'sk1', targetId: 'player', amount: 4, type: 'slashing', crit: false, pos: { ...player.pos }, blocked: false, killingBlow: false }); },
  lowhp: () => { player.hp = 3; },
  heal: () => { player.hp = Math.min(player.maxHp, player.hp + 6); bus.emit('heal', { sourceId: 'ilyra', targetId: 'player', amount: 6, pos: { ...player.pos } }); },
  miss: () => bus.emit('miss', { attackerId: 'sk1', targetId: 'player', pos: { ...sk.pos }, reason: 'miss' }),
  dodge: () => bus.emit('miss', { attackerId: 'sk1', targetId: 'player', pos: { ...player.pos }, reason: 'dodge' }),
  parry: () => bus.emit('parry', { defenderId: 'player', attackerId: 'sk1', pos: { ...sk.pos } }),
  vulnerable: () => bus.emit('damageMod', { targetId: 'sk1', type: 'bludgeoning', mod: 'vulnerable', pos: { ...sk.pos } }),
  attackRoll: () => bus.emit('attackRoll', { attackerId: 'player', targetId: 'sk1', roll: roll(14, 5, 13, 'attack', 'Attack roll'), pos: { ...sk.pos } }),
  check: () => bus.emit('check', { roll: roll(11, 3, 12, 'check', 'perception'), pos: { ...player.pos }, actorId: 'player' }),
  xp: () => { player.xp += 50; bus.emit('xp', { amount: 50, total: player.xp }); },
  gold: () => { world.gold += 12; bus.emit('gold', { amount: 12, total: world.gold }); },
  loot: () => bus.emit('loot', { itemId: 'longsword', qty: 1, name: 'Longsword' }),
  potion: () => bus.emit('loot', { itemId: 'potionHealing', qty: 2, name: 'Potion of Healing' }),
  levelUp: () => { player.level = 2; player.xp = 300; bus.emit('levelUp', { actorId: 'player', level: 2 }); },
  boss: () => { boss.hidden = false; bus.emit('bossStart', { actorId: 'boss', name: 'The Drowned Abbot', subtitle: 'Warden of the Sluice' }); },
  bossHurt: () => { boss.hp = Math.max(0, boss.hp - 12); },
  bossEnd: () => bus.emit('bossEnd', { actorId: 'boss' }),
  area: () => bus.emit('areaEnter', { id: 'shore', name: 'The Hollowmere' }),
  areaCrypt: () => bus.emit('areaEnter', { id: 'crypt', name: 'The Crypt' }),
  cineOn: () => bus.emit('cinematic', { on: true }), cineOff: () => bus.emit('cinematic', { on: false }),
  stamina: () => { player.stamina = 0; bus.emit('staminaEmpty', { actorId: 'player' }); },
  rage: () => world.setCondition('player', 'rage', 20),
  poison: () => world.setCondition('player', 'poisoned', 12),
  cooldown: () => { for (const id of world.kit) player.cooldowns[id] = 6; },
  spend: () => { player.resources.secondWind = 0; player.resources.spellSlots1 = 1; },
  toast: () => bus.emit('toast', { text: 'Ilyra will remember that.', kind: 'info' }),
  toastGold: () => bus.emit('toast', { text: 'Found 12 gold', kind: 'gold' }),
  quest: () => { const s = Object.values(STEPS)[3]; bus.emit('questStep', { id: s.id, title: s.title, hint: s.hint, state: 'start' }); },
  questDone: () => { const s = Object.values(STEPS)[3]; bus.emit('questStep', { id: s.id, title: s.title, hint: s.hint, state: 'complete' }); },
  tutorial: () => ui.tutorial.show(Object.values(STEPS)[3] as any),
  tutorial2: () => ui.tutorial.show(Object.values(STEPS)[5] as any),
  tutorialDone: () => ui.tutorial.complete(Object.values(STEPS)[3].id),
  info: () => ui.tutorial.card(INFO_CARDS.abilityScores.title, INFO_CARDS.abilityScores.html),
  infoAc: () => ui.tutorial.card(INFO_CARDS.ac.title, INFO_CARDS.ac.html, ['Q']),
  prompt: () => bus.emit('interactable', { id: 'sword', label: 'Take the longsword' }),
  promptOff: () => bus.emit('interactable', { id: null, label: null }),
  rest: () => bus.emit('rest', { kind: 'long' }),
  dialogue: () => ui.dialogue.present(sampleNode, sampleChoices, (i) => { console.log('pick', i); ui.dialogue.present(narratorNode, [], () => {}, () => ui.dialogue.hide()); }, () => ui.dialogue.hide()),
  narrator: () => ui.dialogue.present(narratorNode, [], () => {}, () => ui.dialogue.hide()),
  dialogueHide: () => ui.dialogue.hide(),
  rollOk: () => ui.dialogue.showRoll(roll(14, 5, 13, 'check', 'Persuasion check', [{ label: 'Guidance', value: 3 }]), () => console.log('roll done')),
  rollFail: () => ui.dialogue.showRoll(roll(6, 3, 15, 'check', 'Insight check'), () => {}),
  rollNat20: () => ui.dialogue.showRoll(roll(20, 3, 15, 'check', 'Athletics check'), () => {}),
  rollNat1: () => ui.dialogue.showRoll(roll(1, 4, 12, 'check', 'Sleight of Hand check'), () => {}),
  rollAttack: () => ui.dialogue.showRoll(roll(17, 5, 13, 'attack', 'Attack roll'), () => {}),
  rollSave: () => ui.dialogue.showRoll(roll(9, 2, 13, 'save', 'Wisdom save'), () => {}),
  prologue: () => bus.emit('prologueComplete', { stats: { time: 1447, rolls: 23, nat20: 2, nat1: 1, kills: 9, damageDealt: 211, damageTaken: 64, potions: 2, deaths: 0, checksPassed: 5, checksFailed: 2 } }),
  death: () => { player.hp = 0; player.dead = true; bus.emit('death', { actorId: 'player', pos: { ...player.pos }, killerId: 'sk1' }); },
  respawn: () => { player.hp = player.maxHp; player.dead = false; bus.emit('respawn', { pos: { ...player.pos } }); },
  wizard: () => { try { world.setPlayerClass('wizard'); } catch (e) { console.warn(e); } },
  fighter: () => { try { world.setPlayerClass('fighter'); } catch (e) { console.warn(e); } },
};
const SCREENS: ScreenName[] = ['menu', 'classSelect', 'pause', 'inventory', 'character', 'journal', 'map', 'levelUp', 'settings', 'death', 'ending', 'credits', null];

// ---- toolbar ----
const bar = document.createElement('div'); bar.className = 'devbar' + (params.get('dev') === '0' ? ' hidden' : '');
const mk = (label: string, fn: () => void) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; return b; };
const section = (title: string, items: [string, () => void][]) => { const b = document.createElement('b'); b.textContent = title; bar.appendChild(b); const row = document.createElement('div'); row.className = 'row'; for (const [l, f] of items) row.appendChild(mk(l, f)); bar.appendChild(row); };
section('screens', SCREENS.map((s) => [s ?? 'none', () => ui.showScreen(s)]));
section('events', Object.keys(ACTIONS).map((k) => [k, ACTIONS[k]]));
document.body.appendChild(bar);
addEventListener('keydown', (e) => { if (e.code === 'Backquote') bar.classList.toggle('hidden'); });
(window as any).__dev = { fire: (n: string) => ACTIONS[n]?.(), screen: (s: ScreenName) => ui.showScreen(s), ui, world, bus, player };

// ---- loading screen ----
const loading = document.getElementById('loading')!; const bar2 = document.getElementById('loadingBar')!; const txt = document.getElementById('loadingText')!; const tipEl = document.getElementById('loadingTip')!;
let ti = 0; const rotate = () => { const t = TIPS[ti++ % TIPS.length]; tipEl.classList.add('fade'); setTimeout(() => { tipEl.innerHTML = `<b>${t[0]}</b>${t[1]}`; tipEl.classList.remove('fade'); }, 400); };
setInterval(rotate, 4000);
let prog = 0; const tick = setInterval(() => { prog = Math.min(100, prog + 9); bar2.style.width = prog + '%'; txt.textContent = ['Gathering the party…', 'Waking the dead…', 'Polishing the dice…', 'Lighting the campfire…'][Math.floor(prog / 26)] ?? 'Ready'; }, 60);
(document as any).fonts?.ready?.then(() => setTimeout(() => {
  clearInterval(tick); bar2.style.width = '100%';
  if (params.get('loading') !== '1') loading.classList.add('hide');
  requestAnimationFrame(frame);
}, 500));
