/**
 * Skill invocations and the things that happen to a seat, drawn.
 *
 * `AnimBus` reads the notify stream and calls in here. This module owns two
 * things and nothing else: the nine `skill_type` categories, and the
 * general-level events — damage, an hp cost, a recovery, a max-hp change, a
 * death, a turn opening, cards drawn, equipment landing, a delayed trick
 * settling, a judgement resolving. The card lane owns `Emotion` on cards.
 *
 * NO RULES LIVE HERE EITHER. Every method below is the answer to something the
 * engine said had happened, and the four things it remembers — a seat's
 * kingdom, its role, the element of the last damage that landed on it, and who
 * the engine last drew an indicator line at — are all values the engine
 * broadcast, kept so that a later message can be drawn in the light of an
 * earlier one. Nothing decides whether anything should have happened.
 *
 * WHAT IS NOT HERE, AND WHY. The brief asked for 锁定技 to read differently
 * from an optional skill. It cannot, honestly: `InvokeSkill` carries `name`,
 * `player` and `skill_type` and nothing else, and `GetSkillData` — the client
 * VM's own description of a skill — reports `active`/`notactive`, `limit`,
 * `wake`, `quest` and the switch-skill name, but not `Skill.Compulsory`
 * (`lua/client/client_util.lua:420`). The Qt client cannot distinguish
 * a locked skill on invocation either. The only signal that exists is the
 * prefix of the translated *description* — "锁定技，" in zh_CN, "(forced)" in
 * en_US, "Tỏa định kỹ," in vi_VN — and reading game meaning out of translated
 * prose is exactly the kind of thing this lane exists not to do. The fix is one
 * field on the wire, not a heuristic here.
 */
import { beatMs } from './budget';
import { Sky } from './paint';
import {
  markOf, toCategory, toElement, toKingdom, toRole, toWeight,
  type Element, type Kingdom, type Role,
} from './palette';
import {
  drainBurst, drawBurst, equipBurst, hexBurst, mendBurst, openBurst,
  skillBurst, slayBurst, strikeBurst, ultBurst, verdictBurst, vigourBurst,
} from './plan';
import './spectacle.css';

/**
 * How long a masochism skill may claim the element of the damage that provoked
 * it. 反馈 answering a fire 杀 fires on the beat after the damage; six seconds
 * is several beats at the default pace and still short enough that an unrelated
 * masochism skill later in the turn falls back to its own colour.
 */
const ELEMENT_MEMORY_MS = 6000;

/**
 * How long the engine's last indicator line at a seat may aim the blade that
 * kills it.
 *
 * `Animate{type="Indicate"}` is the engine drawing a line from an actor to its
 * targets — every card use sends one (`events/usecard.lua:79`), as does every
 * skill with targets. When a seat falls within a beat or two of having a line
 * drawn at it, the blade comes in along that line. It is the engine's own
 * statement about who was acting on whom, used for nothing but an angle: no
 * text claims a kill, and if the memory is stale the blade takes the role's
 * default angle instead and nothing looks wrong.
 */
const LINE_MEMORY_MS = 2500;

/**
 * How long after a `Damage` an hp drop on the same seat is that damage rather
 * than a separate cost. The engine sends both inside one beat.
 */
const DAMAGE_ECHO_MS = 400;

export class Spectacle {
  private readonly sky = new Sky();

  /** `Fk:translate`, handed in by `AnimBus`. Skill names and role names are
   *  engine strings and are shown in whatever language the room is set to. */
  constructor(private readonly tr: (s: string) => string) {}

  /** Last kingdom broadcast per seat. `PropertyUpdate[id, "kingdom", value]`. */
  private readonly kingdoms = new Map<number, Kingdom>();
  /** Last damage element per seat, and when. See `ELEMENT_MEMORY_MS`. */
  private readonly hurt = new Map<number, { element: Element; at: number }>();
  /** Last role broadcast per seat. `PropertyUpdate[id, "role", value]`. */
  private readonly roles = new Map<number, Role>();
  /** Who the engine last drew a line at, per seat. See `LINE_MEMORY_MS`. */
  private readonly aimed = new Map<number, { from: number; at: number }>();

  /* ------------------------------------------------------------- knowledge */

  /**
   * A seat's kingdom.
   *
   * Broadcast at the top of the game (`gamelogic.lua:172`), again when a 变更
   * skill moves a player between kingdoms (`events/misc.lua:100`), and again as
   * `wild` when a 野心家 is revealed (`serverplayer.lua:583`). One property,
   * every case; watching it is both the simplest way to know and the only one.
   */
  setKingdom(pid: number, raw: unknown): void {
    this.kingdoms.set(pid, toKingdom(raw));
  }

