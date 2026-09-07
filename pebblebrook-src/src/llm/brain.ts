/**
 * The LlmBrain: villagers think and talk through a model when the settings allow it, and through the local
 * brain otherwise — including whenever a request fails, so the sim never waits on a broken network.
 */
import type { LlmSettings } from '../core/app.ts';
import type { Brain, ConversationContext, ConversationTurn, Decision, DecisionContext } from '../core/types.ts';
import { ANTHROPIC_DEFAULT_MODEL, anthropicProvider } from './anthropic.ts';
import { decisionFromResponse, reflectionsFromResponse, turnFromResponse } from './coerce.ts';
import { OPENAI_DEFAULT_MODEL, openaiProvider } from './openai.ts';
import { REFLECT_TOOL, SPEAK_TOOL, conversationMessage, decisionMessage, decisionTools, reflectionMessage, systemPrompt } from './prompt.ts';
import { LlmQueue, PRIORITY, llmStats, recordError, type Priority } from './queue.ts';
import { LlmError, asLlmError, type FetchFn, type LlmRequest, type LlmResponse, type Provider } from './types.ts';

type SyncBrain = Brain & {
  decideSync?: (ctx: DecisionContext) => Decision;
  converseSync?: (ctx: ConversationContext) => ConversationTurn;
  reflectSync?: (ctx: DecisionContext) => string[];
};

export interface LlmBrainOptions {
  fetch?: FetchFn;
  queue?: LlmQueue;
  timeoutMs?: number;
  maxInFlight?: number;
  maxWaiting?: number;
  providers?: Partial<Record<'anthropic' | 'openai', Provider>>;
}

export interface LlmBrain extends Brain {
  /** present exactly when decisions are NOT model-driven, so the sim resolves them synchronously via the local brain */
  readonly decideSync: ((ctx: DecisionContext) => Decision) | undefined;
  readonly converseSync: ((ctx: ConversationContext) => ConversationTurn) | undefined;
  readonly reflectSync: ((ctx: DecisionContext) => string[]) | undefined;
  readonly queue: LlmQueue;
  /** would the model be used for this kind of call right now? */
  active(what: 'decide' | 'social'): boolean;
}

/** The model to send: the Settings panel shares one field across providers, so cross-provider names are swapped for defaults. */
export function modelFor(s: LlmSettings): string {
  const m = s.model.trim();
  if (s.provider === 'anthropic') return m && !/^(gpt|o\d|chatgpt)/i.test(m) ? m : ANTHROPIC_DEFAULT_MODEL;
  if (s.provider === 'openai') return m && !/^claude/i.test(m) ? m : OPENAI_DEFAULT_MODEL;
  return m;
}

const MAX_TOKENS = { decide: 400, converse: 350, reflect: 500 };
const TEMPERATURE = { decide: 0.8, converse: 0.9, reflect: 0.8 };

