// The English translation table, pushed down into the client Lua VM.
//
// WHY THIS EXISTS. Nearly everything the room shows is translated by key, in
// TypeScript: `src/i18n/engine` answers `LtkLua.tr(...)` and the engine's own
// language never changes. The battle log is the exception. `Client:parseMsg`
// (lua/lunarltk/client/client.lua) renders a whole `LogMessage` — the type key,
// player names with seat disambiguation, card names with suit and number,
// virtual cards, every `%arg` — into finished HTML inside the client VM, using
// `Fk:translate` at `Config.language`. By the time the room sees it there is no
// key left to translate.
//
// So `lua/web/client.lua` renders each log line once per language. For that to
// produce real English the VM's `en_US` table has to be complete: upstream's
// covers 681 of 1,368 keys, and the ~107 derived skill badges are registered
// only for the language that was active when the packages loaded. This file
// generates that complete table from the same source the TypeScript overlay
// uses, so there is one set of English strings with two consumers.
//
//   node scripts/build-i18n-lua.mjs
//
// The output is committed; `src/i18n/__tests__/coverage.test.ts` fails if it
// drifts from `src/i18n/engine`, so it cannot rot unnoticed.
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(here, '..');
export const OUT = join(WEB_ROOT, 'lua', 'web', 'i18n_en_US.lua');

/** A Lua double-quoted literal. Control characters become numeric escapes. */
export function luaString(s) {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '\\') out += '\\\\';
    else if (ch === '"') out += '\\"';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (c < 0x20 || c === 0x7f) out += `\\${c}`;
    else out += ch;
  }
  return `${out}"`;
}

export function renderLua(table) {
  const keys = Object.keys(table).sort();
  const lines = keys.map((k) => `  [${luaString(k)}] = ${luaString(table[k])},`);
  return `-- 完整的 en_US 翻译表 —— 由 scripts/build-i18n-lua.mjs 从 src/i18n/engine 生成。
--
-- 不要手改。英文文案的唯一出处是 src/i18n/engine/{upstream,overrides,authored}.ts。
--
-- 用途只有一个：客户端 VM 的 Client:parseMsg 是在 Lua 里把整条战报渲染成 HTML 的
-- （牌名、花色、角色名、座位号消歧、每个 %arg 都在那儿翻译），JS 侧按 key 的覆盖表
-- 够不着。lua/web/client.lua 会把每条 log 按两种语言各渲染一遍，这张表就是让
-- Config.language = "en_US" 那一遍能出真英文的东西。
--
-- 上游 en_US 只覆盖 1368 个 key 中的 681 个，而且 skill_skeleton.lua 派生出来的
-- ~107 个技能角标只会注册进「加载包时的那个语言」，所以必须整张覆盖。
--
-- ${keys.length} 条。
return {
${lines.join('\n')}
}
`;
}

export async function buildI18nLua() {
  const server = await createServer({
    root: WEB_ROOT,
    logLevel: 'error',
    server: { middlewareMode: true },
  });
  try {
    const mod = await server.ssrLoadModule('/src/i18n/engine/index.ts');
    const lua = renderLua(mod.EN_US);
    writeFileSync(OUT, lua);
    return { keys: Object.keys(mod.EN_US).length, bytes: Buffer.byteLength(lua) };
  } finally {
    await server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { keys, bytes } = await buildI18nLua();
  console.log(`lua/web/i18n_en_US.lua: ${keys} keys, ${(bytes / 1024).toFixed(1)} KB`);
}
