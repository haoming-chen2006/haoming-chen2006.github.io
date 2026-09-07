/**
 * Ask the model for a hero, then keep asking until the engine agrees it works.
 *
 * The loop is the point. A model writing Lua-by-blocks gets the composition
 * rules wrong in ways only the engine can see — a `can_trigger` that is never
 * true, a cost in the actions, `self-is-subject` on an event with no subject —
 * and every one of those produces a general that loads. So the failure fed back
 * is never "that was wrong": it is the validator's paths, the compiler's
 * sentence with its engine line number, or the headless probe's own report.
 *
 * Portable: the two things that differ between the dev back end and the
 * published page are injected. `callModel` is one structured-output call
 * (through the local server's key, or straight from the tab with the player's
 * own); `build` is "validate, compile, boot, probe" — on disk in node, in
 * memory in the browser. Everything the model is told is the same in both.
 */
import { HERO_SPEC_SCHEMA, normalizeSpec, type HeroSpec, type SpecError } from '../spec.ts';
import type { ChatMessage } from './openai.ts';
import { failureMessage, systemPrompt } from './prompt.ts';

/** Up to five revisions, then the agent stops and says what is still wrong. */
export const MAX_REVISIONS = 5;

/** `{ reply, spec }`, the shape the model answers in. */
export const CHAT_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'One or two sentences for the person, in their language.' },
    spec: HERO_SPEC_SCHEMA,
  },
  required: ['reply', 'spec'],
  additionalProperties: false,
} as const;

/** What one attempt to build a spec came to. The shape `createHero` returns. */
export interface BuildOutcome {
  ok: boolean;
  errors?: SpecError[];
  test?: { ok: boolean; fired: boolean | null; log: string[] } | null;
}

export type BuildHero = (spec: HeroSpec) => Promise<BuildOutcome>;
export type CallModel = (messages: ChatMessage[]) => Promise<unknown>;

export interface AgentAttempt {
  spec: HeroSpec;
  errors: SpecError[];
  testLog: string[];
}

export interface AgentResult {
  reply: string;
  spec: HeroSpec | null;
  status: 'created' | 'failed';
  attempts: AgentAttempt[];
}

export interface AgentOptions {
  messages: ChatMessage[];
  /** The hero on the canvas, so the model revises rather than restarts. */
  spec?: HeroSpec | null;
  callModel: CallModel;
  build: BuildHero;
  maxRevisions?: number;
  /** Called after every round, so a panel can show the revisions as they happen. */
  onAttempt?: (attempt: AgentAttempt, index: number) => void;
}

const asAnswer = (raw: unknown): { reply?: unknown; spec?: unknown } =>
  typeof raw === 'object' && raw !== null ? (raw as { reply?: unknown; spec?: unknown }) : {};

export async function runAgent({
  messages, spec, callModel, build, maxRevisions = MAX_REVISIONS, onAttempt,
}: AgentOptions): Promise<AgentResult> {
  const convo: ChatMessage[] = [
    { role: 'system', content: systemPrompt() },
    ...(spec ? [{ role: 'user' as const, content: `The hero so far:\n${JSON.stringify(spec)}` }] : []),
    ...messages,
  ];

  const attempts: AgentAttempt[] = [];
  let reply = '';
  let current: HeroSpec | null = null;

  for (let round = 0; round <= maxRevisions; round += 1) {
    const raw = await callModel(convo);
    const answer = asAnswer(raw);
    reply = typeof answer.reply === 'string' ? answer.reply : reply;
    current = normalizeSpec(answer.spec);

    const result = await build(current);
    const testLog = result.test && (result.test.ok === false || result.test.fired === false)
      ? result.test.log
      : [];
    const attempt: AgentAttempt = {
      spec: current,
      errors: result.errors ?? [],
      testLog: result.ok && result.test ? result.test.log : [],
    };
    attempts.push(attempt);
    onAttempt?.(attempt, round);

    if (result.ok && result.test?.ok && result.test.fired !== false) {
      return { reply, spec: current, status: 'created', attempts };
    }

    if (round === maxRevisions) break;
    convo.push(
      { role: 'assistant', content: JSON.stringify(raw) },
      { role: 'user', content: failureMessage({ errors: result.errors ?? [], testLog }) },
    );
  }

  return { reply, spec: current, status: 'failed', attempts };
}
