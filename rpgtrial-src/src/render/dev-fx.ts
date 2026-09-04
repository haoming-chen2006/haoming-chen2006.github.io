// FX dev harness (post-FX agent): boots the game and self-wires Particles / VFX / FlickerLights exactly the way
// game.ts should (see NOTES-postfx.md). Open /rpgtrial/dev-fx.html. Exposes window.__fx for the screenshot harness:
//   __fx.demo('hit'|'crit'|'parry'|'dodge'|'thunder'|'fire'|'missile'|'frost'|'sacred'|'heal'|'levelup'|'check'|'skeleton'|'kill'|'rage'|'mark'|'campfire'|'chapel'|'sun'|'cinematic'|'lowhp'|'loot'|'rest'|'boss'|'stagger'|'telegraph')
import * as THREE from 'three';
import { Game } from '../game.ts';
import { assets } from './assets.ts';
import { Particles } from './particles.ts';
import { VFX } from './vfx.ts';
import { FlickerLight, lightForKind } from './fx/flickerLight.ts';
import { LIGHTS, LANDMARKS } from '../content/level.ts';
import { terrainHeight } from '../sim/terrain.ts';
import { bus } from '../core/events.ts';

const bar = document.getElementById('loadingBar')!; const text = document.getElementById('loadingText')!;
assets.onProgress = (l, t, label) => { bar.style.width = `${Math.round((l / Math.max(t, 1)) * 100)}%`; text.textContent = label.split('/').pop() ?? ''; };

