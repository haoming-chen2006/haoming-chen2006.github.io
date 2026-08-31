/**
 * A skill's inline chooser.
 *
 * `lua/ui_emu/interaction.lua` puts one `Interaction` item in the scene carrying
 * a `spec` — the same spec `Fk/Components/LunarLTK/SkillInteraction/` renders as
 * SkillCombo / SkillSpin / SkillCheckBox / SkillCardName / a package-supplied
 * QML file. The value goes back as
 * `UpdateRequestUI("Interaction", "1", "update", value)`.
 *
 * Built off the spec's shape rather than off a list of the specs the standard
 * pack happens to use: a package can ship its own and this must not care.
 */
import { useEffect, useState } from 'react';
import type { ItemData } from '../../contract/scene';
import { useRoom } from '../RoomContext';
import { cls } from './CardItem';

interface Spec {
  type?: string;
  choices?: string[];
  all_choices?: string[];
  detailed?: boolean;
  default?: unknown;
  from?: number;
  to?: number;
  min_num?: number;
  max_num?: number;
  cancelable?: boolean;
  qml_path?: string;
  pattern?: string;
}

export function InteractionWidget({ item }: { item: ItemData }) {
  const { lua } = useRoom();
  const spec = (item as unknown as { spec?: Spec }).spec ?? {};
  const send = (value: unknown) => lua.interact('Interaction', String(item.id ?? '1'), 'update', value);

  switch (spec.type) {
    case 'combo': return <Combo spec={spec} send={send} />;
    case 'spin': return <Spin spec={spec} send={send} />;
    case 'checkbox': return <CheckBoxes spec={spec} send={send} />;
    case 'cardname': return <CardName spec={spec} send={send} />;
    default:
      // `custom` and anything a package invents: the room cannot render an
      // arbitrary QML file, so it says so rather than pretending.
      // `custom` points at a package-supplied QML file and anything else is a
      // package inventing its own widget. Neither can be rendered here, so the
      // room names what it was asked for rather than drawing a blank.
      return (
        <div className="fk-interaction">
          <span title={JSON.stringify(spec)}>
            <code>{spec.qml_path ?? spec.type ?? '?'}</code>
          </span>
        </div>
      );
  }
}

function Combo({ spec, send }: { spec: Spec; send: (v: unknown) => void }) {
  const { lua } = useRoom();
  const choices = spec.choices ?? [];
  const all = spec.all_choices ?? choices;
  const [value, setValue] = useState<string>(String(spec.default ?? choices[0] ?? ''));
  useEffect(() => { if (value) send(value); /* mirrors SkillCombo's onCompleted clicked() */ }, []);
  return (
    <div className="fk-interaction">
      {all.map((c) => {
        const on = c === value;
        const usable = choices.includes(c);
        return (
          <button
            type="button"
            key={c}
            className={cls('fk-chip', on && 'fk-chip--on')}
            disabled={!usable}
            onClick={() => { setValue(c); send(c); }}
          >{lua.tr(c)}</button>
        );
      })}
    </div>
  );
}

function Spin({ spec, send }: { spec: Spec; send: (v: unknown) => void }) {
  const from = spec.from ?? 0;
  const to = spec.to ?? 0;
  const [value, setValue] = useState<number>(Number(spec.default ?? from));
  useEffect(() => { send(value); }, []);
  const set = (v: number) => {
    const clamped = Math.min(to, Math.max(from, v));
    setValue(clamped);
    send(clamped);
  };
  return (
    <div className="fk-interaction">
      <button type="button" className="fk-chip" onClick={() => set(value - 1)}>−</button>
      <b>{value}</b>
      <button type="button" className="fk-chip" onClick={() => set(value + 1)}>+</button>
    </div>
  );
}

function CheckBoxes({ spec, send }: { spec: Spec; send: (v: unknown) => void }) {
  const { lua } = useRoom();
  const choices = spec.choices ?? [];
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (c: string) => {
    const next = picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c];
    setPicked(next);
    send(next);
  };
  return (
    <div className="fk-interaction">
      {choices.map((c) => (
        <button
          type="button"
          key={c}
          className={cls('fk-chip', picked.includes(c) && 'fk-chip--on')}
          onClick={() => toggle(c)}
        >{lua.tr(c)}</button>
      ))}
    </div>
  );
}

function CardName({ spec, send }: { spec: Spec; send: (v: unknown) => void }) {
  const { lua } = useRoom();
  const choices = spec.all_choices ?? spec.choices ?? [];
  const [value, setValue] = useState<string>(String(spec.default ?? ''));
  return (
    <div className="fk-interaction">
      {choices.map((c) => (
        <button
          type="button"
          key={c}
          className={cls('fk-chip', c === value && 'fk-chip--on')}
          onClick={() => { setValue(c); send(c); }}
        >{lua.tr(c)}</button>
      ))}
    </div>
  );
}
