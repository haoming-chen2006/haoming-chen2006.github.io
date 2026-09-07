// The hero designer's back end. `npm run designer`, port 5175, `/api` proxied
// to it by vite (see vite.config.ts).
//
// It is a back end rather than browser code for one reason: the only way to
// know whether a generated general works is to boot the real Lua engine on it
// and drive its trigger in a scripted room, which needs the filesystem, the
// 1852-file bundle and about a second of CPU. A designer that could not do that
// would be a designer that hands people generals whose skills silently do
// nothing — the exact failure `lua/web/roster.lua` exists to catch.
//
// WHAT WRITING A HERO TOUCHES.
//   packages/custom/generals/<id>.lua    the compiled general (overwritten)
//   packages/custom/specs/<id>.json      the spec it came from, plus test status
//   packages/custom/image/generals/<id>.jpg   the portrait, if one was uploaded
//   public/lua-bundle.json               rebuilt, so the game sees the general
//   public/asset-manifest.json           patched, so the portrait resolves
// Nothing under `../freekill/` (the built site) and nothing in the upstream
// mirror is written, ever.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { HERO_SPEC_SCHEMA, normalizeSpec, validateSpec } from '../../src/designer/spec.ts';
import { CompileError, compileHero } from '../../src/designer/compile/index.ts';
import { formatHeadless, testHero } from '../../src/designer/compile/headless.ts';
import { buildLuaBundle } from '../build-lua-bundle.mjs';
import { CHAT_SCHEMA, runAgent } from '../../src/designer/agent/loop.ts';
import { DEFAULT_MODEL, chatJson, resolveKey } from './openai.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..', '..');
const CUSTOM = join(WEB_ROOT, 'packages', 'custom');
const GENERALS = join(CUSTOM, 'generals');
const SPECS = join(CUSTOM, 'specs');
const PORTRAITS = join(CUSTOM, 'image', 'generals');
const PUBLIC = join(WEB_ROOT, 'public');
const CACHE = join(WEB_ROOT, 'node_modules', '.cache', 'designer');

export const PORT = Number(process.env.DESIGNER_PORT || 5175);

/* -------------------------------------------------------------------------- */
/* Writing a hero                                                              */
/* -------------------------------------------------------------------------- */

const specPath = (id) => join(SPECS, `${id}.json`);

/**
 * The portrait.
 *
 * The manifest key is hardcoded `.jpg` in all four resolvers
 * (`src/room/assets/assets.ts:47`), so the source file is always written with
 * that name whatever was uploaded — `cwebp` sniffs the format from the bytes,
 * not the extension, so `npm run build:assets` re-encodes it correctly anyway.
 *
 * The manifest is then patched by hand rather than by running `build:assets`,
 * which deletes and re-encodes all 1103 images and takes minutes. The patched
 * entry points at the uploaded bytes as they are; the next real asset build
 * replaces it with the WebP and the same key keeps resolving.
 */
function savePortrait(id, image) {
  const ext = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png' }[image.mime];
  if (!ext) return { ok: false, why: `unsupported image type ${image.mime} — send image/jpeg or image/png` };
  const bytes = Buffer.from(image.base64, 'base64');
  if (!bytes.length) return { ok: false, why: 'the image was empty' };

  mkdirSync(PORTRAITS, { recursive: true });
  writeFileSync(join(PORTRAITS, `${id}.jpg`), bytes);

  const manifestPath = join(PUBLIC, 'asset-manifest.json');
  if (!existsSync(manifestPath)) {
    return { ok: true, warning: 'no public/asset-manifest.json yet — run `npm run build:assets` to see the portrait' };
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const href = `assets/${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}${ext}`;
  writeFileSync(join(PUBLIC, href), bytes);

  const key = `packages/custom/image/generals/${id}.jpg`;
  const entry = { key, href, kind: 'general', bytes: bytes.length, pack: 'custom' };
  const at = manifest.entries.findIndex((e) => e.key === key);
  if (at >= 0) manifest.entries[at] = entry;
  else manifest.entries.push(entry);
  manifest.totals.general = (manifest.totals.general ?? 0) + bytes.length;
  writeFileSync(manifestPath, JSON.stringify(manifest));
  return { ok: true };
}

/**
 * Validate, compile, write, rebuild, boot. In that order, and stopping at the
 * first failure, because every later step is meaningless if an earlier one
 * failed and a compile error is a far better message than whatever the engine
 * would say about the file it produced.
 */
export async function createHero({ spec: raw, image, rebuild = true }) {
  const spec = normalizeSpec(raw);
  const { ok, errors } = validateSpec(spec);
  if (!ok) return { ok: false, errors, spec };

  let lua;
  let warnings = [];
  try {
    ({ lua, warnings } = compileHero(spec));
  } catch (e) {
    if (!(e instanceof CompileError)) throw e;
    return { ok: false, errors: [{ path: e.path, message: e.message }], spec };
  }

  mkdirSync(GENERALS, { recursive: true });
  mkdirSync(SPECS, { recursive: true });
  writeFileSync(join(GENERALS, `${spec.id}.lua`), lua);

  if (image) {
    const saved = savePortrait(spec.id, image);
    if (!saved.ok) return { ok: false, errors: [{ path: 'image', message: saved.why }], spec, lua };
    if (saved.warning) warnings = [...warnings, saved.warning];
    spec.image = `${spec.id}.jpg`;
  }

  // The bundle is what the browser and the host both read their rules out of,
  // so a general that is not in it does not exist as far as the game is
  // concerned. `quiet` because this is an endpoint, not a build.
  if (rebuild) await buildLuaBundle({ quiet: true });

  // Nothing is passed in `files`: the point of this test is that what is ON
  // DISK works, including `packages/custom/init.lua` having found the file.
  const test = await testHero(spec);

  const record = {
    spec,
    warnings,
    test: { ok: test.ok, fired: test.drove?.fired ?? null, drove: test.drove, log: formatHeadless(test) },
    at: new Date().toISOString(),
  };
  writeFileSync(specPath(spec.id), `${JSON.stringify(record, null, 2)}\n`);

  return { ok: true, general: spec.id, spec, lua, warnings, errors: [], test: record.test };
}

export function listHeroes() {
  if (!existsSync(SPECS)) return [];
  return readdirSync(SPECS)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(SPECS, f), 'utf8'));
      } catch (e) {
        return { spec: { id: f.replace(/\.json$/, '') }, error: e.message };
      }
    });
}

