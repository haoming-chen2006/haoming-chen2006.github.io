// Skill-panel survey. READ-ONLY: boots the client VM, reads the real roster,
// and cross-references every skill body against the request the engine sends,
// so we can say per (general, skill) what interaction it asks for, what the web
// client draws for it today, and who is being asked.
//
// Two halves, because neither alone is enough:
//   * The VM knows WHICH skills exist and which general carries them (and which
//     `lua/web/roster.lua` hid). Skill names are literary allusions; only the
//     engine knows the real (general -> skill) edges.
//   * The Lua SOURCE knows what a skill DOES. A booted skill exposes `onUse` as
//     an opaque function — the request it raises is only visible in its body.
//
// The wire mapping below is not guesswork: it is `lua/lunarltk/server/room.lua`
// read end to end. Several `askTo*` names do NOT send the command their name
// suggests — `askToChooseCards` sends `AskForPoxi`, `askToYiji` sends
// `AskForUseActiveSkill`, and six `Utility.*` helpers all send `CustomDialog`.
//
// Output: JSON on stdout, or `--out=<path>`.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLuaVm } from '../../src/engine/vm.ts';
import { buildBundle } from '../build-lua-bundle.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..', '..');
const ENGINE_ROOT = process.env.FK_ROOT || '/Users/haoming/FreeKill';

/* ------------------------------------------------------------------ 1. VM */

async function fromVm() {
  const vm = await createLuaVm(await buildBundle(), { logLevels: new Set(['error']) });
  vm.lua.doStringSync(`dofile('lua/web/client.lua')`);
  if (vm.lua.doStringSync(`return FKClient.boot()`) !== true) throw new Error('FKClient.boot() failed');
  const data = JSON.parse(vm.lua.doStringSync(readFileSync(join(here, 'skill-panels.lua'), 'utf8')));
  vm.close();
  return data;
}

/* -------------------------------------------------------------- 2. source */

function luaFiles() {
  const roots = ['standard', 'standard_cards', 'maneuvering', 'utility', 'mobile']
    .map((p) => join(ENGINE_ROOT, 'packages', p));
  roots.push(join(WEB_ROOT, 'packages', 'webmodes'));
  const out = [];
  const walk = (abs) => {
    let entries;
    try { entries = readdirSync(abs); } catch { return; }
    for (const name of entries.sort()) {
      const a = join(abs, name);
      if (statSync(a).isDirectory()) walk(a);
      else if (name.endsWith('.lua')) out.push(a);
    }
  };
  roots.forEach(walk);
  return out;
}

/**
 * skill name -> the source span of its definition.
 *
 * A mobile skill file is `local x = fk.CreateSkill{ name = "..." }` followed by
 * `x:addEffect(...)` blocks; helpers above the skeleton belong to it too. So a
 * file is split at every `fk.Create*Skill` and each span is attributed to the
 * name that constructor declares. All 620 mobile skill files hold exactly one.
 */
function skillSources() {
  const byName = new Map();
  const CREATE = /fk\.Create(?:Skill|ActiveSkill|TriggerSkill|ViewAsSkill|DistanceSkill|ProhibitSkill|FilterSkill|MaxCardsSkill|AttackRangeSkill|TargetModSkill)\s*[{(]/g;
  for (const file of luaFiles()) {
    const text = readFileSync(file, 'utf8');
    const starts = [];
    let m;
    CREATE.lastIndex = 0;
    while ((m = CREATE.exec(text))) starts.push(m.index);
    if (!starts.length) continue;
    for (let i = 0; i < starts.length; i += 1) {
      const from = i === 0 ? 0 : starts[i];
      const to = i + 1 < starts.length ? starts[i + 1] : text.length;
      const nm = /name\s*=\s*"([^"]+)"/.exec(text.slice(starts[i], to));
      if (!nm) continue;
      const prev = byName.get(nm[1]);
      const span = text.slice(from, to);
      byName.set(nm[1], { file, text: prev ? `${prev.text}\n${span}` : span });
    }
  }
  return byName;
}

/* --------------------------------------------------- 3. request detection */

/**
 * Lua call -> { cmd, via } where `cmd` is the command that reaches the client
 * and `via` names the aux skill / poxi type / QML component it carries, which
 * is what a bespoke panel would actually have to draw.
 *
 * Read off `lua/lunarltk/server/room.lua` and `packages/utility/utility.lua`.
 * Names that raise no client request are absent.
 */
