/**
 * One envelope, one key.
 *
 * `liveTable` deduplicates envelopes so a redelivered flush is not applied
 * twice. Its key was `${batch}:${to}`, which assumes one envelope per flush
 * per recipient — true until `routeFlush` began splitting a batch at every
 * public/private transition (`ecdc247`), after which a batch that alternates
 * carries two envelopes to the same recipient and the second was silently
 * dropped as a duplicate.
 *
 * In a three-human 斗地主 the opening does exactly that, and the seat that lost
 * its second private run never received its hand: 0 cards, no request, while
 * the engine waited on it and the other two watched a frozen log. Reproduced
 * with three real browsers. The key now includes the envelope's first seq,
 * which is distinct per envelope within a batch (runs are contiguous and
 * disjoint) and identical on a genuine redelivery.
 */
import { describe, expect, it } from 'vitest';
import type { Envelope } from '../../contract/protocol.ts';
import { envelopeKey } from '../liveTable.ts';

const env = (batch: number, to: number | null, seq: number): Envelope =>
  ({ roomId: 'r', batch, to, messages: [{ seq, kind: 'notify', command: 'AddPlayer', data: null, bytes: 0, payload: '' }] } as unknown as Envelope);

describe('the envelopes a seat applies', () => {
  it('keeps both halves of a batch that alternates public and private', () => {
    // public run, private run to seat 2, public run again — three envelopes,
    // the third addressed to the same recipient (`null`) as the first.
    const batch = [env(7, null, 1), env(7, 2, 4), env(7, null, 9)];
    const keys = new Set(batch.map(envelopeKey));
    expect(keys.size).toBe(3);
  });

  it('still recognises a genuine redelivery of the same envelope', () => {
    const once = env(7, null, 1);
    const again = env(7, null, 1);
    expect(envelopeKey(once)).toBe(envelopeKey(again));
  });

  it('never conflates two seats\' private runs in one batch', () => {
    expect(envelopeKey(env(7, 2, 4))).not.toBe(envelopeKey(env(7, 3, 4)));
  });
});
