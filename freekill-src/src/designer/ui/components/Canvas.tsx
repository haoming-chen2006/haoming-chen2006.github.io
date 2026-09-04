/**
 * The block canvas: one to three skills, each a stack you read top to bottom.
 *
 * The shape on screen is the engine's shape, not a simplification of it.
 *
 *   * ONE TRIGGER PER STACK, and it is a hat. `addEffect` takes exactly one
 *     event key (skill_skeleton.lua:115) and there is no "fires on A or B"
 *     spec — 414 of the 1304 shipped skills hang off more than one event by
 *     adding a second effect. So a skill holds SEVERAL stacks and 「＋ 再加一个
 *     触发时机」 is a first-class button rather than something buried, with the
 *     reason printed beside it. A panel that offered "trigger: A or B" would be
 *     promising a thing the engine cannot express.
 *
 *   * 代价 IS ITS OWN BAND, above 效果. `TriggerSkill:doCost`
 *     (skill_type/trigger.lua:70) runs the cost and only runs the effect if it
 *     came back true. Put the discard in 效果 and a player who cancels still
 *     draws — the bug is invisible in the panel and obvious at the table, which
 *     is the worst place to find it. Red band, above the green one, in that
 *     order, always.
 *
 * Everything red on this screen comes from `validateSpec` (see `problems.ts`),
 * so what the canvas objects to and what the server objects to cannot drift.
 */
import { useCallback } from 'react';
import type { ParamValue, SkillSpec } from '../../spec';
import { Block, EmptySlot } from './Block';
import { LANE_LABEL, type Lane } from '../palette';
import type { Action, DesignerState, Selection } from '../state';
import { effectPath, lanePath, paramPath, skillPath, type Problems } from '../problems';
import { useStackDrag } from './useStackDrag';

type Stacked = Exclude<Lane, 'trigger'>;

const BAND_HINT: Record<Stacked, string> = {
  conditions: '只有全部满足时才会发动（可不填）',
  cost: '先付出，取消则整个技能不发动（可不填）',
  actions: '真正发生的事，至少要有一块',
};

interface LaneProps {
  lane: Stacked;
  at: Selection;
  state: DesignerState;
  problems: Problems;
  dispatch: (action: Action) => void;
  drag: ReturnType<typeof useStackDrag>;
}

