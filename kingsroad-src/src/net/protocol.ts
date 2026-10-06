import type { HeroCommand } from '../game/hero.ts';
import type { Difficulty } from '../game/bot.ts';
import type { MatchMode } from '../game/sim.ts';

/** What one player publishes about itself through room presence. */
export interface PlayerInfo {
  uid: string;
  name: string;
  host: boolean;
  team: 0 | 1;
  seat: number; // index within the team
  hero: string;
  ready: boolean;
  /** ms since epoch when this presence was tracked; the earliest claim wins a contested seat. */
  at: number;
  /** Host only: the room settings everyone sees. */
  cfg?: RoomConfig;
}

export interface RoomConfig { mode: MatchMode; difficulty: Difficulty; name: string }

export interface StartSeat { heroId: string; isBot: boolean; name: string; uid?: string }

/** Broadcast by the host on the room channel when the match begins. */
export interface StartMsg {
  matchId: number;
  seed: number;
  mode: MatchMode;
  difficulty: Difficulty;
  teams: [StartSeat[], StartSeat[]];
  delay: number; // input delay in ticks
  sendEvery: number; // ticks between input packets
}

/** A hero command on the wire. */
export interface WireCmd { m: [number, number]; a: [number, number]; f: number; s: number; b?: string; l?: number }
export const F_ATTACK = 1, F_DASH = 2, F_FLASH = 4, F_RECALL = 8;

/** One tick of one seat's input. */
export interface WireFrame { t: number; c: WireCmd }

export type NetMsg =
  | { k: 'in'; seat: string; f: WireFrame[] }
  | { k: 'hash'; seat: string; t: number; h: number }
  | { k: 'drop'; seat: string; t: number }
  | { k: 'need'; seat: string; from: number }
  | { k: 'chat'; name: string; text: string }
  | { k: 'leave'; seat: string; reason?: string; t?: number }
  | { k: 'ping'; n: number; s: number }
  | { k: 'pong'; n: number; s: number; to: string };

const q3 = (v: number): number => Math.round(v * 1000) / 1000;

/** Both peers must simulate from the SAME numbers, so the local side also uses the decoded copy of what it sent. */
export function encodeCmd(c: HeroCommand): WireCmd {
  const w: WireCmd = {
    m: [q3(c.move.x), q3(c.move.y)], a: [q3(c.aim.x), q3(c.aim.y)],
    f: (c.attack ? F_ATTACK : 0) | (c.dash ? F_DASH : 0) | (c.flash ? F_FLASH : 0) | (c.recall ? F_RECALL : 0),
    s: c.skill,
  };
  if (c.buy) w.b = c.buy;
  if (c.levelSkill >= 0) w.l = c.levelSkill;
  return w;
}

export function decodeCmd(w: WireCmd): HeroCommand {
  return {
    move: { x: w.m[0], y: w.m[1] }, aim: { x: w.a[0], y: w.a[1] },
    attack: (w.f & F_ATTACK) !== 0, dash: (w.f & F_DASH) !== 0, flash: (w.f & F_FLASH) !== 0, recall: (w.f & F_RECALL) !== 0,
    skill: w.s ?? -1, buy: w.b ?? null, levelSkill: w.l ?? -1,
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newRoomCode(len = 4): string {
  let s = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return s;
}
export const isRoomCode = (s: string): boolean => /^[A-Z0-9]{4,8}$/.test(s);
