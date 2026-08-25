// The judge. Holds the OpenAI key, reads the hidden stats no browser ever sees,
// and rules on the rosters.
//
// The stats are the point: the whole draft is played blind, and this is the only
// place the numbers and the lineups meet. They are bundled into this function and
// are not in the repo and not in the app.

import { apply } from '../_shared/engine/rules.ts'
import type { ModeId } from '../_shared/engine/card.ts'
import type { RoomState, Verdict } from '../_shared/engine/state.ts'
import { nba } from '../_shared/modes/nba.ts'
import { soccer } from '../_shared/modes/soccer.ts'
import { hok } from '../_shared/modes/hok.ts'

import nbaBank from '../_shared/banks/nba.json' with { type: 'json' }
import soccerBank from '../_shared/banks/soccer.json' with { type: 'json' }
import hokBank from '../_shared/banks/hok.json' with { type: 'json' }
import nbaHidden from './hidden/nba.json' with { type: 'json' }
import soccerHidden from './hidden/soccer.json' with { type: 'json' }
import hokHidden from './hidden/hok.json' with { type: 'json' }

const URL_ = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI = Deno.env.get('OPENAI_API_KEY')
const MODEL = Deno.env.get('JUDGE_MODEL') ?? 'gpt-5.6'

const BRIEFS = { nba, soccer, hok }
const BANKS: Record<ModeId, { cards: { id: string; name: string; description: string }[] }> = {
  nba: nbaBank,
  soccer: soccerBank,
  hok: hokBank,
}
const HIDDEN: Record<ModeId, { hidden: Record<string, Record<string, string | number>> }> = {
  nba: nbaHidden,
  soccer: soccerHidden,
  hok: hokHidden,
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

/** Strict mode wants every field required and additionalProperties false, all the
 *  way down. Anything looser and the request is rejected outright. */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ranking', 'winnerSeat', 'reasoning'],
  properties: {
    ranking: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['seat', 'place', 'summary'],
        properties: {
          seat: { type: 'integer', description: 'the seat number given in the prompt' },
          place: { type: 'integer', description: '1 is best' },
          summary: {
            type: 'string',
            description: 'two or three sentences naming specific players on that team',
          },
        },
      },
    },
    winnerSeat: { type: 'integer' },
    reasoning: {
      type: 'string',
      description: 'the case for the ruling, comparing the teams by name',
    },
  },
} as const

function buildPrompt(state: RoomState): string {
  const mode = BRIEFS[state.mode]
  const cards = new Map(BANKS[state.mode].cards.map((c) => [c.id, c]))
  const stats = HIDDEN[state.mode].hidden

  const teams = state.seats
    .map((seat, i) => ({ seat, i }))
    .filter(({ seat }) => !seat.eliminated)
    .map(({ seat, i }) => {
      const lineup = mode.slots
        .map((slot, s) => {
          const id = seat.slots[s]
          if (id === null || id === undefined) return `  ${slot}: (empty)`
          const card = cards.get(id)
          const line = stats[id]
          const numbers = line
            ? Object.entries(line)
                .map(([k, v]) => `${k.replaceAll('_', ' ')} ${v}`)
                .join(', ')
            : 'no data'
          return `  ${slot}: ${card?.name ?? id} — ${card?.description ?? ''} — paid $${seat.paid[id] ?? 0} — ${numbers}`
        })
        .join('\n')
      return `Seat ${i} — ${seat.name} (spent $${Object.values(seat.paid).reduce((a, b) => a + b, 0)}, $${seat.budget} unspent)\n${lineup}`
    })
    .join('\n\n')

  return `You are judging a draft. ${mode.label} rules.

${mode.judgeBrief}

Each team below was built by bidding real money out of a fixed budget on cards that
showed only a name, a description and a picture — the numbers you are about to read
were hidden from the drafters the entire time. Prices are shown so you can see what
each drafter believed.

${teams}

Rank every team from best to worst, give each a place starting at 1, and name
specific players in every summary. Then make the case for your ruling. Judge the
team, not the totals.`
}

async function callJudge(prompt: string): Promise<{ verdict: Verdict } | { error: string }> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      text: { format: { type: 'json_schema', name: 'verdict', schema: SCHEMA, strict: true } },
    }),
  })

  if (!res.ok) return { error: `the judge refused the call: ${res.status} ${await res.text()}` }

  const body = await res.json()

  // A safety decline comes back as its own content item rather than as the JSON
  // we asked for. Never parse past it, and never invent a winner.
  for (const item of body.output ?? [])
    for (const part of item.content ?? [])
      if (part.type === 'refusal') return { error: `the judge declined: ${part.refusal}` }

  if (body.status === 'incomplete')
    return { error: `the judge ran out of room: ${body.incomplete_details?.reason ?? 'unknown'}` }

  const text =
    body.output_text ??
    (body.output ?? [])
      .flatMap((item: { content?: { type: string; text?: string }[] }) => item.content ?? [])
      .filter((part: { type: string }) => part.type === 'output_text')
      .map((part: { text?: string }) => part.text ?? '')
      .join('')

  if (!text) return { error: 'the judge said nothing' }

  try {
    return { verdict: JSON.parse(text) as Verdict }
  } catch {
    return { error: 'the judge did not return the shape it was asked for' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'post something' }, 405)
  if (!OPENAI) return json({ error: 'no OPENAI_API_KEY is set on this project' }, 503)

  try {
    const { code } = (await req.json()) as { code?: string }
    if (!code) return json({ error: 'which room?' }, 400)

    const read = await rest(`rooms?code=eq.${encodeURIComponent(code)}&select=code,mode,state,version`)
    if (!read.ok) return json({ error: await read.text() }, 500)
    const rows = (await read.json()) as { state: RoomState; version: number }[]
    const row = rows[0]
    if (!row) return json({ error: `there is no room ${code}` }, 404)

    // Whoever got here first has already done the work.
    if (row.state.verdict !== null) return json({ state: row.state, version: row.version })
    if (row.state.phase !== 'judging') return json({ error: 'this draft is not finished' }, 409)

    const ruled = await callJudge(buildPrompt(row.state))
    if ('error' in ruled) return json({ error: ruled.error }, 502)

    // The reveal goes out with the ruling, and covers only cards somebody actually
    // drafted — the rest of the pool stays unknown, as it should.
    const drafted = new Set(row.state.seats.flatMap((s) => s.slots.filter((c) => c !== null)))
    const stats = HIDDEN[row.state.mode].hidden
    const reveal = Object.fromEntries(
      [...drafted].filter((id) => stats[id as string]).map((id) => [id, stats[id as string]]),
    )

    const result = apply(row.state, { type: 'judge', verdict: ruled.verdict, reveal }, Date.now())
    if (!result.ok) return json({ error: result.reason }, 409)

    const write = await rest(`rooms?code=eq.${encodeURIComponent(code)}&version=eq.${row.version}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        state: result.state,
        version: row.version + 1,
        updated_at: new Date().toISOString(),
      }),
    })
    if (!write.ok) return json({ error: await write.text() }, 500)

    return json({ state: result.state, version: row.version + 1 })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
