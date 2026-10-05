import { NEUTRAL, type Side, type Team } from '../game/types.ts';

/**
 * Whose side of the arena this browser is looking from. The simulation always calls the bottom
 * side team 0, but in an online duel the guest plays team 1 — so every "blue = mine, red = theirs"
 * decision in the presentation goes through here instead of comparing against 0.
 */
export const MINE_HEX = 0x3d9bff;
export const FOE_HEX = 0xff4d4d;
export const MINE_CSS = '#4da3ff';
export const FOE_CSS = '#ff5a5a';

let viewTeam: Team = 0;
export function setViewTeam(t: Team): void { viewTeam = t; }
export function getViewTeam(): Team { return viewTeam; }
export const NEUTRAL_HEX = 0xc9a86a;
export const NEUTRAL_CSS = '#d6b26b';
export const isMine = (t: Side): boolean => t === viewTeam;
export const isFoe = (t: Side): boolean => t !== viewTeam && t !== NEUTRAL;
export const teamHex = (t: Side): number => (t === viewTeam ? MINE_HEX : t === NEUTRAL ? NEUTRAL_HEX : FOE_HEX);
export const teamCss = (t: Side): string => (t === viewTeam ? MINE_CSS : t === NEUTRAL ? NEUTRAL_CSS : FOE_CSS);
