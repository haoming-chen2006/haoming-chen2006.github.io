/**
 * What the panel calls, and where each call actually goes.
 *
 * Two lanes, one surface. The published page has no server: validating,
 * compiling and booting the engine on a hero all happen in the tab
 * (`../browser/`), and the result goes to this browser's 我的武将, which a room
 * can carry (`shell/customHeroes.ts`). The dev page has `npm run designer`
 * behind `/api/designer`, and when that answers, two things are added on top:
 * a created hero is ALSO written to `packages/custom/` so a deploy can ship
 * it, and the AI lane goes through the server's key instead of asking for one.
 *
 * Every reader of the server is defensive on purpose — a 502 from a proxy is
 * an HTML page, not JSON, and a panel that throws `Unexpected token <` at a
 * player who pressed 校验 has told them nothing. Anything unreadable becomes
 * an error in the same `SpecError` shape the validator produces, so the canvas
 * has exactly one way to draw a problem.
 */
import { CompileError, compileHero } from '../compile';
import type { HeroSpec, SpecError } from '../spec';
import { normalizeSpec, validateSpec } from '../spec';
import type { AgentAttempt } from '../agent/loop';
import { chatInBrowser } from '../browser/agent';
import { buildInBrowser } from '../browser/build';
import {
  deleteSavedHero, importSavedHeroes, readSavedHeroes, type SavedHero,
} from '../../shell/customHeroes';
import type { HeroImage } from './state';

export { NeedKeyError } from '../browser/agent';

export interface ValidateResponse {
  ok: boolean;
  errors: SpecError[];
  lua?: string;
  warnings?: string[];
}

export interface TestResult {
  ok: boolean;
  log?: string;
}

export interface CreateResponse {
  ok: boolean;
  general?: string;
  lua?: string;
  errors?: SpecError[];
  warnings?: string[];
  test?: TestResult;
  /** It is in this browser's 我的武将 and a room can carry it. */
  savedInBrowser?: boolean;
  /** The dev back end also wrote it to `packages/custom/`. */
  wroteToDisk?: boolean;
}

/** One revision the agent made: what it tried, what broke, what the game said. */
export interface ChatAttempt {
  spec?: HeroSpec;
  errors?: SpecError[];
  testLog?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  reply: string;
  spec?: HeroSpec;
  status: 'draft' | 'created' | 'failed';
  attempts?: ChatAttempt[];
}

/** A hero that exists somewhere: this browser, or the dev machine's disk. */
export interface HeroRow {
  id?: string;
  name?: string;
  title?: string;
  kingdom?: string;
  general?: string;
  createdAt?: string;
  spec?: HeroSpec;
  test?: TestResult;
  source?: 'browser' | 'disk';
}

const BASE = '/api/designer';

/**
 * The one fact every failure to reach the server shares: the back end is a
 * local process, not a service. `designer.html` ships with the site because
 * that is what type-checks and bundles it, but on the published site there is
 * nothing at `/api/designer` and there cannot be — it boots the Lua engine on
 * the hero and writes into `packages/custom`, which is a checkout, not a CDN.
 */
const BACKEND_HINT = '设计器要在本机跑：在 freekill-src 里执行 npm run dev 和 npm run designer，再打开 localhost:5173/freekill/designer.html。';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * A JSON request, with the two failures that actually happen named.
 *
 * A non-2xx whose body is JSON still carries the useful thing — the validator's
 * errors come back on a 400 — so the body is read before the status is judged
 * and only a body that is not JSON at all becomes an `ApiError`.
 */
const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (cause) {
    throw new ApiError(`连不上设计器后端：${cause instanceof Error ? cause.message : String(cause)}。${BACKEND_HINT}`, 0);
  }
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    // A 404 page is what the published site answers with: there is no back end
    // behind GitHub Pages, and the player deserves to be told that rather than
    // handed a status code.
    throw new ApiError(
      response.ok
        ? '服务器返回的不是 JSON'
        : response.status === 404
          ? `这里没有设计器后端（HTTP 404）。${BACKEND_HINT}`
          : `服务器出错（HTTP ${response.status}）`,
      response.status,
    );
  }
  if (!response.ok && !isObject(body)) {
    throw new ApiError(`服务器出错（HTTP ${response.status}）`, response.status);
  }
  return body as T;
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asErrors = (raw: unknown): SpecError[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    if (typeof e === 'string') return [{ path: '', message: e }];
    if (isObject(e)) {
      return [{ path: String(e.path ?? ''), message: String(e.message ?? JSON.stringify(e)) }];
    }
    return [];
  });
};

