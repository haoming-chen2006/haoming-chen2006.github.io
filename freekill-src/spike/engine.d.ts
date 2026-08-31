import type { LuaEngine } from 'wasmoon';

export interface SpikeVm {
  lua: LuaEngine;
  FS: typeof FS;
  luaWasm: { module: { FS: typeof FS } };
  factory: unknown;
}

export declare function createVm(
  bundle: Record<string, string>,
  options?: { traceAllocations?: boolean; wasmUri?: string; hashSeedEpoch?: number | null },
): Promise<any>;

export declare function installHost(
  vm: { lua: any; FS: any },
  options?: {
    logLevels?: Set<string>;
    replies?: Map<number, string[]>;
    onTick?: (kind: string, connId: number, command: string, nbytes: number) => void;
  },
): {
  cwd: string;
  logs: [string, string][];
  ticks: number;
  tickBytes: number;
  replies: Map<number, string[]>;
};
