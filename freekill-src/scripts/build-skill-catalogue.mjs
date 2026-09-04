// What a skill is made of, read off the build rather than described.
//
// The hero designer needs to know what a skill CAN be before it can offer a
// block that builds one. Rules text is no help: it lies by omission, and it is
// written for a player who already knows the engine. So this boots the real VM,
// walks the skeletons the shipped generals actually carry, and joins each to
// the Lua that defines it.
//
// Two halves, and neither alone is enough — the same split `skill-panels.mjs`
// makes, for the same reason:
//
//   * The VM knows WHICH skills ship and how they are WIRED. `Fk.skill_skels`
//     is the unit printed on a general card; each skeleton holds one or more
//     effect objects, and a trigger effect carries its event as a live class,
//     so `e.event.name` is "fk.Damaged" and `e.event.super.name` is
//     "DamageEvent". Trigger and family are therefore read, never guessed.
//   * The SOURCE knows what a skill DOES. A booted effect exposes `on_use` as
//     an opaque function; what it calls is only visible in its body.
//
// The source half reads the BUNDLE, not the disk, so it describes what really
// ships — the same discipline `roster.test.ts` uses. A pack mirrored in but not
// bundled cannot leak into the catalogue.
//
// Output: `src/designer/vocabulary/catalogue.generated.json` (one record per
// shipped skill) and `vocabulary.generated.json` (the blocks, with counts and
// examples, aggregated from the catalogue). Both are deterministic: everything
// is sorted, and nothing carries a timestamp or an absolute path.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createLuaVm } from '../src/engine/vm.ts';
import { buildBundle } from './build-lua-bundle.mjs';
import {
  CONDITIONS, DECLARATIVE, EFFECTS, REQUESTS, TAG_EFFECTS, TRIGGER_FAMILIES,
} from './skill-vocabulary.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..');
const OUT_DIR = join(WEB_ROOT, 'src', 'designer', 'vocabulary');

/* ------------------------------------------------------------------ 1. VM */

/**
 * The runtime half.
 *
 * `g.skills` holds Skill objects and `g.other_skills` holds names; a general
 * carries both and `build-overview.mjs` reads both, so this does too. The
 * shipped test is the one `Engine:getGeneralsRandomly` uses — neither `hidden`
 * nor `total_hidden` (lua/lunarltk/core/engine.lua:325) — which is what
 * `lua/web/roster.lua` manipulates to keep a general with a broken skill out of
 * the pool. A general the player cannot be dealt is not evidence of anything.
 */
