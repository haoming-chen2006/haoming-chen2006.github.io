/**
 * The complete English engine-key table, and the record of where each entry
 * came from.
 *
 * WHY THIS IS A JS-SIDE TABLE AND NOT A LUA LANGUAGE SWITCH. The engine can be
 * asked for a language (`ModManager:translate(src, lang)`), but a large family
 * of keys — every `#<skill>_<n>_<trig|active|…>` badge — is *derived at load
 * time* by `lua/lunarltk/core/skill_skeleton.lua`, which writes
 * `Fk:translate(skill.name)` into the table for `Config.language` as it is when
 * the packages load. Flipping `Config.language` afterwards therefore cannot fix
 * those, and flipping it before load would lose the Chinese table. So the engine
 * stays in its load-time language and the English is applied here, by key, on
 * the JS side. That also means switching language costs nothing: no VM call, no
 * reload, no engine state to keep in sync.
 *
 * Merge order is upstream -> override -> authored -> modes, and the key sets are
 * disjoint by construction (the coverage test asserts it). `modes` is last and
 * separate because it is the only table whose keys upstream's `zh_CN` does not
 * define at all: they belong to `packages/webmodes`, which this repo owns.
 */
import type { Provenance, TranslationTable } from '../types';
import { AUTHORED_EN_US } from './authored';
import { MODE_EN_US } from './modes';
import { OVERRIDE_EN_US } from './overrides';
import { UPSTREAM_EN_US } from './upstream';

export { AUTHORED_EN_US, MODE_EN_US, OVERRIDE_EN_US, UPSTREAM_EN_US };

/** Every engine key the game can ask for, in English. */
export const EN_US: TranslationTable = {
  ...UPSTREAM_EN_US,
  ...OVERRIDE_EN_US,
  ...AUTHORED_EN_US,
  ...MODE_EN_US,
};

/** key -> who wrote the English. `upstream` needs no review; the rest does. */
export const PROVENANCE: Readonly<Record<string, Provenance>> = (() => {
  const out: Record<string, Provenance> = {};
  for (const k of Object.keys(UPSTREAM_EN_US)) out[k] = 'upstream';
  for (const k of Object.keys(OVERRIDE_EN_US)) out[k] = 'override';
  for (const k of Object.keys(AUTHORED_EN_US)) out[k] = 'authored';
  for (const k of Object.keys(MODE_EN_US)) out[k] = 'authored';
  return out;
})();

export const COUNTS = {
  total: Object.keys(EN_US).length,
  upstream: Object.keys(UPSTREAM_EN_US).length - Object.keys(OVERRIDE_EN_US).length,
  override: Object.keys(OVERRIDE_EN_US).length,
  authored: Object.keys(AUTHORED_EN_US).length + Object.keys(MODE_EN_US).length,
} as const;
