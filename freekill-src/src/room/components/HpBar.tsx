/** The magatama column on a seat. `Fk/Components/LunarLTK/Photo/HpBar.qml`. */
import { memo } from 'react';
import type { ReactElement } from 'react';

export const HpBar = memo(function HpBar(
  { hp, maxHp, shield }: { hp: number; maxHp: number; shield: number },
) {
  if (maxHp <= 0 && shield <= 0) return null;
  const total = Math.max(maxHp, hp, 0);
  const pips: ReactElement[] = [];
  for (let i = 0; i < shield; i++) {
    pips.push(<i key={`s${i}`} className="fk-hp__pip fk-hp__pip--shield" />);
  }
  for (let i = 0; i < total; i++) {
    const filled = i < hp;
    const level = hp <= 1 ? 'crit' : hp <= Math.ceil(maxHp / 2) ? 'low' : 'full';
    pips.push(<i key={i} className={`fk-hp__pip${filled ? ` fk-hp__pip--${level}` : ''}`} />);
  }
  return <div className="fk-hp" title={`${hp}/${maxHp}`}>{pips}</div>;
});
