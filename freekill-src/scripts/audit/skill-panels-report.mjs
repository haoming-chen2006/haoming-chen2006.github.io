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
    ui: 'ConfirmBar yes/no', status: 'scene',
    note: 'Prompt is `#AskForSkillInvoke` with the skill name substituted. Correct, but says nothing about what the skill will do.',
  },
  AskForUseCard: { ui: 'ConfirmBar + hand', status: 'scene', note: 'Prompt via processPrompt; hand filtered by the engine.' },
  AskForResponseCard: { ui: 'ConfirmBar + hand', status: 'scene', note: 'Same path as AskForUseCard.' },
  AskForChoice: {
    ui: 'ChoiceBox', status: 'weak',
    note: 'One row of buttons titled "<skill>: please choose". Options are rendered with tr(), not processPrompt(), so any option carrying arguments shows as a raw colon-string. `detailed` is ignored.',
  },
  AskForChoices: {
    ui: 'ChoiceBox (multi)', status: 'weak',
    note: 'Same box plus OK. The title reads data[5] (the prompt key) where skill_name is data[4], so the heading is a raw prompt key.',
  },
  AskForCardChosen: {
    ui: 'PlayerCardBox', status: 'weak',
    note: 'Zones $Hand/$Equip/$Judge. `_id` — whose cards these are — is destructured and never rendered, so the box never names the victim. QML builds `#AskForChooseCard:<id>`.',
  },
  AskForPoxi: {
    ui: 'PoxiBox', status: 'weak',
    note: 'Filter and feasibility are delegated to the engine, which is right. But `known` is hard-coded on every card, so `extra_data.visible_data` is ignored and face-down hand cards render face-up; and the prompt — already-translated text ending in `:<targetId>` — is passed through `tr()` instead of `processPrompt`, so it prints an unsubstituted `%src` and a dangling id.',
  },
  AskForGuanxing: { ui: 'ArrangeBox', status: 'ok', note: 'Click-to-move zones with capacity and minimum. The bottom zone starts empty, so the move button works.' },
  AskForArrangeCards: {
    ui: 'ArrangeBox', status: 'weak',
    note: 'The move button refuses any zone already at capacity, and `max_limit` defaults to the current row sizes (room.lua:1695) — so a two-row arrange that does not override it cannot move a card at all. `is_free`, `pattern` and `poxi_type` are never read, so illegal arrangements can be confirmed.',
  },
  AskForExchange: { ui: 'ArrangeBox via ExchangeBox', status: 'weak', note: 'Every pile is mapped to a zone whose capacity equals its own length, so no card can ever move. No roster skill reaches it today.' },
  AskForAG: { ui: 'AgBox floating panel', status: 'ok', note: 'Non-modal, table stays clickable.' },
  AskForGeneral: { ui: 'ChooseGeneralBox', status: 'ok', note: 'With per-general detail popup.' },
  AskForMoveCardInBoard: {
    ui: 'UnknownRequest — JSON dump, no buttons', status: 'dead',
    note: 'DialogHost has no case. The modal has no actions prop, so there is no reply path: the seat times out.',
  },
  AskForCardsAndChoice: {
    ui: 'UnknownRequest — JSON dump, no buttons', status: 'dead',
    note: 'Same dead end. Covers both the read-only `viewCards` viewer and the real see-then-decide ask.',
  },
  CustomDialog: {
    ui: 'UnknownRequest — JSON dump, no buttons', status: 'dead',
    note: 'Package-supplied QML component. Eight distinct components are in use across utility/ and mobile/.',
  },
  MiniGame: { ui: 'UnknownRequest — JSON dump, no buttons', status: 'dead', note: 'No roster skill uses it.' },
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
