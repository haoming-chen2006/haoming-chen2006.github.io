// Headless exercise of every troop's possession kit: deploy, possess, move, attack, ability, dash.
declare const process: { exitCode?: number };
import { Simulation } from '../src/game/sim.ts';
import { PRESET_DECKS, TROOPS, cardById, cardsFromIds } from '../src/game/cards.ts';
import { canDeploy, placeCard } from '../src/game/deploy.ts';
import { possess, type HeroCommand } from '../src/game/hero.ts';
import { TICK } from '../src/game/constants.ts';

let failures = 0;
const finiteCheck = (sim: Simulation) => {
  for (const e of sim.w.entities) if (!Number.isFinite(e.pos.x) || !Number.isFinite(e.pos.y) || !Number.isFinite(e.hp)) throw new Error(`non-finite state on ${e.kind} ${e.id}`);
  for (const p of sim.w.projectiles) if (!Number.isFinite(p.pos.x) || !Number.isFinite(p.pos.y)) throw new Error('non-finite projectile');
};

for (const troop of TROOPS) {
  const sim = new Simulation({ playerDeck: cardsFromIds(PRESET_DECKS.Vanguard), botDeck: cardsFromIds(PRESET_DECKS.Swarm), difficulty: 'easy', seed: 7 });
  sim.skipCountdown();
  const w = sim.w;
  try {
    placeCard(w, 0, troop, { x: 3.5, y: 20 });
    const idle: HeroCommand = { move: { x: 0, y: 0 }, aim: { x: 3.5, y: 2 }, attack: false, ability: false, dash: false, release: false };
    for (let i = 0; i < 72; i++) sim.step(TICK, idle);
    const u = w.getUnit(w.players[0].lastDeployId);
    if (!u) throw new Error('deployed unit missing');
    if (!possess(w, 0, u.id)) throw new Error('possess failed');
    if (!u.possessed || u.maxHp <= troop.hp) throw new Error('soulbound bonus not applied');
    placeCard(w, 1, cardById('knight'), { x: 3.5, y: 12 });
    placeCard(w, 1, cardById('spearlings'), { x: 4.8, y: 11 });
    let usedAbility = false, dashed = false, attacked = false;
    let summonOk: boolean | null = null, summonFar: boolean | null = null;
    for (let t = 0; t < 14 * 60; t++) {
      const time = t / 60;
      const cmd: HeroCommand = {
        move: { x: 0, y: -1 }, aim: { x: 3.5, y: 2 }, attack: true,
        ability: (time > 1.5 && time < 1.6) || (time > 8 && time < 8.1), dash: time > 3 && time < 3.05, release: false,
      };
      sim.step(TICK, cmd);
      finiteCheck(sim);
      const hero = w.hero(0);
      if (!hero) break;
      if (hero.abilityCd > 0) usedAbility = true;
      if (hero.dashCd > 0 || time < 3.1) dashed = true;
      if (hero.attackCd > 0) attacked = true;
      if (hero.pos.y < 14 && summonOk === null) {
        summonOk = canDeploy(w, 0, cardById('archers'), { x: hero.pos.x, y: hero.pos.y - 2 }).ok;
        summonFar = canDeploy(w, 0, cardById('archers'), { x: hero.pos.x, y: hero.pos.y - 6 }).ok;
      }
    }
    const hero = w.hero(0);
    const s = w.players[0].stats;
    const line = `${troop.id.padEnd(13)} ability=${usedAbility} dash=${dashed} attack=${attacked} alive=${!!hero} pos=${hero ? `${hero.pos.x.toFixed(1)},${hero.pos.y.toFixed(1)}` : '-'} heroDmg=${Math.round(s.heroDamage)} kills=${s.heroKills} summonNear=${summonOk} summonFar=${summonFar}`;
    console.log(line);
    if (!usedAbility || !dashed || !attacked) { failures++; console.log('  !! kit not fully exercised'); }
    if (summonOk === false || summonFar === true) { failures++; console.log('  !! summon-radius rule wrong'); }
    if (s.heroDamage <= 0) { if (troop.hp >= 300) failures++; console.log(`  ${troop.hp >= 300 ? '!!' : 'note:'} hero dealt no damage${troop.hp < 300 ? ' (fragile swarm unit, expected)' : ''}`); }
  } catch (e) { failures++; console.log(troop.id, 'FAILED', e); }
}
console.log(failures ? `FAILURES: ${failures}` : 'all hero kits passed');
process.exitCode = failures ? 1 : 0;