const EXTRACT = String.raw`
local function esc(s)
  return (s:gsub('[%c"\\]', function(c)
    local map = { ['"'] = '\\"', ['\\'] = '\\\\', ['\n'] = '\\n', ['\r'] = '\\r', ['\t'] = '\\t' }
    return map[c] or string.format('\\u%04X', c:byte())
  end))
end
local function enc(v)
  local t = type(v)
  if t == 'nil' then return 'null'
  elseif t == 'boolean' then return tostring(v)
  elseif t == 'number' then return (v % 1 == 0) and string.format('%d', v) or tostring(v)
  elseif t == 'string' then return '"' .. esc(v) .. '"'
  elseif t == 'table' then
    if v[1] ~= nil or next(v) == nil then
      local out = {}
      for i = 1, #v do out[i] = enc(v[i]) end
      return '[' .. table.concat(out, ',') .. ']'
    end
    local keys = {}
    for k in pairs(v) do keys[#keys + 1] = tostring(k) end
    table.sort(keys)
    local out = {}
    for _, k in ipairs(keys) do
      local val = v[k]
      if val == nil then val = v[tonumber(k)] end
      out[#out + 1] = '"' .. esc(k) .. '":' .. enc(val)
    end
    return '{' .. table.concat(out, ',') .. '}'
  end
  return 'null'
end

local out = { generals = {}, skills = {}, scopes = {}, unresolved = {} }

-- The history scopes max_use_time is indexed by. Emitted rather than written
-- down, because the catalogue keys limits by name and the numbers are engine
-- internals: skill_skeleton.lua:97 fills the array positionally.
out.scopes = {
  phase = Player.HistoryPhase, turn = Player.HistoryTurn,
  round = Player.HistoryRound, game = Player.HistoryGame,
}

local wanted = {}
for _, pack in ipairs(Fk.package_names) do
  local p = Fk.packages[pack]
  if p and p.type == Package.GeneralPack and not pack:match('^test') then
    for _, g in ipairs(p.generals) do
      if not g.hidden and not g.total_hidden then
        local skills = {}
        for _, s in ipairs(g.skills) do skills[#skills + 1] = s.name end
        for _, sname in ipairs(g.other_skills or Util.DummyTable) do skills[#skills + 1] = sname end
        table.sort(skills)
        out.generals[#out.generals + 1] = {
          name = g.name, title = Fk:translate(g.name), pack = pack,
          extension = p.extensionName or pack, kingdom = g.kingdom,
          hp = g.hp, maxHp = g.maxHp, skills = skills,
        }
        for _, sname in ipairs(skills) do
          wanted[sname] = wanted[sname] or {}
          table.insert(wanted[sname], g.name)
        end
      end
    end
  end
end

local function limitOf(v)
  if v == nil then return nil end
  if type(v) == 'function' then return 'dynamic' end
  return v
end

for name, owners in pairs(wanted) do
  local skel = (Fk.skill_skels or Util.DummyTable)[name]
  if not skel then
    -- A name on a general card that the engine never built. roster.lua hides
    -- the generals whose OWN skills are missing, so anything landing here is a
    -- related-general cross-reference, not a hole in a playable card.
    out.unresolved[#out.unresolved + 1] = { name = name, generals = owners }
  else
    table.sort(owners)
    local rec = {
      name = name,
      title = Fk:translate(name),
      generals = owners,
      pack = skel.package and skel.package.name or nil,
      extension = skel.package and skel.package.extensionName or nil,
      tags = skel.tags or {},
      visible = skel.visible ~= false,
      attachedEquip = skel.attached_equip,
      attachedKingdom = (skel.attached_kingdom and #skel.attached_kingdom > 0)
        and skel.attached_kingdom or nil,
      attachedSkillName = skel.attached_skill_name,
      modeSkill = skel.mode_skill and true or false,
      derivedPiles = skel.derived_piles,
      hasAcquireEffect = skel.on_acquire ~= nil,
      hasLoseEffect = skel.on_lose ~= nil,
      limits = {
        phase = limitOf(skel.max_use_time[Player.HistoryPhase]),
        turn = limitOf(skel.max_use_time[Player.HistoryTurn]),
        round = limitOf(skel.max_use_time[Player.HistoryRound]),
        game = limitOf(skel.max_use_time[Player.HistoryGame]),
        branches = skel.max_branches_use_time ~= nil,
      },
      effects = {},
    }
    for i, e in ipairs(skel.effects) do
      local ev = e.event
      local interaction = nil
      if rawget(e, 'interaction') ~= nil then
        local ok, t = pcall(function() return e.interaction.type end)
        interaction = (ok and type(t) == 'string') and t or 'declared'
      end
      local compulsory = false
      local okc, r = pcall(function() return e:hasTag(Skill.Compulsory) end)
      if okc then compulsory = r and true or false end
      rec.effects[#rec.effects + 1] = {
        index = i,
        name = e.name,
        class = e.class and e.class.name or '?',
        -- A trigger event is a live class, so both the event and the family it
        -- belongs to are read off the object (core/trigger_event.lua:13,
        -- events/hp.lua:157 fk.Damaged = DamageEvent:subclass("fk.Damaged")).
        event = ev and ev.name or nil,
        family = (ev and ev.super) and ev.super.name or nil,
        compulsory = compulsory,
        delay = e.is_delay_effect and true or false,
        global = e.global and true or false,
        priority = (e.class and e.class.name == 'TriggerSkill') and e.priority or nil,
        -- spec.on_cost lands on the instance; the default lives on the class.
        -- A TriggerSkill with neither an override nor Compulsory/delay raises
        -- AskForSkillInvoke on every trigger without writing a single ask
        -- (skill_type/trigger.lua:98).
        costOverridden = rawget(e, 'cost') ~= nil,
        triggerOverridden = rawget(e, 'trigger') ~= nil,
        refreshOverridden = rawget(e, 'refresh') ~= nil,
        interaction = interaction,
        anim = (e.anim_type ~= '' and e.anim_type) or nil,
      }
    end
    out.skills[#out.skills + 1] = rec
  end
end

table.sort(out.generals, function(a, b) return a.name < b.name end)
table.sort(out.skills, function(a, b) return a.name < b.name end)
table.sort(out.unresolved, function(a, b) return a.name < b.name end)
return enc(out)
`;

