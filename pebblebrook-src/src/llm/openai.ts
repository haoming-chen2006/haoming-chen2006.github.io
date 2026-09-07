/** OpenAI chat completions with function calling over plain fetch (no SDK). */
import { LlmError, estimateTokens, redact, type LlmRequest, type LlmResponse, type LlmToolCall, type Provider } from './types.ts';

export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';

type Body = Record<string, unknown>;

function buildBody(req: LlmRequest, model: string, withTemperature: boolean): Body {
  const body: Body = {
    model,
    messages: [{ role: 'system', content: req.system }, ...req.messages.map((m) => ({ role: m.role, content: m.content }))],
    max_completion_tokens: req.maxTokens,
  };
  if (withTemperature && req.temperature !== undefined) body.temperature = req.temperature;
  if (req.tools?.length) {
    body.tools = req.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.params } }));
    body.tool_choice = req.toolChoice === 'any' ? 'required' : req.toolChoice ? { type: 'function', function: { name: req.toolChoice } } : 'auto';
    body.parallel_tool_calls = false;
  }
  return body;
}

function parseRetryAfter(res: Response): number | undefined {
  const h = res.headers.get('retry-after');
  if (!h) return undefined;
  const s = Number(h);
  return Number.isFinite(s) ? Math.max(0, s * 1000) : undefined;
}

async function httpError(res: Response, key: string): Promise<LlmError> {
  let message = `HTTP ${res.status}`;
  try {
    const j = (await res.json()) as { error?: { type?: string; code?: string; message?: string } };
    if (j.error?.message) message = `HTTP ${res.status} ${j.error.type ?? ''}${j.error.code ? `/${j.error.code}` : ''}: ${j.error.message}`;
  } catch { /* not json */ }
  const status = res.status;
  const retryable = status === 429 || status === 408 || status === 409 || status >= 500;
  const code = status === 429 ? 'rate-limit' : status === 401 || status === 403 ? 'auth' : 'http';
  return new LlmError(redact(message, key), { status, retryable, code, retryAfterMs: parseRetryAfter(res) });
}

/** Parse a JSON object string; salvage a truncated one by closing open braces/quotes when it helps. */
export function parseArgs(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s === '') return {};
  try { const v = JSON.parse(s); return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null; } catch { /* try to salvage */ }
  const salvaged = salvageJson(s);
  return salvaged;
}

function salvageJson(s: string): Record<string, unknown> | null {
  // drop a dangling partial key/value after the last complete pair, then close the object
  const lastComma = s.lastIndexOf(',');
  const candidates = [s, lastComma > 0 ? s.slice(0, lastComma) : ''].filter(Boolean);
  for (const c of candidates) {
    let t = c;
    const quotes = (t.match(/(?<!\\)"/g) ?? []).length;
    if (quotes % 2 === 1) t += '"';
    const open = (t.match(/{/g) ?? []).length - (t.match(/}/g) ?? []).length;
    const openArr = (t.match(/\[/g) ?? []).length - (t.match(/]/g) ?? []).length;
    t += ']'.repeat(Math.max(0, openArr)) + '}'.repeat(Math.max(0, open));
    try { const v = JSON.parse(t); if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>; } catch { /* next */ }
  }
  return null;
}

interface OpenAiCompletion {
  choices?: { message?: { content?: string | { type: string; text?: string }[] | null; refusal?: string | null; tool_calls?: { function?: { name?: string; arguments?: unknown } }[] }; finish_reason?: string }[];
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function parseOpenAi(j: OpenAiCompletion, req: LlmRequest): LlmResponse {
  const choice = j.choices?.[0];
  const m = choice?.message;
  if (!m) throw new LlmError('empty completion', { code: 'parse' });
  if (choice?.finish_reason === 'content_filter' || (typeof m.refusal === 'string' && m.refusal)) throw new LlmError('the model refused', { code: 'refusal' });
  let text = '';
  if (typeof m.content === 'string') text = m.content;
  else if (Array.isArray(m.content)) text = m.content.map((p) => (p.type === 'text' ? p.text ?? '' : '')).join('');
  const toolCalls: LlmToolCall[] = [];
  for (const tc of m.tool_calls ?? []) {
    const name = tc.function?.name;
    if (typeof name !== 'string') continue;
    const args = parseArgs(tc.function?.arguments);
    if (!args) throw new LlmError(`unparseable arguments for ${name}`, { code: 'parse' });
    toolCalls.push({ name, args });
  }
  const tokensIn = j.usage?.prompt_tokens ?? estimateTokens(req.system + req.messages.map((x) => x.content).join('') + JSON.stringify(req.tools ?? []));
  const tokensOut = j.usage?.completion_tokens ?? estimateTokens(text + JSON.stringify(toolCalls));
  return { text: text.trim(), toolCalls, tokensIn, tokensOut, model: j.model, stop: choice?.finish_reason };
}

export const openaiProvider: Provider = async (req, opts) => {
  const f = opts.fetch ?? ((input: string, init: RequestInit) => globalThis.fetch(input, init));
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` };
  const send = (body: Body): Promise<Response> => f(OPENAI_URL, { method: 'POST', headers, body: JSON.stringify(body), signal: opts.signal });

  let res = await send(buildBody(req, opts.model, true));
  if (!res.ok) {
    const err = await httpError(res, opts.apiKey);
    // Reasoning models reject a custom temperature: retry once without it.
    if (res.status === 400 && req.temperature !== undefined && /temperature/i.test(err.message)) {
      res = await send(buildBody(req, opts.model, false));
      if (!res.ok) throw await httpError(res, opts.apiKey);
    } else throw err;
  }
  return parseOpenAi((await res.json()) as OpenAiCompletion, req);
};
