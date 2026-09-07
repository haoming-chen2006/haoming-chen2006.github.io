/**
 * Request queue and budget for the LLM brain: ≤ N in flight, a per-in-game-hour cap, timeouts, retries with
 * backoff, cooldowns after hard failures, and the exported `llmStats` the UI can show.
 */
import { LlmError, asLlmError } from './types.ts';

export type Priority = 0 | 1 | 2 | 3;
/** lower runs first */
export const PRIORITY = { player: 0 as Priority, conversation: 1 as Priority, decision: 2 as Priority, reflection: 3 as Priority };

export interface LlmStats {
  requests: number;
  ok: number;
  failed: number;
  retries: number;
  timeouts: number;
  /** calls the model should have answered but the local brain did */
  fallbacks: number;
  tokensIn: number;
  tokensOut: number;
  inFlight: number;
  waiting: number;
  hourKey: number;
  usedThisHour: number;
  budgetPerHour: number;
  /** epoch ms; 0 = none */
  cooldownUntil: number;
  lastError: string | null;
  lastErrorAt: number;
  lastLatencyMs: number;
  lastModel: string;
}

export const llmStats: LlmStats = {
  requests: 0, ok: 0, failed: 0, retries: 0, timeouts: 0, fallbacks: 0, tokensIn: 0, tokensOut: 0,
  inFlight: 0, waiting: 0, hourKey: -1, usedThisHour: 0, budgetPerHour: 0, cooldownUntil: 0,
  lastError: null, lastErrorAt: 0, lastLatencyMs: 0, lastModel: '',
};

export function resetLlmStats(): void {
  Object.assign(llmStats, { requests: 0, ok: 0, failed: 0, retries: 0, timeouts: 0, fallbacks: 0, tokensIn: 0, tokensOut: 0,
    inFlight: 0, waiting: 0, hourKey: -1, usedThisHour: 0, budgetPerHour: 0, cooldownUntil: 0, lastError: null, lastErrorAt: 0, lastLatencyMs: 0, lastModel: '' });
}

export function recordError(kind: string, e: LlmError, clock: () => number = Date.now): void {
  llmStats.lastError = `${kind}: ${e.message}`;
  llmStats.lastErrorAt = clock();
}

export interface QueueOptions {
  /** requests allowed per in-game hour (read on every submit so the Settings panel applies at once) */
  budget: () => number;
  maxInFlight?: number;
  timeoutMs?: number;
  maxWaiting?: number;
  /** real-time clock, ms */
  clock?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface JobOptions { priority: Priority; kind: string; retries?: number }

interface Job {
  priority: Priority;
  kind: string;
  retries: number;
  seq: number;
  run: (signal: AbortSignal) => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}

const COOLDOWN_MS = { rateLimit: 4_000, server: 10_000, badRequest: 30_000, auth: 60_000 };
const MAX_RETRY_AFTER_MS = 10_000;
const BACKOFF_BASE_MS = 800;

export class LlmQueue {
  private waiting: Job[] = [];
  private inFlight = 0;
  private seq = 0;
  private readonly budget: () => number;
  private readonly maxInFlight: number;
  private readonly timeoutMs: number;
  private readonly maxWaiting: number;
  private readonly clock: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(opts: QueueOptions) {
    this.budget = opts.budget;
    this.maxInFlight = opts.maxInFlight ?? 3;
    this.timeoutMs = opts.timeoutMs ?? 12_000;
    this.maxWaiting = opts.maxWaiting ?? 12;
    this.clock = opts.clock ?? (() => Date.now());
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.random = opts.random ?? Math.random;
  }

  get stats(): LlmStats { return llmStats; }

  /**
   * Queue a request. Rejects at once (without consuming budget) when the hourly budget is spent, the queue is cooling
   * down after a hard failure, or too many jobs are already waiting. `nowMinute` is in-game time.
   */
  submit<T>(job: JobOptions, nowMinute: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.rollHour(nowMinute);
    const now = this.clock();
    if (llmStats.cooldownUntil > now) return Promise.reject(new LlmError(`cooling down for ${Math.ceil((llmStats.cooldownUntil - now) / 1000)}s`, { code: 'cooldown' }));
    if (llmStats.usedThisHour >= this.budget()) return Promise.reject(new LlmError(`hourly budget of ${this.budget()} spent`, { code: 'budget' }));
    if (this.waiting.length >= this.maxWaiting && job.priority >= PRIORITY.decision) return Promise.reject(new LlmError('queue full', { code: 'queue-full' }));
    llmStats.usedThisHour++;
    return new Promise<T>((resolve, reject) => {
      this.waiting.push({ priority: job.priority, kind: job.kind, retries: job.retries ?? 1, seq: this.seq++, run, resolve: resolve as (v: unknown) => void, reject });
      this.waiting.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
      llmStats.waiting = this.waiting.length;
      this.pump();
    });
  }

  private rollHour(nowMinute: number): void {
    const key = Math.floor(nowMinute / 60);
    if (key !== llmStats.hourKey) { llmStats.hourKey = key; llmStats.usedThisHour = 0; }
    llmStats.budgetPerHour = this.budget();
  }

  private pump(): void {
    while (this.inFlight < this.maxInFlight && this.waiting.length) {
      const job = this.waiting.shift()!;
      llmStats.waiting = this.waiting.length;
      this.inFlight++; llmStats.inFlight = this.inFlight;
      const settle = (): void => { this.inFlight--; llmStats.inFlight = this.inFlight; this.pump(); };
      this.execute(job).then((v) => { settle(); job.resolve(v); }, (e) => { settle(); job.reject(e); });
    }
  }

  private async execute(job: Job): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
      const started = this.clock();
      llmStats.requests++;
      try {
        const result = await job.run(ctrl.signal);
        llmStats.ok++;
        llmStats.lastLatencyMs = this.clock() - started;
        return result;
      } catch (raw) {
        const e = asLlmError(raw);
        if (e.code === 'timeout') llmStats.timeouts++;
        const retryAfter = e.retryAfterMs ?? 0;
        const canRetry = e.retryable && attempt < job.retries && retryAfter <= MAX_RETRY_AFTER_MS;
        if (canRetry) {
          llmStats.retries++;
          const backoff = BACKOFF_BASE_MS * 2 ** attempt + Math.floor(this.random() * 300);
          await this.sleep(Math.max(backoff, retryAfter));
          continue;
        }
        llmStats.failed++;
        recordError(job.kind, e, this.clock);
        this.coolDown(e);
        throw e;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  private coolDown(e: LlmError): void {
    let ms = 0;
    if (e.code === 'auth') ms = COOLDOWN_MS.auth;
    else if (e.code === 'rate-limit') ms = Math.max(COOLDOWN_MS.rateLimit, e.retryAfterMs ?? 0);
    else if (e.code === 'network' || (e.status !== undefined && e.status >= 500)) ms = COOLDOWN_MS.server;
    // 400/404 are configuration-level here (billing, bad model id, invalid schema): the same request would fail again
    else if (e.status === 400 || e.status === 404) ms = COOLDOWN_MS.badRequest;
    if (ms > 0) llmStats.cooldownUntil = Math.max(llmStats.cooldownUntil, this.clock() + ms);
  }
}
