/**
 * The four calls the designer makes, and what it does when they lie.
 *
 * The server is the other lane's; this file is the only place that knows its
 * shape, so a change there is one edit here rather than five in components.
 * Every reader is defensive on purpose — a 502 from a proxy is an HTML page,
 * not JSON, and a panel that throws `Unexpected token <` at a player who
 * pressed 校验 has told them nothing. Anything unreadable becomes an error in
 * the same `SpecError` shape the validator produces, so the canvas has exactly
 * one way to draw a problem.
 */
import type { HeroSpec, SpecError } from '../spec';
import type { HeroImage } from './state';

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
  test?: TestResult;
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

/** A hero the create endpoint has already built. Read loosely: it is a listing. */
export interface HeroRow {
  id?: string;
  name?: string;
  title?: string;
  kingdom?: string;
  general?: string;
  createdAt?: string;
  spec?: HeroSpec;
  test?: TestResult;
}

const BASE = '/api/designer';

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
    throw new ApiError(`连不上服务器：${cause instanceof Error ? cause.message : String(cause)}`, 0);
  }
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(
      response.ok
        ? '服务器返回的不是 JSON'
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

export const validateHero = async (spec: HeroSpec): Promise<ValidateResponse> => {
  const body = await request<Record<string, unknown>>('/validate', {
    method: 'POST',
    body: JSON.stringify({ spec }),
  });
  return {
    ok: body.ok === true,
    errors: asErrors(body.errors),
    lua: typeof body.lua === 'string' ? body.lua : undefined,
    warnings: asStrings(body.warnings),
  };
};

export const createHero = async (
  spec: HeroSpec,
  image: HeroImage | null,
): Promise<CreateResponse> => {
  const body = await request<Record<string, unknown>>('/create', {
    method: 'POST',
    body: JSON.stringify({ spec, ...(image ? { image } : {}) }),
  });
  const test = isObject(body.test)
    ? { ok: body.test.ok === true, log: typeof body.test.log === 'string' ? body.test.log : undefined }
    : undefined;
  return {
    ok: body.ok === true,
    general: typeof body.general === 'string' ? body.general : undefined,
    lua: typeof body.lua === 'string' ? body.lua : undefined,
    errors: asErrors(body.errors),
    test,
  };
};

/** The listing, whether the server wraps it in `{heroes}` or returns the array. */
export const listHeroes = async (): Promise<HeroRow[]> => {
  const body = await request<unknown>('/heroes');
  const rows = Array.isArray(body) ? body : isObject(body) && Array.isArray(body.heroes) ? body.heroes : [];
  return rows.filter(isObject) as HeroRow[];
};

export const chat = async (
  messages: ChatMessage[],
  spec?: HeroSpec,
): Promise<ChatResponse> => {
  const body = await request<Record<string, unknown>>('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, ...(spec ? { spec } : {}) }),
  });
  const status = body.status === 'created' || body.status === 'failed' ? body.status : 'draft';
  const attempts = Array.isArray(body.attempts)
    ? body.attempts.filter(isObject).map((a) => ({
        spec: isObject(a.spec) ? (a.spec as unknown as HeroSpec) : undefined,
        errors: asErrors(a.errors),
        testLog: typeof a.testLog === 'string' ? a.testLog : undefined,
      }))
    : [];
  return {
    reply: typeof body.reply === 'string' ? body.reply : '',
    spec: isObject(body.spec) ? (body.spec as unknown as HeroSpec) : undefined,
    status,
    attempts,
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
