// AGENT F owns this module (LlmBrain + provider adapters + key settings). Keep the export names.
import type { LlmSettings } from '../core/app.ts';
import type { Brain } from '../core/types.ts';
import { createLlmBrain as build, type LlmBrain, type LlmBrainOptions } from './brain.ts';

export const DEFAULT_LLM: LlmSettings = { provider: 'none', apiKey: '', model: 'claude-haiku-4-5-20251001', mode: 'off', budgetPerHour: 60 };

export function loadLlmSettings(): LlmSettings {
  try { return { ...DEFAULT_LLM, ...(JSON.parse(localStorage.getItem('pebblebrook.llm') ?? '{}') as Partial<LlmSettings>) }; } catch { return { ...DEFAULT_LLM }; }
}
export function saveLlmSettings(s: LlmSettings): void { try { localStorage.setItem('pebblebrook.llm', JSON.stringify(s)); } catch { /* no storage */ } }

/** An LLM-backed brain that falls back to `fallback` whenever the model is unavailable. */
export function createLlmBrain(settings: () => LlmSettings, fallback: Brain, opts?: LlmBrainOptions): LlmBrain {
  return build(settings, fallback, opts);
}

export type { LlmBrain, LlmBrainOptions } from './brain.ts';
export { modelFor } from './brain.ts';
export { llmStats, resetLlmStats, LlmQueue, PRIORITY, type LlmStats, type Priority } from './queue.ts';
export { anthropicProvider, parseAnthropic, ANTHROPIC_URL, ANTHROPIC_DEFAULT_MODEL } from './anthropic.ts';
export { openaiProvider, parseOpenAi, parseArgs, OPENAI_URL, OPENAI_DEFAULT_MODEL } from './openai.ts';
export { systemPrompt, decisionMessage, decisionTools, conversationMessage, reflectionMessage, needsToWords, moodWord, timeAgo, pickMemories, SPEAK_TOOL, REFLECT_TOOL } from './prompt.ts';
export { decisionFromResponse, turnFromResponse, reflectionsFromResponse, coerceArgs, parseToolCallFromText, matchToolName, resolveVillagerId, resolvePlaceId, resolveItemId, resolveRecipeId } from './coerce.ts';
export { LlmError, redact, estimateTokens, type LlmRequest, type LlmResponse, type LlmToolCall, type LlmToolSchema, type Provider, type ProviderOpts, type FetchFn } from './types.ts';
