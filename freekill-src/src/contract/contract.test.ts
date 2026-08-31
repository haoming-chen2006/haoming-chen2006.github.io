/**
 * The check that makes the freeze real.
 *
 * It fails the moment a lane's assumption drifts from the engine: the command
 * union is diffed against `Fk/Base/command.mjs` (canonical per CLAUDE.md), and
 * every recorded fixture payload is parsed against the schemas below.
 *
 * Run: `npm test`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENGINE_ROOT } from '../../spike/build-bundle.mjs';
import {
  BYTES_PREFIX, CBOR_TAG, HIGH_FREQUENCY_LOW_VALUE_COMMANDS,
  OBSERVED_WIRE_COMMANDS, UI_COMMANDS, channels, isTaggedRef,
} from './protocol';
import { DIALOG_REQUESTS, ELEM_TYPES, SCENE_TYPES, SceneChangeSchema } from './scene';
import { AssetManifestSchema, LuaManifestSchema, assetIndex } from './manifest';

const FIX = join(import.meta.dirname, '..', '..', 'fixtures');
const fixture = <T>(n: string): T => JSON.parse(readFileSync(join(FIX, n), 'utf8')) as T;

describe('command union vs Fk/Base/command.mjs', () => {
  /** Parsed straight from the source of truth, not imported (it is ESM in
   *  another repo and this must fail loudly if that file moves). */
  const canonical = (() => {
    const src = readFileSync(join(ENGINE_ROOT, 'Fk', 'Base', 'command.mjs'), 'utf8');
    const names = [...src.matchAll(/^export const (\w+)\s*=\s*['"]([^'"]+)['"]/gm)];
    return names.map(([, ident, value]) => {
      // every entry in that file is `export const X = "X"` — assert it stays so
      expect(value, `command.mjs: ${ident} is exported as "${value}"`).toBe(ident);
      return value;
    });
  })();

  it('command.mjs actually parsed', () => {
    expect(canonical.length).toBeGreaterThan(100);
  });

  it('UI_COMMANDS matches command.mjs exactly', () => {
    const mine = [...UI_COMMANDS].sort();
    const theirs = [...canonical].sort();
    expect(mine.filter((c) => !theirs.includes(c)), 'in contract, not in command.mjs').toEqual([]);
    expect(theirs.filter((c) => !mine.includes(c as never)), 'in command.mjs, not in contract').toEqual([]);
    expect(mine).toEqual(theirs);
  });

  it('has no duplicates', () => {
    expect(new Set(UI_COMMANDS).size).toBe(UI_COMMANDS.length);
    expect(new Set(OBSERVED_WIRE_COMMANDS).size).toBe(OBSERVED_WIRE_COMMANDS.length);
  });
});

describe('recorded wire traffic is covered by the contract', () => {
  type Msg = { seq: number; kind: string; command: string; data?: unknown; bytes: number };
  const stream = fixture<Msg[]>('seat-command-stream.json');
  const known = new Set<string>([...UI_COMMANDS, ...OBSERVED_WIRE_COMMANDS]);

  it('has a real game in it', () => {
    expect(stream.length).toBeGreaterThan(5000);
    // The server never sends EnterRoom; the client synthesises it on join.
    // The seat stream therefore opens on StartGame.
    expect(stream.at(0)?.command).toBe('StartGame');
    expect(stream.some((m) => m.command === 'GameOver')).toBe(true);
  });

  it('every observed command is declared', () => {
    const seen = [...new Set(stream.map((m) => m.command))].sort();
    expect(seen.filter((c) => !known.has(c))).toEqual([]);
  });

  it('sequence is dense and monotonic', () => {
    stream.forEach((m, i) => expect(m.seq).toBe(i + 1));
  });

  it('the three history commands really are the volume problem', () => {
    const total = stream.length;
    const hist = stream.filter((m) =>
      (HIGH_FREQUENCY_LOW_VALUE_COMMANDS as readonly string[]).includes(m.command));
    const histBytes = hist.reduce((n, m) => n + m.bytes, 0);
    const allBytes = stream.reduce((n, m) => n + m.bytes, 0);
    // 69.8% of messages, 26.8% of bytes, ~5 bytes each. A count problem.
    expect(hist.length / total).toBeGreaterThan(0.6);
    expect(histBytes / hist.length).toBeLessThan(8);
    expect(histBytes / allBytes).toBeLessThan(0.35);
  });
});

describe('envelopes', () => {
  type Env = { roomId: string; batch: number; to: number | null; messages: { seq: number }[] };
  const envelopes = fixture<Env[]>('envelopes.json');

  it('batch far fewer than raw messages', () => {
    const msgs = envelopes.reduce((n, e) => n + e.messages.length, 0);
    expect(envelopes.length).toBeLessThan(msgs / 5);
  });

  it('batches are ordered and messages keep global sequence', () => {
    let lastBatch = -1;
    let lastSeq = 0;
    for (const e of envelopes) {
      expect(e.batch).toBeGreaterThan(lastBatch);
      lastBatch = e.batch;
      for (const m of e.messages) {
        expect(m.seq).toBe(lastSeq + 1);
        lastSeq = m.seq;
      }
    }
  });

  it('channel names are stable', () => {
    expect(channels.public('abc')).toBe('room:abc');
    expect(channels.player('abc', 3)).toBe('room:abc:p:3');
  });
});

