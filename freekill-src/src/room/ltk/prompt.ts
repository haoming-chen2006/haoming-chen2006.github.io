/**
 * Prompt and player-name formatting.
 *
 * A port of `processPrompt` / `getPlayerStr` in `Fk/Pages/LunarLTK/RoomLogic.js`
 * (lines 596-635). Pure presentation: it splits an i18n key on `:` and
 * substitutes `%src` / `%dest` / `%argN`. No game state is decided here — the
 * key itself arrives from the engine, already carrying its arguments.
 */
import { getLanguage, seatLabel } from '../../i18n';
import type { LtkLua } from './LtkLua';

export interface PlayerNaming {
  /** Seat number shown when a general is still face-down (`anjiang`). */
  seatNumber(pid: number): number;
  general(pid: number): string;
  deputyGeneral(pid: number): string;
  selfId(): number | null;
}

/**
 * The seat marker on a portrait. Chinese spells it out (一号位 -> 一); English
 * counts. `seatLabel` in `src/i18n` owns both, so there is one place that knows
 * how a seat is written; this stays exported because it is the room's name for
 * the idea and callers should not have to thread a language through.
 */
export function seatChar(seat: number): string {
  return seatLabel(seat, getLanguage());
}

/** `RoomLogic.js:596`. */
export function playerStr(lua: LtkLua, naming: PlayerNaming, pid: number): string {
  const general = naming.general(pid);
  const deputy = naming.deputyGeneral(pid);
  const isSelf = pid === naming.selfId();

  if (general === 'anjiang' && (deputy === 'anjiang' || !deputy)) {
    let ret = lua.tr(`seat#${naming.seatNumber(pid)}`);
    if (isSelf) ret += lua.tr('playerstr_self');
    return lua.tr(ret);
  }

  let ret = lua.tr(general);
  if (deputy) ret += `/${lua.tr(deputy)}`;
  if (isSelf) ret += lua.tr('playerstr_self');
  return ret;
}

/**
 * `RoomLogic.js:617`. Prompt keys look like
 * `#slash-jink:5`, `#AskForNullification::4:ex_nihilo`, `#fire_attack-show:8`.
 * Field 0 is the key, 1 is `%src`, 2 is `%dest`, 3+ are `%arg`, `%arg2`, …
 */
export function processPrompt(lua: LtkLua, naming: PlayerNaming, prompt: string): string {
  if (!prompt) return '';
  const parts = prompt.split(':');
  let raw = lua.tr(parts[0]);

  const src = Number.parseInt(parts[1] ?? '', 10);
  const dest = Number.parseInt(parts[2] ?? '', 10);
  if (raw.includes('%src') && Number.isFinite(src)) {
    raw = raw.replaceAll('%src', playerStr(lua, naming, src));
  }
  if (raw.includes('%dest') && Number.isFinite(dest)) {
    raw = raw.replaceAll('%dest', playerStr(lua, naming, dest));
  }

  if (parts.length > 3) {
    for (let i = parts.length - 1; i > 3; i--) {
      raw = raw.replaceAll(`%arg${i - 2}`, lua.tr(parts[i]));
    }
    raw = raw.replaceAll('%arg', lua.tr(parts[3]));
  }
  return raw;
}

/**
 * `Lua.tr(x).arg(y)` in QML fills the first `%1`. Several prompts (`#AskForUseCard`,
 * `#AskForSkillInvoke`) are built that way rather than through `processPrompt`.
 */
export function fillArgs(template: string, ...args: readonly string[]): string {
  let out = template;
  args.forEach((a, i) => { out = out.replaceAll(`%${i + 1}`, a); });
  return out;
}

/**
 * What a skill, card or choice actually DOES — the engine's `:<name>` entry.
 *
 * This is the same text a general's card prints: `GetGeneralDetail` builds its
 * skill list out of `Fk:getDescription`, which is `Fk:translate(":" .. name)`,
 * and `DetailedChoiceBox.qml:61` looks up exactly `":" + modelData` to put a
 * paragraph under each option. So it is the engine's own prose, not ours.
 *
 * TWO THINGS IT HAS TO GET RIGHT.
 *
 * The key. An option can carry `processPrompt` arguments — `zhiheng:::2` — and
 * `:zhiheng:::2` is a key nobody defined. The description belongs to the head
 * of the string, which is the i18n key itself, so that is what is looked up.
 *
 * The miss. `Fk:translate` answers an unknown key with the key, so a naive call
 * would put a literal `:mobile__lvfan` on screen — the exact leak this lane
 * exists to close. An absent description comes back as `''` and the caller
 * draws nothing, because a panel that says nothing is honest and a panel that
 * shows an identifier is not.
 */
export function describe(lua: Pick<LtkLua, 'tr'>, name: string): string {
  if (!name) return '';
  const key = `:${name.split(':')[0]}`;
  const value = lua.tr(key);
  return !value || value === key ? '' : value;
}
