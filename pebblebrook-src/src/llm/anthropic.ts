/**
 * Anthropic Messages API over plain fetch (no SDK). Browser-safe: sends the
 * `anthropic-dangerous-direct-browser-access` header so the API accepts calls straight from the page.
 */
import { LlmError, estimateTokens, redact, type LlmRequest, type LlmResponse, type LlmToolCall, type Provider } from './types.ts';

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

type Body = Record<string, unknown>;

function buildBody(req: LlmRequest, model: string, forced: boolean): Body {
  const body: Body = {
    model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (req.temperature !== undefined) body.temperature = req.temperature;
  if (req.tools?.length) {
    body.tools = req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.params }));
    const choice: Body = { disable_parallel_tool_use: true };
    if (forced && req.toolChoice === 'any') choice.type = 'any';
    else if (forced && req.toolChoice) { choice.type = 'tool'; choice.name = req.toolChoice; }
    else choice.type = 'auto';
    body.tool_choice = choice;
  }
  return body;
}

function parseRetryAfter(res: Response): number | undefined {
  const h = res.headers.get('retry-after');
  if (!h) return undefined;
  const s = Number(h);
  if (Number.isFinite(s)) return Math.max(0, s * 1000);
  const t = Date.parse(h);
  return Number.isFinite(t) ? Math.max(0, t - Date.now()) : undefined;
}

async function httpError(res: Response, key: string): Promise<LlmError> {
  let message = `HTTP ${res.status}`;
  let type = '';
  try {
    const j = (await res.json()) as { error?: { type?: string; message?: string } };
    type = j.error?.type ?? '';
    if (j.error?.message) message = `HTTP ${res.status} ${type}: ${j.error.message}`;
  } catch { /* not json */ }
  const status = res.status;
  const retryable = status === 429 || status === 408 || status === 409 || status >= 500;
  const code = status === 429 ? 'rate-limit' : status === 401 || status === 403 ? 'auth' : 'http';
  return new LlmError(redact(message, key), { status, retryable, code, retryAfterMs: parseRetryAfter(res) });
}

interface AnthropicMessage {
  content?: { type: string; text?: string; name?: string; input?: unknown }[];
  stop_reason?: string;
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export function parseAnthropic(msg: AnthropicMessage, req: LlmRequest): LlmResponse {
  const texts: string[] = [];
  const toolCalls: LlmToolCall[] = [];
  for (const block of msg.content ?? []) {
    if (block.type === 'text' && typeof block.text === 'string') texts.push(block.text);
    else if (block.type === 'tool_use' && typeof block.name === 'string') {
      let args: unknown = block.input;
      if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
      toolCalls.push({ name: block.name, args: args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {} });
    }
  }
  const text = texts.join('\n').trim();
  const tokensIn = msg.usage?.input_tokens ?? estimateTokens(req.system + req.messages.map((m) => m.content).join('') + JSON.stringify(req.tools ?? []));
  const tokensOut = msg.usage?.output_tokens ?? estimateTokens(text + JSON.stringify(toolCalls));
  return { text, toolCalls, tokensIn, tokensOut, model: msg.model, stop: msg.stop_reason };
}

export const anthropicProvider: Provider = async (req, opts) => {
  const f = opts.fetch ?? ((input: string, init: RequestInit) => globalThis.fetch(input, init));
  const headers = {
    'content-type': 'application/json',
    'x-api-key': opts.apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  const send = (body: Body): Promise<Response> => f(ANTHROPIC_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: opts.signal });

  let forced = !!req.toolChoice;
  let res = await send(buildBody(req, opts.model, forced));
  if (!res.ok) {
    const err = await httpError(res, opts.apiKey);
    // Some models (Claude Fable 5.1) reject forced tool use: ask again with `auto`; the prompt already says to use a tool.
    if (res.status === 400 && forced && /tool_choice/i.test(err.message)) {
      forced = false;
      res = await send(buildBody(req, opts.model, forced));
      if (!res.ok) throw await httpError(res, opts.apiKey);
    } else throw err;
  }
  const msg = (await res.json()) as AnthropicMessage;
  if (msg.stop_reason === 'refusal') throw new LlmError('the model refused', { code: 'refusal' });
  return parseAnthropic(msg, req);
};