const asStrings = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((w): w is string => typeof w === 'string') : [];

/* -------------------------------------------------------------------------- */
/* Is there a back end?                                                        */
/* -------------------------------------------------------------------------- */

let backendPromise: Promise<boolean> | null = null;

/**
 * Asked once per page, answered by `/api/designer/heroes`. On the published
 * site that is GitHub Pages' 404 page; in dev without `npm run designer` it is
 * vite's proxy error. Both mean "no", and neither is worth waiting long for.
 */
export function backendAvailable(): Promise<boolean> {
  backendPromise ??= (async () => {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 1500);
      const res = await fetch(`${BASE}/heroes`, { signal: ac.signal }).finally(() => clearTimeout(timer));
      if (!res.ok) return false;
      const body: unknown = await res.json();
      return isObject(body) && Array.isArray(body.heroes);
    } catch {
      return false;
    }
  })();
  return backendPromise;
}

/** Test seam. */
export function resetBackendProbe(): void {
  backendPromise = null;
}

/* -------------------------------------------------------------------------- */
/* The calls                                                                   */
/* -------------------------------------------------------------------------- */

/** Validate and compile, in the tab. The same two functions the server runs. */
export const validateHero = async (raw: HeroSpec): Promise<ValidateResponse> => {
  const spec = normalizeSpec(raw);
  const { ok, errors } = validateSpec(spec);
  if (!ok) return { ok: false, errors, warnings: [] };
  try {
    const { lua, warnings } = compileHero(spec);
    return { ok: true, errors: [], lua, warnings };
  } catch (e) {
    if (!(e instanceof CompileError)) throw e;
    return { ok: false, errors: [{ path: e.path, message: e.message }], warnings: [] };
  }
};

/**
 * Build it here and keep it here; and if the dev back end is listening, write
 * it to disk as well, so `npm run deploy` can ship it. A back end that fails
 * to write costs a warning, never the hero.
 */
export const createHero = async (
  spec: HeroSpec,
  image: HeroImage | null,
): Promise<CreateResponse> => {
  const built = await buildInBrowser(spec, { save: true, image });
  const out: CreateResponse = {
    ok: built.ok,
    general: built.general,
    lua: built.lua,
    errors: built.errors,
    warnings: [...built.warnings],
    test: built.test ? { ok: built.test.ok, log: built.test.log.join('\n') } : undefined,
    savedInBrowser: built.ok,
  };
  if (!built.ok || !(await backendAvailable())) return out;
  try {
    const body = await request<Record<string, unknown>>('/create', {
      method: 'POST',
      body: JSON.stringify({ spec: built.spec, ...(image ? { image } : {}) }),
    });
    out.wroteToDisk = body.ok === true;
    if (!out.wroteToDisk) {
      out.warnings = [...(out.warnings ?? []), ...asErrors(body.errors).map((e) => `本机后端没有写入：${e.message}`)];
    }
  } catch (cause) {
    out.warnings = [...(out.warnings ?? []), `本机后端没有写入：${cause instanceof Error ? cause.message : String(cause)}`];
  }
  return out;
};

const rowOfSaved = (h: SavedHero): HeroRow => ({
  id: h.id,
  general: h.id,
  name: h.name,
  title: h.title,
  kingdom: h.kingdom,
  spec: h.spec as unknown as HeroSpec,
  test: h.test ? { ok: h.test.ok, log: h.test.log.join('\n') } : undefined,
  createdAt: h.at,
  source: 'browser',
});

