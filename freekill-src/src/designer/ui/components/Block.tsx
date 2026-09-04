/**
 * One block, and the parameters written into its face.
 *
 * Scratch's shape, because Scratch's shape is the argument: a block is a
 * sentence with holes, and the holes are filled in place rather than in a
 * properties pane off to one side. 「摸 [3] 张」 is read once and understood;
 * a block that says `draw` beside a form with a `count` field is two things to
 * hold in your head at the same time.
 *
 * The colour carries the lane, and the lane carries meaning the engine enforces
 * — an ask in the red 代价 band cancels the whole effect, the same ask in the
 * green 效果 band does not. See `palette.ts`.
 */
import type { ChangeEvent } from 'react';
import type { BlockRef, ParamValue } from '../../spec';
import { paramsOf } from '../../spec';
import { isOptional, paramSpec, type ParamSpec } from '../labels';
import { LANE_KIND, LANE_PREFIX, paletteBlock, type Lane } from '../palette';

interface ParamFieldProps {
  block: string;
  name: string;
  value: ParamValue | undefined;
  invalid: boolean;
  /** The engine defaults this one; empty means "let it", not "unfinished". */
  optional: boolean;
  onChange: (value: ParamValue) => void;
}

function ParamField({ block, name, value, invalid, optional, onChange }: ParamFieldProps) {
  const spec: ParamSpec = paramSpec(block, name);
  const className = `fk-hd-param${invalid ? ' fk-hd-param--bad' : ''}`;
  const label = spec.label ? <span className="fk-hd-param__label">{spec.label}</span> : null;
  const suffix = spec.suffix ? <span className="fk-hd-param__label">{spec.suffix}</span> : null;

  if (spec.kind === 'bool') {
    return (
      <span className={className}>
        <label className="fk-hd-param__check">
          <input
            type="checkbox"
            checked={value === true}
            aria-label={spec.label || name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
          />
          {spec.label || name}
        </label>
      </span>
    );
  }

  if (spec.kind === 'select') {
    return (
      <span className={className}>
        {label}
        <select
          className="fk-hd-param__input"
          aria-label={`${spec.label || name}`}
          value={value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        >
          {value === undefined || value === '' ? (
            <option value="">{optional ? '默认' : '请选择…'}</option>
          ) : null}
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {suffix}
      </span>
    );
  }

  if (spec.kind === 'number') {
    return (
      <span className={className}>
        {label}
        <input
          className="fk-hd-param__input fk-hd-param__input--num"
          type="number"
          aria-label={spec.label || name}
          min={spec.min}
          max={spec.max}
          value={value === undefined ? '' : String(value)}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(e.target.value === '' ? '' : Number.isFinite(n) ? n : e.target.value);
          }}
        />
        {suffix}
      </span>
    );
  }

  return (
    <span className={className}>
      {label}
      <input
        className="fk-hd-param__input"
        type="text"
        aria-label={spec.label || name}
        placeholder={spec.placeholder ?? (optional ? '默认' : undefined)}
        value={value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix}
    </span>
  );
}

export interface BlockProps {
  lane: Lane;
  block: BlockRef;
  /** Paths of parameters the validator complained about, by parameter name. */
  badParams: Set<string>;
  /** Whatever the validator said about the block as a whole. */
  messages: string[];
  onParam: (name: string, value: ParamValue) => void;
  onRemove: () => void;
  /** Present on a stacked block; the trigger hat does not move. */
  onGrip?: (event: React.PointerEvent<HTMLElement>) => void;
  dragging?: boolean;
}

export function Block({
  lane,
  block,
  badParams,
  messages,
  onParam,
  onRemove,
  onGrip,
  dragging,
}: BlockProps) {
  const meta = paletteBlock(lane, block.block);
  const names = paramsOf(LANE_KIND[lane], block.block) ?? Object.keys(block.params);
  const classes = [
    'fk-hd-block',
    `fk-hd-block--${lane}`,
    messages.length || badParams.size ? 'fk-hd-block--bad' : '',
    dragging ? 'fk-hd-block--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-block={block.block} data-lane={lane}>
      <div className="fk-hd-block__face">
        {onGrip ? (
          <span
            className="fk-hd-block__grip"
            onPointerDown={onGrip}
            role="button"
            tabIndex={-1}
            aria-label="拖动排序"
            title="按住拖动，调整顺序"
          >
            ⠿
          </span>
        ) : null}
        <span className="fk-hd-block__lead">{LANE_PREFIX[lane]}</span>
        <span className="fk-hd-block__name">{meta.label}</span>
        {names.map((name) => (
          <ParamField
            key={name}
            block={block.block}
            name={name}
            value={block.params[name]}
            invalid={badParams.has(name)}
            optional={isOptional(LANE_KIND[lane], block.block, name)}
            onChange={(value) => onParam(name, value)}
          />
        ))}
        <button
          type="button"
          className="fk-hd-block__x"
          onClick={onRemove}
          aria-label={`删除积木 ${meta.label}`}
          title="删除这块"
        >
          ×
        </button>
      </div>
      {messages.length ? (
        <div className="fk-hd-block__why">{messages.join('；')}</div>
      ) : null}
    </div>
  );
}

/** The dashed outline that says a lane is waiting for a block. */
export function EmptySlot({ lane, hint, bad }: { lane: Lane; hint: string; bad?: boolean }) {
  return (
    <div
      className={`fk-hd-slot fk-hd-slot--${lane}${bad ? ' fk-hd-slot--bad' : ''}`}
      data-lane={lane}
    >
      {hint}
    </div>
  );
}
