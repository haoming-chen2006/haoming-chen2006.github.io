// AGENT B owns this module. Entry point: the simulation and the tool catalogue.
import type { Sim } from '../core/app.ts';
import type { Brain, ToolDef, World } from '../core/types.ts';
import { SimImpl } from './sim.ts';
import { TOOLS as CATALOGUE } from './tools/index.ts';

export const TOOLS: ToolDef[] = CATALOGUE;

export function createSim(world: World, seed: number, brains: { local: Brain; llm: Brain | null }): Sim {
  return new SimImpl(world, seed, brains);
}

export { SimImpl } from './sim.ts';
export { createTestWorld } from './testworld.ts';
