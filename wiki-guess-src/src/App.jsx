import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { getLang, setLang, t } from './i18n';
import { useRoom } from './hooks/useRoom';
import {
  ROUND_DURATION_MS,
  TOTAL_ROUNDS,
  displayTitle,
  formatTime,
  generateRounds,
  randomRoomId,
  scoreRound,
} from './utils/gameLogic';
import {
  fetchArticle,
  resolveTitle,
  rewriteArticleHtml,
  titleFromHref,
  titlesMatchOnWiki,
  translateTitle,
} from './utils/wikipedia';

const NAME_KEY = 'wiki-guess-name';
const SELF_ID_KEY = 'wiki-guess-self-id';

function getSelfId() {
  let id = localStorage.getItem(SELF_ID_KEY);
  if (!id) {
    id = `p_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SELF_ID_KEY, id);
  }
  return id;
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    room: params.get('room')?.trim() || '',
    create: params.get('create') === '1',
  };
}

function setRoomInUrl(roomId) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set('room', roomId);
  else url.searchParams.delete('room');
  url.searchParams.delete('create');
  window.history.replaceState({}, '', url);
}

function ArticleView({ uiLang, wikiLang, title, onNavigate, disabled }) {
  const [article, setArticle] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchArticle(wikiLang, title)
      .then((data) => {
        if (cancelled) return;
        setArticle(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [wikiLang, title]);

  const safeHtml = useMemo(() => {
    if (!article?.html) return '';
    const rewritten = rewriteArticleHtml(article.html, wikiLang);
    return DOMPurify.sanitize(rewritten, {
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    });
  }, [article, wikiLang]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const onClick = (e) => {
      if (disabled) return;
      const anchor = e.target.closest('a');
      if (!anchor) return;
      const nextTitle = titleFromHref(anchor.getAttribute('href'), wikiLang);
      if (!nextTitle) return;
      e.preventDefault();
      onNavigate(nextTitle);
    };

    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [wikiLang, onNavigate, disabled, safeHtml]);

  // Anti-cheat: browsers won't let JS reliably block Cmd/Ctrl+F, so instead we
  // make the article un-searchable. Injecting a zero-width space between every
  // character means find-in-page has no contiguous run of text to match, while
  // the text still reads normally and links still work (clicks use href).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      if (!text || !text.trim()) continue;
      node.nodeValue = Array.from(text).join('\u200B');
    }
  }, [safeHtml]);

  if (loading) return <div className="article-status">{t(uiLang, 'loading')}</div>;
  if (error) return <div className="article-status error">{t(uiLang, 'loadError')}</div>;

  return (
    <div className="article-view">
      <h2 className="article-heading" dangerouslySetInnerHTML={{ __html: article.displayTitle }} />
      <div
        ref={containerRef}
        className="article-body"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </div>
  );
}

function PlayerSidebar({ lang, selfId, playerName, isHost, peers, myProgress, totalScores }) {
  const allPlayers = useMemo(() => {
    const list = [{ id: selfId, name: playerName, isHost, progress: myProgress, isSelf: true }];
    Object.values(peers).forEach((p) => {
      if (p.id && p.id !== selfId) {
        list.push({ id: p.id, name: p.name, isHost: p.isHost, progress: p.progress, isSelf: false });
      }
    });
    // Live scoreboard: highest running score first, ties keep self/join order.
    return list
      .map((p) => ({ ...p, pts: totalScores[p.id] ?? 0 }))
      .sort((a, b) => b.pts - a.pts);
  }, [peers, selfId, playerName, isHost, myProgress, totalScores]);

  return (
    <aside className="sidebar">
      <h3>{t(lang, 'scoreboard')}</h3>
      <ul className="player-list">
        {allPlayers.map((p, idx) => {
          const prog = p.progress ?? {};
          const pts = p.pts;
          let status = t(lang, 'waiting');
          if (prog.finished) status = t(lang, 'finished');
          else if (prog.gaveUp) status = t(lang, 'gaveUp');
          else if (prog.current) status = t(lang, 'playing');

          return (
            <li key={p.id} className={`player-card ${p.isSelf ? 'self' : ''} ${prog.finished ? 'done' : ''}`}>
              <div className="player-top">
                <span className="player-name">
                  <span className="player-rank">{idx + 1}</span>
                  {p.isSelf ? t(lang, 'you') : p.name}
                  {p.isHost ? <span className="host-badge">{t(lang, 'host')}</span> : null}
                </span>
                <span className="player-pts">{t(lang, 'pts', { n: pts })}</span>
              </div>
              <div className="player-status">{status}</div>
              {prog.current ? (
                <div className="player-current">{displayTitle(prog.current)}</div>
              ) : null}
              {prog.hops != null ? (
                <div className="player-hops">{t(lang, 'hops', { n: prog.hops })}</div>
              ) : null}
              {prog.elapsedMs != null && prog.finished ? (
                <div className="player-time">{formatTime(prog.elapsedMs).label}</div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default function App() {
  const [lang, setLangState] = useState(getLang);
  const [gameLang, setGameLang] = useState(null);
  const [screen, setScreen] = useState('lobby');
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [roomId, setRoomId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [selfId] = useState(getSelfId);
  const [copied, setCopied] = useState(false);

  const [rounds, setRounds] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentTitle, setCurrentTitle] = useState('');
  const [hops, setHops] = useState(0);
  const [path, setPath] = useState([]);
  const [finished, setFinished] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_MS);
  const [totalScores, setTotalScores] = useState({});
  const [roundResult, setRoundResult] = useState(null);
  const [roundStartAt, setRoundStartAt] = useState(null);
  const [resolvedRound, setResolvedRound] = useState({ start: '', end: '' });
  const [langSwitching, setLangSwitching] = useState(false);

  const roundTimerRef = useRef(null);
  const finishBroadcastRef = useRef(false);

  const { peers, connected, broadcast, registerHandler } = useRoom(
    roomId || null,
    selfId,
    name,
    isHost,
  );

  const currentRound = rounds[roundIndex];
  const wikiLang = gameLang || lang;
  const isSoloSession = !roomId || connected === 0;

  const myProgress = useMemo(() => ({
    id: selfId,
    name,
    current: currentTitle,
    hops,
    path,
    finished,
    gaveUp,
    elapsedMs,
  }), [selfId, name, currentTitle, hops, path, finished, gaveUp, elapsedMs]);

  const toggleLang = async () => {
    if (screen === 'playing') return;
    const langCycle = { en: 'zh', zh: 'zh-tw', 'zh-tw': 'en' };
    const next = langCycle[lang];
    setLangSwitching(true);
    try {
      if (screen === 'playing' && currentTitle) {
        const translated = await translateTitle(wikiLang, next, currentTitle);
        setCurrentTitle(translated);
      }
      setLang(next);
      setLangState(next);
      document.documentElement.lang = next === 'zh' ? 'zh-Hans' : (next === 'zh-tw' ? 'zh-Hant' : 'en');
    } finally {
      setLangSwitching(false);
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
  }, [lang]);

  // Block find-in-page while racing so players can't search the article for
  // the target — they must navigate by clicking links.
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const blockFind = (e) => {
      const key = e.key?.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === 'f' || key === 'g')) {
        e.preventDefault();
        e.stopPropagation();
      } else if (key === '/' && e.target === document.body) {
        // Firefox quick-find
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockFind, true);
    return () => window.removeEventListener('keydown', blockFind, true);
  }, [screen]);

  useEffect(() => {
    if (!currentRound) return undefined;
    let cancelled = false;
    Promise.all([
      resolveTitle(wikiLang, currentRound.start),
      resolveTitle(wikiLang, currentRound.end),
    ]).then(([start, end]) => {
      if (cancelled) return;
      setResolvedRound({
        start: start ?? currentRound.start,
        end: end ?? currentRound.end,
      });
    });
    return () => { cancelled = true; };
  }, [currentRound, wikiLang]);

  const inviteUrl = roomId
    ? `${window.location.origin}${window.location.pathname}?room=${roomId}`
    : '';

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRound = useCallback((index, roundList, startAt) => {
    const round = roundList[index];
    if (!round) return;
    setRoundIndex(index);
    setCurrentTitle(round.start);
    setHops(0);
    setPath([round.start]);
    setFinished(false);
    setGaveUp(false);
    setElapsedMs(null);
    setRoundResult(null);
    setTimeLeft(ROUND_DURATION_MS);
    setRoundStartAt(startAt);
    setScreen('playing');
    finishBroadcastRef.current = false;
  }, []);

  const beginGame = useCallback((nextGameLang) => {
    const newRounds = generateRounds(nextGameLang);
    const startAt = Date.now();
    setGameLang(nextGameLang);
    setRounds(newRounds);
    setTotalScores({});
    setRoundIndex(0);
    if (isHost) {
      broadcast('sendGameState', { type: 'start', rounds: newRounds, startAt, lang: nextGameLang });
    }
    startRound(0, newRounds, startAt);
  }, [isHost, broadcast, startRound]);

  const finishRound = useCallback((localFinishers) => {
    const { sorted, scores } = scoreRound(localFinishers);
    setRoundResult({ sorted, scores });
    setScreen('roundEnd');
    setTotalScores((prev) => {
      const next = { ...prev };
      for (const [id, pts] of Object.entries(scores)) {
        next[id] = (next[id] ?? 0) + pts;
      }
      return next;
    });
    if (isHost && roomId) {
      broadcast('sendRoundResult', { roundIndex, sorted, scores });
    }
  }, [isHost, roomId, broadcast, roundIndex]);

  const advanceRound = useCallback(() => {
    const next = roundIndex + 1;
    if (next >= TOTAL_ROUNDS) {
      setScreen('gameEnd');
      return;
    }
    const startAt = Date.now();
    if (isHost && roomId) {
      broadcast('sendGameState', { type: 'round', roundIndex: next, rounds, startAt });
    }
    startRound(next, rounds, startAt);
  }, [roundIndex, isHost, roomId, broadcast, rounds, startRound]);

  const skipToNextRound = useCallback(() => {
    const next = roundIndex + 1;
    if (next >= TOTAL_ROUNDS) {
      setScreen('gameEnd');
      return;
    }
    const startAt = Date.now();
    if (isHost && roomId) {
      broadcast('sendGameState', { type: 'round', roundIndex: next, rounds, startAt });
    }
    startRound(next, rounds, startAt);
  }, [roundIndex, isHost, roomId, broadcast, rounds, startRound]);

  useEffect(() => {
    registerHandler('onGameState', (data) => {
      if (!data) return;
      if (data.type === 'start') {
        if (data.lang) setGameLang(data.lang);
        setRounds(data.rounds);
        setTotalScores({});
        startRound(0, data.rounds, data.startAt);
      } else if (data.type === 'round') {
        if (data.rounds) setRounds(data.rounds);
        startRound(data.roundIndex, data.rounds ?? rounds, data.startAt);
      }
    });
    registerHandler('onRoundResult', (data) => {
      if (!data) return;
      setRoundResult({ sorted: data.sorted, scores: data.scores });
      setScreen('roundEnd');
      setTotalScores((prev) => {
        const next = { ...prev };
        for (const [id, pts] of Object.entries(data.scores ?? {})) {
          next[id] = (next[id] ?? 0) + pts;
        }
        return next;
      });
    });
  }, [registerHandler, startRound, rounds]);

  const finishersRef = useRef({ finished, elapsedMs, gaveUp, hops, path, peers, selfId, name });
  finishersRef.current = { finished, elapsedMs, gaveUp, hops, path, peers, selfId, name };

  useEffect(() => {
    if (screen !== 'playing' || !roundStartAt) return undefined;

    const tick = () => {
      const left = ROUND_DURATION_MS - (Date.now() - roundStartAt);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(roundTimerRef.current);
        const f = finishersRef.current;
        const list = [];
        if (f.finished && f.elapsedMs != null) {
          list.push({ id: f.selfId, name: f.name, elapsedMs: f.elapsedMs, hops: f.hops, path: f.path });
        }
        Object.values(f.peers).forEach((p) => {
          const prog = p.progress;
          if (prog?.finished && prog.elapsedMs != null) {
            list.push({ id: p.id, name: p.name, elapsedMs: prog.elapsedMs, hops: prog.hops, path: prog.path });
          }
        });
        if (isSoloSession || isHost) {
          finishRound(list);
        }
      }
    };

    tick();
    roundTimerRef.current = setInterval(tick, 250);
    return () => clearInterval(roundTimerRef.current);
  }, [screen, roundStartAt, isHost, isSoloSession, finishRound]);

  useEffect(() => {
    if (screen !== 'roundEnd' || !isSoloSession) return undefined;
    const timer = window.setTimeout(() => advanceRound(), 3500);
    return () => window.clearTimeout(timer);
  }, [screen, isSoloSession, advanceRound]);

  useEffect(() => {
    if (screen !== 'playing' || !isHost || isSoloSession || !roomId) return;
    if (roundResult) return;

    const selfDone = finished || gaveUp;
    const peerList = Object.values(peers);
    if (!selfDone) return;
    if (peerList.length > 0 && !peerList.every((p) => p.progress?.finished || p.progress?.gaveUp)) {
      return;
    }

    const list = [];
    if (finished && elapsedMs != null) {
      list.push({ id: selfId, name, elapsedMs, hops, path });
    }
    peerList.forEach((p) => {
      if (p.progress?.finished && p.progress.elapsedMs != null) {
        list.push({
          id: p.id,
          name: p.name,
          elapsedMs: p.progress.elapsedMs,
          hops: p.progress.hops,
          path: p.progress.path,
        });
      }
    });
    finishRound(list);
  }, [
    screen, isHost, isSoloSession, roomId, finished, gaveUp, elapsedMs, hops, path,
    peers, selfId, name, roundResult, finishRound,
  ]);

  const playerNameById = useCallback((id) => {
    if (id === selfId) return name;
    const peer = Object.values(peers).find((p) => p.id === id);
    return peer?.name ?? id;
  }, [selfId, name, peers]);

  useEffect(() => {
    if (screen !== 'playing') return;
    broadcast('sendProgress', myProgress);
  }, [screen, myProgress, broadcast]);

  useEffect(() => {
    const params = getParams();
    if (params.room) {
      setRoomId(params.room);
      setIsHost(false);
    } else if (params.create) {
      const id = randomRoomId();
      setRoomId(id);
      setIsHost(true);
      setRoomInUrl(id);
    }
  }, []);

  const handleCreateRoom = () => {
    if (!name.trim()) return;
    localStorage.setItem(NAME_KEY, name.trim());
    const id = randomRoomId();
    setRoomId(id);
    setIsHost(true);
    setRoomInUrl(id);
    setScreen('lobby');
  };

  const handleJoinRoom = (code) => {
    if (!name.trim() || !code.trim()) return;
    localStorage.setItem(NAME_KEY, name.trim());
    setRoomId(code.trim());
    setIsHost(false);
    setRoomInUrl(code.trim());
    setScreen('lobby');
  };

  const handleSolo = () => {
    if (!name.trim()) return;
    localStorage.setItem(NAME_KEY, name.trim());
    setIsHost(true);
    setRoomId('');
    setRoomInUrl('');
    beginGame(lang);
  };

  const handleNavigate = async (nextTitle) => {
    if (finished || gaveUp || screen !== 'playing' || !currentRound) return;
    setCurrentTitle(nextTitle);
    setHops((h) => h + 1);
    setPath((p) => [...p, nextTitle]);

    const reached = await titlesMatchOnWiki(wikiLang, nextTitle, currentRound.end);
    if (reached) {
      const elapsed = Date.now() - roundStartAt;
      const finalPath = [...path, nextTitle];
      setFinished(true);
      setElapsedMs(elapsed);
      finishBroadcastRef.current = true;
      broadcast('sendProgress', {
        id: selfId, name, current: nextTitle, hops: hops + 1, path: finalPath, finished: true, gaveUp: false, elapsedMs: elapsed,
      });
      const finisher = { id: selfId, name, elapsedMs: elapsed, hops: hops + 1, path: finalPath };
      if (isSoloSession) {
        finishRound([finisher]);
      } else if (isHost) {
        window.setTimeout(() => finishRound([
          finisher,
          ...Object.values(peers)
            .filter((p) => p.progress?.finished)
            .map((p) => ({
              id: p.id,
              name: p.name,
              elapsedMs: p.progress.elapsedMs,
              hops: p.progress.hops,
              path: p.progress.path,
            })),
        ]), 600);
      }
    }
  };

  const handleGiveUp = () => {
    if (finished || gaveUp || screen !== 'playing') return;

    setGaveUp(true);
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = null;
    }

    broadcast('sendProgress', {
      id: selfId,
      name,
      current: currentTitle,
      hops,
      finished: false,
      gaveUp: true,
      elapsedMs: null,
    });

    const soloMode = isSoloSession;
    if (soloMode) {
      window.setTimeout(() => skipToNextRound(), 600);
    }
  };

  const handleLeave = () => {
    setRoomId('');
    setIsHost(false);
    setGameLang(null);
    setScreen('lobby');
    setRounds([]);
    setRoomInUrl('');
  };

  const activeWikiLang = lang;
  const timeFmt = formatTime(timeLeft);

  if (screen === 'lobby' && !roomId) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t(lang, 'eyebrow')}</p>
            <h1>{t(lang, 'title')}</h1>
            <p className="subtitle">{t(lang, 'subtitle')}</p>
          </div>
          <button type="button" className="lang-toggle" onClick={toggleLang} disabled={langSwitching} aria-label={t(lang, 'langToggleAria')}>
            {langSwitching ? '…' : t(lang, 'langToggle')}
          </button>
        </header>

        <main className="lobby-card">
          <label className="field">
            <span>{t(lang, 'yourName')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(lang, 'namePlaceholder')}
            />
          </label>

          <div className="lobby-actions">
            <button type="button" className="btn primary" disabled={!name.trim()} onClick={handleCreateRoom}>
              {t(lang, 'createRoom')}
            </button>
            <button type="button" className="btn" disabled={!name.trim()} onClick={handleSolo}>
              {t(lang, 'soloPlay')}
            </button>
          </div>

          <div className="join-row">
            <input
              placeholder={t(lang, 'roomCodePlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinRoom(e.target.value);
              }}
            />
            <button
              type="button"
              className="btn"
              onClick={(e) => {
                const input = e.target.closest('.join-row')?.querySelector('input');
                handleJoinRoom(input?.value ?? '');
              }}
            >
              {t(lang, 'joinRoom')}
            </button>
          </div>

          <p className="hint">{t(lang, 'roundDuration')} · {t(lang, 'totalRounds')}</p>
        </main>
      </div>
    );
  }

  if (screen === 'lobby' && roomId) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t(lang, 'eyebrow')}</p>
            <h1>{t(lang, 'title')}</h1>
          </div>
          <div className="topbar-actions">
            <span className="status-pill">{t(lang, 'connected', { n: connected + 1 })}</span>
            <button type="button" className="lang-toggle" onClick={toggleLang} disabled={langSwitching}>
            {langSwitching ? '…' : t(lang, 'langToggle')}
          </button>
          </div>
        </header>

        <main className="lobby-card">
          <p className="room-code">Room: <strong>{roomId}</strong></p>
          <div className="player-list">
            <p><strong>Players ({connected + 1})</strong></p>
            <ul>
              <li>{name} (You)</li>
              {Object.values(peers).map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          </div>

          <p className="hint">{t(lang, 'inviteHint')}</p>
          <button type="button" className="btn" onClick={copyInvite}>
            {copied ? t(lang, 'copied') : t(lang, 'copyInvite')}
          </button>

          {isHost ? (
            <button type="button" className="btn primary" onClick={() => beginGame(lang)}>
              {t(lang, 'startGame')}
            </button>
          ) : (
            <p className="waiting">{t(lang, 'waitingForHost')}</p>
          )}

          <button type="button" className="btn ghost" onClick={handleLeave}>{t(lang, 'leaveRoom')}</button>
        </main>
      </div>
    );
  }

  if (screen === 'roundEnd' || screen === 'gameEnd') {
    const isFinal = screen === 'gameEnd' || roundIndex >= TOTAL_ROUNDS - 1;
    const sortedFinal = Object.entries(totalScores)
      .map(([id, pts]) => ({ id, name: playerNameById(id), pts }))
      .sort((a, b) => b.pts - a.pts);

    return (
      <div className="app-shell">
        <header className="topbar compact">
          <h1>{isFinal ? t(lang, 'gameOver') : t(lang, 'roundOver')}</h1>
          <button type="button" className="lang-toggle" onClick={toggleLang} disabled={langSwitching}>
            {langSwitching ? '…' : t(lang, 'langToggle')}
          </button>
        </header>
        <main className="results-card">
          {roundResult?.sorted?.length ? (
            <>
              <p className="round-winner">
                {t(lang, 'roundWinner', { name: roundResult.sorted[0].name })}
              </p>
              {roundResult.sorted[0].path?.length ? (
                <div className="winner-path">
                  <p className="winner-path-label">
                    {t(lang, 'winnerPath', {
                      name: roundResult.sorted[0].name,
                      hops: roundResult.sorted[0].hops ?? (roundResult.sorted[0].path.length - 1),
                    })}
                  </p>
                  <ol className="winner-path-trail">
                    {roundResult.sorted[0].path.map((step, i) => (
                      <li key={`${step}-${i}`}>{displayTitle(step)}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </>
          ) : (
            <p className="nobody-finished">{t(lang, 'nobodyFinished')}</p>
          )}
          <h3>{isFinal ? t(lang, 'finalScores') : t(lang, 'players')}</h3>
          <ol className="score-list">
            {sortedFinal.map((p, i) => (
              <li key={p.id}>
                <span>{p.name}</span>
                <span>{t(lang, 'pts', { n: p.pts })}</span>
              </li>
            ))}
          </ol>
          {isFinal ? (
            <button type="button" className="btn primary" onClick={() => { setScreen('lobby'); setRounds([]); setGameLang(null); }}>
              {roomId && isHost ? t(lang, 'playAgain') : t(lang, 'backToLobby')}
            </button>
          ) : isHost ? (
            <button type="button" className="btn primary" onClick={advanceRound}>
              {t(lang, 'nextRound')}
            </button>
          ) : (
            <p className="waiting">{t(lang, 'waitingForHost')}</p>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell game-layout">
      <header className="game-topbar">
        <div className="round-info">
          <span className="eyebrow">{t(lang, 'round', { n: roundIndex + 1, total: TOTAL_ROUNDS })}</span>
          <div className="targets">
            <span><strong>{t(lang, 'startArticle')}:</strong> {displayTitle(resolvedRound.start || currentRound?.start)}</span>
            <span><strong>{t(lang, 'targetArticle')}:</strong> {displayTitle(resolvedRound.end || currentRound?.end)}</span>
            <span className="wiki-lang-badge">{activeWikiLang === 'zh' ? '中文维基' : 'English Wiki'}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`timer ${timeLeft < 60000 ? 'urgent' : ''}`}>{t(lang, 'timeLeft', timeFmt)}</span>
          <button type="button" className="lang-toggle" onClick={toggleLang} disabled={langSwitching}>
            {langSwitching ? '…' : t(lang, 'langToggle')}
          </button>
          {!finished && !gaveUp ? (
            <button type="button" className="btn ghost" onClick={handleGiveUp}>{t(lang, 'giveUp')}</button>
          ) : null}
        </div>
      </header>

      <p className="rule-hint">
        {gaveUp ? t(lang, 'nextRound') : t(lang, 'clickLinksOnly')}
      </p>

      <div className="game-grid">
        <section className="game-main">
          {path.length > 1 ? (
            <details className="path-trail">
              <summary>{t(lang, 'history')} ({t(lang, 'hops', { n: hops })})</summary>
              <ol>{path.map((p) => <li key={p}>{displayTitle(p)}</li>)}</ol>
            </details>
          ) : null}
          <ArticleView
            uiLang={lang}
            wikiLang={activeWikiLang}
            title={currentTitle}
            onNavigate={handleNavigate}
            disabled={finished || gaveUp || timeLeft <= 0}
          />
        </section>
        <PlayerSidebar
          lang={lang}
          selfId={selfId}
          playerName={name}
          isHost={isHost}
          peers={peers}
          myProgress={myProgress}
          totalScores={totalScores}
        />
      </div>
    </div>
  );
}
