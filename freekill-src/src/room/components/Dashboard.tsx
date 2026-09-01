/**
 * The viewer's own half of the table: their skills and their hand.
 *
 * `Fk/Components/LunarLTK/Dashboard.qml` plus `SkillArea.qml` and `HandcardArea.qml`.
 *
 * The prompt and the OK/Cancel row used to live here as a third column down the
 * right-hand edge. They are now a full-width strip directly above the hand —
 * see `ConfirmBar.tsx`, which is where the Qt client puts them too.
 *
 * Everything clickable here is clickable because the scene said so. `enabled`
 * on a `CardItem` is the only reason a card can be picked; `enabled` on
 * `Button.OK` is the only reason OK is pressable. No predicate in this file
 * looks at a card, a target or a skill and decides anything.
 */
import { memo } from 'react';
import { useRoom, useRoomState, useScene } from '../RoomContext';
import { CardItem, cls } from './CardItem';

export const Dashboard = memo(function Dashboard() {
  const state = useRoomState();
  const scene = useScene();
  const { lua, mode } = useRoom();

  const meId = state.selfId;
  const me = meId == null ? undefined : state.players[meId];
  const hand = meId == null ? [] : (state.hands[meId] ?? []);
  const cardItems = scene.items.CardItem ?? {};
  const skillItems = scene.items.SkillButton ?? {};
  const interactive = mode === 'play' && scene.active;

  /**
   * The expanded piles the request opened — yiji's `expand_pile`, an equipment
   * a view-as skill may use as a subcard, a `&` pile.
   *
   * These are the cards the scene CREATED (`Dashboard.qml:164`), not "every
   * card item that is not in my hand". The difference is the whole bug: the
   * scene's `CardItem` set is a snapshot of the hand taken when the request
   * opened, so the moment a card leaves the hand — the moment you play it —
   * the subtraction started rendering it back beside the hand, and left it
   * there for the rest of the turn.
   */
  const pileCards = (scene.created.CardItem ?? [])
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
        {skillsOf(lua, me?.skills ?? []).map((name) => {
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
        {hand.length === 0 && pileCards.length === 0
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
        {pileCards.map((cid) => (
          <CardItem
            key={`x${cid}`}
            cid={cid}
            known
            item={interactive ? cardItems[String(cid)] : undefined}
            onClick={clickCard}
            onDoubleClick={dblCard}
            footnote={pileFootnote(lua, scene.uiData.CardItem?.[String(cid)])}
            title={lua.tr('Pile')}
          />
        ))}
      </div>

    </div>
  );
});

/** `ui_data.footnote` on an expanded card names the pile it came from — `$Equip`,
 *  a private pile's name, a skill's name — and `Dashboard.qml:172` prints it
 *  under the card so the player can tell it apart from a hand card. */
function pileFootnote(lua: { tr: (s: string) => string }, ui: unknown): string | undefined {
  const note = (ui as { footnote?: unknown } | undefined)?.footnote;
  return typeof note === 'string' && note !== '' ? lua.tr(note) : undefined;
}

/**
 * Which of the viewer's skills the dashboard lists.
 *
 * `GetMySkills` is the engine's own answer (`client_util.lua:392`: the skills
 * whose `visible` flag is set), and it is what `Dashboard.qml:133` renders. The
 * room used to approximate it with a name-shape rule, and the approximation was
 * wrong in a way that would have been invisible until it mattered: it dropped
 * every name containing `__`, which is how packages namespace their reworks —
 * `mobile__lianzhu`, `changshi__kuiji`. A general from such a package would have
 * shown a dashboard with no skills on it at all.
 *
 * The notify stream's own list is the fallback, for a replay or the fixture
 * harness where there is no VM to ask.
 */
export function skillsOf(lua: { getMySkills: () => readonly string[] }, fromStream: readonly string[]): readonly string[] {
  try {
    const engine = lua.getMySkills();
    if (engine.length) return engine;
  } catch { /* no client VM — replay or fixture */ }
  return fromStream;
}

function safeSkill(lua: { getSkillData: (n: string) => unknown }, name: string) {
  try { return lua.getSkillData(name) as { freq?: string } | undefined; } catch { return undefined; }
}
