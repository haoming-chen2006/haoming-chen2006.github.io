// AGENT B owns this module (LocalBrain). Keep the export names.
import type { Brain, ConversationContext, ConversationTurn, Decision, DecisionContext } from '../core/types.ts';
import { LocalBrain } from './local.ts';

/**
 * The local brain resolves synchronously as well as through the async Brain contract. The sim duck-types
 * these methods so the headless simulation never awaits between ticks; an LLM brain simply lacks them.
 */
export interface LocalBrainSync extends Brain {
  decideSync(ctx: DecisionContext): Decision;
  converseSync(ctx: ConversationContext): ConversationTurn;
  reflectSync(ctx: DecisionContext): string[];
}

export function createLocalBrain(seed: number): Brain & LocalBrainSync {
  return new LocalBrain(seed);
}

export { LocalBrain } from './local.ts';
export { classifyLine } from './dialogue.ts';