function LaneStack({ lane, at, state, problems, dispatch, drag }: LaneProps) {
  const effect = state.spec.skills[at.skill]?.effects[at.effect];
  const blocks = (lane === 'conditions' ? effect?.conditions : lane === 'cost' ? effect?.cost : effect?.actions) ?? [];
  const key = `${at.skill}:${at.effect}:${lane}`;
  const active = drag.drag?.key === key ? drag.drag : null;
  const missing = lane === 'actions' && problems.at(lanePath(at.skill, at.effect, 'actions')).length > 0;

  return (
    <div className={`fk-hd-band fk-hd-band--${lane}`}>
      <div className="fk-hd-band__head">
        <span className="fk-hd-band__name">{LANE_LABEL[lane]}</span>
        <span className="fk-hd-band__hint">{BAND_HINT[lane]}</span>
      </div>
      <div className="fk-hd-stack" data-stack={key}>
        {blocks.map((block, index) => {
          const path = lanePath(at.skill, at.effect, lane, index);
          const bad = new Set<string>();
          for (const name of Object.keys(block.params)) {
            if (problems.at(paramPath(path, name)).length) bad.add(name);
          }
          // A required parameter left out is reported at its own path even
          // though the spec has no key for it, so the block's face can mark the
          // hole rather than printing a sentence underneath.
          for (const e of problems.under(path)) {
            const m = /\.params\.([A-Za-z0-9_]+)$/.exec(e.path);
            if (m) bad.add(m[1]);
          }
          const isDragged = active?.from === index;
          const offset = active && !isDragged ? shift(active.from, active.to, index) : 0;
          return (
            <div
              key={`${block.block}-${index}`}
              data-stack-item=""
              className="fk-hd-stack__item"
              style={
                isDragged
                  ? { transform: `translateY(${active.dy}px)`, zIndex: 3, position: 'relative' }
                  : offset
                    ? { transform: `translateY(${offset * 100}%)` }
                    : undefined
              }
            >
              <Block
                lane={lane}
                block={block}
                badParams={bad}
                messages={problems.at(path)}
                dragging={isDragged}
                onGrip={drag.grip(key, index)}
                onParam={(name, value: ParamValue) =>
                  dispatch({ type: 'param', lane, index, name, value })}
                onRemove={() => dispatch({ type: 'remove-block', lane, index })}
              />
            </div>
          );
        })}
        {blocks.length === 0 ? (
          <EmptySlot
            lane={lane}
            bad={missing}
            hint={
              lane === 'actions'
                ? '从右边「效果」里点一块放进来'
                : `从右边「${LANE_LABEL[lane]}」里点一块放进来`
            }
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * How far a block slides while another is dragged past it.
 *
 * Everything between the block's old and new index moves one slot the other
 * way; everything outside that span stays put. Returning a multiplier rather
 * than pixels lets the CSS use a percentage, so a two-line block and a one-line
 * block both open a gap of exactly their own height.
 */
const shift = (from: number, to: number, index: number): number => {
  if (from < to) return index > from && index <= to ? -1 : 0;
  if (from > to) return index >= to && index < from ? 1 : 0;
  return 0;
};

interface StackProps {
  at: Selection;
  state: DesignerState;
  problems: Problems;
  dispatch: (action: Action) => void;
  onRemove: (() => void) | null;
  index: number;
}

function EffectStack({ at, state, problems, dispatch, onRemove, index }: StackProps) {
  const selected = state.selected.skill === at.skill && state.selected.effect === at.effect;
  const effect = state.spec.skills[at.skill]?.effects[at.effect];
  const drag = useStackDrag(
    useCallback(
      (key: string, from: number, to: number) => {
        const lane = key.split(':')[2] as Stacked;
        dispatch({ type: 'move-block', lane, from, to });
      },
      [dispatch],
    ),
  );
  if (!effect) return null;

  const triggerPath = lanePath(at.skill, at.effect, 'trigger');
  const triggerBad = new Set<string>();
  for (const e of problems.under(triggerPath)) {
    const m = /\.params\.([A-Za-z0-9_]+)$/.exec(e.path);
    if (m) triggerBad.add(m[1]);
  }

  return (
    <section
      className={`fk-hd-effect${selected ? ' fk-hd-effect--on' : ''}`}
      aria-selected={selected}
      data-effect={index}
      onPointerDownCapture={() => {
        if (!selected) dispatch({ type: 'select', at });
      }}
    >
      <header className="fk-hd-effect__head">
        <span className="fk-hd-effect__no">时机 {index + 1}</span>
        {selected ? <span className="fk-hd-effect__on">正在编辑</span> : null}
        {onRemove ? (
          <button type="button" className="fk-hd-x" onClick={onRemove} title="删除这个触发时机">
            删除时机
          </button>
        ) : null}
      </header>

      {effect.trigger.block ? (
        <div className="fk-hd-stack">
          <Block
            lane="trigger"
            block={effect.trigger}
            badParams={triggerBad}
            messages={problems.at(triggerPath)}
            onParam={(name, value) => dispatch({ type: 'param', lane: 'trigger', index: 0, name, value })}
            onRemove={() => dispatch({ type: 'clear-trigger' })}
          />
        </div>
      ) : (
        <EmptySlot lane="trigger" bad hint="必须先从右边「触发」里选一个时机" />
      )}

      <LaneStack lane="conditions" at={at} state={state} problems={problems} dispatch={dispatch} drag={drag} />
      <LaneStack lane="cost" at={at} state={state} problems={problems} dispatch={dispatch} drag={drag} />
      <LaneStack lane="actions" at={at} state={state} problems={problems} dispatch={dispatch} drag={drag} />
    </section>
  );
}

interface SkillProps {
  skill: SkillSpec;
  index: number;
  state: DesignerState;
  problems: Problems;
  dispatch: (action: Action) => void;
}

function SkillCard({ skill, index, state, problems, dispatch }: SkillProps) {
  const path = skillPath(index);
  const count = problems.under(path).length;
  const patch = (p: Partial<SkillSpec>) => dispatch({ type: 'skill', skill: index, patch: p });

  return (
    <article className="fk-hd-skill">
      <header className="fk-hd-skill__head">
        <input
          className={`fk-hd-skill__name${problems.at(`${path}.name`).length ? ' fk-hd-bad' : ''}`}
          value={skill.name}
          placeholder="技能名"
          aria-label={`技能 ${index + 1} 名称`}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <input
          className={`fk-hd-skill__id${problems.at(`${path}.id`).length ? ' fk-hd-bad' : ''}`}
          value={skill.id}
          placeholder="skill_id"
          aria-label={`技能 ${index + 1} 编号`}
          onChange={(e) => patch({ id: e.target.value })}
        />
        <label className="fk-hd-toggle" title="锁定技不询问，直接生效">
          <input
            type="checkbox"
            checked={skill.compulsory === true}
            onChange={(e) => patch({ compulsory: e.target.checked ? true : undefined })}
          />
          锁定技
        </label>
        {count ? <span className="fk-hd-count">{count} 处待修</span> : <span className="fk-hd-ok">✓</span>}
        {state.spec.skills.length > 1 ? (
          <button
            type="button"
            className="fk-hd-x"
            onClick={() => dispatch({ type: 'remove-skill', skill: index })}
            title="删除这个技能"
          >
            删除技能
          </button>
        ) : null}
      </header>

      <textarea
        className={`fk-hd-skill__text${problems.at(`${path}.description`).length ? ' fk-hd-bad' : ''}`}
        value={skill.description}
        rows={2}
        placeholder="技能描述，写给玩家看的那一句，例如「当你受到伤害后，你可以摸一张牌。」"
        aria-label={`技能 ${index + 1} 描述`}
        onChange={(e) => patch({ description: e.target.value })}
      />

      {skill.effects.map((_, j) => (
        <EffectStack
          key={j}
          index={j}
          at={{ skill: index, effect: j }}
          state={state}
          problems={problems}
          dispatch={dispatch}
          onRemove={
            skill.effects.length > 1
              ? () => dispatch({ type: 'remove-effect', skill: index, effect: j })
              : null
          }
        />
      ))}

      <div className="fk-hd-skill__foot">
        <button type="button" className="fk-hd-btn" onClick={() => dispatch({ type: 'add-effect', skill: index })}>
          ＋ 再加一个触发时机
        </button>
        <span className="fk-hd-note">
          引擎里一个技能挂在一个时机上；要同时响应两件事，就再加一个时机，两段各写各的。
        </span>
      </div>
    </article>
  );
}

export interface CanvasProps {
  state: DesignerState;
  problems: Problems;
  dispatch: (action: Action) => void;
}

export function Canvas({ state, problems, dispatch }: CanvasProps) {
  return (
    <div className="fk-hd-canvas">
      {state.spec.skills.map((skill, i) => (
        <SkillCard key={i} skill={skill} index={i} state={state} problems={problems} dispatch={dispatch} />
      ))}
      {state.spec.skills.length < 3 ? (
        <button type="button" className="fk-hd-btn fk-hd-btn--wide" onClick={() => dispatch({ type: 'add-skill' })}>
          ＋ 添加技能（最多三个）
        </button>
      ) : null}
    </div>
  );
}