async function fromVm() {
  // `designer: false`: the catalogue measures the vocabulary this designer
  // offers, so counting generals GENERATED from that vocabulary would make the
  // measurement about itself. See DESIGNER_PACKAGES in build-lua-bundle.mjs.
  const bundle = await buildBundle({ designer: false });
  const vm = await createLuaVm(bundle, { logLevels: new Set(['error']) });
  vm.lua.doStringSync(`dofile('lua/web/client.lua')`);
  if (vm.lua.doStringSync(`return FKClient.boot()`) !== true) throw new Error('FKClient.boot() failed');
  const data = JSON.parse(vm.lua.doStringSync(EXTRACT));
  vm.close();
  return { data, bundle };
}

/* -------------------------------------------------------------- 2. source */

/**
 * Lua with its noise blanked out, byte offsets preserved.
 *
 * Two views of the same file, and both are needed. Structure — where a function
 * ends, where a call site is — must be read with strings blanked, or the word
 * `end` inside a prompt closes a block that is still open and every offset
 * after it is wrong. Literals — the skill's own name, the `"active"` in
 * `addEffect("active", …)`, the `"slash"` in a card-name test — can only be
 * read with strings intact.
 *
 * Blanking rather than deleting keeps the two views aligned character for
 * character, so a span located in one can be sliced out of the other. That
 * alignment is the whole trick: `functionExtent` counts keywords on the
 * string-blanked view and the classifier reads the same span off the
 * comment-only view.
 */