const REQUESTS = {
  /* --- own wire command, dialog-shaped ---------------------------------- */
  askToChoice: ['AskForChoice', 'choice'],
  askToChoices: ['AskForChoices', 'choices'],
  askToJointChoice: ['AskForChoice', 'joint choice (broadcast)'],
  askToChooseKingdom: ['AskForChoice', 'kingdom (broadcast)'],
  askToChooseCard: ['AskForCardChosen', 'one card off a player'],
  askToChooseCards: ['AskForPoxi', 'poxi "AskForCardsChosen"'],
  askToPoxi: ['AskForPoxi', 'named poxi method'],
  askToGuanxing: ['AskForGuanxing', 'top/bottom'],
  askToArrangeCards: ['AskForArrangeCards', 'n zones'],
  askToExchange: ['AskForExchange', 'piles'],
  askToAG: ['AskForAG', 'amazing grace'],
  askToChooseGeneral: ['AskForGeneral', 'general pick'],
  askForGeneralsChosen: ['AskForGeneral', 'general pick'],

  /* --- own wire command, NO panel --------------------------------------- */
  askToMoveCardInBoard: ['AskForMoveCardInBoard', 'move an e/j card between two boards'],
  askToChooseCardsAndChoice: ['AskForCardsAndChoice', 'see cards, then decide'],
  askToViewCardsAndChoice: ['AskForCardsAndChoice', 'see cards, then decide'],
  viewCards: ['AskForCardsAndChoice', 'read-only card viewer'],
  askToCustomDialog: ['CustomDialog', 'package QML component'],
  askToMiniGame: ['MiniGame', 'package QML minigame'],
  askForChooseCardNames: ['CustomDialog', 'ChooseCardNamesBox.qml'],
  askForChooseCardList: ['CustomDialog', 'ChooseCardListBox.qml'],
  askToChooseSkills: ['CustomDialog', 'ChooseSkillBox.qml'],
  askToJointSkills: ['CustomDialog', 'ChooseSkillBox.qml (broadcast)'],
  askToChooseGeneralSkills: ['CustomDialog', 'ChooseGeneralSkillsBox.qml'],
  askToChooseGeneralsAndChoice: ['CustomDialog', 'ChooseGeneralsAndChoiceBox.qml'],

  /* --- scene-model requests (ConfirmBar + table, no dialog) -------------- */
  askToSkillInvoke: ['AskForSkillInvoke', 'yes/no'],
  askToUseCard: ['AskForUseCard', 'play a card'],
  askToUseRealCard: ['AskForUseActiveSkill', 'userealcard_skill'],
  askToUseVirtualCard: ['AskForUseActiveSkill', 'virtual_viewas (CardNameBox)'],
  askToPlayCard: ['AskForUseCard', 'play a card'],
  askToResponse: ['AskForResponseCard', 'respond with a card'],
  askToNullification: ['AskForUseCard', 'nullification (race)'],
  askToUseActiveSkill: ['AskForUseActiveSkill', 'named aux skill'],
  askToCards: ['AskForUseActiveSkill', 'choose_cards_skill'],
  askToDiscard: ['AskForUseActiveSkill', 'discard_skill'],
  askToChoosePlayers: ['AskForUseActiveSkill', 'choose_players_skill'],
  askToChooseCardsAndPlayers: ['AskForUseActiveSkill', 'ex__choose_skill'],
  askToYiji: ['AskForUseActiveSkill', 'distribution_select_skill (loop)'],
  askToJointCards: ['AskForUseActiveSkill', 'choose_cards_skill (broadcast)'],
  askToNumber: ['AskForUseActiveSkill', 'spin_skill (Spin)'],
  askToChooseToMoveCardInBoard: ['AskForUseActiveSkill', 'choose_players_to_move_card_in_board'],
  askForCardByMultiPatterns: ['AskForUseActiveSkill', 'choose_cards_mutlipat_skill'],
};

const NAMES = Object.keys(REQUESTS).sort((a, b) => b.length - a.length);
// The receiver of the ask is its first argument. `askToChoice(player, ...)` asks
// the skill's owner; `askToChoice(target, ...)` asks somebody else — which is
// exactly the case the audit is looking for.
const CALL = new RegExp(`[:.](${NAMES.join('|')})\\s*[({]\\s*([A-Za-z_][\\w.:\\[\\]]*)?`, 'g');
const SELF_ARGS = new Set([
  'player', 'self', 'from', 'owner', 'effect.from', 'p', 'me', 'attacker',
  'player.room', 'room', 'data.from', 'user',
]);
const WIDGET = /UI\.(ComboBox|CardNameBox|Spin|CheckBox)\b/g;

