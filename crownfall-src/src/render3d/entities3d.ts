import * as THREE from 'three';
import type { Building, Entity, Tower, Unit } from '../game/types.ts';
import type { World } from '../game/world.ts';
import { activeFx } from './effects3d.ts';
import { animateUnit, buildBuildingModel, buildTowerModel, buildUnitModel, disposeModel, disposeObject, setTint, type BuildingModel, type TowerModel, type UnitModel, animateTowerFlags, setHeroLook } from './models.ts';

interface StatusFx { ice?: THREE.Mesh; stars?: THREE.Group; bubble?: THREE.Mesh; aura?: THREE.Mesh; champ?: THREE.Mesh }
interface UnitRec { model: UnitModel; unit: Unit; squash: number; lastFlash: number; lastHp: number; fx: StatusFx; wasDashing: boolean; emberT: number; heroLook: boolean }
interface TowerRec { model: TowerModel; tower: Tower; lastHp: number }
interface BuildingRec { model: BuildingModel; building: Building }
type DeathMode = 'fall' | 'collapse' | 'spiral' | 'dissolve' | 'tower' | 'building';
interface Dying { obj: THREE.Object3D; t: number; dur: number; mode: DeathMode; dispose: () => void; spin: number; color: number; x: number; z: number; radius: number; height: number; mats?: THREE.Material[]; vy: number; done: boolean }

const sharedGeo = {
  ice: new THREE.SphereGeometry(1, 12, 8),
  star: new THREE.OctahedronGeometry(0.09, 0),
  bubble: new THREE.IcosahedronGeometry(1, 1),
  aura: new THREE.RingGeometry(0.7, 1, 32),
};

