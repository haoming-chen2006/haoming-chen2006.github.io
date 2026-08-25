// Talking to a room. The browser never writes the table — it posts actions to the
// `action` function and watches the row for the result. Reads go straight to
// PostgREST and Realtime with the anon key, which RLS makes read-only.

import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { ModeId } from '../engine/card'
import type { Action, Config, RoomState } from '../engine/state'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Whether this build can reach a backend at all. Without it the app still plays
 *  hot seat; it just cannot offer a room, and says so rather than failing later. */
export const online = Boolean(URL_ && ANON)

let client: SupabaseClient | null = null
function db(): SupabaseClient {
  if (!online) throw new Error('this build has no Supabase settings')
  client ??= createClient(URL_!, ANON!)
  return client
}

/** Your identity in every room you ever join. Survives a reload, which is the
 *  whole reason a reconnect can find its seat again. */
export function myToken(): string {
  const KEY = 'draft.token'
  const kept = localStorage.getItem(KEY)
  if (kept !== null && kept !== '') return kept
  const made = crypto.randomUUID()
  localStorage.setItem(KEY, made)
  return made
}

/** Remember which room this browser was last in, so a reload can walk back in. */
export const rememberRoom = (code: string) => localStorage.setItem('draft.room', code)
export const forgetRoom = () => localStorage.removeItem('draft.room')
export const lastRoom = (): string | null => localStorage.getItem('draft.room')

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(
      res.status === 404
        ? `the ${name} function is not deployed yet`
        : `${name} answered ${res.status}`,
    )
  }
  if (!res.ok) throw new Error((parsed as { error?: string }).error ?? `${name} failed`)
  return parsed as T
}

export const createRoom = (mode: ModeId, config: Partial<Config>) =>
  callFunction<{ code: string; state: RoomState; version: number }>('action', {
    op: 'create',
    mode,
    config,
  })

export const send = (code: string, action: Action) =>
  callFunction<{ state: RoomState; version: number }>('action', {
    op: 'act',
    code,
    seatId: myToken(),
    action,
  })

export const askForVerdict = (code: string) =>
  callFunction<{ state: RoomState; version: number }>('judge', { code })

export async function fetchRoom(code: string): Promise<RoomState | null> {
  const { data, error } = await db()
    .from('rooms')
    .select('state')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.state as RoomState | undefined) ?? null
}

/** Watch a room. Realtime pushes the whole row on every write, and a poll every
 *  few seconds covers the case where the socket quietly drops — a missed update
 *  in an eight second round is the difference between bidding and not. */
export function watchRoom(code: string, onState: (state: RoomState) => void): () => void {
  const room = code.toUpperCase()
  let channel: RealtimeChannel | null = null
  let stopped = false

  channel = db()
    .channel(`room:${room}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${room}` },
      (payload) => {
        const next = (payload.new as { state?: RoomState }).state
        if (next && !stopped) onState(next)
      },
    )
    .subscribe()

  const poll = setInterval(() => {
    fetchRoom(room)
      .then((state) => state && !stopped && onState(state))
      .catch(() => {})
  }, 4_000)

  return () => {
    stopped = true
    clearInterval(poll)
    if (channel) db().removeChannel(channel)
  }
}
