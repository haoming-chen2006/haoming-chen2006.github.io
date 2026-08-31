import { fetchBundle, type LuaBundle } from '../engine/bundle.ts';
import { InProcessLuaHost } from '../engine/luaHost.ts';
import type { Endpoint, HostRequest, HostResponse, InitPayload } from './protocol.ts';

/**
 * The worker's half of the port, with no dependency on `self` or on
 * `node:worker_threads`. It is handed an `Endpoint`, so the same code runs in a
 * real Web Worker, in a node worker thread, and over a plain `MessageChannel`
 * in a test - and all three drive the identical `InProcessLuaHost`.
 *
 * Output and decisions are pushed rather than polled. The engine emits in bursts
 * between yields, so waiting for the main thread to ask would add a round trip
 * per flush for no reason.
 */
export function serveHost(endpoint: Endpoint): void {
  let host: InProcessLuaHost | null = null;

  const reply = (r: HostResponse) => endpoint.post(r);

  const need = () => {
    if (!host) throw new Error('host worker used before init');
    return host;
  };

  endpoint.onMessage(async (raw) => {
    const req = raw as HostRequest;
    if (!req || typeof req !== 'object' || typeof req.id !== 'number') return;
    try {
      const value = await dispatch(req);
      reply({ id: req.id, ok: true, value });
    } catch (e) {
      reply({ id: req.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });

  async function dispatch(req: HostRequest): Promise<unknown> {
    const a = req.args;
    switch (req.op) {
      case 'init': {
        const p = a[0] as InitPayload;
        const bundle: LuaBundle = p.bundle ?? (await fetchBundle(p.bundleUrl!));
        host = await InProcessLuaHost.create(bundle, {
          wasmUri: p.wasmUri,
          hashSeedEpoch: p.hashSeedEpoch,
          maxResumes: p.maxResumes,
        });
        host.onOutput((e) => endpoint.post({ id: -1, ok: true, value: { push: 'output', envelope: e } }));
        host.onDecision((d) => endpoint.post({ id: -1, ok: true, value: { push: 'decision', decision: d } }));
        return true;
      }
      case 'createRoom':
        return need().createRoom(a[0] as never);
      case 'resume':
        return need().resume(a[0] as string | undefined);
      case 'advance':
        return need().advance(a[0] as never);
      case 'submitReply':
        return need().submitReply(a[0] as number, a[1]);
      case 'pushReply':
        return need().pushReplyRaw(a[0] as number, a[1] as string);
      case 'request':
        return need().request(a[0] as number, a[1] as string);
      case 'replay':
        return need().replay(a[0] as never, a[1] as never);
      case 'replayStatus':
        return need().replayStatus();
      case 'stateDigest':
        return need().stateDigest();
      case 'stateJson':
        return need().stateJson();
      case 'joinPreamble':
        return need().joinPreamble(a[0] as number);
      case 'resyncPayload':
        return need().resyncPayload(a[0] as number);
      case 'addObserver':
        return need().addObserver(a[0] as number, a[1] as number, a[2] as string, a[3] as string);
      case 'removeObserver':
        return need().removeObserver(a[0] as number);
      case 'setPlayerState':
        return need().setPlayerState(a[0] as number, a[1] as number);
      case 'pendingInput':
        return need().pendingInput();
      case 'decisionsFrom':
        return need().decisionsFrom(a[0] as number);
      case 'stats':
        return need().stats();
      case 'dispose':
        host?.dispose();
        host = null;
        return true;
      default:
        throw new Error(`unknown host op ${String(req.op)}`);
    }
  }
}