/**
 * A skill that posts its own request instead of calling an `askTo*` helper.
 *
 * `Request:new(players, "<Command>")` is public API and `packages/` uses it —
 * 盗书 raises `CustomDialog` this way so it can ask a whole team at once
 * (`packages/mobile/pkg/mobile_sp/skills/mobile_daoshu.lua:102`), and utility's
 * `askToJointSkills` does the same. A scan that only knows the helper names
 * reports those skills as raising nothing at all, which is how 盗书 stayed off
 * the dead-panel census while its seat sat looking at an unanswerable box.
 */
const RAW_REQUEST = /Request:new\s*\(\s*([A-Za-z_][\w.\[\]]*)?\s*,\s*"([A-Za-z]+)"/g;

function scan(text) {
  const asks = new Map();
  let m;
  CALL.lastIndex = 0;
  while ((m = CALL.exec(text))) {
    const [cmd, via] = REQUESTS[m[1]];
    // Room methods are `room:askTo…(player, …)`; the Utility helpers take the
    // player first too, except `askForChooseCardNames/List(room, player, …)`.
    let who = m[2] ?? '?';
    if (who === 'room' || who === 'player.room' || who === 'self.room') {
      const after = text.slice(m.index, m.index + 200);
      who = (/,\s*([A-Za-z_][\w.\[\]]*)/.exec(after) ?? [, '?'])[1];
    }
    const foreign = !SELF_ARGS.has(who) && who !== '?';
    const e = asks.get(cmd) ?? { via: [], calls: [], n: 0, foreign: false, receivers: [] };
    e.n += 1;
    if (!e.calls.includes(m[1])) e.calls.push(m[1]);
    if (!e.via.includes(via)) e.via.push(via);
    if (!e.receivers.includes(who)) e.receivers.push(who);
    e.foreign = e.foreign || foreign;
    asks.set(cmd, e);
  }
  RAW_REQUEST.lastIndex = 0;
  while ((m = RAW_REQUEST.exec(text))) {
    const cmd = m[2];
    const who = m[1] ?? '?';
    const e = asks.get(cmd) ?? { via: [], calls: [], n: 0, foreign: false, receivers: [] };
    e.n += 1;
    if (!e.calls.includes('Request:new')) e.calls.push('Request:new');
    if (!e.via.includes('raw Request')) e.via.push('raw Request');
    if (!e.receivers.includes(who)) e.receivers.push(who);
    e.foreign = e.foreign || (!SELF_ARGS.has(who) && who !== '?');
    asks.set(cmd, e);
  }
  const widgets = [];
  WIDGET.lastIndex = 0;
  while ((m = WIDGET.exec(text))) if (!widgets.includes(m[1])) widgets.push(m[1]);
  if (/qml_path\s*=/.test(text)) widgets.push('custom');
  // Which QML component a CustomDialog names, when the skill names one itself.
  const qml = [...text.matchAll(/url\s*=\s*"([^"]*\.qml)"/g)].map((x) => x[1]);
  return { asks, widgets, qml: [...new Set(qml)] };
}

/* ----------------------------------------------------------------- 4. run */

const vmData = await fromVm();
const sources = skillSources();

const skills = {};
for (const [name, info] of Object.entries(vmData.skills)) {
  const src = sources.get(name);
  const { asks, widgets, qml } = src ? scan(src.text) : { asks: new Map(), widgets: [], qml: [] };
  // A non-compulsory TriggerSkill that does not override `cost` raises
  // AskForSkillInvoke on every trigger without writing a single call —
  // `TriggerSkill:cost` (lua/lunarltk/core/skill_type/trigger.lua:98) does it.
  const implicitInvoke = info.effects.some((e) =>
    e.class === 'TriggerSkill' && !e.compulsory && !e.delay && !e.costOverridden);
  if (implicitInvoke && !asks.has('AskForSkillInvoke')) {
    asks.set('AskForSkillInvoke', { via: ['implicit trigger cost'], calls: [], n: 0, foreign: false, receivers: ['player'] });
  }
  skills[name] = {
    ...info,
    file: src ? src.file.replace(`${ENGINE_ROOT}/`, '').replace(`${WEB_ROOT}/`, '') : null,
    requests: Object.fromEntries(asks),
    widgets,
    qml,
    implicitInvoke,
  };
}

const out = { generals: vmData.generals, skills, qmlMarks: vmData.qmlMarks };
const arg = process.argv.find((a) => a.startsWith('--out='));
const json = JSON.stringify(out, null, arg ? 0 : 2);
if (arg) { writeFileSync(arg.slice(6), json); console.error(`wrote ${arg.slice(6)}`); }
else console.log(json);
