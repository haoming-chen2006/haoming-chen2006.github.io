-- SPDX-License-Identifier: GPL-3.0-or-later
--
-- packages/custom -- 自制武将。hero designer 写进来的武将都住在这里。
--
-- 一个包，不是一将一包。每个 generals/<id>.lua 返回一个 function(extension)，
-- 由这里调用并把同一个 Package 交给它 —— 因为 extensionName 决定立绘的查找
-- 路径（Assets.generalPortrait 找的是 packages/<extensionName>/image/generals/
-- <name>.jpg），一将一包就意味着一将一个图片目录，而且武将一览里会多出一堆只有
-- 一个人的分包。
--
-- 目录是运行时列的，不是写死的名单。Package:loadSkillSkelsByPath
-- （lunarltk/core/package.lua:106）就是这么做的，FileIO.ls 在网页版的虚拟文件
-- 系统上一样能用 —— ModManager:loadPackages 本身就是靠它枚举 packages/ 的，
-- 目录不存在时 __fk_ls 返回空串（src/engine/vm.ts:145），于是这个循环什么也不做。
-- 于是 designer 只要把文件丢进 generals/ 再重建 bundle 就行，没有第二处名单要
-- 跟着改，也就没有名单和目录对不上的那一类错。
--
-- Pcall 是刻意的：一个生成坏了的武将不该把整包带下去。引擎在 require 里抛出来
-- 的东西没人接，整个 packages/custom 就一个武将都没有了。

local extension = Package:new("custom")

Fk:loadTranslationTable {
  ["custom"] = "自制武将",
}

for _, filename in ipairs(FileIO.ls("packages/custom/generals")) do
  if filename:sub(-4) == ".lua" then
    local install = Pcall(require, "packages.custom.generals." .. filename:sub(1, -5))
    if type(install) == "function" then
      Pcall(install, extension)
    end
  end
end

return extension
