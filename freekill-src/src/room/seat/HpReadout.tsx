/**
 * How much life a seat has left, said in numbers.
 *
 * This replaces the magatama column (`components/HpBar.tsx`, the web reading of
 * `Fk/Components/LunarLTK/Photo/HpBar.qml`). The beads are faithful to the Qt
 * client and they are the reason nobody can tell how hurt anyone is: at eight
 * seats the ring shrinks the portrait to about 134px, which leaves a column of
 * 7px beads down one edge that has to be *counted*, twice, to answer "can this
 * kill them". A number does not have to be counted.
 *
 * The beads stay, because they still do one thing the number cannot: show the
 * damage at a glance as a shrinking row, and show shields as a different thing
 * rather than a different number. They are now a row under the number instead
 * of a column beside the portrait, so the whole answer is one block in one
 * place at the top of the seat.
 *
 * Everything is sized from `--fk-photo-w`, which `RoomView` publishes from the
 * measured ring, so the readout scales with whatever photo size the ring chose
 * for the number of seats actually playing. It is absolutely positioned inside
 * `.fk-photo`, which has a fixed height, so it cannot change `seatHeight()` and
 * therefore cannot push the ring into a collision.
 */
import { memo } from 'react';
import type { ReactElement } from 'react';

export interface HpReadoutProps {
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
}

/** The three bands the beads and the number are both coloured by. */
export function hpLevel(hp: number, maxHp: number): 'crit' | 'low' | 'full' {
  if (hp <= 1) return 'crit';
  return hp <= Math.ceil(maxHp / 2) ? 'low' : 'full';
}

export const HpReadout = memo(function HpReadout({ hp, maxHp, shield }: HpReadoutProps) {
  if (maxHp <= 0 && shield <= 0) return null;

  // `hp > maxHp` happens — 神将 and a few skills push it — so the row is sized
  // by whichever is larger rather than by `maxHp` alone.
  const total = Math.max(maxHp, hp, 0);
  const level = hpLevel(hp, maxHp);

  const pips: ReactElement[] = [];
  for (let i = 0; i < shield; i++) {
    pips.push(<i key={`s${i}`} className="fk-hp__pip fk-hp__pip--shield" />);
  }
  for (let i = 0; i < total; i++) {
    pips.push(<i key={i} className={`fk-hp__pip${i < hp ? ` fk-hp__pip--${level}` : ''}`} />);
  }

  return (
    <div className={`fk-hp fk-hp--${level}`} title={`${hp}/${maxHp}`}>
      <div className="fk-hp__num">
        <b>{hp}</b>
        <span className="fk-hp__slash">/</span>
        <span className="fk-hp__max">{maxHp}</span>
        {shield > 0 ? <span className="fk-hp__shield">+{shield}</span> : null}
      </div>
      <div className="fk-hp__pips">{pips}</div>
    </div>
  );
});
