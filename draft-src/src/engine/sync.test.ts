import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { forDeno } from '../../scripts/sync-engine.mjs'

// The rules must exist once. They are copied into the Edge Function bundle because
// Supabase can only ship what sits under supabase/functions, so this asserts the
// copy is exactly the original with Deno's import extensions added — nothing else.
// If it fails, someone edited the copy, or forgot `npm run sync`.
describe('the engine the server runs', () => {
  for (const file of ['card.ts', 'state.ts', 'rules.ts'])
    it(`is the same ${file} the browser runs`, () => {
      const original = readFileSync(`src/engine/${file}`, 'utf8')
      const shipped = readFileSync(`supabase/functions/_shared/engine/${file}`, 'utf8')

      expect(shipped).toBe(forDeno(original))
    })

  it('adds the .ts Deno needs and changes nothing else', () => {
    expect(forDeno("import { MODES } from './card'")).toBe("import { MODES } from './card.ts'")
    expect(forDeno("import { nba } from '../engine/card'")).toBe(
      "import { nba } from '../engine/card.ts'",
    )
    expect(forDeno("import x from 'node:fs'")).toBe("import x from 'node:fs'")
    expect(forDeno("const s = 'from ./nothing'")).toBe("const s = 'from ./nothing'")
  })
})
