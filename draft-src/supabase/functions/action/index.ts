// The only thing that writes a room. A browser never touches the table: it posts
// an action here, this runs the same rules the browser runs, and the new state is
// pushed back out over Realtime.
//
// Talks to PostgREST with plain fetch and the service role key. No SDK, because a
// dependency that fails to resolve at deploy time is a dependency that costs an
// evening.

import { apply } from '../_shared/engine/rules.ts'
import { MODES, type ModeId } from '../_shared/engine/card.ts'
import { newRoom, type Action, type BankCard, type Config, type RoomState } from '../_shared/engine/state.ts'

const URL_ = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

/** Codes people read aloud over a call: no O/0, no I/1. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () =>
  Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

type Row = { code: string; mode: ModeId; state: RoomState; version: number }

async function read(code: string): Promise<Row | null> {
  const res = await rest(`rooms?code=eq.${encodeURIComponent(code)}&select=code,mode,state,version`)
  if (!res.ok) throw new Error(`read failed: ${res.status} ${await res.text()}`)
  const rows = (await res.json()) as Row[]
  return rows[0] ?? null
}

/** The draw order for a draft, decided here so no browser can pick its own. */
async function pool(mode: ModeId): Promise<BankCard[]> {
  const bank = JSON.parse(await Deno.readTextFile(new URL(`./banks/${mode}.json`, import.meta.url)))
  const order: BankCard[] = bank.cards.map((c: { id: string; position: string }) => ({
    id: c.id,
    position: c.position,
  }))
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'post something' }, 405)

  let body: {
    op?: 'create' | 'act'
    code?: string
    seatId?: string
    mode?: ModeId
    config?: Partial<Config>
    action?: Action
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'that was not JSON' }, 400)
  }

  try {
    if (body.op === 'create') {
      const mode = body.mode
      if (mode === undefined || !(mode in MODES)) return json({ error: 'unknown mode' }, 400)

      // Four letters is 1M rooms; a couple of tries is plenty to dodge a clash.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = newCode()
        const state = newRoom(mode, body.config ?? {})
        const res = await rest('rooms', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ code, mode, state, version: 0 }),
        })
        if (res.ok) return json({ code, state, version: 0 })
        if (res.status !== 409) return json({ error: await res.text() }, 500)
      }
      return json({ error: 'could not find a free room code' }, 503)
    }

    const { code, seatId, action } = body
    if (!code || !seatId || !action) return json({ error: 'need a code, a seat and an action' }, 400)

    // Read, run the rules, write only if nobody moved first. Three goes, then we
    // tell the caller they were too slow rather than guessing.
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = await read(code)
      if (row === null) return json({ error: `there is no room ${code}` }, 404)

      const resolved = resolveSeat(row.state, seatId, action)
      if ('error' in resolved) return json({ error: resolved.error }, 403)

      const withPool =
        resolved.action.type === 'start'
          ? { ...resolved.action, bank: await pool(row.mode) }
          : resolved.action

      const result = apply(row.state, withPool, Date.now())
      if (!result.ok) return json({ error: result.reason }, 409)

      // Nothing changed — an early or duplicate resolve. Don't burn a version.
      if (JSON.stringify(result.state) === JSON.stringify(row.state))
        return json({ state: row.state, version: row.version })

      const res = await rest(
        `rooms?code=eq.${encodeURIComponent(code)}&version=eq.${row.version}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            state: result.state,
            version: row.version + 1,
            updated_at: new Date().toISOString(),
          }),
        },
      )
      if (!res.ok) return json({ error: await res.text() }, 500)

      const written = (await res.json()) as Row[]
      if (written.length > 0) return json({ state: result.state, version: row.version + 1 })
      // Zero rows: somebody else got there between our read and our write. Retry.
    }

    return json({ error: 'too late — somebody got there first' }, 409)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

/** A caller proves who they are with their seat token; the rules only ever see an
 *  index. This is the whole of the trust boundary: a browser cannot act as a seat
 *  it does not hold, and cannot start a draft it does not host. */
function resolveSeat(
  state: RoomState,
  seatId: string,
  action: Action,
): { action: Action } | { error: string } {
  if (action.type === 'join') return { action: { ...action, seatId } }

  const seat = state.seats.findIndex((s) => s.id === seatId)
  if (seat < 0) return { error: 'you are not in this room' }

  // Anyone may nudge a round along — resolve is a no-op unless it is genuinely due.
  if (action.type === 'resolve' || action.type === 'judge') return { action }

  if (action.type === 'start') {
    if (seat !== 0) return { error: 'only the host can start the draft' }
    return { action }
  }

  return { action: { ...action, seat } as Action }
}
