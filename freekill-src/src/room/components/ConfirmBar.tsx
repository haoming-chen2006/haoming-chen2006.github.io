/**
 * The question you are being asked, over the cards you answer it with.
 *
 * This used to be a panel down the right-hand side of the dashboard, beside the
 * hand. That put "是否为目标为 甄姬 的【南蛮入侵】使用【无懈可击】？" and its 取消
 * button at the far edge of the screen while the cards the question is about sat
 * in the middle, so reading the prompt and acting on it meant crossing the table
 * twice.
 *
 * The Qt client does not do that, and it is worth being precise about what it
 * does instead, because this is a port of it. `Room.qml:362` declares
 *
 *     Item { id: controls
 *       anchors.bottom: dashboard.top
 *       anchors.bottomMargin: -60
 *       width: roomScene.width
 *
 * — a full-width strip anchored to the seam between the table and the
 * dashboard, pulled 60 px down into it. The prompt (`Room.qml:368`) is centred
 * text with no background, outlined so it stays legible over the table; the
 * timer bar sits under it at 60% of the room's width; and `okCancel`
 * (`Room.qml:477`) is a centred row on the strip's bottom edge, with the skill
 * interaction loader anchored immediately to its left (`Room.qml:469`).
 *
 * So: one horizontal band, centred, on the seam, in the reading path between
 * the table you are looking at and the hand you are about to play from.
 */
import { memo, useMemo, useState } from 'react';
import type { ItemData } from '../../contract/scene';
import { describe, fillArgs } from '../ltk/prompt';
import { useRoom, useRoomState, useScene, usePrompt } from '../RoomContext';
import { cls } from './CardItem';
import { Detail } from './Detail';
import { InteractionWidget } from './Interaction';

/** Which special use a player has pressed, and for which offer. */
export type SpecialPick = { readonly key: string; readonly skill: string } | null;

/**
 * The lit chip: the player's own pick while it still belongs to this offer,
 * and otherwise the first entry — which is `_normal_use` whenever the card can
 * also be used normally (`play_card.lua:192`).
 *
 * Keyed by the offered list rather than by a counter, because that is what
 * makes a fresh offer re-default: the engine replaces `skills` wholesale on
 * every card selection (`play_card.lua:198`) and clears it on deselection, and
 * a QML Repeater rebuilds its RadioButtons with `checked: index === 0` each
 * time. A stale pick from the previous card must not survive into the next.
 */
export function specialUseOn(skills: readonly string[], pick: SpecialPick): string | undefined {
  if (pick && pick.key === skills.join('|') && skills.includes(pick.skill)) return pick.skill;
  return skills[0];
}

