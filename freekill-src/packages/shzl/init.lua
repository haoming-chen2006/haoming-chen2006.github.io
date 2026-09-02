-- SPDX-License-Identifier: GPL-3.0-or-later

require("packages.shzl.i18n.en_US")

local prefix = "packages.shzl.pkg."

local wind = require (prefix.."wind")
local fire = require (prefix.."fire")
local forest = require (prefix.."forest")
local mountain = require (prefix.."mountain")

local shadow = require (prefix.."shadow")

local thunder = require (prefix.."thunder")

local god = require (prefix.."god")

Fk:loadTranslationTable{ ["shzl"] = "神话再临" }

return {
    wind,
    fire,
    forest,
    mountain,
    shadow,
    thunder,
    god,
}
