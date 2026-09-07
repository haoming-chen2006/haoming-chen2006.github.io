/** Provider-neutral request/response shapes for src/llm. Plain data; no SDK types. */
import type { JsonSchema } from '../core/types.ts';

export interface LlmToolSchema { name: string; description: string; params: JsonSchema }
export interface LlmMessage { role: 'user' | 'assistant'; content: string }

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools?: LlmToolSchema[];
  /** 'any' = must call some tool; a tool name = must call that one; undefined = the model may answer in text */
  toolChoice?: 'any' | string;
  maxTokens: number;
  temperature?: number;
}

export interface LlmToolCall { name: string; args: Record<string, unknown> }

export interface LlmResponse {
  /** all text blocks joined */
  text: string;
  toolCalls: LlmToolCall[];
  tokensIn: number;
  tokensOut: number;
  model?: string;
  stop?: string;
}

export type FetchFn = (input: string, init: RequestInit) => Promise<Response>;

export interface ProviderOpts { apiKey: string; model: string; signal?: AbortSignal; fetch?: FetchFn }
export type Provider = (req: LlmRequest, opts: ProviderOpts) => Promise<LlmResponse>;

export type LlmErrorCode =
  | 'http' | 'rate-limit' | 'auth' | 'network' | 'timeout' | 'refusal' | 'parse' | 'budget' | 'cooldown' | 'queue-full' | 'config';

export class LlmError extends Error {
  status: number | undefined;
  retryable: boolean;
  retryAfterMs: number | undefined;
  code: LlmErrorCode;
  constructor(message: string, opts: { status?: number; retryable?: boolean; retryAfterMs?: number; code?: LlmErrorCode } = {}) {
    super(message);
    this.name = 'LlmError';
    this.status = opts.status;
    this.retryable = opts.retryable ?? false;
    this.retryAfterMs = opts.retryAfterMs;
    this.code = opts.code ?? 'http';
  }
}

/** Mask the configured key and anything that looks like an API key so it never reaches logs or the UI. */
export function redact(text: string, key = ''): string {
  let out = text;
  if (key && key.length >= 8) out = out.split(key).join('[key]');
  return out.replace(/sk-[A-Za-z0-9_-]{12,}/g, '[key]').replace(/Bearer\s+[A-Za-z0-9_.-]{12,}/g, 'Bearer [key]');
}

export function asLlmError(e: unknown, key = ''): LlmError {
  if (e instanceof LlmError) { e.message = redact(e.message, key); return e; }
  if (e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError') return new LlmError('timed out', { code: 'timeout' });
  const msg = e instanceof Error ? e.message : String(e);
  if (/fetch|network|ECONN|ENOTFOUND|Failed to fetch|load failed/i.test(msg)) return new LlmError(redact(msg, key), { code: 'network', retryable: true });
  return new LlmError(redact(msg, key), { code: 'parse' });
}

/** Rough token estimate for stats when a provider reports no usage. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