export function createLlmBrain(settings: () => LlmSettings, fallback: Brain, opts: LlmBrainOptions = {}): LlmBrain {
  const fb = fallback as SyncBrain;
  const queue = opts.queue ?? new LlmQueue({ budget: () => Math.max(0, settings().budgetPerHour), timeoutMs: opts.timeoutMs, maxInFlight: opts.maxInFlight, maxWaiting: opts.maxWaiting });
  const providers: Record<'anthropic' | 'openai', Provider> = { anthropic: anthropicProvider, openai: openaiProvider, ...opts.providers };

  const active = (what: 'decide' | 'social'): boolean => {
    const s = settings();
    if (s.provider === 'none' || !s.apiKey.trim() || s.mode === 'off') return false;
    return what === 'social' || s.mode === 'all';
  };

  async function call(kind: string, priority: Priority, retries: number, nowMinute: number, req: LlmRequest): Promise<LlmResponse> {
    const s = settings();
    const provider = s.provider === 'anthropic' || s.provider === 'openai' ? providers[s.provider] : null;
    if (!provider) throw new LlmError('no provider configured', { code: 'config' });
    const apiKey = s.apiKey.trim(), model = modelFor(s);
    const res = await queue.submit({ priority, kind, retries }, nowMinute, async (signal) => {
      try { return await provider(req, { apiKey, model, signal, fetch: opts.fetch }); } catch (e) { throw asLlmError(e, apiKey); }
    });
    llmStats.tokensIn += res.tokensIn; llmStats.tokensOut += res.tokensOut; llmStats.lastModel = res.model ?? model;
    return res;
  }

  function useFallback(kind: string, e: unknown): void {
    llmStats.fallbacks++;
    const err = asLlmError(e, settings().apiKey);
    // queue failures already recorded themselves; parse/config problems are recorded here
    if (err.code === 'parse' || err.code === 'config' || err.code === 'refusal') recordError(kind, err);
  }

  async function decide(ctx: DecisionContext): Promise<Decision> {
    if (!active('decide') || !ctx.options.length) return fallback.decide(ctx);
    const kind = `decide:${ctx.villager.id}`;
    try {
      const req: LlmRequest = { system: systemPrompt(ctx.villager), messages: [{ role: 'user', content: decisionMessage(ctx) }], tools: decisionTools(ctx), toolChoice: 'any', maxTokens: MAX_TOKENS.decide, temperature: TEMPERATURE.decide };
      const res = await call(kind, PRIORITY.decision, 1, ctx.now.minute, req);
      const d = decisionFromResponse(res, ctx);
      if (!d.ok) throw new LlmError(d.reason, { code: 'parse' });
      const out: Decision = { tool: d.tool, args: d.args, thought: d.thought };
      if (d.say) out.say = d.say;
      return out;
    } catch (e) {
      useFallback(kind, e);
      return fallback.decide(ctx);
    }
  }

  async function speak(ctx: ConversationContext, mode: 'converse' | 'chat'): Promise<ConversationTurn> {
    const kind = `${mode}:${ctx.speaker.id}`;
    const priority = ctx.listener === 'player' ? PRIORITY.player : PRIORITY.conversation;
    const req: LlmRequest = { system: systemPrompt(ctx.speaker), messages: [{ role: 'user', content: conversationMessage(ctx, mode) }], tools: [SPEAK_TOOL], toolChoice: 'speak', maxTokens: MAX_TOKENS.converse, temperature: TEMPERATURE.converse };
    const res = await call(kind, priority, 2, ctx.world.time.minute, req);
    const turn = turnFromResponse(res, ctx);
    if (!turn) throw new LlmError('no line in reply', { code: 'parse' });
    return turn;
  }

  async function converse(ctx: ConversationContext): Promise<ConversationTurn> {
    if (!active('social')) return fallback.converse(ctx);
    try { return await speak(ctx, 'converse'); } catch (e) { useFallback(`converse:${ctx.speaker.id}`, e); return fallback.converse(ctx); }
  }

  async function chat(ctx: ConversationContext): Promise<ConversationTurn | null> {
    if (!active('social') || !ctx.playerLine) return fallback.chat ? fallback.chat(ctx) : null;
    try { return await speak(ctx, 'chat'); } catch (e) {
      useFallback(`chat:${ctx.speaker.id}`, e);
      const local = fallback.chat ? await fallback.chat(ctx) : null;
      return local ?? fallback.converse(ctx);
    }
  }

  async function reflect(ctx: DecisionContext): Promise<string[]> {
    if (!active('social')) return fallback.reflect(ctx);
    const kind = `reflect:${ctx.villager.id}`;
    try {
      const req: LlmRequest = { system: systemPrompt(ctx.villager), messages: [{ role: 'user', content: reflectionMessage(ctx) }], tools: [REFLECT_TOOL], toolChoice: 'reflect', maxTokens: MAX_TOKENS.reflect, temperature: TEMPERATURE.reflect };
      const res = await call(kind, PRIORITY.reflection, 1, ctx.now.minute, req);
      const lines = reflectionsFromResponse(res);
      if (!lines.length) throw new LlmError('no reflections in reply', { code: 'parse' });
      return lines;
    } catch (e) {
      useFallback(kind, e);
      return fallback.reflect(ctx);
    }
  }

  return {
    kind: 'llm',
    queue,
    active,
    get decideSync() { return active('decide') ? undefined : fb.decideSync ? fb.decideSync.bind(fb) : undefined; },
    get converseSync() { return active('social') ? undefined : fb.converseSync ? fb.converseSync.bind(fb) : undefined; },
    get reflectSync() { return active('social') ? undefined : fb.reflectSync ? fb.reflectSync.bind(fb) : undefined; },
    decide,
    converse,
    reflect,
    chat,
  };
}
