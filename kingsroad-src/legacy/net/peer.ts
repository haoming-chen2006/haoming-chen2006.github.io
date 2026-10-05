import type { PeerMsg, Signal } from './protocol.ts';
import type { Room } from './room.ts';

/**
 * The game link between the two seats. Preferred path: a WebRTC data channel straight between the
 * two browsers (tens of milliseconds, no server quota). Signalling rides the room's broadcast
 * channel. If the direct path never opens — symmetric NATs, a locked-down network — or drops
 * mid-match, every message goes through the room channel instead ("relay"), at a higher latency
 * the lockstep driver absorbs with a longer input delay.
 */
export type LinkMode = 'connecting' | 'p2p' | 'relay';

const ICE: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export class PeerLink {
  mode: LinkMode = 'connecting';
  /** Round trip in ms, exponentially smoothed; 0 until the first pong. */
  rtt = 0;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private listeners = new Set<(m: PeerMsg) => void>();
  private modeListeners = new Set<(m: LinkMode) => void>();
  private unsubRoom: () => void;
  private pingTimer = 0;
  private pingN = 0;
  private pendingPings = new Map<number, number>();
  private closed = false;
  private forceRelay: boolean;
  private pendingIce: RTCIceCandidateInit[] = [];
  private room: Room;
  /** The direct path was given a fair chance (or failed outright): report relay while it is not open. */
  private gaveUp = false;
  /** Game packets that arrived before anyone was listening (the match starts a beat later on the guest). */
  private backlog: PeerMsg[] = [];

  constructor(room: Room, opts: { forceRelay?: boolean } = {}) {
    this.room = room;
    this.forceRelay = !!opts.forceRelay || /[?&]relay=1/.test(location.search) || /relay=1/.test(location.hash);
    this.unsubRoom = room.onEvent((e) => {
      if (e.type === 'signal' && e.from !== room.uid) void this.onSignal(e.signal);
      else if (e.type === 'relay') this.deliver(e.payload as PeerMsg);
    });
  }

  /** Start negotiating. The host offers; the guest answers. Safe to call once per seat. */
  connect(): void {
    if (this.forceRelay || typeof RTCPeerConnection === 'undefined') { this.gaveUp = true; this.updateMode(); this.startPings(); return; }
    const pc = new RTCPeerConnection({ iceServers: ICE });
    this.pc = pc;
    pc.onicecandidate = (ev) => { if (ev.candidate) void this.room.send('signal', { signal: { kind: 'ice', cand: ev.candidate.toJSON() } satisfies Signal }); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.fallBack();
      else this.updateMode();
    };
    if (this.room.role === 'host') {
      const dc = pc.createDataChannel('crownfall', { ordered: true });
      this.bindChannel(dc);
      void (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await this.room.send('signal', { signal: { kind: 'offer', sdp: offer.sdp ?? '' } satisfies Signal });
        } catch { this.fallBack(); }
      })();
    } else {
      pc.ondatachannel = (ev) => this.bindChannel(ev.channel);
    }
    // If nothing is open by the deadline, play relayed rather than not at all — but keep negotiating:
    // a direct channel that opens late is still taken up the moment it does.
    window.setTimeout(() => { this.gaveUp = true; this.updateMode(); }, 10000);
    this.startPings();
  }

  private bindChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    dc.onopen = () => this.updateMode();
    dc.onclose = () => { if (this.dc === dc) { this.gaveUp = true; this.updateMode(); } };
    dc.onerror = () => { if (this.dc === dc) { this.gaveUp = true; this.updateMode(); } };
    dc.onmessage = (ev) => { try { this.deliver(JSON.parse(String(ev.data)) as PeerMsg); } catch { /* junk */ } };
  }

  /** Direct while the channel is open and the connection healthy; otherwise relay, or "connecting" until we give up. */
  private updateMode(): void {
    if (this.closed) return;
    const pcOk = !!this.pc && this.pc.connectionState !== 'failed' && this.pc.connectionState !== 'disconnected' && this.pc.connectionState !== 'closed';
    const open = pcOk && !!this.dc && this.dc.readyState === 'open';
    this.setMode(open ? 'p2p' : this.gaveUp ? 'relay' : 'connecting');
  }

  private async onSignal(s: Signal): Promise<void> {
    const pc = this.pc;
    if (!pc || this.forceRelay) return;
    try {
      if (s.kind === 'offer' && this.room.role === 'guest') {
        await pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
        for (const c of this.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.room.send('signal', { signal: { kind: 'answer', sdp: answer.sdp ?? '' } satisfies Signal });
      } else if (s.kind === 'answer' && this.room.role === 'host') {
        await pc.setRemoteDescription({ type: 'answer', sdp: s.sdp });
        for (const c of this.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
      } else if (s.kind === 'ice') {
        if (pc.remoteDescription) await pc.addIceCandidate(s.cand).catch(() => {}); else this.pendingIce.push(s.cand);
      }
    } catch { this.fallBack(); }
  }

  /** The direct path is dead for good: drop it and stay on the relay. */
  private fallBack(): void {
    if (this.closed) return;
    this.gaveUp = true;
    try { this.dc?.close(); } catch { /* ignore */ }
    try { this.pc?.close(); } catch { /* ignore */ }
    this.dc = null; this.pc = null;
    this.updateMode();
  }

  private setMode(m: LinkMode): void {
    if (this.mode === m) return;
    this.mode = m;
    this.rtt = 0;
    for (const fn of this.modeListeners) fn(m);
  }

  private startPings(): void {
    window.clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => {
      if (this.closed) return;
      const n = ++this.pingN;
      this.pendingPings.set(n, performance.now());
      if (this.pendingPings.size > 8) this.pendingPings.delete(n - 8);
      this.send({ k: 'ping', n, s: performance.now() });
    }, 1000);
  }

  private deliver(m: PeerMsg): void {
    if (this.closed || !m || typeof m !== 'object') return;
    if (m.k === 'ping') { this.send({ k: 'pong', n: m.n, s: m.s }); return; }
    if (m.k === 'pong') {
      const sent = this.pendingPings.get(m.n);
      if (sent !== undefined) {
        let r = performance.now() - sent;
        // A pong that waited for the other tab to wake up says nothing about the path: clamp outliers.
        if (this.rtt > 0 && r > this.rtt * 4) r = this.rtt * 4;
        this.rtt = this.rtt === 0 ? r : this.rtt * 0.7 + r * 0.3;
        this.pendingPings.delete(m.n);
      }
      return;
    }
    if (this.listeners.size === 0) { if (m.k === 'in' || m.k === 'hash') { this.backlog.push(m); if (this.backlog.length > 256) this.backlog.shift(); } return; }
    for (const fn of this.listeners) fn(m);
  }

  send(m: PeerMsg): void {
    if (this.closed) return;
    const dc = this.dc;
    if (this.mode === 'p2p' && dc && dc.readyState === 'open') {
      try { dc.send(JSON.stringify(m)); return; } catch { this.fallBack(); }
    }
    // Relay: while still connecting, inputs go through the server too, so a slow handshake never stalls the match.
    void this.room.send('relay', { payload: m });
  }

  onMessage(fn: (m: PeerMsg) => void): () => void {
    this.listeners.add(fn);
    for (const m of this.backlog.splice(0)) fn(m);
    return () => this.listeners.delete(fn);
  }
  onMode(fn: (m: LinkMode) => void): () => void { this.modeListeners.add(fn); return () => this.modeListeners.delete(fn); }

  get direct(): boolean { return this.mode === 'p2p'; }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    window.clearInterval(this.pingTimer);
    this.unsubRoom();
    try { this.dc?.close(); } catch { /* ignore */ }
    try { this.pc?.close(); } catch { /* ignore */ }
    this.listeners.clear(); this.modeListeners.clear();
  }
}
