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

/**
 * Keys the PACKAGES define, which this dump does not contain.
 *
 * `lua-data.json` is a snapshot taken before `packages/utility` and
 * `packages/mobile` were part of the build (`src/room/dev/dump-lua-data.mjs`
 * still boots the spike's `web/boot.lua`), so its 1,368 zh_CN entries are the
 * standard packs alone — while the room now draws panels for mobile content and
 * legitimately names mobile strings.
 *
 * This is a second universe, not a waiver. Every key below is asserted to
 * translate in a REAL booted engine — in both languages, and to something other
 * than itself — by `src/engine/__tests__/customdialog.test.ts`. A typo here
 * fails there, which is the guard this test is for.
 */
const PACKAGE_KEYS = new Set([
  // packages/utility/utility.lua — the Clear All button on both card-name boxes.
  'Clear All',
  // packages/mobile/pkg/mobile_rare/skills/danggu.lua — 〖党锢〗's box title.
  '$JieDang',
  // packages/mobile/pkg/mobile_shiji/skills/tamo.lua — 〖榻谟〗's title and its
  // "click a second seat to trade places" hint.
  '$TaMo', 'click to exchange',
  // packages/mobile/pkg/mobile_shiji/skills/wuling.lua — 〖五灵〗's title and
  // the skill's own name over its row of tokens.
  'Please arrange WuLing cards', 'wuling',
]);

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
        if (PACKAGE_KEYS.has(key)) continue;
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
