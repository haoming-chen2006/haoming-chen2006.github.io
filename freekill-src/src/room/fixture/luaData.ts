/**
 * Static game data, dumped out of the real engine by `src/room/dev/dump-lua-data.mjs`.
 *
 * This is what the harness answers `LuaClient.call` from. At integration Agent 1's
 * client VM answers the same calls with the same shapes and this file goes away.
 * It is a recording of engine output, not a second implementation of anything.
 */
import raw from '../dev/data/lua-data.json';
import type { CardData, GeneralData, GeneralDetail, SkillData } from '../ltk/types';

interface RawCard {
  cid: number; name: string; extension: string; package: string;
  number: number; suit: string; color: string; type: number;
  subtype: string; multiple_targets?: boolean;
}
interface RawGeneral {
  package: string; extension: string; kingdom: string; subkingdom?: string;
  gender: number; hp: number; maxHp: number; shield: number; hidden?: boolean;
  skills: { name: string; related: boolean }[];
}
interface RawSkill {
  extension: string; freq: 'active' | 'notactive';
  frequency?: 'limit' | 'wake' | 'quest'; isViewAsSkill: boolean;
}

const data = raw as unknown as {
  cards: RawCard[];
  generals: Record<string, RawGeneral>;
  skills: Record<string, RawSkill>;
  translations: Record<string, Record<string, string>>;
};

export const cardById = new Map<number, CardData>(
  data.cards.map((c) => [c.cid, {
    cid: c.cid, name: c.name, known: true, extension: c.extension,
    number: c.number, suit: c.suit as CardData['suit'], color: c.color as CardData['color'],
    type: c.type, subtype: c.subtype as CardData['subtype'],
    multiple_targets: c.multiple_targets, mark: [],
  }]),
);

export const cardExtensionByName = new Map<string, string>(
  data.cards.map((c) => [c.name, c.extension]),
);

export const generals: Record<string, GeneralData & { skills: { name: string; related: boolean }[]; gender: number }> =
  data.generals as never;

export const skills: Record<string, RawSkill> = data.skills;

/**
 * `GetGeneralDetail(name)` — `client_util.lua:27`.
 *
 * The dump stores a general's skills as `{ name, related }`; the engine answers
 * with `{ name, description, is_related_skill }`, where the description is
 * `Fk:getDescription(name)` and that is `Fk:translate(":" .. name)`. Assembling
 * it here rather than in the room keeps the room's only source of skill text the
 * same shape from the fixture and from the real client VM — the general-detail
 * popup reads `detail.skill` and does not care which one answered.
 */
export function generalDetail(name: string, lang: Language): GeneralDetail | undefined {
  const g = data.generals[name] ?? data.generals.diaochan;
  if (!g) return undefined;
  return {
    ...(generals[name] ?? generals.diaochan),
    gender: g.gender,
    skill: (g.skills ?? []).map((s) => ({
      name: s.name,
      description: translate(`:${s.name}`, lang),
      is_related_skill: !!s.related,
    })),
    companions: [],
  };
}

export function skillData(name: string): SkillData | undefined {
  const s = data.skills[name];
  if (!s) return undefined;
  return {
    skill: name, orig_skill: name, extension: s.extension,
    freq: s.freq, frequency: s.frequency, switchSkillName: '',
    isViewAsSkill: s.isViewAsSkill,
  };
}

export const LANGUAGES = ['zh_CN', 'en_US'] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * `ModManager:translate` (`lua/core/mod_manager.lua:122`) exactly: an unknown
 * key comes back as itself. It does NOT fall back to Chinese per key — only a
 * wholly missing language table falls back. Upstream's `en_US` covers 681 of
 * the 1,368 zh_CN keys, so some English strings show as their raw key; that is
 * the engine's behaviour and an upstream gap, not something to paper over here.
 */
export function translate(src: string, lang: Language): string {
  const table = data.translations[lang] ?? data.translations.zh_CN;
  return table?.[src] ?? src;
}
