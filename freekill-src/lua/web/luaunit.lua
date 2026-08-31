-- luaunit.lua -- 在 wasm 引擎上跑 test/lua 下的既有 luaunit 套件
--
-- 这些套件本来由 test/*.cpp 里的 C++ 夹具驱动（见 test/lua/cpp_run*.lua）。
-- 那边的夹具提供三个全局：__package.path、__os、__io ——
-- 因为 lua/freekill.lua 会把 package / os / io 裁掉，而测试要用它们。
-- 这里把同样的三样东西接上，然后原样 dofile 那几个入口。
--
-- 与 host.lua 的区别：这个 VM 用的是 lua/lsp 下的纯 Lua 桩
-- （test/lua/lib/fake_backend.lua 自己要的），不是我们的 fkhost。
-- 也就是说它验证的是「引擎在 wasm 里跑得对不对」，不是「我们的宿主层对不对」——
-- 后者由 src/engine 的测试覆盖。

FKUnit = {}

local vclock_us = 0

function FKUnit.boot()
  os.time = function() return 1700000000 + vclock_us // 1000000 end
  os.clock = function() return vclock_us / 1e6 end
  os.getms = function() return vclock_us end
  os.date = function() return "1970-01-01" end
  os.difftime = function(a, b) return a - b end

  package.path = "./?.lua;./?/init.lua;./lua/lib/?.lua;./lua/?.lua;./lua/?/init.lua"

  fk = dofile("lua/web/fkhost.lua")

  -- freekill.lua 之后 package / os / io 就没了，先留一份给测试夹具用。
  local real_package, real_os, real_io = package, os, io

  dofile("lua/freekill.lua")

  __package = real_package
  __os = setmetatable({ exit = function(code) FKUnit.exitCode = code end }, { __index = real_os })
  __io = real_io
  return true
end

--- 跑一个 cpp_run 入口。
---@param entry string 例如 "test/lua/cpp_run.lua"
---@return string json { ok, code, error? }
function FKUnit.run(entry)
  FKUnit.exitCode = nil
  FKUnit.output = {}
  local realPrint = print
  print = function(...)
    local parts = {}
    for i = 1, select("#", ...) do parts[i] = tostring((select(i, ...))) end
    FKUnit.output[#FKUnit.output + 1] = table.concat(parts, "\t")
  end

  local ok, err = pcall(dofile, entry)
  local failures
  if ok then
    -- C++ 夹具就是这么跑的：test/lua_core_test.cpp:36
    ok, failures = pcall(function() return lu.LuaUnit.run() end)
    if not ok then err = failures; failures = nil end
  else
    err = err
  end

  print = realPrint
  return json.encode {
    ok = ok and true or false,
    failures = failures,
    error = (not ok) and tostring(err) or nil,
    output = table.concat(FKUnit.output, "\n"),
  }
end

return FKUnit