(async () => {
  const game = new Game(document.getElementById('gl') as HTMLCanvasElement);
  await game.init();
  // ---- wiring (mirror of what game.ts should do) ----
  const particles = new Particles(game.scene, game.renderer.settings);
  const vfx = new VFX(game.scene, (id) => game.views.get(id), game.cam.camera, game.renderer);
  vfx.particles = particles;
  const wv = game.worldView as any;
  if (wv.sunSprite) game.renderer.setSun(wv.sunSprite);
  const lights: FlickerLight[] = [];
  for (const l of LIGHTS) {
    const pl = lightForKind(l.kind, l.color, l.intensity, l.range); pl.position.set(l.x, l.y, l.z); game.scene.add(pl); lights.push(pl);
    const kind = l.kind === 'fire' ? 'fire' : l.kind === 'torch' ? 'torch' : l.kind === 'candle' ? 'candle' : 'magicBrazier';
    particles.addEmitter(kind, { x: l.x, y: l.y - (l.kind === 'fire' ? 0.45 : l.kind === 'torch' ? 0.2 : 0.05), z: l.z }, { scale: l.kind === 'fire' && (l.intensity ?? 0) > 40 ? 1.25 : 1 });
  }
  if (!LIGHTS.some((l) => l.kind === 'fire')) { // no dressing yet: put a campfire at the landmark
    const c = LANDMARKS.campfire; const y = terrainHeight(c.x, c.z);
    particles.addEmitter('fire', { x: c.x, y: y + 0.1, z: c.z });
    const pl = lightForKind('fire'); pl.position.set(c.x, y + 0.9, c.z); game.scene.add(pl); lights.push(pl);
  }
  const playerPos = new THREE.Vector3();
  const q = new URLSearchParams(location.search);
  if (!q.has('nofx')) {
    particles.addEmitter('fireflies', { x: 0, y: 0, z: 0 }, { follow: playerPos });
    particles.addEmitter('dust', { x: 0, y: 0, z: 0 }, { follow: playerPos });
    particles.addEmitter('leaves', { x: 0, y: 0, z: 0 }, { follow: playerPos });
    particles.addEmitter('mist', { x: 0, y: 0, z: 0 }, { follow: playerPos });
  }
  console.info('[dev-fx] wired', { emitters: particles.emitters.size, lights: lights.length });
  let t = 0;
  game.frameHooks.push((dt) => {
    t += dt; const p = game.world.player; if (p) playerPos.set(p.pos.x, p.pos.y, p.pos.z);
    particles.update(dt, game.cam.camera.position, t);
    vfx.update(dt, game.cam.camera.position);
    FlickerLight.updateAll(dt, game.cam.camera.position);
  });

  // ---- demo triggers for screenshots ----
  const P = () => { const p = game.world.player; return { x: p.pos.x, y: p.pos.y, z: p.pos.z }; };
  const ahead = (d: number) => { const p = game.world.player; return { x: p.pos.x + Math.sin(p.yaw) * d, y: p.pos.y, z: p.pos.z + Math.cos(p.yaw) * d }; };
  const teleport = (x: number, z: number, yaw: number) => { const p = game.world.player; p.pos.x = x; p.pos.z = z; p.pos.y = terrainHeight(x, z); p.yaw = yaw; game.cam.snapBehind(p); };
  let skelId: string | null = null;
  const demo = (name: string, arg?: number) => {
    const p = game.world.player; const w = game.world as any;
    switch (name) {
      case 'hit': bus.emit('damage', { sourceId: skelId ?? 'x', targetId: 'player', amount: 4, type: 'slashing', crit: false, pos: P(), blocked: false, killingBlow: false }); break;
      case 'crit': bus.emit('damage', { sourceId: skelId ?? 'x', targetId: 'player', amount: 9, type: 'slashing', crit: true, pos: P(), blocked: false, killingBlow: false }); break;
      case 'hitskel': if (skelId) bus.emit('damage', { sourceId: 'player', targetId: skelId, amount: 7, type: 'slashing', crit: !!arg, pos: w.actors.get(skelId).pos, blocked: false, killingBlow: false }); break;
      case 'block': bus.emit('damage', { sourceId: 'x', targetId: 'player', amount: 1, type: 'slashing', crit: false, pos: P(), blocked: true, killingBlow: false }); break;
      case 'parry': bus.emit('parry', { defenderId: 'player', attackerId: skelId ?? 'x', pos: ahead(0.8) }); break;
      case 'dodge': bus.emit('dodge', { actorId: 'player', pos: P() }); break;
      case 'swing': p.state = 'attack'; p.stateTime = 0; bus.emit('swing', { actorId: 'player', kind: arg ? 'heavy' : 'light', pos: P() }); (game.views.get('player') as any)?.play('1H_Melee_Attack_Slice_Horizontal', false, 0.05, 1); break;
      case 'thunder': bus.emit('castStart', { actorId: 'player', spellId: 'thunderwave', pos: P() }); setTimeout(() => bus.emit('castRelease', { actorId: 'player', spellId: 'thunderwave', from: P(), to: ahead(2) }), 250); break;
      case 'fire': { const from = { ...P(), y: p.pos.y + 1.1 }; const to = { ...ahead(7), y: p.pos.y + 1 }; bus.emit('castRelease', { actorId: 'player', spellId: 'fireBolt', from, to }); bus.emit('projectile', { id: 1, kind: 'fireBolt', from, to, speed: 22 }); setTimeout(() => bus.emit('spellImpact', { spellId: 'fireBolt', pos: to }), (7 / 22) * 1000); break; }
      case 'fireimpact': bus.emit('spellImpact', { spellId: 'fireBolt', pos: { ...ahead(3), y: p.pos.y + 1 } }); break;
      case 'missile': { const from = { ...P(), y: p.pos.y + 1.1 }; const to = { ...ahead(8), y: p.pos.y + 1 }; for (let i = 0; i < 3; i++) bus.emit('projectile', { id: 10 + i, kind: 'magicMissile', from, to, speed: 9 + i * 2 }); break; }
      case 'frost': { const from = { ...P(), y: p.pos.y + 1.1 }; const to = { ...ahead(7), y: p.pos.y + 1 }; bus.emit('projectile', { id: 20, kind: 'rayOfFrost', from, to, speed: 30 }); setTimeout(() => bus.emit('spellImpact', { spellId: 'rayOfFrost', pos: to }), 250); break; }
      case 'sacred': bus.emit('spellImpact', { spellId: 'sacredFlame', pos: ahead(3) }); break;
      case 'heal': bus.emit('heal', { sourceId: 'ilyra', targetId: 'player', amount: 6, pos: { ...P(), y: p.pos.y + 1.2 } }); break;
      case 'levelup': bus.emit('levelUp', { actorId: 'player', level: 2 }); break;
      case 'check': bus.emit('check', { roll: { kind: 'check', label: 'Athletics', d20: arg ?? 17, bonus: 3, total: (arg ?? 17) + 3, dc: 12, success: (arg ?? 17) + 3 >= 12 }, pos: { ...P(), y: p.pos.y + 1.6 }, actorId: 'player' }); break;
      case 'skeleton': { const pos = ahead(2.5); const a = typeof w.spawnEnemy === 'function' ? w.spawnEnemy('warrior', pos, { id: 'demo_sk' }) : w.spawn({ id: 'demo_sk', kind: 'enemy', name: 'Skeleton', model: 'Skeleton_Warrior', faction: 'undead', pos, yaw: p.yaw + Math.PI, weapon: 'Skeleton_Blade', offhand: 'Skeleton_Shield_Small_A', ai: {} }); skelId = a.id; if (a.ai) a.ai.behaviour = 'dormant'; game.syncViews(); break; }
      case 'kill': if (skelId) { const a = w.actors.get(skelId); bus.emit('death', { actorId: skelId, pos: { ...a.pos }, killerId: 'player' }); } break;
      case 'rage': bus.emit('castRelease', { actorId: 'player', spellId: 'rage', from: P(), to: P(), targetId: 'player' }); break;
      case 'mark': if (skelId) bus.emit('castRelease', { actorId: 'player', spellId: 'huntersMark', from: P(), to: w.actors.get(skelId).pos, targetId: skelId }); break;
      case 'lock': if (skelId) { p.targetId = skelId; } break;
      case 'stagger': if (skelId) bus.emit('stagger', { actorId: skelId, pos: w.actors.get(skelId).pos, seconds: 3 }); break;
      case 'telegraph': if (skelId) bus.emit('telegraph', { actorId: skelId, kind: 'heavy', pos: w.actors.get(skelId).pos, duration: 1.2 }); break;
      case 'loot': bus.emit('loot', { itemId: 'gold', qty: 1, name: 'Gold' }); break;
      case 'rest': bus.emit('rest', { kind: 'short' }); break;
      case 'boss': if (skelId) bus.emit('bossStart', { actorId: skelId, name: 'Demo', subtitle: 'x' }); break;
      case 'campfire': teleport(LANDMARKS.campfire.x - 2.6, LANDMARKS.campfire.z + 2.2, Math.atan2(2.6, -2.2)); break;
      case 'chapel': teleport(LANDMARKS.chapel.x - 6, LANDMARKS.chapel.z + 4, Math.atan2(6, -4)); break;
      case 'gate': teleport(LANDMARKS.gate.x - 5, LANDMARKS.gate.z + 3, Math.atan2(5, -3)); break;
      case 'sun': { const d = wv.sunPosition ? new THREE.Vector3().copy(wv.sunPosition).sub(game.cam.camera.position).normalize() : new THREE.Vector3(-0.5, 0.3, -0.7); game.cam.yaw = Math.atan2(-d.x, -d.z); game.cam.pitch = -Math.asin(d.y) * 0.9; break; }
      case 'cinematic': game.renderer.setCinematic(true, arg ?? 3); break;
      case 'lowhp': game.renderer.setLowHealth(arg ?? 0.8); break;
      case 'flash': game.renderer.flash(0xffffff, arg ?? 0.5); break;
      case 'interact': vfx.setInteractableHighlight({ ...ahead(2), y: terrainHeight(ahead(2).x, ahead(2).z) }); break;
    }
    return name;
  };
  (window as any).__fx = { game, particles, vfx, lights, bus, THREE, demo, teleport };
  document.getElementById('loading')!.classList.add('hide');
  game.start();
})().catch((e) => { console.error(e); text.textContent = 'Failed to load: ' + e.message; });
