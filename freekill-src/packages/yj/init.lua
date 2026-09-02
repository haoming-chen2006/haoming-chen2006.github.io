-- SPDX-License-Identifier: GPL-3.0-or-later

local prefix = "packages.yj.pkg."

local yj2011 = require(prefix .. "yj2011")
local yj2012 = require(prefix .. "yj2012")
local yj2013 = require(prefix .. "yj2013")
local yj2014 = require(prefix .. "yj2014")
local yj2015 = require(prefix .. "yj2015")
local yj2016 = require(prefix .. "yj2016")
local yj2017 = require(prefix .. "yj2017")
local tw2013 = require(prefix .. "tw2013")
local tw2017 = require(prefix .. "tw2017")

Fk:loadTranslationTable{ ["yj"] = "一将成名" }
Fk:loadTranslationTable(require 'packages/yj/i18n/en_US', 'en_US')

return {
  yj2011,
  yj2012,
  yj2013,
  yj2014,
  yj2015,
  yj2016,
  yj2017,
  tw2013,
  tw2017,
}
