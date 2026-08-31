/**
 * Identity, and the fact that it survives a reload.
 *
 * "Type a name and play" is the entire login. Anonymous auth issues the user id;
 * the display name and avatar ride along with it. Both are read back on mount,
 * so a refresh — including a refresh mid-game — puts the same person back in the
 * same seat rather than asking who they are again.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getLanguage, t } from '../i18n';
import { getApi } from './api';
import type { Identity, LobbyApi } from './api';
import type { Loaded } from './boot';

interface SessionValue {
  readonly api: LobbyApi;
  readonly loaded: Loaded;
  readonly identity: Identity | null;
  signIn(displayName: string, avatar: string): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

export function SessionProvider(
  { api, loaded, initialIdentity, children }:
  { api: LobbyApi; loaded: Loaded; initialIdentity: Identity | null; children: ReactNode },
) {
  const [identity, setIdentity] = useState<Identity | null>(initialIdentity);

  // A session restored by the auth library after mount (token refresh, magic
  // link) must not leave the UI on the sign-in screen.
  useEffect(() => {
    let live = true;
    if (!identity) void api.currentIdentity().then((i) => { if (live && i) setIdentity(i); });
    return () => { live = false; };
  }, [api, identity]);

  const signIn = useCallback(async (displayName: string, avatar: string) => {
    setIdentity(await api.signIn(displayName.trim().slice(0, 24) || t('session.anonymous', getLanguage()), avatar));
  }, [api]);

  const signOut = useCallback(async () => {
    await api.signOut();
    setIdentity(null);
  }, [api]);

  const value = useMemo<SessionValue>(
    () => ({ api, loaded, identity, signIn, signOut }),
    [api, loaded, identity, signIn, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
