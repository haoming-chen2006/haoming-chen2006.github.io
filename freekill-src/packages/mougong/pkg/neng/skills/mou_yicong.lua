local mouYicong = fk.CreateSkill({
  name = "mou__yicong",
  tags = { Skill.Charge },
})

Fk:loadTranslationTable{
  ["mou__yicong"] = "义从",
  [":mou__yicong"] = "蓄力技（2/4），每轮开始时，你可以消耗至少一点蓄力点并选择一项：1.令你本轮计算与其他角色的距离-1，" ..
  "并将牌堆中的X张【杀】置于你的武将牌上，称为“扈”；2.令其他角色本轮计算与你的距离+1，并将牌堆中X张【闪】置于你的武将牌上，" ..
  "称为“扈”（X为你以此法消耗的蓄力点数）。你至多拥有四张“扈”且你可将“扈”如手牌般使用或打出。",
  ["#mou__yicong-cost"] = "义从：你可消耗至少一点蓄力点发动“义从”",
  ["mou__yicong_offensive"] = "本轮你至其他角色距离-1",
  ["mou__yicong_defensive"] = "本轮其他角色至你距离+1",
  ["@@mou__yicong_def-round"] = "义从 +1",
  ["@@mou__yicong_off-round"] = "义从 -1",
  ["mou__yicong_hu"] = "扈",

  ["$mou__yicong1"] = "尔等性命，皆在吾甲骑之间。",
  ["$mou__yicong2"] = "围以疲敌，不做无谓之战。",
}

local U = require "packages.utility.utility"

mouYicong:addEffect(fk.RoundStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouYicong.name) and player:getMark("skill_charge") > 0
  end,
  on_cost = function (self, event, target, player, data)
    ---@type string
    local skillName = mouYicong.name
    local room = player.room
    local choices = {}
    for i = 1, player:getMark("skill_charge") do
      table.insert(choices, tostring(i))
    end
    table.insert(choices, "Cancel")
    local num = room:askToChoice(player, { choices = choices, skill_name = skillName, prompt = "#mou__yicong-cost" })
    if num == "Cancel" then
      return false
    end

    local choice = room:askToChoice(
      player,
      {
        choices = { "mou__yicong_offensive", "mou__yicong_defensive", "Cancel" },
        skill_name = skillName
      }
    )
    if choice == "Cancel" then
      return false
    end

    event:setCostData(self, { tonumber(num), choice })
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local costData = event:getCostData(self)
    local num = tonumber(costData[1])
    U.skillCharged(player, -num)

    local isDefensive = costData[2] == "mou__yicong_defensive"
    room:setPlayerMark(
      player,
      isDefensive and "@@mou__yicong_def-round" or "@@mou__yicong_off-round",
      1
    )

    num = math.min(4 - #player:getPile("mou__yicong_hu"), num)
    if num < 1 then
      return false
    end

    local ids = room:getCardsFromPileByRule(isDefensive and "jink" or "slash", num)
    if #ids > 0 then
      player:addToPile("mou__yicong_hu", ids, true, mouYicong.name)
    end
  end,
})

mouYicong:addEffect("distance", {
  correct_func = function(self, from, to)
    if from:getMark("@@mou__yicong_off-round") > 0 then
      return -1
    end
    if to:getMark("@@mou__yicong_def-round") > 0 then
      return 1
    end
  end,
})

mouYicong:addEffect("filter", {
  handly_cards = function (self, player)
    if player:hasSkill(mouYicong.name) then
      return player:getPile("mou__yicong_hu")
    end
  end,
})

mouYicong:addAcquireEffect(function (self, player)
  U.skillCharged(player, 2, 4)
end)

mouYicong:addLoseEffect(function (self, player)
  U.skillCharged(player, -2, -4)
end)

return mouYicong
