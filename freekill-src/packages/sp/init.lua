local sp = require "packages.sp.pkg.sp"
local sp_star = require "packages.sp.pkg.sp_star"
local sp_jsp = require "packages.sp.pkg.sp_jsp"
local sp_re = require "packages.sp.pkg.sp_re"

Fk:loadTranslationTable(require 'packages/sp/i18n/en_US', 'en_US')

return {
  sp,
  sp_star,
  sp_jsp,
  sp_re,
}
