// The dev back end's half of the OpenAI client: reading the key off disk. The
// call itself is `src/designer/agent/openai.ts`, shared with the published page.
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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** `freekill-src/.env`: local, gitignored, the place to name the key file once. */
export const LOCAL_ENV = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');

import { DEFAULT_MODEL as MODEL_DEFAULT, chatJson as chatJsonPortable } from '../../src/designer/agent/openai.ts';

export { OpenAIError } from '../../src/designer/agent/openai.ts';
export const DEFAULT_MODEL = process.env.OPENAI_MODEL || MODEL_DEFAULT;

/** The portable call, with this process's default model. */
export const chatJson = (opts) => chatJsonPortable({ model: DEFAULT_MODEL, ...opts });

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
export function resolveKey(argv = process.argv.slice(2), { localEnv = LOCAL_ENV } = {}) {
  if (process.env.OPENAI_API_KEY) return { key: process.env.OPENAI_API_KEY, from: '$OPENAI_API_KEY' };

  // freekill-src/.env is gitignored and is where this machine's answer lives:
  // `DESIGNER_KEY_FILE=~/.hermes/.env`, chosen once instead of typed per run.
  let local = {};
  try { local = parseDotenv(readFileSync(localEnv, 'utf8')); } catch { /* no .env: fine */ }
  if (local.OPENAI_API_KEY) return { key: local.OPENAI_API_KEY, from: localEnv };

  const i = argv.indexOf('--key-file');
  const file = (i >= 0 ? argv[i + 1] : undefined) ?? process.env.DESIGNER_KEY_FILE ?? local.DESIGNER_KEY_FILE;
  if (!file) {
    return {
      key: null,
      from: 'nowhere',
      why: 'no OPENAI_API_KEY, and no key file named — pass --key-file <path>, set DESIGNER_KEY_FILE, or put DESIGNER_KEY_FILE=… in freekill-src/.env',
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
