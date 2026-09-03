-- SPDX-License-Identifier: GPL-3.0-or-later

local suspicion = require "packages.sxrm.pkg.suspicion"
local pride = require "packages.sxrm.pkg.pride"
local rage = require "packages.sxrm.pkg.rage"

Fk:loadTranslationTable{ ["sxrm"] = "蚀心入魔" }

return {
  suspicion,
  pride,
  rage,
}