  /**
   * A seat's role — `PropertyUpdate[id, "role", value]`, broadcast to every
   * client at the top of the game (`gamelogic.lua:79`).
   *
   * Kept, not shown. The only thing that ever draws it is `slay`, and by then
   * `Photo` is already printing the same role across the same portrait because
   * `dead` has arrived — see the note on `ROLES` in `palette.ts`.
   */
  setRole(pid: number, raw: unknown): void {
    this.roles.set(pid, toRole(raw));
  }

  /**
   * `Animate{type="Indicate"}` — the engine drawing a line from an actor to its
   * targets. `Indicators.tsx` draws the line itself off store state; this only
   * remembers who it pointed at, so that a seat falling moments later can be
   * cut from the right direction.
   */
  line(from: unknown, targets: readonly unknown[]): void {
    const source = Number(from);
    if (!Number.isFinite(source)) return;
    const at = Date.now();
    for (const raw of targets) {
      const to = Number(raw);
      if (Number.isFinite(to) && to !== source) this.aimed.set(to, { from: source, at });
    }
  }

  /* ---------------------------------------------------------------- skills */

  /** `Animate{type="InvokeSkill"}` — the nine categories. */
  skill(pid: number, host: HTMLElement, skillType: unknown, name: unknown): void {
    const ms = beatMs('skill');
    if (ms <= 0) return;
    const category = toCategory(skillType);
    const kingdom = this.kingdomOf(pid);
    this.sky.play(skillBurst({
      category,
      label: this.tr(String(name ?? '')),
      kingdom,
      mark: markOf(kingdom, this.tr),
      element: category === 'masochism' ? this.elementOf(pid) : undefined,
      ms,
    }), host);
  }

  /**
   * `Animate{type="InvokeUltSkill"}` — a limited skill's once-per-game.
   *
   * The engine stops the room for two seconds straight afterwards
   * (`room.lua:609`), which is what makes a full-screen answer affordable here
   * and nowhere else.
   */
  ult(pid: number, host: HTMLElement, name: unknown): void {
    const ms = beatMs('ult');
    if (ms <= 0) return;
    const kingdom = this.kingdomOf(pid);
    this.sky.play(ultBurst({
      label: this.tr(String(name ?? '')),
      kingdom,
      mark: markOf(kingdom, this.tr),
      ms,
    }), host);
  }

  /* --------------------------------------------------------------- the hit */

  /**
   * `LogEvent{type="Damage"}` — `{to, damageType, damageNum}`.
   *
   * The impact belongs to the card lane, which authors it per element. This
   * adds the two things that are not seat-sized: the number, and — at two
   * points or more — the table reeling.
   */
  damage(pid: number, host: HTMLElement, damageType: unknown, damageNum: unknown): void {
    const element = toElement(damageType);
    // Remembered whether or not anything is drawn. A masochism skill answering
    // this damage wants its element, and the hp watcher wants to know the drop
    // it is about to see was already explained — see `drain`.
    this.hurt.set(pid, { element, at: Date.now() });
    const ms = beatMs('strike');
    if (ms <= 0) return;
    const weight = toWeight(damageNum);
    this.sky.play(strikeBurst({ element, weight, ms }), host);
    // Rare enough to stay an event. `.fk-seats` and not `.fk-room`: the
    // dashboard and the confirm strip stay still, so a shake can never move a
    // control out from under a click that is already travelling.
    if (weight >= 2) {
      const seats = host.closest<HTMLElement>('.fk-seats');
      if (seats) this.sky.accent(seats, `quake${weight}`, ms);
    }
  }

  /**
   * An hp drop the engine did not report as damage: a skill cost, or 失去体力.
   *
   * Every damage is also an hp drop, so this has to know when it is being told
   * about something that has already been drawn. `LogEvent{Damage}` arrives on
   * the same beat as the `PropertyUpdate` it causes, so a drop within a beat of
   * a recorded hit on this seat is that hit and draws nothing.
   */
  drain(pid: number, host: HTMLElement): void {
    const ms = beatMs('accent');
    if (ms <= 0) return;
    const hit = this.hurt.get(pid);
    if (hit && Date.now() - hit.at <= DAMAGE_ECHO_MS) return;
    this.sky.play(drainBurst(ms), host);
  }

  /** An hp rise. There is no `LogEvent` for a recovery — see `AnimBus`. */
  mend(host: HTMLElement): void {
    const ms = beatMs('accent');
    if (ms > 0) this.sky.play(mendBurst(ms), host);
  }

