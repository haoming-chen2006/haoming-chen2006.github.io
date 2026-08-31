// Dumps the static game data the room renders — card faces, general stats, skill
// metadata, translation tables — straight out of the real engine.
//
// This is DEVELOPMENT DATA ONLY. At integration the room asks Agent 1's
// LuaClient (`client.call('GetCardData', id)` and friends) for exactly these
// values; nothing here is a second source of truth and nothing here is a rule.
// It exists so the harness page can render a full game with no engine running.
//
//   node src/room/dev/dump-lua-data.mjs
//
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBundle } from '../../../spike/build-bundle.mjs';
import { createVm, installHost } from '../../../spike/engine.js';

const here = dirname(fileURLToPath(import.meta.url));

const PROBE = String.raw`
local subtypeStrings = {
  [Card.SubtypeNone] = "none",
  [Card.SubtypeDelayedTrick] = "delayed_trick",
  [Card.SubtypeWeapon] = "weapon",
  [Card.SubtypeArmor] = "armor",
  [Card.SubtypeDefensiveRide] = "defensive_ride",
  [Card.SubtypeOffensiveRide] = "offensive_ride",
  [Card.SubtypeTreasure] = "treasure",
}
local out = { cards = {}, generals = {}, skills = {}, translations = {} }

for _, card in ipairs(Fk.cards) do
  out.cards[#out.cards + 1] = {
    cid = card.id,
    name = card.name,
    extension = card.package.extensionName,
    package = card.package.name,
    number = card.number,
    suit = card:getSuitString(),
    color = card:getColorString(),
    type = card.type,
    subtype = subtypeStrings[card.sub_type],
    multiple_targets = card.multiple_targets,
  }
end

for name, g in pairs(Fk.generals) do
  local skills = {}
  for _, s in ipairs(g.all_skills) do
    skills[#skills + 1] = { name = s[1], related = s[2] }
  end
  out.generals[name] = {
    package = g.package.name,
    extension = g.package.extensionName,
    kingdom = g.kingdom,
    subkingdom = g.subkingdom,
    gender = g.gender,
    hp = g.hp,
    maxHp = g.maxHp,
    shield = g.shield,
    hidden = g.hidden,
    skills = skills,
  }
end

for name, s in pairs(Fk.skills) do
  local freq = "notactive"
  if s:isInstanceOf(ActiveSkill) or s:isInstanceOf(ViewAsSkill) then freq = "active" end
  local frequency
  if s:hasTag(Skill.Limited, false) then frequency = "limit"
  elseif s:hasTag(Skill.Wake) then frequency = "wake"
  elseif s:hasTag(Skill.Quest) then frequency = "quest" end
  out.skills[name] = {
    extension = s.package and s.package.extensionName or "",
    freq = freq,
    frequency = frequency,
    isViewAsSkill = s:isInstanceOf(ViewAsSkill),
  }
end

for lang, t in pairs(Fk.translations) do out.translations[lang] = t end
return json.encode(out)
`;

const bundle = buildBundle();
const { lua, FS } = await createVm(bundle);
installHost({ lua, FS }, { logLevels: new Set(['error']) });
lua.doStringSync(`dofile('web/boot.lua')`);
lua.doStringSync(`assert(FKWeb.boot())`);

const data = JSON.parse(lua.doStringSync(PROBE));

// zh_CN and en_US only — the spec scopes languages to those two.
const langs = ['zh_CN', 'en_US'];
const translations = {};
for (const l of langs) translations[l] = data.translations[l] ?? {};

const out = {
  generatedBy: 'src/room/dev/dump-lua-data.mjs',
  note: 'Development stand-in for LuaClient.call(...). Replaced by the real client VM at integration.',
  cards: data.cards.sort((a, b) => a.cid - b.cid),
  generals: data.generals,
  skills: data.skills,
  translations,
};

const dest = join(here, 'data', 'lua-data.json');
writeFileSync(dest, JSON.stringify(out));
console.log(
  `cards=${out.cards.length} generals=${Object.keys(out.generals).length} ` +
  `skills=${Object.keys(out.skills).length} ` +
  langs.map((l) => `${l}=${Object.keys(translations[l]).length}`).join(' ')
);
console.log(`-> ${dest}`);
