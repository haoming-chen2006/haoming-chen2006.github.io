import type { Action } from '../game/actions.ts';
import type { HeroCommand } from '../game/hero.ts';

/** What one seat publishes about itself through room presence. */
export interface PlayerInfo {
  uid: string;
  name: string;
  role: 'host' | 'guest';
  deck: string[];
  ready: boolean;
  /** ms since epoch when this presence was tracked; the earliest guest wins a contested seat. */
  at: number;
}

/** Broadcast by the host on the room channel when the match begins (and again for a rematch). */
export interface StartMsg {
  matchId: number;
  seed: number;
  host: { uid: string; name: string; deck: string[] };
  guest: { uid: string; name: string; deck: string[] };
  /** Input delay in ticks, chosen by the host from the measured round trip. */
  delay: number;
  /** Ticks between input packets (1 on a direct link, more when relayed through the server). */
  sendEvery: number;
}

export type Signal =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; cand: RTCIceCandidateInit };

/** A hero command on the wire: movement, aim, and a bitfield of the four buttons. */
export interface WireCmd { m: [number, number]; a: [number, number]; f: number }
export const F_ATTACK = 1, F_ABILITY = 2, F_DASH = 4, F_RELEASE = 8;

/** One tick of one seat's input. `x` carries the discrete actions scheduled for that tick. */
export interface WireFrame { t: number; c: WireCmd; x?: Action[] }

export type PeerMsg =
  | { k: 'in'; f: WireFrame[] }
  | { k: 'hash'; t: number; h: number }
  | { k: 'ping'; n: number; s: number }
  | { k: 'pong'; n: number; s: number }
  | { k: 'snapreq'; t: number }
  | { k: 'snap'; t: number; d: unknown }
  | { k: 'chat'; text: string }
  | { k: 'leave'; reason?: string };

const q3 = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * Both peers must simulate from the SAME numbers, so the local side also uses the decoded copy of
 * what it sent. Rounding to 1e-3 keeps packets small; it is exact arithmetic so it is identical
 * on every engine.
 */
export function encodeCmd(c: HeroCommand): WireCmd {
  return {
    m: [q3(c.move.x), q3(c.move.y)], a: [q3(c.aim.x), q3(c.aim.y)],
    f: (c.attack ? F_ATTACK : 0) | (c.ability ? F_ABILITY : 0) | (c.dash ? F_DASH : 0) | (c.release ? F_RELEASE : 0),
  };
}

export function decodeCmd(w: WireCmd): HeroCommand {
  return {
    move: { x: w.m[0], y: w.m[1] }, aim: { x: w.a[0], y: w.a[1] },
    attack: (w.f & F_ATTACK) !== 0, ability: (w.f & F_ABILITY) !== 0, dash: (w.f & F_DASH) !== 0, release: (w.f & F_RELEASE) !== 0,
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I L O 0 1
export function newRoomCode(len = 4): string {
  let s = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return s;
}
export const isRoomCode = (s: string): boolean => /^[A-Z0-9]{4,8}$/.test(s);
