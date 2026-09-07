/**
 * 「AI 设计」 without a server: the same loop, the model reached from the tab.
 *
 * `agent/loop.ts` is what runs; this supplies its two halves for the published
 * page. The model call goes straight to api.openai.com with the key the player
 * gave `keys.ts`, and the build is `browser/build.ts` — validate, compile, boot
 * the engine in this tab, probe — so what the model is told about a failed
 * attempt is the engine's own report, exactly as on the dev page. Nothing is
 * saved until the engine says the hero fires: a revision the model abandoned
 * is not a hero anybody wants in 我的武将.
 */
import { CHAT_SCHEMA, runAgent, type AgentAttempt, type AgentResult } from '../agent/loop.ts';
import { DEFAULT_MODEL, chatJson, type ChatMessage } from '../agent/openai.ts';
import type { HeroSpec } from '../spec.ts';
import { buildInBrowser, type BuildOptions } from './build.ts';
import { readBrowserKey, readBrowserModel } from './keys.ts';

export class NeedKeyError extends Error {
  constructor() {
    super('这一页没有后端，AI 设计要用你自己的 OpenAI API Key。填在下面就行，它只存在这台浏览器里。');
    this.name = 'NeedKeyError';
  }
}

export interface BrowserChatOptions {
  onAttempt?: (attempt: AgentAttempt, index: number) => void;
  /** Test seams. */
  callModel?: (messages: ChatMessage[]) => Promise<unknown>;
  build?: BuildOptions;
}

export async function chatInBrowser(
  messages: ChatMessage[],
  spec: HeroSpec | null | undefined,
  opts: BrowserChatOptions = {},
): Promise<AgentResult> {
  const key = readBrowserKey();
  if (!opts.callModel && !key) throw new NeedKeyError();
  const model = readBrowserModel() || DEFAULT_MODEL;

  const out = await runAgent({
    messages,
    spec,
    callModel: opts.callModel
      ?? ((msgs) => chatJson({ key, model, messages: msgs, schema: CHAT_SCHEMA, schemaName: 'hero' })),
    build: async (candidate) => {
      const r = await buildInBrowser(candidate, { ...opts.build, save: false });
      return { ok: r.ok, errors: r.errors, test: r.test ?? null };
    },
    onAttempt: opts.onAttempt,
  });

  // The engine agreed: build once more, this time keeping it.
  if (out.status === 'created' && out.spec) {
    await buildInBrowser(out.spec, { ...opts.build, save: true });
  }
  return out;
}