/** This browser's heroes first, then the dev machine's, minus any the browser already has. */
export const listHeroes = async (): Promise<HeroRow[]> => {
  const mine = readSavedHeroes().map(rowOfSaved);
  if (!(await backendAvailable())) return mine;
  const seen = new Set(mine.map((r) => r.id));
  try {
    const body = await request<unknown>('/heroes');
    const rows = Array.isArray(body) ? body : isObject(body) && Array.isArray(body.heroes) ? body.heroes : [];
    const disk = rows.filter(isObject).map((r): HeroRow => {
      const spec = isObject(r.spec) ? (r.spec as unknown as HeroSpec) : undefined;
      const test = isObject(r.test)
        ? { ok: r.test.ok === true, log: Array.isArray(r.test.log) ? r.test.log.join('\n') : typeof r.test.log === 'string' ? r.test.log : undefined }
        : undefined;
      return {
        id: spec?.id, general: spec?.id, name: spec?.name, title: spec?.title, kingdom: spec?.kingdom,
        spec, test, createdAt: typeof r.at === 'string' ? r.at : undefined, source: 'disk',
      };
    });
    return [...mine, ...disk.filter((r) => r.id && !seen.has(r.id))];
  } catch {
    return mine;
  }
};

export const deleteHero = (id: string): void => {
  deleteSavedHero(id);
};

/** Everything this browser has, as a file another browser can import. */
export const exportHeroes = (): string => JSON.stringify(readSavedHeroes(), null, 2);

export const importHeroes = (text: string): { added: number; total: number } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('这个文件不是武将列表（不是 JSON）');
  }
  const out = importSavedHeroes(parsed);
  if (!out.added) throw new Error('文件里没有能读的武将');
  return out;
};

export interface ChatOptions {
  /** Each revision as it lands, so the panel can show the agent working. */
  onAttempt?: (attempt: ChatAttempt, index: number) => void;
}

const attemptOf = (a: AgentAttempt): ChatAttempt => ({
  spec: a.spec,
  errors: a.errors,
  testLog: a.testLog.length ? a.testLog.join('\n') : undefined,
});

/**
 * The agent. Through the dev back end when there is one — it holds the key and
 * writes to disk — and otherwise in this tab, with the player's own key.
 */
export const chat = async (
  messages: ChatMessage[],
  spec?: HeroSpec,
  opts: ChatOptions = {},
): Promise<ChatResponse> => {
  if (await backendAvailable()) {
    const body = await request<Record<string, unknown>>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, ...(spec ? { spec } : {}) }),
    });
    const status = body.status === 'created' || body.status === 'failed' ? body.status : 'draft';
    const attempts = Array.isArray(body.attempts)
      ? body.attempts.filter(isObject).map((a) => ({
          spec: isObject(a.spec) ? (a.spec as unknown as HeroSpec) : undefined,
          errors: asErrors(a.errors),
          testLog: Array.isArray(a.testLog) ? asStrings(a.testLog).join('\n') || undefined
            : typeof a.testLog === 'string' ? a.testLog : undefined,
        }))
      : [];
    return {
      reply: typeof body.reply === 'string' ? body.reply : '',
      spec: isObject(body.spec) ? (body.spec as unknown as HeroSpec) : undefined,
      status,
      attempts,
    };
  }

  const out = await chatInBrowser(
    messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    spec,
    { onAttempt: opts.onAttempt ? (a, i) => opts.onAttempt?.(attemptOf(a), i) : undefined },
  );
  return {
    reply: out.reply,
    spec: out.spec ?? undefined,
    status: out.status,
    attempts: out.attempts.map(attemptOf),
  };
};

/**
 * A picked file as the create endpoint takes it.
 *
 * `FileReader` gives `data:image/png;base64,…`; the endpoint wants the two
 * halves apart, and a data URL from a source that omits the media type would
 * otherwise arrive with an empty mime and no way to tell.
 */
export const readImage = (file: File): Promise<HeroImage> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const url = String(reader.result ?? '');
      const comma = url.indexOf(',');
      const head = url.slice(0, comma);
      if (comma < 0 || !head.includes('base64')) {
        reject(new Error('这个文件不是图片'));
        return;
      }
      resolve({
        mime: head.slice(5, head.indexOf(';')) || file.type || 'image/png',
        base64: url.slice(comma + 1),
      });
    };
    reader.readAsDataURL(file);
  });

export const imageUrl = (image: HeroImage): string => `data:${image.mime};base64,${image.base64}`;
