/**
 * The OpenAI key, on the published page.
 *
 * A static site cannot hold a secret, so the key the AI lane uses there is
 * the player's own, typed once and kept in this browser's `localStorage`. It
 * is sent to exactly one host, api.openai.com, in the Authorization header of
 * `agent/openai.ts`'s call, and to nothing else — not to this site, which has
 * no server to send it to. The dev page never needs it: `npm run designer`
 * holds the key on the machine and the page talks to that instead.
 */
export const OPENAI_KEY_STORAGE = 'fk.designer.openai_key';
export const OPENAI_MODEL_STORAGE = 'fk.designer.openai_model';

function read(key: string): string {
  try { return globalThis.localStorage?.getItem(key) ?? ''; } catch { return ''; }
}

function write(key: string, value: string): void {
  try {
    if (value) globalThis.localStorage?.setItem(key, value);
    else globalThis.localStorage?.removeItem(key);
  } catch { /* a key we cannot keep is still usable for this page's lifetime */ }
}

let memoryKey = '';

export function readBrowserKey(): string {
  return memoryKey || read(OPENAI_KEY_STORAGE);
}

export function writeBrowserKey(key: string): void {
  memoryKey = key.trim();
  write(OPENAI_KEY_STORAGE, memoryKey);
}

export function readBrowserModel(): string {
  return read(OPENAI_MODEL_STORAGE);
}

export function writeBrowserModel(model: string): void {
  write(OPENAI_MODEL_STORAGE, model.trim());
}

/** `sk-…`, `sk-proj-…`: the shapes OpenAI issues. Loose on purpose; the API is the judge. */
export const looksLikeKey = (key: string): boolean => /^sk-[A-Za-z0-9_-]{16,}$/.test(key.trim());
