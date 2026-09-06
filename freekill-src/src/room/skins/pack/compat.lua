-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- compat.lua -- the one thing standing between this pack and this engine.
--
-- lunarltk_skins is written against a newer core than the 0.5.20 mirror this
-- build ships. Upstream's `Package:addSkinPackage` (lua/lunarltk/core/package.lua:181)
-- reads `skinPak.path` and joins it onto the package's own directory:
--
--     local pkg_path = "packages/" .. self.extensionName .. skinPak.path .. "/"
--
-- Every call site in this pack passes `url` instead -- an absolute https base --
-- and no `path` at all. So the concat hits a nil and the whole pack dies on its
-- first skin entry (skin_other.lua:1479). `ModManager:loadPackages` wraps the
-- require in `Pcall`, so the failure is swallowed: no crash, no skins, no sign
-- that anything was meant to happen. That silence is why this file exists.
--
-- The fix is to widen the method rather than patch the engine. `lua/` and the
-- other `packages/` are read-only upstream mirrors; editing them means carrying
-- a patch forever and losing it on the next sync. Widening from inside the pack
-- that needs it keeps the mirror clean, and the widening is a strict superset --
-- a `path` caller behaves exactly as before -- so nothing else in the engine can
-- notice. When the mirror catches up to a core that understands `url`, delete
-- this file and the one `require` in init.lua.
--
-- Absolute URLs then flow through `Package.skin_specs` into `Engine.skin_packages`
-- untouched, and `Engine:getSkinsByGeneral` hands them out as-is. Nothing in the
-- Lua layer ever opens a skin file, so a URL and a path are interchangeable to
-- it; resolving one is entirely the client's business (see src/room/skins/).

local orig = Package.addSkinPackage

---@param skinPak SkinPackageSpec
function Package:addSkinPackage(skinPak)
  if not skinPak.url then return orig(self, skinPak) end

  -- Normalise to exactly one trailing slash so `base .. file` is well formed
  -- whether or not the caller supplied one.
  local base = (skinPak.url:gsub("/*$", "")) .. "/"

  for _, arr in ipairs(skinPak.content or Util.DummyTable) do
    -- Skeleton/spine entries carry `files` rather than `skins`. This build has
    -- no renderer for them, so they are skipped rather than half-registered.
    local skins = arr.skins
    if skins then
      for _, g in ipairs(arr.enabled_generals or Util.DummyTable) do
        if g ~= "" then
          local urls = table.map(skins, function(s) return base .. s end)
          if self.skin_specs[g] then
            table.insertTable(self.skin_specs[g], urls)
          else
            self.skin_specs[g] = urls
          end
        end
      end
    end
  end
end
