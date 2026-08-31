import type { LuaBundle } from '../engine/bundle.ts';

/**
 * The typed message port between the main thread and the authoritative host VM.
 *
 * This is deliberately a thin RPC over `LuaHost`: every op is a method on that
 * interface, so the worker adds a transport and nothing else. There is one
 * implementation of the engine's behaviour (`InProcessLuaHost`), and the
 * headless tests and the browser drive the same one.
 */

export type HostOp =
  | 'init'
  | 'createRoom'
  | 'pushReply'
  | 'submitReply'
  | 'request'
  | 'resume'
  | 'advance'
  | 'drain'
  | 'steps'
  | 'stateDigest'
  | 'stateJson'
  | 'joinPreamble'
  | 'resyncPayload'
  | 'addObserver'
  | 'removeObserver'
  | 'setPlayerState'
  | 'pendingInput'
  | 'pushReply'
  | 'submitReply'
  | 'replay'
  | 'replayStatus'
  | 'decisionsFrom'
  | 'stats'
  | 'dispose';

/**
 * Pushed, not polled. The engine emits in bursts between yields; making the
 * main thread ask for output would add a round trip per flush for nothing.
 * Carried on `id: -1` so it cannot collide with a pending request.
 */
export type HostPush =
  | { push: 'output'; envelope: unknown }
  | { push: 'decision'; decision: unknown };

export const PUSH_ID = -1;

export interface HostRequest {
  id: number;
  op: HostOp;
  args: unknown[];
}

export type HostResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };

export interface InitPayload {
  /** Pass the bundle directly (tests, or a main thread that already has it). */
  bundle?: LuaBundle;
  /** Or let the worker fetch it, which keeps 1.6 MB of Lua off the main thread. */
  bundleUrl?: string;
  /** Override where wasmoon fetches `glue.wasm` from. */
  wasmUri?: string;
  hashSeedEpoch?: number | null;
  maxResumes?: number;
}

/** Anything that can carry messages both ways: a `Worker`, a `MessagePort`, `self`. */
export interface Endpoint {
  post(message: unknown): void;
  onMessage(handler: (message: unknown) => void): void;
  close?(): void;
}

interface MessageTarget {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', handler: (ev: { data: unknown }) => void): void;
  start?(): void;
  terminate?(): void;
}

/** Wraps a DOM-style `Worker` / `MessagePort` / `self`. */
export function domEndpoint(target: MessageTarget): Endpoint {
  return {
    post: (m) => target.postMessage(m),
    onMessage: (h) => {
      target.addEventListener('message', (ev) => h(ev.data));
      target.start?.();
    },
    close: () => target.terminate?.(),
  };
}

interface NodePort {
  postMessage(message: unknown): void;
  on(event: 'message', handler: (message: unknown) => void): void;
  terminate?(): unknown;
}

/** Wraps a `node:worker_threads` `Worker` / `MessagePort`. */
export function nodeEndpoint(port: NodePort): Endpoint {
  return {
    post: (m) => port.postMessage(m),
    onMessage: (h) => port.on('message', h),
    close: () => void port.terminate?.(),
  };
}
