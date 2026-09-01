/**
 * Choosing what to play.
 *
 * The lobby used to ask two questions and let them disagree — a mode from a
 * `<select>`, then a player count from another. This asks one, because there is
 * only one: 斗地主 *is* three seats, 2v2 *is* four. `contract/modes.ts` holds
 * the offers; nothing here invents a rule.
 *
 * WHY THE SEAT RING. Every mode's real difference is who sits where and who
 * knows what, and a dropdown cannot say either. The ring draws the actual table:
 * `seatRoles` clockwise from seat one, coloured by allegiance, hollow where the
 * allegiance is concealed. So 2v2 shows its partner opposite, 斗地主 shows one
 * red against two green, and a 身份局 shows one red lord and seven seats you
 * cannot read — which is the game.
 */
import type { GameModeOffer, RoleName } from '../contract/modes';
import { GAME_MODES } from '../contract/modes';
import { useT, type UiKey } from '../i18n';

const ROLE_LABEL: Record<RoleName | 'hidden', UiKey> = {
  lord: 'mode.role.lord',
  loyalist: 'mode.role.loyalist',
  rebel: 'mode.role.rebel',
  renegade: 'mode.role.renegade',
  hidden: 'mode.unknown',
};

const MODE_NAME: Record<string, UiKey> = {
  duel: 'mode.duel.name',
  team: 'mode.team.name',
  dizhu: 'mode.dizhu.name',
  role5: 'mode.role5.name',
  role8: 'mode.role8.name',
};

const MODE_TAGLINE: Record<string, UiKey> = {
  duel: 'mode.duel.tagline',
  team: 'mode.team.tagline',
  dizhu: 'mode.dizhu.tagline',
  role5: 'mode.role5.tagline',
  role8: 'mode.role8.tagline',
};

export function modeNameKey(id: string): UiKey {
  return MODE_NAME[id] ?? 'mode.unknown';
}

/**
 * The table, drawn. Seat one is at the top and the rest run clockwise, which is
 * the order the engine seats them in.
 */
export function SeatRing({ mode, size = 74 }: { mode: GameModeOffer; size?: number }) {
  const r = size / 2;
  const ring = r - 9;
  const dot = mode.seats > 5 ? 5.4 : 6.6;
  return (
    <svg className="mode-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={r} cy={r} r={ring} className="mode-ring__track" />
      {mode.seatRoles.map((role, i) => {
        const angle = (i / mode.seats) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={r + Math.cos(angle) * ring}
            cy={r + Math.sin(angle) * ring}
            r={dot}
            className="mode-ring__seat"
            data-role={role}
          />
        );
      })}
    </svg>
  );
}

/** `地主×1 · 农民×2` — what the deal produces, in the mode's own vocabulary. */
export function RoleStrip({ mode }: { mode: GameModeOffer }) {
  const t = useT();
  return (
    <div className="role-strip">
      {mode.roles.map((share) => (
        <span className="role-chip" data-role={share.role} key={`${share.role}-${share.as ?? ''}`}>
          {t('mode.roleCount', {
            role: t(share.as ? `mode.role.${share.as}` as UiKey : ROLE_LABEL[share.role]),
            n: share.count,
          })}
        </span>
      ))}
      <span className="role-chip" data-role={mode.hiddenRoles ? 'hidden' : 'open'}>
        {t(mode.hiddenRoles ? 'mode.hiddenRoles' : 'mode.openRoles')}
      </span>
    </div>
  );
}

export function ModePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: GameModeOffer['id']) => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <div className="mode-grid" role="radiogroup" aria-label={t('lobby.chooseMode')}>
      {GAME_MODES.map((mode) => {
        const on = mode.id === value;
        return (
          <button
            type="button"
            key={mode.id}
            className="mode-card"
            role="radio"
            aria-checked={on}
            data-mode={mode.id}
            disabled={disabled}
            onClick={() => onChange(mode.id)}
          >
            <div className="mode-card__top">
              <SeatRing mode={mode} />
              <div className="mode-card__head">
                <span className="mode-card__name">{t(modeNameKey(mode.id))}</span>
                <span className="mode-card__seats">{t('mode.seats', { n: mode.seats })}</span>
              </div>
            </div>
            <RoleStrip mode={mode} />
            <p className="mode-card__tagline">{t(MODE_TAGLINE[mode.id] ?? 'mode.unknown')}</p>
          </button>
        );
      })}
    </div>
  );
}
