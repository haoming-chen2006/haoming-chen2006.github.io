/**
 * Hash routing, on purpose.
 *
 * The app is served as static files from a GitHub Pages subpath. History
 * routing there needs a 404.html fallback that rewrites every deep link, which
 * breaks the moment the path moves. A join link has to survive being pasted
 * into a group chat, so it gets the boring mechanism that cannot break:
 * `.../freekill/#/join/ABCD`.
 */
import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'lobby' }
  | { name: 'room'; roomId: string }
  | { name: 'join'; code: string }
  | { name: 'overview'; tab: 'generals' | 'cards' | 'modes' | 'skills' };

const OVERVIEW_TABS = ['generals', 'cards', 'modes', 'skills'] as const;

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const [head, ...rest] = path.split('/').filter(Boolean);
  switch (head) {
    case undefined:
    case '':
      return { name: 'landing' };
    case 'lobby':
      return { name: 'lobby' };
    case 'room':
      return rest[0] ? { name: 'room', roomId: rest[0] } : { name: 'lobby' };
    case 'join':
      return rest[0] ? { name: 'join', code: rest[0].toUpperCase() } : { name: 'lobby' };
    case 'overview': {
      const tab = OVERVIEW_TABS.find((t) => t === rest[0]) ?? 'generals';
      return { name: 'overview', tab };
    }
    default:
      return { name: 'landing' };
  }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'landing': return '#/';
    case 'lobby': return '#/lobby';
    case 'room': return `#/room/${route.roomId}`;
    case 'join': return `#/join/${route.code}`;
    case 'overview': return `#/overview/${route.tab}`;
  }
}

/** Absolute link a friend can open. The entire "share a link" journey. */
export function shareUrl(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/join/${code}`;
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((r: Route) => {
    const next = href(r);
    if (window.location.hash === next) setRoute(r);
    else window.location.hash = next;
  }, []);
  return [route, navigate];
}
