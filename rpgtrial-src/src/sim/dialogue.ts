// Dialogue runtime. Walks a DialogueTree: shows nodes through `ui.dialogue.present`, filters choices by
// condition, rolls skill checks through `world.skillCheck` and shows them with `ui.dialogue.showRoll`,
// applies effect strings through the injected resolver, and emits dialogueStart/Line/End.
// sim layer: no three, no DOM. content-quest agent owns this file.
//
// Conventions honoured here:
//  - `{name}`, `{class}`, `{Class}` (+ ctx.vars()) are substituted in node and choice text.
//  - node.next may be a conditional route: 'a?condition|b' → a if checkCondition(condition) else b.
//  - a choice with `check` rolls; success → successNext ?? next, failure → failNext ?? next.
//  - choice.effect fires on pick (before the roll result is known); node.effect fires when the node shows.
//  - speaker 'narrator' has no actor; 'player' maps to world.playerId; anything else is an actor id.
import { bus, type RollResult } from '../core/events.ts';
import type { DialogueTree, DialogueNode, DialogueChoice, SkillKey } from './types.ts';
import type { WorldAPI, QuestUI, CheckOpts } from './quest.ts';

export interface DialogueContext {
  world: WorldAPI;
  ui: QuestUI;
  resolveEffect(world: WorldAPI, id: string): void;
  checkCondition(world: WorldAPI, id: string): boolean;
  /** Extra `{var}` substitutions. */
  vars?(): Record<string, string>;
  /** Roll options for a choice check (Guidance bonus dice, advantage...). Called once per roll. */
  checkOpts?(skill: SkillKey): CheckOpts;
  /** Called when a node is shown (camera shot hints, stats...). */
  onNode?(node: DialogueNode): void;
  /** Called right after the roll is made (before the dice are shown). */
  onRoll?(roll: RollResult, choice: DialogueChoice): void;
  /** Called when the dice presentation has finished, just before routing to the success/fail node. */
  onRollDone?(roll: RollResult, choice: DialogueChoice): void;
}
export interface DialogueResult {
  id: string; endedAt: string | null; visited: string[]; picks: string[]; rolls: RollResult[]; aborted: boolean;
}
export interface DialogueHandle {
  done: Promise<DialogueResult>;
  abort(): void;
  readonly active: boolean;
  readonly nodeId: string | null;
}

const NPC_SPEAKER = (s: string) => s !== 'narrator' && s !== 'player';

export function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}
export function dialogueVars(world: WorldAPI, extra?: Record<string, string>): Record<string, string> {
  const p = world.player;
  const cls = p?.classId ?? 'adventurer';
  const Cls = cls.charAt(0).toUpperCase() + cls.slice(1);
  return { name: p?.name ?? 'stranger', class: cls, Class: Cls, ...extra };
}

/** Parse 'a?cond|b' routes. Returns the raw id when there is no condition. */
export function routeNext(next: string, check: (cond: string) => boolean): string {
  const m = /^([^?]+)\?(.+)\|([^|]+)$/.exec(next);
  if (!m) return next;
  return check(m[2]) ? m[1] : m[3];
}

