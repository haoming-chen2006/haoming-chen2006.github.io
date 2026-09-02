local daimou = fk.CreateSkill {
  name = "daimou",
}

Fk:loadTranslationTable{
  ["daimou"] = "殆谋",
  [":daimou"] = "每回合各限一次，当一名角色使用【杀】指定其他角色/你为目标时，你可以用牌堆顶的牌<a href='premeditate_href'>“蓄谋”</a>/"..
  "你须弃置你区域里的一张“蓄谋”牌。",

  ["#daimou-invoke"] = "殆谋：是否用牌堆顶牌“蓄谋”？",
  ["#daimou-discard"] = "殆谋：你须弃置一张“蓄谋”牌",
}

local U = require "packages.utility.utility"

daimou:addEffect(fk.TargetSpecifying, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(daimou.name) and data.card.trueName == "slash" and
      data.to ~= player and player:usedEffectTimes(self.name, Player.HistoryTurn) == 0
  end,
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = daimou.name,
      prompt = "#daimou-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    U.premeditate(player, player.room:getNCards(1), daimou.name)
  end,
})

daimou:addEffect(fk.TargetSpecifying, {
  anim_type = "negative",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(daimou.name) and data.card.trueName == "slash" and
      data.to == player and player:usedEffectTimes(self.name, Player.HistoryTurn) == 0 and
      table.find(player:getCardIds("j"), function (id)
        return player:getVirtualEquip(id) and player:getVirtualEquip(id).name == "premeditate"
      end)
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local cards = table.filter(player:getCardIds("j"), function (id)
      return player:getVirtualEquip(id) and player:getVirtualEquip(id).name == "premeditate"
    end)
    if #cards > 1 then
      cards = room:askToCards(player, {
        min_num = 1,
        max_num = 1,
        include_equip = false,
        skill_name = daimou.name,
        pattern = tostring(Exppattern{ id = cards }),
        prompt = "#daimou-discard",
        cancelable = false,
        expand_pile = cards,
      })
    end
    room:throwCard(cards, daimou.name, player, player)
  end,
})

return daimou
