local beginning = require "packages.jsrg.pkg.beginning"
local continue = require "packages.jsrg.pkg.continue"
local transition = require "packages.jsrg.pkg.transition"
local conclusion = require "packages.jsrg.pkg.conclusion"
local decline = require "packages.jsrg.pkg.decline"
local rise = require "packages.jsrg.pkg.rise"

Fk:loadTranslationTable{ ["jsrg"] = "江山如故" }

return {
  beginning,
  continue,
  transition,
  conclusion,
  decline,
  rise,
}
