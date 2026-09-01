/**
 * English for the engine keys `packages/webmodes` defines.
 *
 * Kept apart from `./authored.ts` for the same reason that file is kept apart
 * from `./upstream.ts`: different provenance. `authored.ts` is the missing half
 * of upstream's `zh_CN` table and its size is asserted against that table, key
 * for key. These keys are not upstream's at all — they belong to a package this
 * repo wrote — so folding them in would make that count mean two things.
 *
 * Terminology follows `./authored.ts` exactly: Slash, judgement area, Prepare
 * phase, Judge phase, HP, max HP, Lord / Loyalist / Rebel / Renegade, and
 * "(forced)" for 锁定技.
 */
import type { TranslationTable } from '../types';

const DUEL = [
  '# Duel',
  '',
  'Two players, no roles and nothing hidden. Kill the other one.',
  '',
  'There are no lord skills, no extra HP for anybody, and both players draw from the same '
  + 'character pool.',
].join('\n');

const TEAM = [
  '# 2v2',
  '',
  'Four players in two teams of two. **Your partner sits opposite you**: seats 1 and 3 are one '
  + 'team, seats 2 and 4 the other.',
  '',
  'No lord, no renegade, no concealed allegiance — every side is face up from the start.',
  '',
  'When both members of a team are dead, the other team wins.',
].join('\n');

const DIZHU = [
  '# Fight the Landlord',
  '',
  'Three players. One is the **landlord**, two are **peasants**. The landlord takes seat one and '
  + 'goes first.',
  '',
  'The landlord has three advantages:',
  '',
  '- **+2** characters to choose from (peasants see 3, the landlord sees 5)',
  '- **+1** HP and max HP',
  '- two skills of their own:',
  '',
  '**Flying High**: at the start of your Judge phase, you may discard two hand cards, then '
  + 'discard every card in your judgement area.',
  '',
  '**Overbearing**: (forced) in your Prepare phase, draw a card; in your Action phase you may '
  + 'use one extra Slash.',
  '',
  'All three roles are face up: everyone knows who the landlord is from the first turn.',
  '',
  'The peasants win if the landlord dies; the landlord wins by killing both peasants.',
  '',
  '*Killing a peasant earns no three-card bounty.*',
].join('\n');

export const MODE_EN_US: TranslationTable = {
  webmodes: 'Web modes',

  webmodes_duel: 'Duel',
  ':webmodes_duel': DUEL,
  webmodes_team: '2v2',
  ':webmodes_team': TEAM,
  webmodes_dizhu: 'Fight the Landlord',
  ':webmodes_dizhu': DIZHU,

  dz__feiyang: 'Flying High',
  ':dz__feiyang':
    'At the start of your Judge phase, you may discard two hand cards, then discard every card '
    + 'in your judgement area.',
  '#dz__feiyang-invoke':
    'Flying High: discard two hand cards, then discard every card in your judgement area',
  dz__bahu: 'Overbearing',
  ':dz__bahu':
    '(forced) In your Prepare phase, draw a card; in your Action phase you may use one extra Slash.',
};
