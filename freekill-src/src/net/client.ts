/**
 * The one Supabase client, plus the escape hatch that makes two of them.
 *
 * The app wants a singleton: one socket, one session in localStorage. Tests want
 * several independent "browsers" inside one process, each with its own anonymous
 * identity — so `createFkClient` takes an isolated storage adapter and the
 * singleton is just the default instance.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const SUPABASE_URL =
  env.VITE_SUPABASE_URL ?? 'https://bgxmcgsfkjhpocptrezi.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_18hn9O3SKu_Sr1H7RRGVKw_5lnb8UJL';

/** Node has no localStorage; supabase-js needs *something* to persist a session. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k); },
    setItem: (k, v) => { m.set(k, v); },
  } as Storage;
}

export interface FkClientOptions {
  /** Own storage => own identity. Tests pass one per simulated player. */
  readonly storage?: Storage;
  readonly storageKey?: string;
}

export function createFkClient(opts: FkClientOptions = {}): SupabaseClient {
  const hasDom = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      // Anonymous sign-in only: no magic links, no redirects, so PKCE's
      // per-browser verifier is never in the way.
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: opts.storageKey ?? 'freekill-auth',
      storage: opts.storage ?? (hasDom ? window.localStorage : memoryStorage()),
    },
    realtime: { params: { eventsPerSecond: 20 } },
  });
}

let shared: SupabaseClient | null = null;

export function fkClient(): SupabaseClient {
  shared ??= createFkClient();
  return shared;
}
