/**
 * The whole OpenAI client: one structured-output call over `fetch`.
 *
 * Portable on purpose. `fetch` is global in node 22 and in every browser, so
 * the same eighty lines serve the dev back end (`scripts/designer/openai.mjs`,
 * which adds the key-file reading node can do) and the published page, where
 * the call goes straight from the player's tab to api.openai.com with a key
 * they typed themselves (`../browser/keys.ts`).
 *
 * The key is never logged and never echoed in an error: an `OpenAIError`
 * carries the status and the first 400 characters of the body, which is where
 * OpenAI puts the sentence a person needs, and nothing else.
 */
export const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_MODEL = 'gpt-4.1-mini';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIError extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(`OpenAI ${status}: ${String(body).slice(0, 400)}`);
    this.name = 'OpenAIError';
    this.status = status;
  }
}

export interface ChatJsonOptions {
  key: string;
  model?: string;
  messages: ChatMessage[];
  schema: Record<string, unknown>;
  schemaName?: string;
  timeoutMs?: number;
  endpoint?: string;
}

/**
 * One structured-output call. Returns the parsed object.
 *
 * `strict: true` is what makes the schema a guarantee rather than a suggestion,
 * and it is also what rejects a schema the API does not like — with a 400 that
 * names the offending keyword. Rather than pin a guess about which keywords are
 * currently accepted, an invalid_request that mentions the schema is retried
 * once without strict: a spec that then fails `validateSpec` costs one revision
 * round, where a hard failure costs the whole request.
 */
export async function chatJson({
  key, model = DEFAULT_MODEL, messages, schema, schemaName = 'result', timeoutMs = 90_000,
  endpoint = OPENAI_ENDPOINT,
}: ChatJsonOptions): Promise<unknown> {
  const call = async (strict: boolean): Promise<unknown> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_schema', json_schema: { name: schemaName, strict, schema } },
        }),
        signal: ac.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new OpenAIError(res.status, text);
      const body = JSON.parse(text) as { choices?: { message?: { content?: unknown } }[] };
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new OpenAIError(res.status, 'no message content');
      return JSON.parse(content) as unknown;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await call(true);
  } catch (e) {
    if (e instanceof OpenAIError && e.status === 400 && /schema/i.test(e.message)) return call(false);
    throw e;
  }
}
