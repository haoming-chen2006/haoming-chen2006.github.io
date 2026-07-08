import { useCallback, useEffect, useRef, useState } from 'react';
import { joinRoom } from 'trystero/torrent';

const APP_ID = 'wiki-guess-v1';

export function useRoom(roomId, selfId, playerName, isHost) {
  const roomRef = useRef(null);
  const [peers, setPeers] = useState({});
  const [connected, setConnected] = useState(0);
  const handlersRef = useRef({});

  const registerHandler = useCallback((event, fn) => {
    handlersRef.current[event] = fn;
  }, []);

  useEffect(() => {
    if (!roomId) return undefined;

    const room = joinRoom({ appId: APP_ID }, roomId);
    roomRef.current = room;

    const [sendPresence, getPresence] = room.makeAction('presence', { max: 50 });
    const [sendProgress, getProgress] = room.makeAction('progress', { max: 50 });
    const [sendGameState, getGameState] = room.makeAction('gameState', { max: 10 });
    const [sendRoundResult, getRoundResult] = room.makeAction('roundResult', { max: 10 });
    const [sendChat, getChat] = room.makeAction('chat', { max: 20 });

    const announce = () => {
      sendPresence({ id: selfId, name: playerName, isHost });
    };

    const peerMap = {};

    room.onPeerJoin((peerId) => {
      setConnected((c) => c + 1);
      announce();
    });

    room.onPeerLeave((peerId) => {
      setConnected((c) => Math.max(0, c - 1));
      delete peerMap[peerId];
      setPeers({ ...peerMap });
    });

    getPresence((data, peerId) => {
      if (!data?.id) return;
      peerMap[peerId] = { ...peerMap[peerId], peerId, ...data };
      setPeers({ ...peerMap });
    });

    getProgress((data, peerId) => {
      if (!data?.id) return;
      peerMap[peerId] = { ...peerMap[peerId], peerId, progress: data };
      setPeers({ ...peerMap });
      handlersRef.current.onProgress?.(data, peerId);
    });

    getGameState((data) => {
      handlersRef.current.onGameState?.(data);
    });

    getRoundResult((data) => {
      handlersRef.current.onRoundResult?.(data);
    });

    getChat((data) => {
      handlersRef.current.onChat?.(data);
    });

    announce();
    const interval = setInterval(announce, 8000);

    roomRef.current._actions = {
      sendPresence,
      sendProgress,
      sendGameState,
      sendRoundResult,
      sendChat,
    };

    return () => {
      clearInterval(interval);
      room.leave();
      roomRef.current = null;
    };
  }, [roomId, selfId, playerName, isHost]);

  const broadcast = useCallback((action, data) => {
    roomRef.current?._actions?.[action]?.(data);
  }, []);

  return { peers, connected, broadcast, registerHandler };
}
