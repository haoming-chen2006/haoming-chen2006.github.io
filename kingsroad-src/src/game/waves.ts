import { CAMPS, FIRST_WAVE_AT, OBJECTIVES, SIEGE_EVERY, WAVE_EVERY, mirrorPos, type LaneId } from './constants.ts';
import { lanePath } from './map.ts';
import { NEUTRAL, type Team } from './types.ts';
import { MINIONS, MONSTERS } from './units.ts';
import type { World } from './world.ts';

/** Minion waves on all three lanes for both teams, and jungle camp respawns. */
export function updateSpawns(w: World, dt: number): void {
  if (w.waveNo === 0 && w.nextWaveAt === 0) w.nextWaveAt = FIRST_WAVE_AT;
  if (w.time >= w.nextWaveAt) {
    w.waveNo += 1;
    w.nextWaveAt += WAVE_EVERY;
    const level = 1 + Math.floor(w.time / 90);
    const siege = w.waveNo % SIEGE_EVERY === 0;
    for (const team of [0, 1] as Team[]) {
      for (const lane of w.lanesOpen as LaneId[]) {
        const path = lanePath(lane, team);
        const start = path[0];
        const list = ['melee', 'melee', 'melee', 'ranged', 'ranged', 'ranged', ...(siege ? ['siege'] : [])];
        // super minions when the enemy has lost a base tower on this lane... (overlord buff) handled in sim
        list.forEach((id, i) => {
          const jitter = { x: start.x + (w.rng.next() - 0.5) * 1.2 - (i * 0.25) * (team === 0 ? 1 : -1), y: start.y + (w.rng.next() - 0.5) * 1.2 };
          const def = MINIONS[id];
          const u = w.spawnUnit(def, team, jitter, { lane, level });
          scaleMinion(w, u, level);
          u.deployT = i * 0.12;
        });
      }
    }
    w.emit({ type: 'wave', text: String(w.waveNo) });
  }
  // jungle camps
  for (const team of [0, 1] as Team[]) {
    for (const c of CAMPS) {
      const key = `${team}:${c.id}`;
      let t = w.campT.get(key);
      if (t === undefined) { t = c.firstSpawn; w.campT.set(key, t); }
      if (t < 0) {
        // alive: check if all dead
        const alive = [...w.units(NEUTRAL)].some((u) => u.camp === key);
        if (!alive) w.campT.set(key, w.time + c.respawn);
        continue;
      }
      if (w.time >= t) {
        const pos = team === 0 ? c.pos : mirrorPos(c.pos);
        const level = 1 + Math.floor(w.time / 120);
        for (let i = 0; i < c.count; i++) {
          const off = c.count === 1 ? { x: 0, y: 0 } : { x: Math.cos((i / c.count) * Math.PI * 2) * 0.9, y: Math.sin((i / c.count) * Math.PI * 2) * 0.9 };
          const u = w.spawnUnit(MONSTERS[c.monster], NEUTRAL, { x: pos.x + off.x, y: pos.y + off.y }, { camp: key, level });
          u.home = { ...pos };
        }
        w.campT.set(key, -1);
      }
    }
  }
  for (const o of OBJECTIVES) {
    const key = `obj:${o.id}`;
    let t = w.campT.get(key);
    if (t === undefined) { t = o.firstSpawn; w.campT.set(key, t); }
    if (t < 0) {
      const alive = [...w.units(NEUTRAL)].some((u) => u.camp === key);
      if (!alive) w.campT.set(key, w.time + o.respawn);
      continue;
    }
    if (w.time >= t) {
      const level = 1 + Math.floor(w.time / 120);
      const u = w.spawnUnit(MONSTERS[o.monster], NEUTRAL, { ...o.pos }, { camp: key, level });
      u.home = { ...o.pos };
      w.campT.set(key, -1);
      w.emit({ type: 'objective', text: o.id === 'tyrant' ? '@objective.tyrantSpawned' : '@objective.overlordSpawned', pos: o.pos });
    }
  }
  void dt;
}

function scaleMinion(w: World, u: import('./types.ts').Unit, level: number): void {
  const L = level - 1;
  u.maxHp = Math.round(u.def.hp * (1 + 0.12 * L));
  u.hp = u.maxHp;
  u.armor = u.def.armor + 6 * L; u.resist = u.def.resist + 6 * L;
  const d = w.stats(u);
  d.maxHp = u.maxHp; d.attack = u.def.damage * (1 + 0.1 * L);
  // overlord buff: empowered waves for the team that holds it
  const p = w.players[u.team as Team];
  if (w.time - p.objectiveT.overlord < 90 && p.objectiveT.overlord > 0) { u.maxHp = Math.round(u.maxHp * 1.6); u.hp = u.maxHp; d.attack *= 1.4; u.soulbound = true; }
}
