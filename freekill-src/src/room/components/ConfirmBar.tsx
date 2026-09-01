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
import { memo } from 'react';
import type { ItemData } from '../../contract/scene';
import { fillArgs } from '../ltk/prompt';
import { useRoom, useRoomState, useScene, usePrompt } from '../RoomContext';
import { cls } from './CardItem';
import { InteractionWidget } from './Interaction';

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

  const asking = interactive && (promptText !== '' || buttons.OK?.enabled === true);

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

      <div className="fk-confirm__row">
        {specialSkills?.skills?.length ? (
          <div className="fk-interaction">
            {specialSkills.skills.map((s, i) => (
              <button
                type="button"
                key={s}
                className={cls('fk-chip', i === 0 && 'fk-chip--on')}
                onClick={() => lua.interact('SpecialSkills', '1', 'click', s)}
              >{lua.tr(s)}</button>
            ))}
          </div>
        ) : null}

        {interaction ? <InteractionWidget item={interaction} /> : null}

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