  /** `LogEvent{type="ChangeMaxHp"}` — `{player, num}`. */
  maxHp(host: HTMLElement, num: unknown): void {
    const n = Number(num);
    if (!Number.isFinite(n) || n === 0) return;
    const ms = beatMs('strike');
    if (ms > 0) this.sky.play(vigourBurst(n, ms), host);
  }

  /**
   * `LogEvent{type="Death"}` — `{to}`. The centrepiece.
   *
   * `seatOf` resolves another seat's portrait, so the blade can come in along
   * the last line the engine drew at this one. It is handed in rather than
   * looked up here: this module never touches the store or the stage registry.
   */
  slay(
    pid: number,
    host: HTMLElement,
    seatOf: (id: number) => HTMLElement | undefined,
  ): void {
    const ms = beatMs('slay');
    if (ms <= 0) return;
    const role = this.roles.get(pid) ?? 'unknown';
    const kingdom = this.kingdomOf(pid);
    this.sky.play(slayBurst({
      role,
      label: this.tr(role),
      kingdom,
      mark: markOf(kingdom, this.tr),
      cut: this.cutAngle(pid, host, seatOf),
      ms,
    }), host);
    // The whole table reels. `.fk-seats` and not `.fk-room`: the dashboard and
    // the confirm strip stay still, so a kill can never move a control out from
    // under a click that is already travelling.
    const seats = host.closest<HTMLElement>('.fk-seats');
    if (seats) this.sky.accent(seats, 'quake3', Math.round(ms * 0.4));
  }

  /* ------------------------------------------------------------- the table */

  /** `PropertyUpdate[id, "phase", 2]` — `Phase.Start`, once per turn. */
  open(pid: number, host: HTMLElement): void {
    const ms = beatMs('accent');
    if (ms <= 0) return;
    const kingdom = this.kingdomOf(pid);
    this.sky.play(openBurst(kingdom, markOf(kingdom, this.tr), ms), host);
  }

  /** `MoveCards` into a hand. */
  draw(host: HTMLElement, count: number): void {
    const ms = beatMs('accent');
    if (ms > 0) this.sky.play(drawBurst(count, ms), host);
  }

  /** `MoveCards` into an equip slot. */
  equip(host: HTMLElement): void {
    const ms = beatMs('accent');
    if (ms > 0) this.sky.play(equipBurst(ms), host);
  }

  /** `MoveCards` into a judge zone — a delayed trick attaching. */
  hex(host: HTMLElement): void {
    const ms = beatMs('accent');
    if (ms > 0) this.sky.play(hexBurst(ms), host);
  }

  /**
   * `Animate{type="Emotion", is_card=true}` with `judgegood` / `judgebad`.
   *
   * Drawn over the processing area rather than a seat, because that is what the
   * engine named: `setCardEmotion` addresses a card id, and the card is on the
   * table. Which player is being judged is not on the wire at this point — the
   * `#JudgeResult` log line carries it but arrives already rendered to a
   * string — so the verdict goes where the card is, which is where everyone is
   * already looking.
   */
  verdict(good: boolean): void {
    const ms = beatMs('verdict');
    if (ms > 0) this.sky.play(verdictBurst(good, ms));
  }

  /* ------------------------------------------------------------- lifecycle */

  dispose(): void {
    this.sky.dispose();
    this.kingdoms.clear();
    this.hurt.clear();
    this.roles.clear();
    this.aimed.clear();
  }

  /**
   * The angle the blade comes in at, from the last line the engine drew at this
   * seat. `undefined` when there was none recently, which leaves the role's own
   * angle in place.
   *
   * Screen coordinates: `atan2` of the two seat centres, in degrees, which is
   * exactly what a CSS `rotate()` wants.
   */
  private cutAngle(
    pid: number,
    host: HTMLElement,
    seatOf: (id: number) => HTMLElement | undefined,
  ): number | undefined {
    const hit = this.aimed.get(pid);
    if (!hit || Date.now() - hit.at > LINE_MEMORY_MS) return undefined;
    const killer = seatOf(hit.from);
    if (!killer || !killer.isConnected || !host.isConnected) return undefined;
    const a = killer.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    if (!a.width || !b.width) return undefined;
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return undefined;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  private kingdomOf(pid: number): Kingdom {
    return this.kingdoms.get(pid) ?? 'unknown';
  }

  private elementOf(pid: number): Element | undefined {
    const hit = this.hurt.get(pid);
    if (!hit) return undefined;
    return Date.now() - hit.at <= ELEMENT_MEMORY_MS ? hit.element : undefined;
  }
}
