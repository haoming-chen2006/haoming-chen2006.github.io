/**
 * Finding a clip, the way the engine finds one.
 *
 * A port of the lookup half of `Fk/Base/SkinBank.qml` — `getAudioByPath` for a
 * path the engine built itself, `getAudio` for a name it expects a package to
 * hold. The path conventions are the engine's:
 *
 *   card use        packages/<pkg>/audio/card/<male|female>/<card>
 *   equip proc      packages/<pkg>/audio/card/<equip>
 *   wearing equip   audio/card/common/<weapon|armor|horse>
 *   interface       audio/system/<name>
 *   skill line      packages/<pkg>/audio/skill/<skill>[_<general>][<take>]
 *   death line      packages/<pkg>/audio/death/<general>
 *
 * The one thing this does that `SkinBank` does not is search every package in
 * the index rather than one named extension. `SkinBank.getAudio` is handed the
 * general's `extension` by a call into the client VM; a cue arriving here has
 * only a name, and asking the Lua VM for a general's package on every skill
 * invocation to save a `Map` lookup would be a strange trade. Names collide
 * across packages roughly never, and where they do, either take is right.
 */
import { CLIP_BY_KEY, CLIPS, type Clip } from './clips.generated';

/** `packages/<pkg>/audio/skill/fankui1` -> `audio/skill/fankui1`. */
function tailOf(key: string): string {
  const m = /^packages\/[^/]+\/(audio\/.+)$/.exec(key);
  return m ? m[1] : key;
}

/**
 * Every clip that ends in the same package-relative path, keyed by that path.
 *
 * Built once at import: 89 rows today, a few thousand if a voice bank is ever
 * added, and either way it is a `Map` construction rather than a scan per cue.
 */
const BY_TAIL: ReadonlyMap<string, readonly Clip[]> = (() => {
  const m = new Map<string, Clip[]>();
  for (const c of CLIPS) {
    const tail = tailOf(c.key);
    const bucket = m.get(tail);
    if (bucket) bucket.push(c);
    else m.set(tail, [c]);
  }
  return m;
})();

/** A clip the engine named by its full path. `getAudioByPath`. */
export function clipByKey(key: string): Clip | undefined {
  return CLIP_BY_KEY.get(key) ?? BY_TAIL.get(tailOf(key))?.[0];
}

/**
 * The takes of one line, in order.
 *
 * `SkinBank.getAudio` tries `<name>.mp3` and then `<name>1.mp3`, because a line
 * with a single take is stored unnumbered and a line with several is numbered
 * from one. Both shapes end up in the same bucket here, sorted, so "the third
 * take" and "any take" are both a subscript.
 */
export function takesOf(bank: 'skill' | 'death', name: string): readonly Clip[] {
  const exact = BY_TAIL.get(`audio/${bank}/${name}`) ?? [];
  const numbered: Clip[] = [];
  for (let n = 1; n <= 12; n += 1) {
    const hit = BY_TAIL.get(`audio/${bank}/${name}${n}`);
    if (!hit) break;
    numbered.push(hit[0]);
  }
  return numbered.length ? numbered : exact;
}

/**
 * One take. `index` is the engine's `data.i`: -1 means whichever, and a real
 * index is 1-based because that is how the files are numbered.
 */
export function pickTake(takes: readonly Clip[], index: number, rand = Math.random): Clip | undefined {
  if (!takes.length) return undefined;
  if (index > 0 && index <= takes.length) return takes[index - 1];
  return takes[Math.floor(rand() * takes.length)];
}

export { CLIPS, CLIP_BY_KEY };
export type { Clip, ClipRole } from './clips.generated';

/** True when this build shipped recorded performances at all. See `provenance.json`. */
export const HAS_VOICE_BANK = CLIPS.some((c) => c.role === 'voice');
