/**
 * Every string the room shows must be a key the engine's own translation tables
 * define. Inventing a key means shipping English (or a bare identifier) into a
 * Chinese UI, and it means the string can never be translated by the packages
 * that own the content.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import raw from '../dev/data/lua-data.json';

const ROOM = join(dirname(fileURLToPath(import.meta.url)), '..');
const zh = (raw as unknown as { translations: Record<string, Record<string, string>> }).translations.zh_CN;

/** Keys built at runtime from engine data (general names, card names, roles,
 *  phases, marks) are not literals and cannot be checked here. */
const LITERAL_TR = /\b(?:lua\.tr|tr)\(\s*'([^']+)'/g;

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'data' || name === '__tests__') continue;
      sources(p, out);
    } else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('translation keys', () => {
  it('uses only keys the engine defines', () => {
    const unknown: string[] = [];
    for (const f of sources(ROOM)) {
      const body = readFileSync(f, 'utf8');
      for (const m of body.matchAll(LITERAL_TR)) {
        const key = m[1];
        // Prefixed keys are formatted by processPrompt, not looked up directly.
        if (key.startsWith('%')) continue;
        if (!(key in zh)) unknown.push(`${f.slice(ROOM.length + 1)}: ${key}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it('has the engine keys the room leans on hardest', () => {
    for (const key of [
      '$GameOver', 'Game Win', 'Game Lose', 'pile_draw', 'pile_discard',
      '#currentRoundNum', 'Illustrator', 'AskForGuanxing', 'AskForArrangeCards',
      'Please choose cards', 'OK', 'Cancel', 'End', 'Chat', 'Log',
      'lord', 'loyalist', 'rebel', 'renegade', 'unknown', 'playerstr_self',
    ]) {
      expect(zh, key).toHaveProperty([key]);
    }
  });

  it('can name what a promptless request is asking for', () => {
    // `Dashboard` builds these keys from `PendingRequest.command`, so the regex
    // above cannot see them. They are the fallback prompt for the three scene
    // requests that routinely arrive with none of their own — `ReqInvoke` never
    // sets one, and "play a Jink" arrives with `prompt == ""` — and each takes
    // the skill or card name in `%1`, filled by `fillArgs`.
    for (const key of ['#AskForSkillInvoke', '#AskForUseCard', '#AskForResponseCard']) {
      expect(zh, key).toHaveProperty([key]);
      expect(zh[key], key).toContain('%1');
    }
  });

  it('carries the inline artist credits the packages ship', () => {
    const credits = Object.entries(zh).filter(([k]) => k.startsWith('illustrator:'));
    expect(credits.length).toBeGreaterThanOrEqual(25);
    expect(new Set(credits.map(([, v]) => v))).toContain('KayaK');
  });
});