export const ConfirmBar = memo(function ConfirmBar() {
  const state = useRoomState();
  const scene = useScene();
  const { lua, mode } = useRoom();
  const prompt = usePrompt();

  const buttons = scene.items.Button ?? {};
  const interaction = scene.items.Interaction?.['1'];
  const specialSkills = scene.items.SpecialSkills?.['1'] as (ItemData & { skills?: string[] }) | undefined;
  const interactive = mode === 'play' && scene.active;

  // `#AskForSkillInvoke` / `#AskForUseCard` / `#AskForResponseCard` when the
  // scene sent no prompt of its own — see `PendingRequest.promptArg`.
  const req = state.request;
  const promptText = scene.prompt
    ? prompt(scene.prompt)
    : req.kind === 'scene' && req.promptArg
      ? fillArgs(lua.tr(`#${req.command}`), lua.tr(req.promptArg))
      : '';

  /**
   * WHAT THE SKILL ACTUALLY DOES, on the panel that asks you to fire it.
   *
   * `#AskForSkillInvoke` is "你想发动〖%1〗吗？" — "do you want to use 〖X〗?" —
   * and `%1` is a two-character literary allusion. 洛神, 苦肉, 反间: the name
   * tells a player who already knows the general which button to press and
   * tells everyone else nothing whatsoever. Upstream stops there
   * (`RoomLogic.js:829`), and the panel survey's verdict on this request was
   * "Correct, but says nothing about what the skill will do."
   *
   * The text exists and is one lookup away: `:<skill>` is the paragraph the
   * general's own card prints, which is where a player would go to read it if
   * the question were not blocking the table. So it goes under the question.
   *
   * ONLY FOR A SKILL. `promptArg` also carries a card name for
   * `AskForUseCard` / `AskForResponseCard`, and "play a Jink" does not want the
   * rules text for 闪 under it every time somebody is Slashed — that is the one
   * prompt in the game every player has already read.
   */
  const skillDetail = req.kind === 'scene' && req.command === 'AskForSkillInvoke' && req.promptArg
    ? describe(lua, req.promptArg)
    : '';

  const asking = interactive && (promptText !== '' || buttons.OK?.enabled === true);

  /**
   * WHICH SPECIAL USE IS CHOSEN — a state the engine does not echo back.
   *
   * `SpecialSkills:toData` sends `skills` and nothing else
   * (`lua/ui_emu/specialskills.lua:16`); upstream renders the list as a
   * `RadioButton` group whose `checked: index === 0` is a *default*, and the
   * group moves the check when a player presses one (`Room.qml:453-466`).
   *
   * This was `i === 0`, which is the default without the group: a player who
   * pressed 重铸 saw 正常使用 still lit while the engine had in fact switched
   * (`ReqPlayCard:update` -> `selectSpecialUse`, `play_card.lua:220`). The UI
   * contradicting the engine is worse than no UI, so the pick is remembered
   * here — keyed by the offered list, so a new selection re-defaults to index 0
   * exactly as a rebuilt Repeater does.
   */
  const skills = specialSkills?.skills ?? [];
  const skillKey = skills.join('|');
  const [pick, setPick] = useState<SpecialPick>(null);
  const activeSpecial = specialUseOn(skills, pick);

  /**
   * 反选 — `Room.qml:244-249`.
   *
   * Enabled exactly while a view-as or active skill is mid-selection, which is
   * what `GetPendingSkill` answers (`client_util.lua:1116`: the request's skill
   * name while no card has been settled on). Pressing it runs
   * `RevertSelection` in the client VM, which unselects every pending card and
   * selects every other card the scene will take — the inversion is the
   * engine's, card by card, and there is no version of it on this side.
   *
   * Asked once per scene change, like everything else the scene drives: the
   * store replaces `scene` wholesale on `UpdateRequestUI`, so this memo does
   * not run on the 5 Hz status poll.
   */
  const pendingSkill = useMemo(() => {
    if (!interactive || !scene.active) return '';
    try { return lua.getPendingSkill(); } catch { return ''; }
  }, [scene, lua, interactive]);

  return (
    /*
     * `fk-controls` is not decoration and must not be dropped.
     *
     * `scripts/audit/probe.mjs` enumerates everything the table is offering
     * through `.fk-controls .fk-buttons .fk-btn` and `.fk-controls
     * .fk-interaction` — that list is both the render-fidelity check and the
     * set of things the audit driver knows how to press. When this component
     * was split out of the dashboard and the wrapper was renamed, the audit
     * stopped being able to see OK and Cancel at all: it never answered a
     * request, and every game stalled in round one looking exactly like a
     * table whose seats had stopped responding to clicks.
     *
     * The class stays as the selector contract with the harness.
     */
    <div className={cls('fk-confirm', 'fk-controls', asking && 'fk-confirm--asking')}>
      {/* The strip keeps its height whether or not there is a question in it.
          Letting it collapse moved the entire hand up and down as requests
          opened and closed, which is a table that flinches under the cursor. */}
      {/* `fk-prompt` is kept alongside the BEM name because `scripts/audit/probe.mjs`
          reads `.fk-prompt` into every snapshot — it is how a finding quotes the
          question that was on screen when something went wrong. */}
      <div className="fk-confirm__prompt fk-prompt">{promptText}</div>
      {/* Between the question and the buttons, because that is the order it is
          read in: what am I being asked, what does saying yes do, yes / no. */}
      {skillDetail ? <Detail text={skillDetail} /> : null}

      <div className="fk-confirm__row">
        {skills.length ? (
          <div className="fk-interaction">
            {skills.map((s) => (
              <button
                type="button"
                key={s}
                className={cls('fk-chip', s === activeSpecial && 'fk-chip--on')}
                onClick={() => {
                  setPick({ key: skillKey, skill: s });
                  lua.interact('SpecialSkills', '1', 'click', s);
                }}
              >{lua.tr(s)}</button>
            ))}
          </div>
        ) : null}

        {interaction ? <InteractionWidget item={interaction} /> : null}

        {/* Its own wrapper, deliberately outside `.fk-buttons`: the audit probe
            identifies OK / Cancel / End inside that box by position when the VM
            is too busy to translate their labels (`scripts/audit/probe.mjs:807`),
            and a fourth button in the row would shift that reading. */}
        {pendingSkill ? (
          <div className="fk-confirm__aux">
            <button
              type="button"
              className="fk-btn"
              title={lua.tr(pendingSkill)}
              onClick={() => lua.revertSelection()}
            >{lua.tr('Revert Selection')}</button>
          </div>
        ) : null}

        {/* `Room.qml:487-519`: OK and Cancel stand there for as long as the
            request does, lit or not, so the player can see that a confirmation
            step exists before they have earned it. End appears only while the
            engine says it may be pressed. An absent item is a button the scene
            never had cause to mention — which means "not available", not "not
            there": before this, OK popped into existence the instant it lit up
            and the control row jumped under the cursor. */}
        <div className="fk-buttons">
          <ControlButton id="OK" label="OK" item={buttons.OK ?? { id: 'OK' }} shown={interactive} primary interactive={interactive} />
          <ControlButton id="Cancel" label="Cancel" item={buttons.Cancel ?? { id: 'Cancel' }} shown={interactive} interactive={interactive} />
          <ControlButton id="End" label="End" item={buttons.End ?? { id: 'End' }} shown={interactive && buttons.End?.enabled === true} interactive={interactive} />
        </div>
      </div>
    </div>
  );
});

function ControlButton(
  { id, label, item, shown, primary, interactive }:
  { id: string; label: string; item: ItemData; shown: boolean; primary?: boolean; interactive: boolean },
) {
  const { lua } = useRoom();
  if (!shown) return null;
  const enabled = item.enabled === true && interactive;
  return (
    <button
      type="button"
      className={cls('fk-btn', primary && 'fk-btn--primary')}
      disabled={!enabled}
      onClick={() => lua.interact('Button', id, 'click')}
    >{lua.tr(label)}</button>
  );
}