function blankNoise(src, { strings = true } = {}) {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  const blank = (from, to) => {
    for (let k = from; k < to && k < n; k += 1) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < n) {
    const c = src[i];
    // Long bracket, comment or string: --[=[ ... ]=] and [=[ ... ]=]
    const long = /^(--)?\[(=*)\[/.exec(src.slice(i, i + 16));
    if (long && (long[1] || c === '[')) {
      const close = `]${long[2]}]`;
      const end = src.indexOf(close, i + long[0].length);
      const stop = end === -1 ? n : end + close.length;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === '-' && src[i + 1] === '-') {
      let end = src.indexOf('\n', i);
      if (end === -1) end = n;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      let k = i + 1;
      while (k < n && src[k] !== c) {
        if (src[k] === '\\') k += 1;
        if (src[k] === '\n') break;
        k += 1;
      }
      if (strings) blank(i, k + 1);
      i = k + 1;
      continue;
    }
    i += 1;
  }
  return out.join('');
}

/**
 * The extent of the `function ... end` that starts at `from`.
 *
 * Lua block structure is countable without a parser once strings and comments
 * are gone: `function`, `if` and `do` open, `end` closes, and `repeat` closes
 * with `until`. `for` and `while` are deliberately NOT openers — each is always
 * followed by its own `do`, and counting both double-counts every loop.
 */
function functionExtent(clean, from) {
  const KW = /\b(function|if|do|repeat|end|until)\b/g;
  KW.lastIndex = from;
  let depth = 0;
  let m;
  while ((m = KW.exec(clean))) {
    const w = m[1];
    if (w === 'function' || w === 'if' || w === 'do' || w === 'repeat') depth += 1;
    else depth -= 1;
    if (depth === 0) return m.index + w.length;
  }
  return clean.length;
}

/** The spec keys whose bodies carry meaning for the designer. */
const SPEC_KEYS = [
  'can_trigger', 'on_cost', 'on_use', 'on_trigger', 'can_refresh', 'on_refresh',
  'can_wake', 'can_use', 'card_filter', 'target_filter', 'feasible', 'on_effect',
  'mod_target_filter', 'about_to_effect', 'on_nullified', 'on_action', 'view_as',
  'filter_pattern', 'prompt', 'interaction', 'trigger_times', 'times',
  'correct_func', 'fixed_func', 'is_prohibited', 'prohibit_use', 'prohibit_discard',
  'prohibit_response', 'prohibit_pindian', 'residue_func', 'fix_times_func',
  'fix_target_func', 'distance_limit_func', 'extra_target_func', 'bypass_times',
  'bypass_distances', 'invalidity_func', 'card_visible', 'role_visible',
  'move_visible', 'exclude_from', 'before_use', 'after_use', 'fix_targets',
  'enabled_at_play', 'enabled_at_response', 'enabled_at_nullification',
];

/**
 * Split one skill's Lua into its `addEffect` blocks, and each block into the
 * spec functions it declares.
 *
 * Attribution is by the addEffect KEY, not by position: `SkillSkeleton:addEffect`
 * reorders as it inserts — 'active' and 'viewas' carry priority 5 and jump to
 * the front (skill_skeleton.lua:115-151, engine.lua:56) — so the nth block in
 * the file is not the nth entry in `skel.effects`. Keys are matched instead,
 * and blocks sharing a key are zipped in source order, which is the order the
 * engine preserves among equals.
 */
function splitEffects(text) {
  const clean = blankNoise(text);                    // structure
  const lit = blankNoise(text, { strings: false });  // literals, same offsets
  // `:addEffect(` is located on the structural view so a mention in a comment
  // cannot open a block, but the KEY is read off the literal view — `"active"`
  // is blanked in `clean`, which is exactly the string we need.
  const ADD = /:addEffect\s*\(\s*/g;
  const blocks = [];
  let m;
  while ((m = ADD.exec(clean))) {
    const head = lit.slice(m.index, m.index + 64);
    // `fk.X` is the engine's own event; `U.X` / `Utility.X` is one a package
    // defined for itself (packages/utility registers five, e.g. 议事). Both are
    // legal keys, and the alias a file imports under is its own business — so
    // the trailing identifier is what gets kept, and pairing matches on that.
    const key = /:addEffect\s*\(\s*(?:"([a-z]+)"|([A-Za-z_]\w*\.[A-Za-z]\w*))/.exec(head);
    if (!key) continue;
    blocks.push({ key: key[1] ?? key[2], at: m.index, end: clean.length });
  }
  for (let i = 0; i < blocks.length - 1; i += 1) blocks[i].end = blocks[i + 1].at;

  // Everything before the first addEffect (local helpers, upvalue tables) is
  // shared: a helper hoisted out of on_use is still what the skill does.
  const preamble = blocks.length ? lit.slice(0, blocks[0].at) : lit;

  for (const b of blocks) {
    const seg = clean.slice(b.at, b.end);
    b.regions = {};
    for (const key of SPEC_KEYS) {
      const re = new RegExp(`\\b${key}\\s*=\\s*function\\b`, 'g');
      let k;
      while ((k = re.exec(seg))) {
        const start = seg.indexOf('function', k.index);
        const stop = functionExtent(seg, start);
        // Located structurally, sliced literally — the classifier needs the
        // card names and mark names the structural view blanked out.
        (b.regions[key] ??= []).push(lit.slice(b.at + start, b.at + stop));
      }
      // `filter_pattern = { ... }` and `interaction = UI.ComboBox{...}` are
      // values, not functions; record that they exist so a block can say so.
      if (!b.regions[key]) {
        const flat = new RegExp(`\\b${key}\\s*=\\s*[^f\\s]`, 'g');
        if (flat.test(seg)) b.regions[key] = [];
      }
    }
    b.text = lit.slice(b.at, b.end);
  }
  return { blocks, preamble, clean, lit };
}

/** Which of a dictionary's patterns fire in a chunk of Lua, with hit counts. */
function classify(chunk, dict) {
  const hits = {};
  for (const [id, spec] of Object.entries(dict)) {
    let n = 0;
    for (const re of spec.match) {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      n += (chunk.match(g) ?? []).length;
    }
    if (n > 0) hits[id] = n;
  }
  return hits;
}

/**
 * skeleton name -> the Lua that defines it, read out of the bundle.
 *
 * A skill file is `local x = fk.CreateSkill{ name = "..." }` followed by
 * `x:addEffect(...)` chains. A file may hold several skeletons (a general's
 * whole kit in one file), so it is cut at every `fk.CreateSkill` and each span
 * is attributed to the name that constructor declares. Anything above the first
 * constructor is preamble and belongs to whatever follows it.
 */
function skillSources(bundle) {
  const byName = new Map();
  const CREATE = /fk\.Create(Skill|ActiveSkill|TriggerSkill|ViewAsSkill|DistanceSkill|ProhibitSkill|FilterSkill|MaxCardsSkill|AttackRangeSkill|TargetModSkill)\s*[{(]/g;
  for (const [path, raw] of Object.entries(bundle)) {
    if (!path.startsWith('packages/') || !path.endsWith('.lua')) continue;
    const clean = blankNoise(raw);
    const starts = [];
    let m;
    CREATE.lastIndex = 0;
    while ((m = CREATE.exec(clean))) starts.push({ at: m.index, kind: m[1] });
    if (!starts.length) continue;
    for (let i = 0; i < starts.length; i += 1) {
      const from = i === 0 ? 0 : starts[i].at;
      const to = i + 1 < starts.length ? starts[i + 1].at : raw.length;
      // The constructor is located structurally; the name it declares is a
      // string literal, so it has to be read off the raw text.
      const nm = /name\s*=\s*"([^"]+)"/.exec(raw.slice(starts[i].at, to));
      if (!nm) continue;
      const prev = byName.get(nm[1]);
      const span = raw.slice(from, to);
      byName.set(nm[1], {
        path,
        // `fk.CreateSkill` is the skeleton API; anything else is the legacy
        // family the designer must not emit.
        api: starts[i].kind === 'Skill' ? 'skeleton' : 'legacy',
        text: prev ? `${prev.text}\n${span}` : span,
      });
    }
  }
  return byName;
}

/* ------------------------------------------------------------- 3. assemble */

const CLASS_OF_KEY = {
  active: 'ActiveSkill', viewas: 'ViewAsSkill', cardskill: 'CardSkill',
  distance: 'DistanceSkill', prohibit: 'ProhibitSkill', atkrange: 'AttackRangeSkill',
  maxcards: 'MaxCardsSkill', targetmod: 'TargetModSkill', filter: 'FilterSkill',
  invalidity: 'InvaliditySkill', visibility: 'VisibilitySkill',
};

/** The part of an event key that identifies it regardless of import alias. */
const eventLeaf = (s) => s.slice(s.lastIndexOf('.') + 1);

/** Pair each runtime effect with the source block that declared it. */
function pairBlocks(effects, blocks) {
  const pool = new Map();
  for (const b of blocks) {
    const k = b.key.includes('.') ? eventLeaf(b.key) : CLASS_OF_KEY[b.key] ?? b.key;
    (pool.get(k) ?? pool.set(k, []).get(k)).push(b);
  }
  const taken = new Map();
  return effects.map((e) => {
    const k = e.event ? eventLeaf(e.event) : e.class;
    const list = pool.get(k);
    if (!list) return null;
    const i = taken.get(k) ?? 0;
    taken.set(k, i + 1);
    return list[i] ?? null;
  });
}

/**
 * The one parameter every phase trigger needs.
 *
 * `fk.EventPhaseStart` is the most-used trigger in the game by a wide margin
 * and on its own it says nothing — the phase is tested inside `can_trigger`
 * (`player.phase == Player.Play`). A designer block that cannot name the phase
 * is not a block, so the phase is lifted out of the condition and made a
 * parameter of the trigger.
 */
const PHASES = ['RoundStart', 'Start', 'Judge', 'Draw', 'Play', 'Discard', 'Finish', 'NotActive', 'PhaseNone'];
/** The four generic phase events; all of them discriminate on data.phase. */
const PHASE_EVENTS = new Set([
  'fk.EventPhaseStart', 'fk.EventPhaseEnd', 'fk.EventPhaseProceeding', 'fk.EventPhaseChanging',
  'fk.EventPhaseSkipping', 'fk.EventPhaseSkipped',
]);
function phaseParam(chunk) {
  const found = new Set();
  for (const p of PHASES) {
    if (new RegExp(`Player\\.${p}\\b`).test(chunk)) found.add(p);
  }
  return [...found].sort();
}

function main() {
  return fromVm().then(async ({ data, bundle }) => {
    const sources = skillSources(bundle);
    const skills = [];
    const unclassified = [];

    for (const rec of data.skills) {
      const src = sources.get(rec.name);
      if (!src) {
        // A skeleton the engine built but no bundled file declares by that
        // name — an aux effect registered under a computed name, say.
        unclassified.push({ name: rec.name, reason: 'no source span in the bundle' });
      }
      const { blocks, preamble } = src ? splitEffects(src.text) : { blocks: [], preamble: '' };
      const paired = pairBlocks(rec.effects, blocks);

      const effects = rec.effects.map((e, i) => {
        const b = paired[i];
        const regions = b?.regions ?? {};
        const body = (keys) => keys.flatMap((k) => regions[k] ?? []).join('\n');
        // Everything the engine consults to decide whether the skill is
        // available at all. A view-as skill has no `can_trigger` — its gate is
        // `enabled_at_play` plus the card and target filters — so reading only
        // `can_trigger` would report 93 skills as unconditional when they are
        // not.
        const cond = body([
          'can_trigger', 'can_use', 'can_wake', 'can_refresh',
          'enabled_at_play', 'enabled_at_response', 'enabled_at_nullification',
          'card_filter', 'target_filter', 'mod_target_filter', 'feasible',
        ]);
        const cost = body(['on_cost']);
        // `on_trigger` replaces the default that calls doCost, so a skill that
        // writes one is doing its work there; count it with the effect body.
        const use = body(['on_use', 'on_trigger', 'on_effect', 'on_refresh', 'view_as', 'on_action']);
        const whole = b ? b.text : '';
        // A body may be hoisted above the addEffect chain and referenced —
        // 无双 writes `on_use = wushuang_spec.on_use` and both its effects share
        // it. The block then holds a name, not a function, so fall back to the
        // preamble rather than reporting a skill that does nothing.
        const fallback = whole + (use ? '' : `\n${preamble}`);
        // A declarative kind has no body to read: it IS its effect object.
        const declared = DECLARATIVE[e.class];
        const does = classify(use || fallback, EFFECTS);
        if (declared) does[declared.id] = (does[declared.id] ?? 0) + 1;
        return {
          ...e,
          conditions: sortedKeys(classify(cond, CONDITIONS)),
          cost: sortedKeys(classify(cost, EFFECTS)),
          does: sortedKeys(does),
          requests: sortedKeys(classify(whole, REQUESTS)),
          phases: PHASE_EVENTS.has(e.event) ? phaseParam(cond || whole) : undefined,
          sourced: Boolean(b),
        };
      });

      // A skill whose effects the pairing could not reach still has a body; the
      // whole span is better evidence than nothing, and saying so keeps the
      // coverage claim honest.
      // Comments blanked, strings kept: the rollup classifier tests card names
      // and mark names, which only exist as string literals.
      const span = src ? blankNoise(src.text, { strings: false }) : '';
      const allEffects = classify(span, EFFECTS);
      for (const e of rec.effects) {
        const d = DECLARATIVE[e.class];
        if (d) allEffects[d.id] = (allEffects[d.id] ?? 0) + 1;
      }
      for (const t of rec.tags) {
        const d = TAG_EFFECTS[t];
        if (d) allEffects[d.id] = (allEffects[d.id] ?? 0) + 1;
      }
      skills.push({
        ...rec,
        api: src?.api ?? null,
        file: src?.path ?? null,
        kinds: [...new Set(rec.effects.map((e) => e.class))].sort(),
        triggers: [...new Set(rec.effects.map((e) => e.event).filter(Boolean))].sort(),
        families: [...new Set(rec.effects.map((e) => e.family).filter(Boolean))].sort(),
        effects,
        // Skill-wide rollups, taken over the whole span so a helper hoisted
        // above the addEffect chain is still counted.
        // Conditions are rolled up from the guard regions, NOT from the whole
        // span. `fk.ReasonDraw` appears as an ARGUMENT to moveCards far more
        // often than as a test, and scanning the file wholesale reported a
        // third of the roster as checking a move reason when it does not.
        allConditions: [...new Set(effects.flatMap((e) => e.conditions))].sort(),
        allEffects: sortedKeys(allEffects),
        allRequests: sortedKeys(classify(span, REQUESTS)),
      });
    }

    const catalogue = {
      // Content identity, so a stale catalogue is provable rather than assumed.
      bundleSha: createHash('sha256')
        .update(Object.keys(bundle).sort().map((k) => `${k}\0${bundle[k]}`).join('\0'))
        .digest('hex').slice(0, 16),
      scopes: data.scopes,
      counts: {
        generals: data.generals.length,
        skills: skills.length,
        effects: skills.reduce((n, s) => n + s.effects.length, 0),
        unresolved: data.unresolved.length,
        unclassified: unclassified.length,
      },
      generals: data.generals,
      skills,
      // Named on a general card, never built by the engine. Kept so the count
      // is auditable instead of silently dropped.
      unresolved: data.unresolved,
      unclassified: unclassified.sort((a, b) => a.name.localeCompare(b.name)),
    };

    mkdirSync(OUT_DIR, { recursive: true });
    // The catalogue is data for a machine and 1300 records long, so it ships
    // minified the way `overview.json` does — it is behind a dynamic import and
    // has no business on the critical path at any size. The vocabulary is the
    // half a person reads, so that one keeps its indentation.
    writeFileSync(join(OUT_DIR, 'catalogue.generated.json'), `${JSON.stringify(catalogue)}\n`);

    const vocab = buildVocabulary(catalogue);
    writeFileSync(join(OUT_DIR, 'vocabulary.generated.json'), `${JSON.stringify(vocab, null, 2)}\n`);
    return { catalogue, vocab };
  });
}

function sortedKeys(hits) {
  return Object.keys(hits).sort();
}

/* ----------------------------------------------------------- 4. vocabulary */

/**
 * The blocks, aggregated from the catalogue.
 *
 * A block earns its place by how many shipped skills use it, so every entry
 * carries its count and three real examples. `citation` comes from the
 * dictionary — the engine call or type the block compiles down to — so a block
 * cannot promise something the engine has no method for.
 */
export function buildVocabulary(catalogue) {
  const tally = (pick) => {
    const m = new Map();
    for (const s of catalogue.skills) {
      for (const id of new Set(pick(s))) {
        const e = m.get(id) ?? { id, skills: [] };
        e.skills.push(s.name);
        m.set(id, e);
      }
    }
    return m;
  };

  const decorate = (m, dict, extra = () => ({})) => [...m.values()]
    .map((e) => ({
      id: e.id,
      ...(dict[e.id] ? { label: dict[e.id].label, citation: dict[e.id].citation } : {}),
      ...(dict[e.id]?.params ? { params: dict[e.id].params } : {}),
      count: e.skills.length,
      share: Number((e.skills.length / catalogue.skills.length).toFixed(4)),
      examples: e.skills.slice().sort().slice(0, 3),
      ...extra(e),
    }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  // Triggers are counted per skill, and the phase parameter is folded in: a
  // block is "at the start of my Play phase", not "on a phase event".
  const trig = new Map();
  for (const s of catalogue.skills) {
    for (const e of s.effects) {
      if (!e.event) continue;
      const t = trig.get(e.event) ?? { id: e.event, family: e.family, skills: new Set(), phases: {} };
      t.skills.add(s.name);
      for (const p of e.phases ?? []) t.phases[p] = (t.phases[p] ?? 0) + 1;
      trig.set(e.event, t);
    }
  }

  const triggers = [...trig.values()].map((t) => ({
    id: t.id,
    family: t.family,
    group: TRIGGER_FAMILIES[t.family] ?? 'other',
    count: t.skills.size,
    share: Number((t.skills.size / catalogue.skills.length).toFixed(4)),
    ...(Object.keys(t.phases).length
      ? { phaseParam: Object.fromEntries(Object.entries(t.phases).sort((a, b) => b[1] - a[1])) }
      : {}),
    examples: [...t.skills].sort().slice(0, 3),
  })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  // The declarative kinds are documented by class, so their labels have to be
  // re-keyed by effect id before the block list can find them.
  const effectDoc = { ...EFFECTS };
  for (const d of Object.values(DECLARATIVE)) effectDoc[d.id] = d;
  for (const d of Object.values(TAG_EFFECTS)) effectDoc[d.id] = d;

  const conditions = decorate(tally((s) => s.allConditions), CONDITIONS);
  const effects = decorate(tally((s) => s.allEffects), effectDoc);
  const requests = decorate(tally((s) => s.allRequests), REQUESTS);

  // Which effect ids appear in an `on_cost` body rather than an `on_use` one.
  // That is the cost/effect line the designer has to draw, and it is drawn by
  // the engine, not by us: `TriggerSkill:doCost` runs `cost` first and only
  // runs `use` if it returned true (skill_type/trigger.lua:70).
  const costs = new Map();
  for (const s of catalogue.skills) {
    for (const e of s.effects) for (const id of e.cost) {
      const c = costs.get(id) ?? { id, skills: new Set() };
      c.skills.add(s.name);
      costs.set(id, c);
    }
  }

  const kinds = new Map();
  for (const s of catalogue.skills) for (const k of s.kinds) kinds.set(k, (kinds.get(k) ?? 0) + 1);
  const tags = new Map();
  for (const s of catalogue.skills) for (const t of s.tags) tags.set(t, (tags.get(t) ?? 0) + 1);

  const band = (n) => (n >= catalogue.skills.length * 0.05 ? 'common'
    : n >= 5 ? 'occasional' : n > 1 ? 'rare' : 'one-off');

  return {
    bundleSha: catalogue.bundleSha,
    of: { skills: catalogue.skills.length, generals: catalogue.generals.length },
    triggers: triggers.map((t) => ({ ...t, band: band(t.count) })),
    conditions: conditions.map((c) => ({ ...c, band: band(c.count) })),
    effects: effects.map((e) => ({
      ...e,
      band: band(e.count),
      asCost: costs.get(e.id)?.skills.size ?? 0,
    })),
    requests,
    kinds: Object.fromEntries([...kinds.entries()].sort((a, b) => b[1] - a[1])),
    tags: Object.fromEntries([...tags.entries()].sort((a, b) => b[1] - a[1])),
    composition: compositionStats(catalogue),
    coverage: coverageReport(catalogue),
  };
}

/**
 * What the classifier could not name, and why.
 *
 * A coverage number without its residue is a boast. Every skill resolves to a
 * kind and a trigger set because both come from the booted engine, so those
 * cannot be wrong. What can be wrong is the ACTION, which is read out of a
 * body, and the honest thing is to say which bodies said nothing and what shape
 * they had — a refresh-only effect that keeps a mark really does perform no
 * action, and counting it as a gap would make this number unable to reach 100%.
 */
function coverageReport(catalogue) {
  const flat = catalogue.skills.flatMap((s) => s.effects.map((e) => ({ s, e })));
  const silent = flat.filter(({ e }) => e.does.length === 0);
  const reason = ({ e }) => (e.refreshOverridden ? 'refresh-only (keeps a mark, performs no action)'
    : e.costOverridden ? 'cost-only (the whole skill is what it asks for)'
      : 'no call this dictionary names');
  const by = {};
  for (const r of silent) {
    const k = reason(r);
    (by[k] ??= { count: 0, examples: [] }).count += 1;
    if (by[k].examples.length < 3) by[k].examples.push(`${r.s.name} / ${r.e.event ?? r.e.class}`);
  }
  return {
    skillsWithAKind: catalogue.skills.filter((s) => s.kinds.length > 0).length,
    skillsWithATrigger: catalogue.skills.filter((s) => s.triggers.length > 0).length,
    skillsWithAnEffect: catalogue.skills.filter((s) => s.allEffects.length > 0).length,
    skillsWithNoCondition: catalogue.skills.filter((s) => s.allConditions.length === 0).length,
    effectsPairedToSource: flat.filter(({ e }) => e.sourced).length,
    effectsTotal: flat.length,
    effectsWithNoNamedAction: silent.length,
    effectsWithNoNamedActionBy: by,
  };
}

/** How shipped skills are actually assembled — the shape a generator must emit. */
function compositionStats(catalogue) {
  const effectCount = {};
  const triggerCount = {};
  const pairs = new Map();
  let multiTrigger = 0;
  let mixed = 0;
  for (const s of catalogue.skills) {
    effectCount[s.effects.length] = (effectCount[s.effects.length] ?? 0) + 1;
    const t = s.effects.filter((e) => e.event).length;
    triggerCount[t] = (triggerCount[t] ?? 0) + 1;
    if (t > 1) multiTrigger += 1;
    if (s.kinds.length > 1) mixed += 1;
    // Which trigger events co-occur inside one printed skill. A designer that
    // offers "several conditions at once" is offering exactly this.
    const evs = [...new Set(s.effects.map((e) => e.event).filter(Boolean))].sort();
    for (let i = 0; i < evs.length; i += 1) {
      for (let j = i + 1; j < evs.length; j += 1) {
        const k = `${evs[i]} + ${evs[j]}`;
        const p = pairs.get(k) ?? { pair: k, count: 0, examples: [] };
        p.count += 1;
        if (p.examples.length < 3) p.examples.push(s.name);
        pairs.set(k, p);
      }
    }
  }
  return {
    effectsPerSkill: effectCount,
    triggersPerSkill: triggerCount,
    skillsWithSeveralTriggers: multiTrigger,
    skillsMixingKinds: mixed,
    commonTriggerPairs: [...pairs.values()]
      .sort((a, b) => b.count - a.count || a.pair.localeCompare(b.pair)).slice(0, 25),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { catalogue, vocab } = await main();
  console.log(`catalogue: ${catalogue.counts.skills} skills on ${catalogue.counts.generals} generals, `
    + `${catalogue.counts.effects} effects`);
  console.log(`  unresolved ${catalogue.counts.unresolved}, unclassified ${catalogue.counts.unclassified}`);
  console.log(`vocabulary: ${vocab.triggers.length} triggers, ${vocab.conditions.length} conditions, `
    + `${vocab.effects.length} effects`);
}

export { main as buildSkillCatalogue };
