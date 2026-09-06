/**
 * The catalog is a claim about the roster, so it is checked against the roster.
 *
 * `catalog.generated.ts` is committed because it is derived from a tree
 * (`$FK_ROOT`) that is not this repository. A committed derivative goes stale
 * silently, and this one did: the roster grew from 341 generals to 697 and the
 * catalog stayed at the 110 it had been generated against, so six seats in
 * eight showed the default portrait and the players read it as the skins
 * having been removed. This regenerates and compares, exactly as
 * `scripts/catalogue.test.ts` does for the designer's vocabulary.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG_PATH, computeSkinCatalog, renderCatalog } from '../generate.mjs';

describe('the shipped skin catalog', () => {
  it('matches what the engine currently loads', async () => {
    const rows = await computeSkinCatalog();
    expect(
      renderCatalog(rows),
      'run `node src/room/skins/generate.mjs` — the roster or the pack changed under the committed catalog',
    ).toEqual(readFileSync(CATALOG_PATH, 'utf8'));
  }, 300_000);
});
