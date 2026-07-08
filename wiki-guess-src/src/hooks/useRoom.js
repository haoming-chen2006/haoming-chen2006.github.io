import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

// Multiplayer runs entirely over Supabase Realtime (broadcast + presence).
// Every player subscribes to a channel keyed by the room code; there is no
// WebRTC/peer handshake to fail, and nothing is written to the database.
//
// App.jsx broadcasts with these action names, which map to Realtime events:
const EVENT_BY_ACTION = {
  sendPresence: 'presence',
  sendProgress: 'progress',
  sendGameState: 'gameState',
  sendRoundResult: 'roundResult',
  sendChat: 'chat',
};

export function useRoom(roomId, selfId, playerName, isHost) {
  const channelRef = useRef(null);
  const peerMapRef = useRef({});
  const [peers, setPeers] = useState({});
  const [connected, setConnected] = useState(0);
  const handlersRef = useRef({});
  // Keep latest identity available to callbacks without re-subscribing.
  const selfRef = useRef({ playerName, isHost });
  selfRef.current = { playerName, isHost };

  const registerHandler = useCallback((event, fn) => {
    handlersRef.current[event] = fn;
  }, []);

  useEffect(() => {
    if (!roomId) return undefined;

    peerMapRef.current = {};
    setPeers({});
    setConnected(0);

    const channel = supabase.channel(`wiki-guess-${roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: selfId },
      },
    });
    channelRef.current = channel;

    const commitPeers = () => setPeers({ ...peerMapRef.current });

    const upsertPeer = (id, patch) => {
      if (!id || id === selfId) return;
      const map = peerMapRef.current;
      map[id] = { ...map[id], id, peerId: id, ...patch };
      commitPeers();
    };

    const announce = () => {
      const { playerName: nm, isHost: host } = selfRef.current;
      channel.send({
        type: 'broadcast',
        event: 'presence',
        payload: { id: selfId, name: nm, isHost: host },
      });
    };

    channel
      .on('broadcast', { event: 'presence' }, ({ payload }) => {
        if (!payload?.id) return;
        upsertPeer(payload.id, { name: payload.name, isHost: payload.isHost });
      })
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        if (!payload?.id) return;
        upsertPeer(payload.id, { progress: payload });
        handlersRef.current.onProgress?.(payload, payload.id);
      })
      .on('broadcast', { event: 'gameState' }, ({ payload }) => {
        handlersRef.current.onGameState?.(payload);
      })
      .on('broadcast', { event: 'roundResult' }, ({ payload }) => {
        handlersRef.current.onRoundResult?.(payload);
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        handlersRef.current.onChat?.(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        // Presence state is the reliable source of who's here and their name
        // (from track()), with no broadcast timing gap. Progress fields already
        // merged from broadcasts are preserved.
        const state = channel.presenceState();
        const map = peerMapRef.current;
        const presentIds = new Set();
        for (const key of Object.keys(state)) {
          const meta = state[key]?.[0] ?? {};
          const id = meta.id ?? key;
          presentIds.add(id);
          if (id === selfId) continue;
          map[id] = { ...map[id], id, peerId: id, name: meta.name, isHost: meta.isHost };
        }
        for (const id of Object.keys(map)) {
          if (!presentIds.has(id)) delete map[id];
        }
        setConnected([...presentIds].filter((id) => id !== selfId).length);
        commitPeers();
      })
      .on('presence', { event: 'join' }, () => {
        // A newcomer needs our identity right away.
        announce();
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { playerName: nm, isHost: host } = selfRef.current;
        await channel.track({ id: selfId, name: nm, isHost: host });
        announce();
      }
    });

    const interval = setInterval(announce, 8000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, selfId]);

  const broadcast = useCallback((action, data) => {
    const event = EVENT_BY_ACTION[action];
    if (!event) return;
    channelRef.current?.send({ type: 'broadcast', event, payload: data });
  }, []);

  return { peers, connected, broadcast, registerHandler };
}
