-- Upstream init.lua, plus one line: the pack targets a newer core than this
-- build's mirror, and compat.lua widens Package:addSkinPackage to accept the
-- absolute `url` bases every call site below passes. See compat.lua.
require "packages/lunarltk_skins/compat"

local rem = require "packages/lunarltk_skins/skin_other"
local van = require "packages/lunarltk_skins/skin_van"

return {
  rem, van
}