/** Keeps Three.js objects in sync with the simulation's entities and adds hit/status/death feedback. */
export class Entities3D {
  private scene: THREE.Scene;
  private units = new Map<number, UnitRec>();
  private towers = new Map<number, TowerRec>();
  private buildings = new Map<number, BuildingRec>();
  private dying: Dying[] = [];
  private heroAura: THREE.Mesh;
  private heroAura2: THREE.Mesh;
  private heroLight: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.heroAura = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 40), new THREE.MeshBasicMaterial({ color: 0xffd86b, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.heroAura.rotation.x = -Math.PI / 2;
    this.heroAura.visible = false;
    scene.add(this.heroAura);
    this.heroAura2 = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.95, 40), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.heroAura2.rotation.x = -Math.PI / 2;
    this.heroAura2.visible = false;
    scene.add(this.heroAura2);
    this.heroLight = new THREE.PointLight(0xffd27a, 0, 7, 1.6);
    scene.add(this.heroLight);
  }

  unitModel(id: number): UnitModel | undefined { return this.units.get(id)?.model; }
  towerModel(id: number): TowerModel | undefined { return this.towers.get(id)?.model; }
  headHeight(e: Entity): number {
    if (e.kind === 'unit') { const m = this.units.get(e.id)?.model; return m ? m.height + m.hover + 0.35 : 1.5; }
    if (e.kind === 'tower') return (this.towers.get(e.id)?.model.height ?? 4) + 0.6;
    return (this.buildings.get(e.id)?.model.height ?? 1.5) + 0.5;
  }

  sync(w: World, dt: number, time: number, heroId: number, hideHero: boolean): void {
    const seen = new Set<number>();
    for (const e of w.alive()) {
      seen.add(e.id);
      if (e.kind === 'unit') this.syncUnit(e, dt, time, heroId, hideHero);
      else if (e.kind === 'tower') this.syncTower(e, dt, time);
      else this.syncBuilding(e, time);
    }
    for (const [id, r] of this.units) if (!seen.has(id)) { this.units.delete(id); this.startUnitDeath(r); }
    for (const [id, r] of this.towers) if (!seen.has(id)) { this.towers.delete(id); this.startTowerDeath(r); }
    for (const [id, r] of this.buildings) if (!seen.has(id)) { this.buildings.delete(id); this.startBuildingDeath(r); }
    this.updateDying(dt);
    const hero = heroId >= 0 ? this.units.get(heroId) : undefined;
    if (hero) {
      const u = hero.unit;
      const base = Math.max(0.5, u.radius * 1.9) * hero.model.ring.scale.x;
      this.heroAura.visible = true;
      this.heroAura.position.set(u.pos.x, 0.06, u.pos.y);
      this.heroAura.rotation.z = time * 1.5;
      this.heroAura.scale.setScalar(base * (1.0 + Math.sin(time * 5) * 0.06));
      this.heroAura2.visible = true;
      this.heroAura2.position.set(u.pos.x, 0.07, u.pos.y);
      this.heroAura2.rotation.z = -time * 0.9;
      this.heroAura2.scale.setScalar(base * (1.15 + Math.sin(time * 3.1) * 0.08));
      this.heroLight.position.set(u.pos.x - Math.cos(u.facing) * 0.8, 2.6 + hero.model.hover + hero.model.height * 0.4, u.pos.y - Math.sin(u.facing) * 0.8);
      this.heroLight.intensity = 1.8 + Math.sin(time * 6) * 0.5;
      hero.emberT += dt;
      if (hero.emberT > 0.07 && activeFx) {
        hero.emberT = 0;
        const a = Math.random() * Math.PI * 2, r = u.radius * (0.6 + Math.random() * 0.8);
        activeFx.sparks.emit({ x: u.pos.x + Math.cos(a) * r, y: 0.1 + Math.random() * 0.3 + hero.model.hover, z: u.pos.y + Math.sin(a) * r, vy: 1.2 + Math.random(), vx: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.4, life: 1.0, size: 0.16, sizeEnd: 0.3, color: 0xffd86b, colorEnd: 0xfff6d0, gravity: -0.6, spin: 4 });
      }
    } else { this.heroAura.visible = false; this.heroAura2.visible = false; this.heroLight.intensity = 0; }
  }

  private statusFx(r: UnitRec, key: keyof StatusFx): THREE.Object3D {
    const m = r.model;
    const u = r.unit;
    const existing = r.fx[key];
    if (existing) return existing;
    const s = Math.max(0.4, u.radius * 1.5);
    if (key === 'ice') {
      const ice = new THREE.Mesh(sharedGeo.ice, new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.45, roughness: 0.2, emissive: 0x5aa8e8, emissiveIntensity: 0.4, depthWrite: false, flatShading: true }));
      ice.scale.set(s, Math.max(0.6, m.height * 0.55), s);
      ice.position.y = m.height * 0.5 + m.hover;
      m.root.add(ice);
      r.fx.ice = ice;
      return ice;
    }
    if (key === 'stars') {
      const g = new THREE.Group();
      const sm = new THREE.MeshBasicMaterial({ color: 0xffe680 });
      for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(sharedGeo.star, sm); st.userData.i = i; g.add(st); }
      g.position.y = m.height + m.hover + 0.15;
      m.root.add(g);
      r.fx.stars = g;
      return g;
    }
    if (key === 'bubble') {
      const b = new THREE.Mesh(sharedGeo.bubble, new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.35, wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      b.scale.setScalar(Math.max(0.7, m.height * 0.6));
      b.position.y = m.height * 0.5 + m.hover;
      m.root.add(b);
      r.fx.bubble = b;
      return b;
    }
    if (key === 'champ') {
      const c = new THREE.Mesh(sharedGeo.aura, new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      c.rotation.x = -Math.PI / 2;
      c.position.y = 0.075;
      c.scale.setScalar(Math.max(0.55, u.radius * 1.9));
      m.root.add(c);
      r.fx.champ = c;
      return c;
    }
    const a = new THREE.Mesh(sharedGeo.aura, new THREE.MeshBasicMaterial({ color: 0xd84cff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    a.rotation.x = -Math.PI / 2;
    a.position.y = 0.08;
    a.scale.setScalar(Math.max(0.5, u.radius * 1.6));
    m.root.add(a);
    r.fx.aura = a;
    return a;
  }

  private syncUnit(u: Unit, dt: number, time: number, heroId: number, hideHero: boolean): void {
    let r = this.units.get(u.id);
    if (!r) {
      const model = buildUnitModel(u.def.look, u.team, u.id);
      this.scene.add(model.root);
      r = { model, unit: u, squash: 0, lastFlash: 0, lastHp: u.hp, fx: {}, wasDashing: false, emberT: 0, heroLook: false };
      this.units.set(u.id, r);
    }
    r.unit = u;
    const m = r.model;
    const fx = activeFx;
    if (u.possessed !== r.heroLook) { r.heroLook = u.possessed; setHeroLook(m, u.possessed, u.team); }
    m.root.position.set(u.pos.x, 0, u.pos.y);
    m.body.rotation.y = -u.facing;
    const moving = Math.hypot(u.pos.x - u.lastPos.x, u.pos.y - u.lastPos.y) > 0.003 || !!u.dashVel;
    animateUnit(m, {
      moving, speed: u.def.speed, attackAnim: u.attackAnim, time: time + u.bobT, stunned: u.status.stun > 0, frozen: u.status.freeze > 0,
      deployProgress: u.deployT > 0 ? 1 - u.deployT / u.def.deployTime : 1, hover: m.hover, hero: u.possessed,
    });
    // hit squash: triggered when the sim's hit flash restarts
    if (u.hitFlash > r.lastFlash + 0.02) r.squash = 1;
    r.lastFlash = u.hitFlash;
    if (r.squash > 0) {
      r.squash = Math.max(0, r.squash - dt * 6);
      const k = Math.sin(r.squash * Math.PI) * 0.22;
      m.body.scale.multiply(new THREE.Vector3(1 + k * 0.6, 1 - k, 1 + k * 0.6));
    }
    // knockback tilt
    const kb = Math.hypot(u.vel.x, u.vel.y);
    m.body.rotation.x = u.dashVel ? 0.25 : kb > 0.2 ? -Math.min(0.45, kb * 0.09) : 0;
    // tint priority: hit flash > freeze > stun > rage > charge > possessed > burn
    if (u.hitFlash > 0) setTint(m, 0xffffff, 0.9);
    else if (u.status.freeze > 0) setTint(m, 0x7ec8ff, 0.5);
    else if (u.status.stun > 0) setTint(m, 0xffe680, 0.3);
    else if (u.status.rage > 0 || u.buffT > 0) setTint(m, 0xd84cff, 0.35);
    else if (u.charging) setTint(m, 0xffe680, 0.45);
    else if (u.possessed && u.id !== heroId) setTint(m, 0xff2a2a, 0.22);
    else if (u.possessed) setTint(m, 0xffc35a, 0.18);
    else if (u.status.burnT > 0) setTint(m, 0xff6a2a, 0.5);
    else setTint(m, 0x000000, 0);
    // status props
    const frozen = u.status.freeze > 0;
    if (frozen || r.fx.ice) { const ice = this.statusFx(r, 'ice'); ice.visible = frozen; if (frozen && fx && Math.random() < dt * 3) fx.sparks.emit({ x: u.pos.x + (Math.random() - 0.5) * u.radius * 2, y: 0.3 + Math.random() * m.height, z: u.pos.y + (Math.random() - 0.5) * u.radius * 2, vy: -0.3, life: 0.8, size: 0.15, color: 0xe8fbff, gravity: 1 }); }
    const stunned = u.status.stun > 0 && !frozen;
    if (stunned || r.fx.stars) {
      const stars = this.statusFx(r, 'stars') as THREE.Group;
      stars.visible = stunned;
      if (stunned) for (const st of stars.children) { const i = st.userData.i as number; const a = time * 5 + (i * Math.PI * 2) / 3; st.position.set(Math.cos(a) * u.radius * 1.1, Math.sin(time * 8 + i) * 0.06, Math.sin(a) * u.radius * 1.1); st.rotation.y = time * 4; }
    }
    const shielded = u.shield > 0;
    if (shielded || r.fx.bubble) { const b = this.statusFx(r, 'bubble'); b.visible = shielded; if (shielded) { b.rotation.y = time * 0.8; b.rotation.x = Math.sin(time * 0.7) * 0.3; } }
    const raged = (u.status.rage > 0 || u.buffT > 0) && !frozen;
    if (raged || r.fx.aura) { const a = this.statusFx(r, 'aura'); a.visible = raged; if (raged) { a.rotation.z = time * 3; a.scale.setScalar(Math.max(0.5, u.radius * 1.6) * (1 + Math.sin(time * 9) * 0.1)); if (fx && Math.random() < dt * 8) fx.sparks.emit({ x: u.pos.x + (Math.random() - 0.5) * u.radius * 1.5, y: 0.2 + m.hover, z: u.pos.y + (Math.random() - 0.5) * u.radius * 1.5, vy: 2, life: 0.6, size: 0.18, color: 0xd84cff, colorEnd: 0xffb3ff, gravity: -1 }); } }
    // enemy champion (bot-possessed): crimson aura + ember trail; gold stays reserved for the player's hero
    const enemyChamp = u.possessed && u.id !== heroId;
    if (enemyChamp || r.fx.champ) {
      const c = this.statusFx(r, 'champ');
      c.visible = enemyChamp;
      if (enemyChamp) {
        c.rotation.z = -time * 1.6;
        c.scale.setScalar(Math.max(0.55, u.radius * 1.9) * (1 + Math.sin(time * 5) * 0.07));
        r.emberT += dt;
        if (fx && r.emberT > 0.09) { r.emberT = 0; const a = Math.random() * Math.PI * 2, rr = u.radius * (0.6 + Math.random() * 0.8); fx.sparks.emit({ x: u.pos.x + Math.cos(a) * rr, y: 0.1 + Math.random() * 0.3 + m.hover, z: u.pos.y + Math.sin(a) * rr, vy: 1.1 + Math.random(), vx: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.4, life: 0.9, size: 0.16, sizeEnd: 0.3, color: 0xff3b3b, colorEnd: 0xffb090, gravity: -0.5, spin: 4 }); }
      }
    }
    if (fx) {
      if (u.status.burnT > 0 && Math.random() < dt * 14) fx.sparks.emit({ x: u.pos.x + (Math.random() - 0.5) * u.radius * 1.6, y: 0.2 + m.hover + Math.random() * m.height * 0.8, z: u.pos.y + (Math.random() - 0.5) * u.radius * 1.6, vy: 1.6, vx: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.4, life: 0.5, size: 0.42, sizeEnd: 0.1, color: 0xffa040, colorEnd: 0x3a0800, gravity: -1.5 });
      if (u.charging && moving && Math.random() < dt * 20) { const bx = -Math.cos(u.facing), bz = -Math.sin(u.facing); fx.sparks.emit({ x: u.pos.x + bx * u.radius + (Math.random() - 0.5) * 0.4, y: 0.3 + Math.random() * m.height * 0.7, z: u.pos.y + bz * u.radius + (Math.random() - 0.5) * 0.4, vx: bx * 3, vz: bz * 3, life: 0.25, size: 0.16, color: 0xffe680, gravity: 0 }); }
      if (u.dashVel) {
        const bx = -u.dashVel.x, bz = -u.dashVel.y;
        const l = Math.hypot(bx, bz) || 1;
        for (let i = 0; i < 2; i++) fx.smoke.emit({ x: u.pos.x + (Math.random() - 0.5) * u.radius, y: 0.15 + m.hover, z: u.pos.y + (Math.random() - 0.5) * u.radius, vx: (bx / l) * 1.5, vy: 0.6, vz: (bz / l) * 1.5, life: 0.6, size: 0.4, sizeEnd: 1.6, color: 0xb0a090, colorEnd: 0xd8d0c0, alpha: 0.4, drag: 2 });
        for (let i = 0; i < 3; i++) fx.sparks.emit({ x: u.pos.x + (bx / l) * u.radius * 0.5, y: 0.3 + m.hover + Math.random() * m.height * 0.8, z: u.pos.y + (bz / l) * u.radius * 0.5, vx: (bx / l) * 6, vz: (bz / l) * 6, life: 0.2, size: 0.18, color: u.possessed ? 0xffd86b : 0xffffff, gravity: 0 });
        if (!r.wasDashing) fx.sparks.burst(u.pos.x, 0.5 + m.hover, u.pos.y, 12, { color: 0xffffff, speed: 2, up: 1, life: 0.3, size: 0.22, gravity: 3 });
      }
      r.wasDashing = !!u.dashVel;
    }
    r.lastHp = u.hp;
    const isHero = u.id === heroId;
    m.root.visible = !(isHero && hideHero);
    if (u.shield > 0) { m.ring.scale.setScalar(1.15); (m.ring.material as THREE.MeshBasicMaterial).color.setHex(0xffe9a0); }
    else { m.ring.scale.setScalar(1); (m.ring.material as THREE.MeshBasicMaterial).color.setHex(u.team === 0 ? 0x3d9bff : 0xff4d4d); }
  }

  private syncTower(t: Tower, dt: number, time: number): void {
    let r = this.towers.get(t.id);
    if (!r) {
      const model = buildTowerModel(t.towerType, t.team, t.radius);
      model.root.position.set(t.pos.x, 0, t.pos.y);
      this.scene.add(model.root);
      r = { model, tower: t, lastHp: t.hp };
      this.towers.set(t.id, r);
    }
    r.tower = t;
    const m = r.model;
    if (t.targetId >= 0) m.turret.rotation.y = -t.facing;
    animateTowerFlags(m, time);
    const recoil = t.attackAnim > 0 ? Math.sin(t.attackAnim * Math.PI) * 0.25 : 0;
    m.turret.position.x = -recoil * Math.cos(t.facing); m.turret.position.z = -recoil * Math.sin(t.facing);
    for (const mm of m.mats) { mm.emissive.setHex(t.hitFlash > 0 ? 0xffffff : t.status.freeze > 0 ? 0x7ec8ff : 0x000000); mm.emissiveIntensity = t.hitFlash > 0 ? 0.5 : t.status.freeze > 0 ? 0.5 : 0; }
    if (m.crown) {
      const gold = (m.crown.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      gold.emissiveIntensity = t.active ? 0.8 + Math.sin(time * 3) * 0.4 : 0.05;
      m.crown.rotation.y = t.active ? time * 0.6 : 0;
    }
    // tower shudder + stone dust when hit hard
    if (t.hp < r.lastHp - 40 && activeFx) {
      const a = Math.random() * Math.PI * 2;
      activeFx.smoke.burst(t.pos.x + Math.cos(a) * t.radius, 1 + Math.random() * 2, t.pos.y + Math.sin(a) * t.radius, 4, { color: 0x9a9a9a, colorEnd: 0xcccccc, speed: 1, up: 0.5, life: 0.9, size: 0.35, sizeEnd: 1.4, gravity: 1.5, alpha: 0.4 });
      activeFx.debris.spawn(t.pos.x + Math.cos(a) * t.radius, 1.5 + Math.random() * 2, t.pos.y + Math.sin(a) * t.radius, 2, { color: 0x8c8f96, speed: 1.5, up: 0.6, size: 0.08, life: 1.5 });
    }
    m.root.position.set(t.pos.x + (t.hitFlash > 0 ? (Math.random() - 0.5) * 0.04 : 0), 0, t.pos.y + (t.hitFlash > 0 ? (Math.random() - 0.5) * 0.04 : 0));
    r.lastHp = t.hp;
    void dt;
  }

  private syncBuilding(b: Building, time: number): void {
    let r = this.buildings.get(b.id);
    if (!r) {
      const model = buildBuildingModel(b.def, b.team);
      model.root.position.set(b.pos.x, 0, b.pos.y);
      this.scene.add(model.root);
      r = { model, building: b };
      this.buildings.set(b.id, r);
    }
    r.building = b;
    const m = r.model;
    if (b.targetId >= 0) m.turret.rotation.y = -b.facing;
    const scale = b.deployT > 0 ? 0.3 + 0.7 * (1 - b.deployT / b.def.deployTime) : 1;
    m.root.scale.setScalar(scale);
    if (m.orb) { const om = m.orb.material as THREE.MeshStandardMaterial; om.emissiveIntensity = 3 + Math.sin(time * 6) * 1.0 + (b.attackAnim > 0 ? 4 : 0); }
    for (const mm of m.mats) if (mm !== m.orb?.material) { mm.emissive.setHex(b.hitFlash > 0 ? 0xffffff : b.status.freeze > 0 ? 0x7ec8ff : 0x000000); mm.emissiveIntensity = b.hitFlash > 0 ? 0.6 : b.status.freeze > 0 ? 0.5 : 0; }
  }

  /* ---------- deaths ---------- */

  private startUnitDeath(r: UnitRec): void {
    const u = r.unit, m = r.model;
    for (const f of Object.values(r.fx)) if (f) f.visible = false;
    m.ring.visible = false;
    const color = parseInt(u.def.look.color.slice(1), 16);
    const kind = m.kind;
    const mode: DeathMode = kind === 'skeleton' ? 'collapse' : kind === 'flyer' || kind === 'dragon' ? 'spiral' : kind === 'wraith' ? 'dissolve' : 'fall';
    const fx = activeFx;
    if (mode === 'collapse') {
      fx?.debris.spawn(u.pos.x, 0.5, u.pos.y, 10, { color: 0xe8e8e8, color2: 0xcfcfcf, speed: 3, up: 1.2, size: 0.09, life: 2.2 });
      fx?.decals.spawn('bones', u.pos.x, u.pos.y, 0.6, 7);
    } else if (mode === 'dissolve') {
      fx?.sparks.burst(u.pos.x, 1.0, u.pos.y, 40, { color: 0xb67cff, colorEnd: 0x3d2c5a, speed: 1.5, up: 2.5, life: 1.2, size: 0.3, gravity: -1.5, spin: 6 });
    } else if (mode === 'fall') {
      fx?.smoke.burst(u.pos.x, 0.2, u.pos.y, 6, { color: 0x9a8a72, speed: 1.5, up: 0.8, life: 0.8, size: 0.4, sizeEnd: 1.6, gravity: -0.3, alpha: 0.35 });
      if (kind === 'brute' || kind === 'beast') fx?.debris.spawn(u.pos.x, 0.3, u.pos.y, 6, { color: 0x6b5a45, speed: 3, up: 1, size: 0.1, life: 1.5 });
    }
    const mats: THREE.Material[] = m.mats;
    if (mode === 'dissolve') for (const mm of mats) { mm.transparent = true; }
    this.dying.push({ obj: m.root, t: 0, dur: mode === 'collapse' ? 0.35 : mode === 'spiral' ? 1.4 : mode === 'dissolve' ? 0.9 : 1.1, mode, dispose: () => disposeModel(m), spin: (Math.random() - 0.5) * 2, color, x: u.pos.x, z: u.pos.y, radius: u.radius, height: m.height, mats, vy: mode === 'spiral' ? 1.5 : 0, done: false });
  }

  private startTowerDeath(r: TowerRec): void {
    const t = r.tower, m = r.model;
    const fx = activeFx;
    fx?.debris.spawn(t.pos.x, 2, t.pos.y, 30, { color: 0x8c8f96, color2: 0x5f636b, speed: 5, up: 1.4, size: 0.32, life: 3.5 });
    fx?.smoke.burst(t.pos.x, 1, t.pos.y, 40, { color: 0x8a8a8a, colorEnd: 0xbbbbbb, speed: 4, up: 2, life: 2.5, size: 1.2, sizeEnd: 4, gravity: -0.3, drag: 1.2, alpha: 0.5 });
    fx?.decals.spawn('cracks', t.pos.x, t.pos.y, t.radius * 1.6, 12, 0.19);
    this.dying.push({ obj: m.root, t: 0, dur: 2.0, mode: 'tower', dispose: () => { m.mats.forEach((x) => x.dispose()); disposeObject(m.root); }, spin: (Math.random() - 0.5) * 2, color: 0x8c8f96, x: t.pos.x, z: t.pos.y, radius: t.radius, height: m.height, vy: 0, done: false });
  }

  private startBuildingDeath(r: BuildingRec): void {
    const b = r.building, m = r.model;
    const fx = activeFx;
    fx?.debris.spawn(b.pos.x, 0.6, b.pos.y, 12, { color: 0x777c85, color2: 0x8a6d3b, speed: 3.5, up: 1.2, size: 0.16, life: 2.5 });
    fx?.smoke.burst(b.pos.x, 0.4, b.pos.y, 14, { color: 0x8a8a8a, colorEnd: 0xbbbbbb, speed: 2, up: 1.2, life: 1.4, size: 0.7, sizeEnd: 2.4, gravity: -0.3, alpha: 0.45 });
    this.dying.push({ obj: m.root, t: 0, dur: 0.9, mode: 'building', dispose: () => { m.mats.forEach((x) => x.dispose()); disposeObject(m.root); }, spin: (Math.random() - 0.5) * 2, color: 0x777c85, x: b.pos.x, z: b.pos.y, radius: b.radius, height: m.height, vy: 0, done: false });
  }

  private updateDying(dt: number): void {
    const fx = activeFx;
    this.dying = this.dying.filter((d) => {
      d.t += dt;
      const p = Math.min(1, d.t / d.dur);
      const o = d.obj;
      switch (d.mode) {
        case 'fall': {
          const fall = Math.min(1, d.t / 0.35);
          const ease = 1 - Math.pow(1 - fall, 3);
          o.rotation.z = ease * 1.45 * (d.spin >= 0 ? 1 : -1);
          if (fall >= 1 && !d.done) { d.done = true; fx?.smoke.burst(d.x, 0.15, d.z, 5, { color: 0x9a8a72, speed: 1.2, up: 0.5, life: 0.7, size: 0.4, sizeEnd: 1.5, alpha: 0.3 }); }
          if (p > 0.5) o.position.y = -((p - 0.5) / 0.5) * (d.height + 0.4);
          break;
        }
        case 'collapse': o.scale.set(1 + p * 0.3, Math.max(0.001, 1 - p), 1 + p * 0.3); break;
        case 'spiral': {
          d.vy -= 9 * dt;
          o.position.y += d.vy * dt;
          o.rotation.y += dt * 9;
          o.rotation.z = Math.min(1.2, d.t * 1.5);
          if (o.position.y <= -0.1 && !d.done) { d.done = true; fx?.smoke.burst(d.x, 0.2, d.z, 8, { color: 0x9a8a72, speed: 2, up: 0.8, life: 0.8, size: 0.4, sizeEnd: 1.6, alpha: 0.4 }); fx?.sparks.burst(d.x, 0.3, d.z, 12, { color: d.color, speed: 2.5, up: 1, life: 0.5, size: 0.25, gravity: 5 }); }
          if (d.done) { o.position.y = -0.1; o.scale.multiplyScalar(Math.max(0, 1 - dt * 3)); }
          break;
        }
        case 'dissolve': {
          o.position.y = p * 0.8;
          o.scale.setScalar(1 - p * 0.3);
          if (d.mats) for (const mm of d.mats) mm.opacity = Math.max(0, 1 - p * 1.1);
          if (fx && Math.random() < dt * 20) fx.sparks.emit({ x: d.x + (Math.random() - 0.5) * d.radius * 2, y: 0.3 + Math.random() * d.height, z: d.z + (Math.random() - 0.5) * d.radius * 2, vy: 1.5, life: 0.7, size: 0.22, color: 0xb67cff, colorEnd: 0xffffff, gravity: -1 });
          break;
        }
        case 'tower': {
          if (d.t < 0.4) { o.position.x = d.x + (Math.random() - 0.5) * 0.12; o.position.z = d.z + (Math.random() - 0.5) * 0.12; }
          else {
            const q = (d.t - 0.4) / (d.dur - 0.4);
            o.position.y = -q * q * (d.height + 1);
            o.rotation.z = q * 0.4 * d.spin;
            o.rotation.x = q * 0.25;
            if (fx) {
              for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2; fx.smoke.emit({ x: d.x + Math.cos(a) * d.radius * 1.1, y: 0.3, z: d.z + Math.sin(a) * d.radius * 1.1, vx: Math.cos(a) * 2, vy: 1.5 + Math.random(), vz: Math.sin(a) * 2, life: 1.8, size: 0.9, sizeEnd: 3, color: 0x8a8a8a, colorEnd: 0xc0c0c0, alpha: 0.45, drag: 1 }); }
              if (Math.random() < dt * 30) { const a = Math.random() * Math.PI * 2; fx.debris.spawn(d.x + Math.cos(a) * d.radius * 0.8, 1 + Math.random() * 2, d.z + Math.sin(a) * d.radius * 0.8, 2, { color: 0x8c8f96, color2: 0x5f636b, speed: 3, up: 0.8, size: 0.22, life: 3 }); }
            }
            if (q > 0.5 && !d.done) { d.done = true; fx?.smoke.burst(d.x, 0.3, d.z, 30, { color: 0x9a9a9a, colorEnd: 0xd0d0d0, speed: 5, up: 1.2, life: 2.2, size: 1.3, sizeEnd: 4, gravity: -0.2, drag: 1.3, alpha: 0.5 }); }
          }
          break;
        }
        case 'building': {
          o.position.y = -p * p * (d.height + 0.5);
          o.rotation.z = p * 0.3 * d.spin;
          o.scale.setScalar(1 - p * 0.3);
          break;
        }
      }
      if (p >= 1) { this.scene.remove(o); d.dispose(); return false; }
      return true;
    });
  }

  clear(): void {
    for (const r of this.units.values()) { this.scene.remove(r.model.root); disposeModel(r.model); }
    for (const r of this.towers.values()) this.scene.remove(r.model.root);
    for (const r of this.buildings.values()) this.scene.remove(r.model.root);
    for (const d of this.dying) this.scene.remove(d.obj);
    this.units.clear(); this.towers.clear(); this.buildings.clear(); this.dying = [];
    this.heroAura.visible = false; this.heroAura2.visible = false; this.heroLight.intensity = 0;
  }
}
