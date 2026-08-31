/**
 * The acceptance criterion for this lane, made checkable.
 *
 * spec.md: "Card selection legality, target validity, and the OK button's
 * enabled state come from the Lua scene model, not from TypeScript rules —
 * verified by the fact that no card or target legality predicate exists in the
 * web client's source."
 *
 * This test is that verification. It reads every source file in `src/room`,
 * strips comments and string literals (so prose about the rule does not trip
 * it), and fails on any identifier that would mean the room had started
 * deciding things for itself.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { skillsOf } from '../components/Dashboard';
import { LtkLua } from '../ltk/LtkLua';

const ROOM = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Names that would only exist if a game rule had been reimplemented here. */
const FORBIDDEN = [
  /\bcanPlay\w*/i,
  /\bcanUse\w*/i,
  /\bcanRespond\w*/i,
  /\bcanTarget\w*/i,
  /\bcanSelect\w*/i,
  /\bcanDiscard\w*/i,
  /\bisLegal\w*/i,
  /\bisValidTarget\w*/i,
  /\bcheckTarget\w*/i,
  /\bcardLegal\w*/i,
  /\btargetLegal\w*/i,
  /\bcomputeDistance\w*/i,
  /\bdistanceBetween\w*/i,
  /\bskillAvailable\w*/i,
  /\bmatchesPattern\w*/i,
  /\bevaluatePattern\w*/i,
];

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'data' || name === 'node_modules') continue;
      sources(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/** Comments and string literals are prose, not logic. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

describe('no game rules in the room', () => {
  const files = sources(ROOM);

  it('has source to check', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it('defines no legality, target-validity or distance predicate', () => {
    const hits: string[] = [];
    for (const f of files) {
      const body = code(readFileSync(f, 'utf8'));
      for (const re of FORBIDDEN) {
        const m = body.match(re);
        if (m) hits.push(`${f.slice(ROOM.length + 1)}: ${m[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('forwards every rules question to the engine', () => {
    // Each of these is a question only the Lua engine may answer. Assert the
    // method body does nothing but hand it over.
    const src = readFileSync(join(ROOM, 'ltk', 'LtkLua.ts'), 'utf8');
    for (const method of [
      'cardFitPattern', 'getCardProhibitReason', 'getSkillStatus', 'distanceTo',
      'getTargetTip', 'cardVisibility', 'roleVisibility',
      'chooseGeneralFilter', 'chooseGeneralFeasible', 'poxiFilter', 'poxiFeasible',
    ]) {
      const body = src.slice(src.indexOf(`${method}(`));
      const end = body.indexOf('\n  }');
      expect(body.slice(0, end), method).toContain('this.client.call');
      expect(LtkLua.prototype).toHaveProperty(method);
    }
  });

  it('never writes selectability back onto a scene item', () => {
    // `enabled` and `selected` may be READ off a scene item; writing one would
    // be the room forming its own opinion about what is legal. The scene is the
    // engine's word and the room only mirrors it.
    const WRITE = /\b(item|items\[[^\]]*\]|scene(?:\.[\w$]+|\[[^\]]*\])*)\.(enabled|selected)\s*=[^=]/g;
    const hits: string[] = [];
    for (const f of files) {
      if (f.endsWith('no-rules.test.ts')) continue;
      const body = code(readFileSync(f, 'utf8'));
      for (const m of body.matchAll(WRITE)) hits.push(`${f.slice(ROOM.length + 1)}: ${m[0].trim()}`);
    }
    expect(hits).toEqual([]);
  });

  it('asks the engine which skills the viewer has, rather than reading their names', () => {
    // Which of a player's skills are visible is `s.visible` in the engine
    // (`client_util.lua:392`, `GetMySkills`), not a property of the name. The
    // room used to approximate it with a shape rule that dropped every name
    // containing `__` or ending in `&` — which is `mobile__lianzhu`,
    // `changshi__kuiji`, and `spear_skill&`, the 丈八蛇矛 view-as skill that ships
    // in `standard_cards` and is therefore in this build. Each of those gets a
    // `SkillButton` in the scene; a dashboard that does not list them is a
    // dashboard with no way to press them.
    const engine = { getMySkills: () => ['zhiheng', 'spear_skill&', 'mobile__lianzhu'] };
    expect(skillsOf(engine, ['zhiheng'])).toEqual(['zhiheng', 'spear_skill&', 'mobile__lianzhu']);

    // With no VM to ask — a replay, the fixture harness — the notify stream's
    // own list stands in rather than the dashboard going blank.
    const noVm = { getMySkills: (): string[] => { throw new Error('no client VM'); } };
    expect(skillsOf(noVm, ['zhiheng', 'yiji'])).toEqual(['zhiheng', 'yiji']);
    expect(skillsOf({ getMySkills: () => [] }, ['zhiheng'])).toEqual(['zhiheng']);
  });

  it('lets the scene be the only source of the OK button state', () => {
    const dash = code(readFileSync(join(ROOM, 'components', 'Dashboard.tsx'), 'utf8'));
    // The button's disabled state must be a straight read of the scene item.
    expect(dash).toMatch(/const enabled = item\.enabled === true/);
    expect(dash).not.toMatch(/OK[\s\S]{0,80}length\s*[<>=]/);
  });
});
