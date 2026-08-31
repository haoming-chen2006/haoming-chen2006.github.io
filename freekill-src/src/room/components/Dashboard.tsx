/**
 * The viewer's own half of the table: skills, hand, and the control row.
 *
 * `Fk/Components/LunarLTK/Dashboard.qml` plus `SkillArea.qml` and `HandcardArea.qml`.
 *
 * Everything clickable here is clickable because the scene said so. `enabled`
 * on a `CardItem` is the only reason a card can be picked; `enabled` on
 * `Button.OK` is the only reason OK is pressable. No predicate in this file
 * looks at a card, a target or a skill and decides anything.
 */
import { memo } from 'react';
import type { ItemData } from '../../contract/scene';
import { useRoom, useRoomState, useScene, usePrompt } from '../RoomContext';
import { CardItem, cls } from './CardItem';
import { InteractionWidget } from './Interaction';

export const Dashboard = memo(function Dashboard() {
  const state = useRoomState();
  const scene = useScene();
  const { lua, mode } = useRoom();
  const prompt = usePrompt();

  const meId = state.selfId;
  const me = meId == null ? undefined : state.players[meId];
  const hand = meId == null ? [] : (state.hands[meId] ?? []);
  const cardItems = scene.items.CardItem ?? {};
  const skillItems = scene.items.SkillButton ?? {};
  const buttons = scene.items.Button ?? {};
  const interaction = scene.items.Interaction?.['1'];
  const specialSkills = scene.items.SpecialSkills?.['1'] as (ItemData & { skills?: string[] }) | undefined;
  const interactive = mode === 'play' && scene.active;

  // Cards the scene created that are not in hand — expanded piles, e.g. yiji's
  // `expand_pile`. They render alongside the hand exactly as the Qt client does.
  const extraCards = Object.keys(cardItems)
    .map(Number)
    .filter((cid) => Number.isFinite(cid) && !hand.includes(cid));

  const clickCard = (cid: number, selected: boolean) => {
    lua.interact('CardItem', cid, 'click', { selected, autoTarget: false });
  };
  const dblCard = (cid: number) => {
    const sel = cardItems[String(cid)]?.selected === true;
    lua.interact('CardItem', cid, 'doubleClick', { selected: !sel, doubleClickUse: true, autoTarget: false });
  };
  const clickSkill = (name: string, selected: boolean) => {
    lua.interact('SkillButton', name, 'click', { selected, autoTarget: false });
  };

  return (
    <div className="fk-dashboard">
      <div className="fk-skills">
        {(me?.skills ?? []).filter(visibleSkill).map((name) => {
          const item = skillItems[name];
          const offered = item !== undefined;
          const enabled = item?.enabled === true;
          const selected = item?.selected === true;
          const data = safeSkill(lua, name);
          return (
            <button
              type="button"
              key={name}
              className={cls(
                'fk-skill',
                data?.freq === 'active' && 'fk-skill--active',
                offered && enabled && interactive && 'fk-skill--enabled',
                offered && !enabled && 'fk-skill--disabled',
                selected && 'fk-skill--selected',
              )}
              disabled={!interactive || !enabled}
              onClick={() => clickSkill(name, !selected)}
              title={name}
            >
              {lua.tr(name)}
              {me?.limitSkills?.[name] != null
                ? <span className="fk-skill__times">{me.limitSkills[name]}</span>
                : null}
            </button>
          );
        })}

      </div>

      <div className="fk-hand">
        {hand.length === 0 && extraCards.length === 0
          ? <span className="fk-hand__empty">{lua.tr('hand_card')} 0</span>
          : null}
        {hand.map((cid) => (
          <CardItem
            key={cid}
            cid={cid}
            known
            item={interactive ? cardItems[String(cid)] : undefined}
            onClick={clickCard}
            onDoubleClick={dblCard}
          />
        ))}
        {extraCards.map((cid) => (
          <CardItem
            key={`x${cid}`}
            cid={cid}
            known
            item={interactive ? cardItems[String(cid)] : undefined}
            onClick={clickCard}
            onDoubleClick={dblCard}
            title={lua.tr('Pile')}
          />
        ))}
      </div>

      <div className="fk-controls">
        <div className="fk-prompt">{scene.prompt ? prompt(scene.prompt) : ''}</div>

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

        <div className="fk-buttons">
          <ControlButton id="OK" label="OK" item={buttons.OK} primary interactive={interactive} />
          <ControlButton id="Cancel" label="Cancel" item={buttons.Cancel} interactive={interactive} />
          <ControlButton id="End" label="End" item={buttons.End} interactive={interactive} />
        </div>
      </div>
    </div>
  );
});

function ControlButton(
  { id, label, item, primary, interactive }:
  { id: string; label: string; item?: ItemData; primary?: boolean; interactive: boolean },
) {
  const { lua } = useRoom();
  if (!item) return null;
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

/** `GetMySkills` hides these; the notify stream does not. Same filter as
 *  `client_util.lua:398` — attached-equip skills and `&`-suffixed helpers. */
function visibleSkill(name: string): boolean {
  return !name.startsWith('#') && !name.startsWith('~') && !name.includes('__') && !name.endsWith('&');
}

function safeSkill(lua: { getSkillData: (n: string) => unknown }, name: string) {
  try { return lua.getSkillData(name) as { freq?: string } | undefined; } catch { return undefined; }
}
