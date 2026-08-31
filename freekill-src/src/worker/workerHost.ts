import type { DecisionRecord, LuaHost, RoomSpec } from '../contract/engine.ts';
import type { Envelope } from '../contract/protocol.ts';
import type {
  AdvanceOptions,
  AdvanceResult,
  HostStats,
  ReplayStatus,
} from '../engine/types.ts';
import {
  PUSH_ID,
  type Endpoint,
  type HostOp,
  type HostPush,
  type HostResponse,
  type InitPayload,
} from './protocol.ts';

/**
 * Main-thread proxy for the host VM.
 *
 * Implements `LuaHost` over a message port, so the app cannot tell whether the
 * authority is in a worker or in-process - which is exactly the point: the tests
 * drive `InProcessLuaHost` and the browser drives this, and both are the same
 * engine behind the same interface.
 */
export class WorkerLuaHost implements LuaHost {
  private endpoint: Endpoint;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private outputHandlers = new Set<(e: Envelope) => void>();
  private decisionHandlers = new Set<(d: DecisionRecord) => void>();

  private constructor(endpoint: Endpoint) {
    this.endpoint = endpoint;
    endpoint.onMessage((raw) => this.receive(raw as HostResponse));
  }

  static async connect(endpoint: Endpoint, init: InitPayload): Promise<WorkerLuaHost> {
    const h = new WorkerLuaHost(endpoint);
    await h.send('init', [init]);
    return h;
  }

  private receive(msg: HostResponse): void {
    if (!msg || typeof msg !== 'object') return;
    if (msg.id === PUSH_ID) {
      const push = (msg as { value?: HostPush }).value;
      if (!push) return;
      if (push.push === 'output') {
        for (const h of this.outputHandlers) h(push.envelope as Envelope);
      } else if (push.push === 'decision') {
        for (const h of this.decisionHandlers) h(push.decision as DecisionRecord);
      }
      return;
    }
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    if (msg.ok) p.resolve(msg.value);
    else p.reject(new Error(msg.error));
  }

  private send<T>(op: HostOp, args: unknown[]): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.endpoint.post({ id, op, args });
    });
  }

  createRoom(spec: RoomSpec): Promise<void> {
    return this.send('createRoom', [spec]);
  }

  resume(reason?: string): Promise<boolean> {
    return this.send('resume', [reason]);
  }

  submitReply(playerId: number, reply: unknown): Promise<void> {
    return this.send('submitReply', [playerId, reply]);
  }

  onOutput(handler: (envelope: Envelope) => void): () => void {
    this.outputHandlers.add(handler);
    return () => this.outputHandlers.delete(handler);
  }

  onDecision(handler: (d: DecisionRecord) => void): () => void {
    this.decisionHandlers.add(handler);
    return () => this.decisionHandlers.delete(handler);
  }

  replay(spec: RoomSpec, log: readonly DecisionRecord[]): Promise<void> {
    return this.send('replay', [spec, log]);
  }

  stateDigest(): Promise<string> {
    return this.send('stateDigest', []);
  }

  dispose(): void {
    void this.send('dispose', []).catch(() => undefined);
    this.endpoint.close?.();
  }

  /* ----------------------------------------------------------- extensions */

  advance(opts: AdvanceOptions = {}): Promise<AdvanceResult> {
    return this.send('advance', [opts]);
  }

  pushReplyRaw(connId: number, payloadB64: string): Promise<void> {
    return this.send('pushReply', [connId, payloadB64]);
  }

  request(playerId: number, command: string): Promise<void> {
    return this.send('request', [playerId, command]);
  }

  replayStatus(): Promise<ReplayStatus> {
    return this.send('replayStatus', []);
  }

  stateJson(): Promise<unknown> {
    return this.send('stateJson', []);
  }

  joinPreamble(playerId: number): Promise<{ command: string; payload: string }[]> {
    return this.send('joinPreamble', [playerId]);
  }

  resyncPayload(playerId: number): Promise<string> {
    return this.send('resyncPayload', [playerId]);
  }

  addObserver(connId: number, playerId: number, name?: string, avatar?: string): Promise<void> {
    return this.send('addObserver', [connId, playerId, name, avatar]);
  }

  removeObserver(playerId: number): Promise<void> {
    return this.send('removeObserver', [playerId]);
  }

  setPlayerState(playerId: number, state: number): Promise<void> {
    return this.send('setPlayerState', [playerId, state]);
  }

  pendingInput(): Promise<number[]> {
    return this.send('pendingInput', []);
  }

  decisionsFrom(from: number): Promise<DecisionRecord[]> {
    return this.send('decisionsFrom', [from]);
  }

  stats(): Promise<HostStats> {
    return this.send('stats', []);
  }
}

/**
 * Browser convenience: spin up the worker and connect to it.
 * `bundleUrl` keeps 1.6 MB of Lua off the main thread entirely - the worker
 * fetches it itself.
 */
export async function startHostWorker(init: InitPayload): Promise<WorkerLuaHost> {
  const { domEndpoint } = await import('./protocol.ts');
  const worker = new Worker(new URL('./hostWorker.ts', import.meta.url), { type: 'module' });
  return WorkerLuaHost.connect(domEndpoint(worker as unknown as never), init);
}
