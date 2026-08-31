/**
 * URL to seated.
 *
 * Four routes, one rule: anything that needs a name redirects to the landing
 * page and comes back afterwards. A join link opened by a stranger therefore
 * asks for a name once and drops them straight into the room — it never loses
 * the room on the way through sign-in.
 */
import { useCallback, useEffect, useState } from 'react';
import { LanguageToggle, useT } from '../i18n';
import { href, useRoute } from './router';
import type { Route } from './router';
import { useSession } from './session';
import { generalAvatar } from './boot';
import { Landing } from './pages/Landing';
import { Lobby } from './pages/Lobby';
import { RoomPage } from './pages/RoomPage';
import { Overview } from './pages/Overview';

export function App() {
  const t = useT();
  const [route, navigate] = useRoute();
  const { api, loaded, identity, signOut } = useSession();
  const [pending, setPending] = useState<Route | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const needsName = !identity && route.name !== 'landing' && route.name !== 'overview';

  useEffect(() => {
    if (needsName) {
      setPending(route);
      navigate({ name: 'landing' });
    }
  }, [needsName, route, navigate]);

  // A join link is a code, not a room id: resolve it once signed in.
  useEffect(() => {
    if (route.name !== 'join' || !identity) return;
    let live = true;
    setJoinError(null);
    void api.joinByCode(route.code)
      .then((room) => { if (live) navigate({ name: 'room', roomId: room.summary.id }); })
      .catch((e) => { if (live) setJoinError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [route, identity, api, navigate]);

  const afterSignIn = useCallback(() => {
    const next = pending ?? { name: 'lobby' as const };
    setPending(null);
    navigate(next);
  }, [pending, navigate]);

  const avatarSrc = identity ? generalAvatar(loaded, identity.avatar) : null;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={href({ name: 'landing' })}>{t('brand.name')}</a>
        <nav>
          <a href={href({ name: 'lobby' })} aria-current={route.name === 'lobby' ? 'page' : undefined}>
            {t('nav.lobby')}
          </a>
          <a
            href={href({ name: 'overview', tab: 'generals' })}
            aria-current={route.name === 'overview' ? 'page' : undefined}
          >
            {t('nav.overview')}
          </a>
        </nav>
        {/* The whole game switches from here, on every page: the header is
            rendered for all four routes, so the control is always one click
            away — lobby, waiting room, table and reference alike. */}
        <LanguageToggle />
        {identity
          ? (
            <div className="who">
              {avatarSrc ? <img className="avatar" src={avatarSrc} alt="" /> : null}
              <span>{identity.displayName}</span>
              <button className="btn small ghost" onClick={() => void signOut()}>{t('app.changeName')}</button>
            </div>
          )
          : null}
      </header>

      {route.name === 'landing' ? <Landing onDone={afterSignIn} /> : null}
      {route.name === 'lobby' ? <Lobby onEnterRoom={(id) => navigate({ name: 'room', roomId: id })} /> : null}
      {route.name === 'room'
        ? <RoomPage roomId={route.roomId} onLeave={() => navigate({ name: 'lobby' })} />
        : null}
      {route.name === 'join'
        ? (
          <div className="page">
            <h2>{t('app.join.title', { code: route.code })}</h2>
            {joinError
              ? (
                <>
                  <p className="notice">{joinError}</p>
                  <button className="btn" style={{ marginTop: 14 }} onClick={() => navigate({ name: 'lobby' })}>
                    {t('app.backToLobby')}
                  </button>
                </>
              )
              : <p className="lede">{t('app.join.wait')}</p>}
          </div>
        )
        : null}
      {route.name === 'overview'
        ? <Overview tab={route.tab} onTab={(tab) => navigate({ name: 'overview', tab })} />
        : null}
    </div>
  );
}
