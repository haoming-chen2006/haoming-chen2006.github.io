/**
 * `node:worker_threads` entry, so the engine's own suite can prove the host
 * really runs off-thread rather than only that the message protocol type-checks.
 * Identical body to `hostWorker.ts` with a different endpoint adapter.
 */
import { parentPort } from 'node:worker_threads';
import { serveHost } from './hostCore.ts';
import { nodeEndpoint } from './protocol.ts';

if (!parentPort) throw new Error('nodeHostWorker must be started as a worker thread');
serveHost(nodeEndpoint(parentPort));