export function startDialogue(ctx: DialogueContext, tree: DialogueTree): DialogueHandle {
  const { world, ui } = ctx;
  const result: DialogueResult = { id: tree.id, endedAt: null, visited: [], picks: [], rolls: [], aborted: false };
  let active = true;
  let nodeId: string | null = null;
  let token = 0;
  let finish: (r: DialogueResult) => void = () => {};
  const done = new Promise<DialogueResult>((r) => { finish = r; });

  const safeEffect = (id: string) => { try { ctx.resolveEffect(world, id); } catch (e) { console.error(`[dialogue:${tree.id}] effect '${id}'`, e); } };
  const safeCond = (id: string) => { try { return ctx.checkCondition(world, id); } catch (e) { console.error(`[dialogue:${tree.id}] condition '${id}'`, e); return false; } };
  const vars = () => dialogueVars(world, ctx.vars?.());
  const actorFor = (speaker: string) => (speaker === 'player' ? world.playerId : NPC_SPEAKER(speaker) ? speaker : null);

  // primary NPC speaker: first non-narrator/non-player speaker in the tree
  const primary = Object.values(tree.nodes).map((n) => n.speaker).find(NPC_SPEAKER) ?? 'narrator';

  const end = (aborted: boolean) => {
    if (!active) return;
    active = false; token++;
    result.aborted = aborted; result.endedAt = nodeId;
    try { ui.dialogue.hide(); } catch (e) { console.error('[dialogue] hide', e); }
    try { world.setCinematic(false); } catch (e) { console.error('[dialogue] setCinematic(false)', e); }
    bus.emit('dialogueEnd', { id: tree.id });
    finish(result);
  };

  const route = (next: string | null | undefined) => {
    if (!active) return;
    if (next == null) { end(false); return; }
    const id = routeNext(next, safeCond);
    if (!tree.nodes[id]) { console.warn(`[dialogue:${tree.id}] missing node '${id}'`); end(false); return; }
    show(id);
  };

  const pick = (c: DialogueChoice) => {
    result.picks.push(c.text);
    if (c.check) {
      const opts = ctx.checkOpts?.(c.check.skill) ?? {};
      const roll = world.skillCheck(world.player, c.check.skill, c.check.dc, { label: c.check.label ?? c.check.skill, ...opts });
      result.rolls.push(roll);
      ctx.onRoll?.(roll, c);
      if (c.effect) safeEffect(c.effect);
      const my = ++token;
      ui.dialogue.showRoll(roll, () => {
        if (!active || my !== token) return;
        ctx.onRollDone?.(roll, c);
        route(roll.success ? (c.successNext ?? c.next) : (c.failNext ?? c.next));
      });
      return;
    }
    if (c.effect) safeEffect(c.effect);
    route(c.next);
  };

  const show = (id: string) => {
    const node = tree.nodes[id];
    nodeId = id; result.visited.push(id);
    if (node.effect) safeEffect(node.effect);
    const actor = actorFor(node.speaker);
    if (node.emote && actor && world.actors.has(actor)) {
      try { world.playAnim(actor, node.emote, false, 0.15, 1); } catch (e) { console.error('[dialogue] playAnim', e); }
    }
    const v = vars();
    const text = substituteVars(node.text, v);
    bus.emit('dialogueLine', { speakerId: node.speaker, text, emote: node.emote });
    bus.emit('cinematic', { on: true, shot: node.shot ?? 'ots' });
    ctx.onNode?.(node);
    const visible = (node.choices ?? []).filter((c) => !c.condition || safeCond(c.condition)).map((c) => ({ ...c, text: substituteVars(c.text, v) }));
    const shown: DialogueNode = { ...node, text, choices: visible.length ? visible : undefined };
    const my = ++token;
    const onContinue = () => { if (!active || my !== token) return; route(node.next ?? null); };
    if (!visible.length) { ui.dialogue.present(shown, [], () => {}, onContinue); return; }
    ui.dialogue.present(shown, visible, (i) => {
      if (!active || my !== token) return;
      const c = visible[i]; if (!c) return;
      token++;
      pick(c);
    }, onContinue);
  };

  // --- go ---
  try { world.setCinematic(true); } catch (e) { console.error('[dialogue] setCinematic(true)', e); }
  bus.emit('dialogueStart', { id: tree.id, speakerId: primary });
  if (primary !== 'narrator' && world.actors.has(primary) && world.player) {
    try { world.lookAt(primary, world.playerId); world.lookAt(world.playerId, primary); } catch (e) { console.error('[dialogue] lookAt', e); }
  }
  show(tree.start);

  return {
    done,
    abort: () => end(true),
    get active() { return active; },
    get nodeId() { return nodeId; },
  };
}