/* -------------------------------------------------------------------------- */
/* The agent path                                                              */
/* -------------------------------------------------------------------------- */

function logAttempts(id, payload) {
  try {
    mkdirSync(CACHE, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${id || 'nameless'}.json`;
    writeFileSync(join(CACHE, name), `${JSON.stringify(payload, null, 2)}\n`);
    return join(CACHE, name);
  } catch {
    // A log that cannot be written must not cost the caller their hero.
    return null;
  }
}

/**
 * The agent loop (`src/designer/agent/loop.ts`) with this process's two
 * halves plugged in: the model through the key read off disk, and the build
 * on disk — write, rebuild the bundle, boot — so what the model is told about
 * is the same file the game will load.
 */
export async function runChat({ messages, spec, callModel, model = DEFAULT_MODEL, key }) {
  const out = await runAgent({
    messages,
    spec,
    callModel: callModel
      ?? ((msgs) => chatJson({ key, model, messages: msgs, schema: CHAT_SCHEMA, schemaName: 'hero' })),
    build: (candidate) => createHero({ spec: candidate }),
  });
  const log = logAttempts(out.spec?.id, { reply: out.reply, attempts: out.attempts, status: out.status });
  return { ...out, log };
}

/* -------------------------------------------------------------------------- */
/* HTTP                                                                        */
/* -------------------------------------------------------------------------- */

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', (c) => {
    size += c.length;
    // A portrait arrives as base64 in the body; 12 MB is generous for one.
    if (size > 12 << 20) reject(new Error('body too large'));
    else chunks.push(c);
  });
  req.on('end', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    try {
      resolve(text ? JSON.parse(text) : {});
    } catch (e) {
      reject(new Error(`body is not JSON: ${e.message}`));
    }
  });
  req.on('error', reject);
});

const send = (res, status, body) => {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
  });
  res.end(text);
};

export function createDesignerServer({ key = null, model = DEFAULT_MODEL, callModel = null } = {}) {
  return createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const url = new URL(req.url, 'http://localhost');

    try {
      if (url.pathname === '/api/designer/heroes' && req.method === 'GET') {
        return send(res, 200, { heroes: listHeroes() });
      }

      if (url.pathname === '/api/designer/validate' && req.method === 'POST') {
        const { spec } = await readBody(req);
        const normalised = normalizeSpec(spec);
        const { ok, errors } = validateSpec(normalised);
        if (!ok) return send(res, 200, { ok, errors, lua: null, warnings: [] });
        try {
          const { lua, warnings } = compileHero(normalised);
          return send(res, 200, { ok: true, errors: [], lua, warnings });
        } catch (e) {
          if (!(e instanceof CompileError)) throw e;
          return send(res, 200, {
            ok: false, errors: [{ path: e.path, message: e.message }], lua: null, warnings: [],
          });
        }
      }

      if (url.pathname === '/api/designer/create' && req.method === 'POST') {
        const { spec, image } = await readBody(req);
        const out = await createHero({ spec, image });
        return send(res, 200, {
          ok: out.ok,
          general: out.general ?? null,
          lua: out.lua ?? null,
          errors: out.errors ?? [],
          warnings: out.warnings ?? [],
          test: out.test ?? null,
        });
      }

      if (url.pathname === '/api/designer/chat' && req.method === 'POST') {
        if (!key && !callModel) {
          return send(res, 503, {
            error: 'no OpenAI key — restart with `npm run designer -- --key-file <path>`',
          });
        }
        const { messages = [], spec = null } = await readBody(req);
        const clean = messages
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m) => ({ role: m.role, content: m.content }));
        if (!clean.length) return send(res, 400, { error: 'no messages' });
        return send(res, 200, await runChat({ messages: clean, spec, callModel, model, key }));
      }

      return send(res, 404, { error: `no route for ${req.method} ${url.pathname}` });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { key, from, why } = resolveKey();
  const server = createDesignerServer({ key, model: DEFAULT_MODEL });
  server.listen(PORT, () => {
    console.log(`designer on http://localhost:${PORT}`);
    console.log(`  model ${DEFAULT_MODEL}, key from ${from}${key ? '' : ` — ${why}`}`);
    if (!key) console.log('  /api/designer/chat is off; validate and create still work');
  });
}
