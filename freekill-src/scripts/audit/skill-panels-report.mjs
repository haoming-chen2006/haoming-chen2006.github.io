// Turns `skill-panels.mjs` output into the audit's two answers: one row per
// (skill, general) across the playable roster, and the panel patterns ranked by
// how many generals share each.
//
// READ-ONLY. Writes only to the path given by `--out=`.
//
// The verdict per request type is not an opinion — it is what
// `src/room/state/store.ts` + `src/room/dialogs/DialogHost.tsx` do with the
// command, checked against what `Fk/Pages/LunarLTK/*.qml` does with the same
// payload. Four commands reach `UnknownRequest`, which has no action buttons at
// all, so the seat cannot answer and the request runs to timeout.
import { readFileSync, writeFileSync } from 'node:fs';

const ENGINE_ROOT = process.env.FK_ROOT || '/Users/haoming/FreeKill';
const fileCache = new Map();
const readSkill = (f) => {
  if (!fileCache.has(f)) fileCache.set(f, readFileSync(`${ENGINE_ROOT}/${f}`, 'utf8'));
  return fileCache.get(f);
};

/** The argument list of the call starting at `i`, to its matching bracket. */
function argSlice(text, i) {
  let depth = 0;
  let started = false;
  for (let j = i; j < text.length && j < i + 4000; j += 1) {
    const c = text[j];
    if (c === '(' || c === '{') { depth += 1; started = true; }
    else if (c === ')' || c === '}') { depth -= 1; if (started && depth <= 0) return text.slice(i, j + 1); }
  }
  return text.slice(i, i + 800);
}

/**
 * The two things that decide whether a box says anything.
 *
 * `prompt` is optional on most asks and defaults to `""` for `askToChoice` and
 * `askToChoosePlayers` (`lua/lunarltk/server/room.lua:825, 1426`), so a skill
 * that omits it leaves the panel with a title and nothing else.
 *
 * `args` is the other half: a choice built as `"key::"..pid..":"..n` is a
 * `processPrompt` key. QML renders options through `processPrompt`
 * (`ChoiceBox.qml:35`); the web renders them through `tr()`, which does not
 * split on `:` and hands the raw string straight to the button face.
 */
