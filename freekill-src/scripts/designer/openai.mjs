// The whole OpenAI client. `fetch` is global in node 22, so this needs no
// dependency, and a dependency is not free here: it would be the first one this
// repo takes for a dev-only tool.
//
// Two things it is careful about, both about the key. It is never logged, never
// echoed in an error, and never written to the attempt log — only where it was
// READ from is reported, because "which file did it pick" is the question a
// person actually has when two candidate files hold different keys. And it is
// never guessed: with no `OPENAI_API_KEY` in the environment, the file has to be
// named, by `--key-file` or `DESIGNER_KEY_FILE`. There are two plausible dotenv
// files on this machine with different keys in them and picking one would be
// spending somebody's money on a coin flip.
import { readFileSync } from 'node:fs';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

/** `KEY=value`, `export KEY="value"`, `# comment`. Enough for a dotenv file. */
function parseDotenv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/**
 * @returns {{ key: string|null, from: string, why?: string }}
 */
export function resolveKey(argv = process.argv.slice(2)) {
  if (process.env.OPENAI_API_KEY) return { key: process.env.OPENAI_API_KEY, from: '$OPENAI_API_KEY' };

  const i = argv.indexOf('--key-file');
  const file = (i >= 0 ? argv[i + 1] : undefined) ?? process.env.DESIGNER_KEY_FILE;
  if (!file) {
    return {
      key: null,
      from: 'nowhere',
      why: 'no OPENAI_API_KEY, and no key file named — pass --key-file <path> or set DESIGNER_KEY_FILE',
    };
  }
  let text;
  try {
    text = readFileSync(file.replace(/^~/, process.env.HOME ?? '~'), 'utf8');
  } catch (e) {
    return { key: null, from: file, why: `cannot read ${file}: ${e.code ?? e.message}` };
  }
  const key = parseDotenv(text).OPENAI_API_KEY;
  if (!key) return { key: null, from: file, why: `${file} has no OPENAI_API_KEY line` };
  return { key, from: file };
}

export class OpenAIError extends Error {
  constructor(status, body) {
    super(`OpenAI ${status}: ${String(body).slice(0, 400)}`);
    this.name = 'OpenAIError';
    this.status = status;
  }
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
}) {
  const call = async (strict) => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINT, {
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
      const body = JSON.parse(text);
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new OpenAIError(res.status, 'no message content');
      return JSON.parse(content);
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
