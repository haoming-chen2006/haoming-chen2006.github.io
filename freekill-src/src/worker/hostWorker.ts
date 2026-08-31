/**
 * Web Worker entry for the authoritative host VM.
 *
 * Mount it from the main thread as:
 *   new Worker(new URL('./hostWorker.ts', import.meta.url), { type: 'module' })
 *
 * Only the host's server VM gets a worker. The client VM stays on the main
 * thread so the room's ~164 `Lua.call` sites stay synchronous - see
 * `contract/engine.ts`. Do not move it without re-measuring.
 */
import { serveHost } from './hostCore.ts';
import { domEndpoint } from './protocol.ts';

declare const self: {
  postMessage(m: unknown): void;
  addEventListener(t: 'message', h: (ev: { data: unknown }) => void): void;
};

serveHost(domEndpoint(self));
