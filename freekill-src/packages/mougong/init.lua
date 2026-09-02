-- SPDX-License-Identifier: GPL-3.0-or-later

-- require("packages.mougong.i18n.en_US")

local prefix = "packages.mougong.pkg."

local zhi = require (prefix .. "zhi")
local shi = require (prefix .. "shi")
local tong = require (prefix .. "tong")
local yu = require (prefix .. "yu")
local neng = require (prefix .. "neng")

Fk:loadTranslationTable {
    ["mougong"] = "谋攻篇",
    ["mou"] = "谋",

    ["zhi"] = "知",
    ["shi"] = "识",
    ["tong"] = "同",
    ["yu"] = "虞",
    ["neng"] = "能",
}

return {
    zhi,
    shi,
    tong,
    yu,
    neng,
}
