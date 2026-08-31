/**
 * Binds the shell to whichever backplane exists.
 *
 * Agent 2 owns `src/net/`. Until it lands the shell runs on the local API, and
 * the lobby says so. The glob is what makes this work either way: `import.meta
 * .glob` resolves to an empty object when the file is absent, so the build never
 * breaks on a module that is not written yet, and picks it up with no edit here
 * once it is.
 *
 * The expected export from `src/net/index.ts` is one of `createLobbyApi` /
 * `createApi` / `lobbyApi`, returning (or being) a `LobbyApi`.
 */
import type { LobbyApi } from './types';
import { createLocalApi } from './local';

export type { LobbyApi } from './types';
export * from './types';

const netModules = import.meta.glob<Record<string, unknown>>('../../net/index.ts');

let cached: Promise<LobbyApi> | null = null;

async function resolveApi(): Promise<LobbyApi> {
  const entry = Object.values(netModules)[0];
  if (entry) {
    try {
      const mod = await entry();
      for (const name of ['createLobbyApi', 'createApi', 'createSupabaseApi']) {
        const factory = mod[name];
        if (typeof factory === 'function') return (factory as () => LobbyApi)();
      }
      const direct = mod.lobbyApi;
      if (direct && typeof direct === 'object') return direct as LobbyApi;
      console.warn('[api] src/net exists but exports no LobbyApi factory; using the local API');
    } catch (e) {
      console.warn('[api] src/net failed to load; using the local API', e);
    }
  }
  return createLocalApi();
}

export function getApi(): Promise<LobbyApi> {
  cached ??= resolveApi();
  return cached;
}
