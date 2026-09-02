
local zhangwu = fk.CreateSkill({
  name = "mou__zhangwu",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__zhangwu"] = "章武",
  [":mou__zhangwu"] = "锁定技，你或一名因〖仁德〗获得过牌的角色杀死角色后，你摸三张牌。"..
  "一名因〖仁德〗获得过牌的角色死亡后，你的蓄力点上限减半（向上取整）且出【杀】次数和攻击范围+1，"..
  "然后你选择一种颜色，本局游戏你此颜色的手牌只能当【杀】（黑色为雷【杀】，红色为火【杀】）使用或打出。",

  ["#mou__zhangwu-choice"] = "章武：选择一种颜色，本局游戏此颜色牌只能当【杀】使用或打出",
  ["mou__zhangwu_black"] = "黑色手牌视为雷【杀】",
  ["mou__zhangwu_red"] = "红色手牌视为火【杀】",

  ["$mou__zhangwu1"] = "吾兴乃仁义之兵，所彰乃汉室之荣！",
  ["$mou__zhangwu2"] = "汉贼不两立，王业不偏安！",
}

local U = require "packages.utility.utility"

zhangwu:addEffect(fk.Deathed, {
  mute = true,
  can_trigger = function (self, event, target, player, data)
    if player:hasSkill(zhangwu.name) then
      if data.killer and
        (data.killer == player or table.contains(player:getTableMark("mou__rende"), data.killer)) then
        return true
      end
      return table.contains(player:getTableMark("mou__rende"), target)
    end
  end,
  on_use = function (self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(zhangwu.name)
    if data.killer and
      (data.killer == player or table.contains(player:getTableMark("mou__rende"), data.killer)) then
      room:notifySkillInvoked(player, zhangwu.name, "drawcard")
      player:drawCards(3, zhangwu.name)
      if player.dead then return end
    end
    if table.contains(player:getTableMark("mou__rende"), target) then
      room:notifySkillInvoked(player, zhangwu.name, "negative")
      if player:getMark("skill_charge_max") > 0 then
        U.skillCharged(player, 0, -((player:getMark("skill_charge_max") + 1) // 2))
        if player.dead then return end
      end
      room:addPlayerMark(player, MarkEnum.SlashResidue, 1)
      room:addPlayerMark(player, zhangwu.name, 1)
      local choice = room:askToChoice(player, {
        choices = { "mou__zhangwu_black", "mou__zhangwu_red" },
        skill_name = zhangwu.name,
        prompt = "#mou__zhangwu-choice",
        cancelable = false,
      })
      room:setPlayerMark(player, choice, 1)
    end
  end,
})

zhangwu:addEffect("filter", {
  mute = true,
  card_filter = function(self, card, player)
    return player:getMark("mou__zhangwu_"..card:getColorString()) > 0 and
      table.contains(player:getCardIds("h"), card.id)
  end,
  view_as = function(self, player, card)
    if card.color == Card.Red then
      return Fk:cloneCard("fire__slash", card.suit, card.number)
    else
      return Fk:cloneCard("thunder__slash", card.suit, card.number)
    end
  end,
})

zhangwu:addEffect("atkrange", {
  correct_func = function(self, from, to)
    return from:getMark(zhangwu.name)
  end,
})

return zhangwu