describe('every fixture UpdateRequestUI payload parses against scene.ts', () => {
  const scenes = fixture<unknown[]>('request-ui-scenes.json');
  const uiStream = fixture<{ command: string; data?: unknown }[]>('ui-notify-stream.json');
  const fromStream = uiStream.filter((n) => n.command === 'UpdateRequestUI').map((n) => n.data);
  const all = [...scenes, ...fromStream];

  it('there are payloads to check', () => {
    expect(scenes.length).toBeGreaterThan(0);
    expect(fromStream.length).toBeGreaterThan(0);
  });

  it('the client-side ui stream opens with EnterRoom', () => {
    expect(uiStream.at(0)?.command).toBe('EnterRoom');
    expect(uiStream.some((n) => n.command === 'GameOver')).toBe(true);
  });

  it('all parse', () => {
    for (const [i, payload] of all.entries()) {
      const r = SceneChangeSchema.safeParse(payload);
      expect(r.success, `scene ${i}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });

  it('every _type is declared', () => {
    const types = new Set(all.map((p) => (p as { _type: string })._type));
    expect([...types].filter((t) => !(SCENE_TYPES as readonly string[]).includes(t))).toEqual([]);
  });

  it('every elemType key is declared', () => {
    const elems = new Set<string>();
    for (const p of all) {
      for (const k of Object.keys(p as object)) if (!k.startsWith('_')) elems.add(k);
      for (const n of (p as { _new?: { type: string }[] })._new ?? []) elems.add(n.type);
      for (const d of (p as { _delete?: { type: string }[] })._delete ?? []) elems.add(d.type);
    }
    expect([...elems].filter((e) => !(ELEM_TYPES as readonly string[]).includes(e))).toEqual([]);
  });
});

describe('dialog-shaped requests', () => {
  const payloads = fixture<Record<string, unknown[]>>('request-payloads.json');

  const rendersUi = (m: object) => (m as { rendersUi?: boolean }).rendersUi !== false;

  it('every recorded request command is declared and marked exercised', () => {
    for (const command of Object.keys(payloads)) {
      expect(DIALOG_REQUESTS, `undeclared request command ${command}`).toHaveProperty(command);
      expect(
        DIALOG_REQUESTS[command as keyof typeof DIALOG_REQUESTS].exercised,
        `${command} has a fixture but is marked unexercised`,
      ).toBe(true);
    }
  });

  it('nothing claims to be exercised without a fixture', () => {
    for (const [command, meta] of Object.entries(DIALOG_REQUESTS)) {
      if (meta.exercised && rendersUi(meta)) {
        expect(payloads, `${command} marked exercised`).toHaveProperty(command);
      }
    }
  });

  it('arrange-cards and poxi are honestly marked unexercised', () => {
    expect(DIALOG_REQUESTS.AskForArrangeCards.exercised).toBe(false);
    expect(DIALOG_REQUESTS.AskForPoxi.exercised).toBe(false);
  });
});

describe('manifests', () => {
  it('lua manifest validates', () => {
    const m = LuaManifestSchema.parse(fixture('lua-manifest.json'));
    expect(m.packages).toContain('test'); // ModManager unconditionally requires it
    expect(m.entry).toBe('lua/freekill.lua');
  });

  it('asset manifest validates and indexes by engine path', () => {
    const m = AssetManifestSchema.parse(fixture('asset-manifest.json'));
    expect(m.entries.length).toBeGreaterThan(500);
    const idx = assetIndex(m);
    const general = m.entries.find((e) => e.kind === 'general')!;
    expect(idx.get(general.key)).toBe(general);
    expect(general.key.startsWith('packages/')).toBe(true);
  });
});

describe('command log', () => {
  type Log = { seed: number; steps: { seq: number; playerId: number; command: string; digest: string }[] };
  const log = fixture<Log>('command-log.json');

  it('is seed + a dense ordered decision list', () => {
    expect(Number.isInteger(log.seed)).toBe(true);
    expect(log.steps.length).toBeGreaterThan(100);
    log.steps.forEach((s, i) => {
      expect(s.seq).toBe(i + 1);
      expect(s.digest).toMatch(/^[0-9a-f]{16}$/);
      expect(s.playerId).toBeGreaterThan(0);
    });
  });

  it('every logged command is a declared request command', () => {
    for (const s of log.steps) expect(DIALOG_REQUESTS).toHaveProperty(s.command);
  });

  it('replies are plain data (no live engine objects leaked into the log)', () => {
    const src = readFileSync(join(FIX, 'command-log.lua'), 'utf8');
    expect(src.startsWith('return {')).toBe(true);
    expect(src).not.toMatch(/function|<[a-z]+:/);
  });
});

describe('cbor tag handling', () => {
  it('recognises the five engine tags', () => {
    expect(Object.values(CBOR_TAG)).toEqual([33001, 33002, 33003, 33004, 33005]);
    expect(isTaggedRef({ __tag: CBOR_TAG.REAL_CARD, value: 42 })).toBe(true);
    expect(isTaggedRef({ __tag: 7, value: 42 })).toBe(false);
    expect(isTaggedRef(42)).toBe(false);
  });

  it('binary payloads carry the bytes prefix rather than mangled text', () => {
    const stream = fixture<{ data?: unknown }[]>('seat-command-stream.json');
    const strings = stream.flatMap((m) => (typeof m.data === 'string' ? [m.data] : []));
    for (const s of strings) {
      if (s.startsWith(BYTES_PREFIX)) expect(s.slice(BYTES_PREFIX.length)).toMatch(/^[0-9a-f]*$/);
    }
  });
});
