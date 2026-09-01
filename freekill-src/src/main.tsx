/**
 * The meeting point: the real assets, the real backplane, the real room.
 *
 * Load order is the first-run experience and it is deliberate. The three
 * manifests — assets, Lua bundle, overview — are a few tens of KB and gate the
 * first paint. The 1.5 MB Lua bundle does not: it is prefetched in the
 * background once the lobby is up, and only awaited when a game actually
 * starts. That is what keeps a cold load to a playable lobby well inside the
 * spec's ten seconds.
 *
 * If the load fails, the app says what failed and offers a retry. A blank page
 * with a console error is not an error screen.
 */
import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageToggle, useT } from './i18n';
import { App } from './shell/App';
import { GameAudio } from './room/audio';
import { SessionProvider } from './shell/session';
import { getApi, type Identity, type LobbyApi } from './shell/api';
import { loadShell, prefetchLuaBundle, type Loaded } from './shell/boot';
import './shell/shell.css';

interface BootState {
  step: string;
  done: number;
  total: number;
  ready?: { api: LobbyApi; loaded: Loaded; identity: Identity | null };
  error?: unknown;
}

function Boot() {
  const t = useT();
  const [state, setState] = useState<BootState>({ step: '', done: 0, total: 4 });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const loaded = await loadShell((step, done, total) => {
          if (live) setState((s) => ({ ...s, step, done, total: total + 1 }));
        });
        if (!live) return;
        setState((s) => ({ ...s, step: t('boot.step.connect') }));
        const api = await getApi();
        const identity = await api.currentIdentity();
        if (!live) return;
        // Warm the engine bundle behind the lobby; nobody waits on it here.
        void prefetchLuaBundle().catch(() => {});
        setState({ step: t('boot.step.ready'), done: 4, total: 4, ready: { api, loaded, identity } });
      } catch (error) {
        if (live) setState((s) => ({ ...s, error }));
      }
    })();
    return () => { live = false; };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ step: t('boot.step.retry'), done: 0, total: 4 });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (state.ready || state.error) document.getElementById('boot')?.remove();
  }, [state.ready, state.error]);

  if (state.error) {
    const message = state.error instanceof Error ? state.error.message : String(state.error);
    return (
      <div className="boot-screen error">
        <LanguageToggle position="fixed" />
        <div className="title">{t('boot.failed.title')}</div>
        <p className="step">{t('boot.failed.body')}</p>
        <pre>{message}</pre>
        <button className="btn" onClick={retry}>{t('boot.retry')}</button>
      </div>
    );
  }

  if (!state.ready) {
    return (
      <div className="boot-screen">
        {/* Before the app exists there is no header to hang it on, so the
            toggle parks itself in the viewport's top corner instead. */}
        <LanguageToggle position="fixed" />
        <div className="title">{t('brand.name')}</div>
        <div className="bar"><i style={{ width: `${(state.done / state.total) * 100}%` }} /></div>
        <div className="step">{state.step || t('boot.step.start')}</div>
      </div>
    );
  }

  const { api, loaded, identity } = state.ready;
  return (
    <SessionProvider api={api} loaded={loaded} initialIdentity={identity}>
      <App />
    </SessionProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
    {/* Outside <Boot> on purpose: the music has to survive a route change and
        the control has to exist on the boot screen too, so it is a sibling of
        the whole app rather than a child of any page. It is silent — and loads
        nothing that can make a noise — until the player asks. See
        `src/room/audio/`. */}
    <GameAudio />
  </StrictMode>,
);