function callSignals(text, methods) {
  const out = { calls: 0, unprompted: 0, args: false };
  for (const m of methods) {
    const re = new RegExp(`[:.]${m}\\s*[({]`, 'g');
    let mm;
    while ((mm = re.exec(text))) {
      const slice = argSlice(text, mm.index);
      out.calls += 1;
      if (!/\bprompt\s*=/.test(slice)) out.unprompted += 1;
      if (/(::|\.\.\s*["\w])/.test(slice) && /choices/.test(slice)) out.args = true;
    }
  }
  return out;
}

const PANELS = {
  AskForUseActiveSkill: {
    ui: 'ConfirmBar + live table', status: 'scene',
    note: 'Answered on the table: hand cards and seats light up, OK/Cancel in the bar. No dialog is wanted here.',
  },
  AskForSkillInvoke: {
    ui: 'ConfirmBar yes/no + skill text', status: 'scene',
    note: 'Prompt is `#AskForSkillInvoke` with the skill name substituted, and under it the skill\'s own `:<name>` rules text — the paragraph the general\'s card prints.',
  },
  AskForUseCard: { ui: 'ConfirmBar + hand', status: 'scene', note: 'Prompt via processPrompt; hand filtered by the engine.' },
  AskForResponseCard: { ui: 'ConfirmBar + hand', status: 'scene', note: 'Same path as AskForUseCard.' },
  AskForChoice: {
    ui: 'ChoiceBox', status: 'ok',
    note: 'One row of buttons titled "<skill>: please choose". Options go through processPrompt (as ChoiceBox.qml:33 does), so an option carrying arguments reads as prose. Each option also carries its `:<option>` rules text, which upstream draws only behind the `detailed` flag.',
  },
  AskForChoices: {
    ui: 'ChoiceBox (multi)', status: 'ok',
    note: 'Same box plus OK/Cancel. Reads skill_name from data[4] and the prompt from data[5], as RoomLogic.js:962 sends them.',
  },
  AskForCardChosen: {
    ui: 'PlayerCardBox', status: 'ok',
    note: 'Zones $Hand/$Equip/$Judge. The prompt is `#AskForChooseCard:<id>` with the skill in %1, as RoomLogic.js:1010 builds it, and the target is named in the title too.',
  },
  AskForPoxi: {
    ui: 'PoxiBox', status: 'ok',
    note: 'Filter, feasibility and card visibility are all the engine\'s answers. The prompt — already-translated text ending in `:<targetId>` — goes through processPrompt, as PoxiBox.qml:13 does.',
  },
  AskForGuanxing: { ui: 'ArrangeBox', status: 'ok', note: 'Click-to-move zones with capacity and minimum. The bottom zone starts empty, so ⇄ moves a card outright; clicking two cards trades them.' },
  AskForArrangeCards: {
    ui: 'ArrangeBox', status: 'weak',
    note: 'Clicking a card picks it up and clicking a second puts it down, which trades places across a row at capacity exactly as ArrangeCardsBox.qml updateCardReleased does — and that is the only operation there is once `max_limit` defaults to the current row sizes (room.lua:1695), as it does for 星魂. `is_free`, `pattern` and `poxi_type` are still never read, so an arrangement the QML would forbid can still be confirmed.',
  },
  AskForExchange: { ui: 'ArrangeBox via ExchangeBox', status: 'ok', note: 'Every pile is a zone whose capacity equals its own length, so a trade is the only move it has — which is what the box now offers. No roster skill reaches it today.' },
  AskForAG: { ui: 'AgBox floating panel', status: 'ok', note: 'Non-modal, table stays clickable.' },
  AskForGeneral: { ui: 'ChooseGeneralBox', status: 'ok', note: 'With per-general detail popup.' },
  AskForMoveCardInBoard: {
    ui: 'MoveInBoardBox', status: 'ok',
    note: 'Two rows, one per player; clicking a card moves it across. Replies { cardId, pos } with pos the card\'s ORIGINAL side, as MoveCardInBoardBox.qml:136 does. Cancel replies "", which the engine reads as "move a random one" (room.lua:2941).',
  },
  AskForCardsAndChoice: {
    ui: 'CardsAndChoiceBox', status: 'weak',
    note: 'Cards plus one button per choice, replying { cards, choice }; cancel_choices reply with no cards. Covers the read-only `viewCards` viewer (min=max=0) too. WEAK for one reason: `filter_skel`\'s extra.choiceFilter gates the non-default choices in QML via Lua.evaluate, and there is no string-eval door into the VM on this side, so every choice is offered once the card count is legal.',
  },
  CustomDialog: {
    ui: 'UnknownRequest — JSON dump, declinable', status: 'dead',
    note: 'Package-supplied QML component. Eight distinct components are in use across utility/ and mobile/. Still unimplemented, but the box now carries a Cancel that replies "" so the seat is not frozen for the whole timeout.',
  },
  MiniGame: { ui: 'UnknownRequest — JSON dump, declinable', status: 'dead', note: 'No roster skill uses it.' },
};

const ORDER = { dead: 0, weak: 1, scene: 2, ok: 3, none: 4 };

const src = JSON.parse(readFileSync(process.argv.find((a) => a.startsWith('--in=')).slice(5), 'utf8'));
const playable = src.generals.filter((g) => !g.hidden);
const hidden = src.generals.filter((g) => g.hidden);

/** skill -> the playable generals that print it on their card. */
const carriers = new Map();
for (const g of playable) {
  for (const s of g.skills) {
    if (s.related) continue; // another general's skill, shown for reference only
    if (!carriers.has(s.name)) carriers.set(s.name, []);
    carriers.get(s.name).push(g);
  }
}

const rows = [];
for (const [name, gens] of [...carriers].sort((a, b) => a[0].localeCompare(b[0]))) {
  const sk = src.skills[name];
  const cmds = Object.keys(sk.requests);
  // The worst thing this skill asks for decides its row.
  const worst = cmds.map((c) => PANELS[c]?.status ?? 'none')
    .sort((a, b) => ORDER[a] - ORDER[b])[0] ?? 'none';
  const foreign = cmds.filter((c) => sk.requests[c].foreign);
  const body = sk.file ? readSkill(sk.file) : '';
  const choice = callSignals(body, ['askToChoice', 'askToChoices']);
  const chosen = callSignals(body, ['askToChooseCard']);
  rows.push({
    silentChoice: choice.unprompted,
    argChoices: choice.args,
    detailedChoice: /detailed\s*=\s*true/.test(body),
    silentCardChosen: chosen.unprompted,
    skill: name,
    title: sk.title,
    desc: sk.desc,
    generals: gens.map((g) => g.name),
    generalTitles: gens.map((g) => g.title),
    pack: gens[0].extension,
    classes: [...new Set(sk.effects.map((e) => e.class))],
    tags: sk.tags,
    requests: cmds.map((c) => ({
      cmd: c, via: sk.requests[c].via, calls: sk.requests[c].calls,
      foreign: sk.requests[c].foreign, receivers: sk.requests[c].receivers,
      ui: PANELS[c]?.ui ?? '—', status: PANELS[c]?.status ?? 'none',
    })),
    widgets: sk.widgets.filter((w) => w !== 'custom'),
    qmlMark: [...new Set([...body.matchAll(/"@\[(\w+)\]/g)].map((m) => m[1]))],
    qml: sk.qml,
    implicitInvoke: sk.implicitInvoke,
    foreign,
    status: worst,
    file: sk.file,
  });
}

/* ------------------------------------------------------------- patterns */

function bucket(row) {
  const has = (c) => row.requests.some((r) => r.cmd === c);
  if (has('CustomDialog')) return 'customDialog';
  if (has('AskForMoveCardInBoard')) return 'moveInBoard';
  if (has('AskForCardsAndChoice')) return 'cardsAndChoice';
  if (row.foreign.some((c) => c === 'AskForChoice' || c === 'AskForChoices')) return 'foreignChoice';
  if (row.foreign.length) return 'foreignOther';
  if (has('AskForChoice') || has('AskForChoices')) return 'choice';
  if (has('AskForCardChosen')) return 'cardChosen';
  if (has('AskForPoxi')) return 'poxi';
  if (has('AskForGuanxing') || has('AskForArrangeCards') || has('AskForExchange')) return 'arrange';
  if (row.widgets.length) return 'widget';
  if (has('AskForUseActiveSkill') || has('AskForUseCard') || has('AskForResponseCard')) return 'scene';
  if (has('AskForSkillInvoke')) return 'invoke';
  return 'silent';
}

const buckets = {};
for (const r of rows) {
  const b = bucket(r);
  (buckets[b] ??= { skills: [], generals: new Set() });
  buckets[b].skills.push(r.skill);
  r.generals.forEach((g) => buckets[b].generals.add(g));
}

const out = {
  builtAt: new Date().toISOString(),
  counts: {
    generalsTotal: src.generals.length,
    playable: playable.length,
    hidden: hidden.length,
    skills: rows.length,
    pairs: rows.reduce((n, r) => n + r.generals.length, 0),
  },
  hidden: hidden.map((g) => ({ name: g.name, title: g.title, pack: g.extension })),
  panels: PANELS,
  rows,
  buckets: Object.fromEntries(Object.entries(buckets)
    .map(([k, v]) => [k, { skills: v.skills, generals: [...v.generals].sort() }])),
  qmlMarks: src.qmlMarks,
};

const to = process.argv.find((a) => a.startsWith('--out='));
if (to) { writeFileSync(to.slice(6), JSON.stringify(out)); console.error(`wrote ${to.slice(6)}`); }
else console.log(JSON.stringify(out, null, 2));
