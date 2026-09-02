local mouduan = fk.CreateSkill {
  name = "mouduan",
  tags = { Skill.Switch },
}

Fk:loadTranslationTable{
  ["mouduan"] = "谋断",
  [":mouduan"] = "转化技，通常状态下，你拥有标记“武”并拥有技能〖激昂〗和〖谦逊〗。当你的手牌数为2张或以下时，你须将你的标记翻面为“文”，"..
  "将该两项技能转化为〖英姿〗和〖克己〗。任一角色的回合开始前，你可弃一张牌将标记翻回。<br>"..
  "<font color=\"grey\">转换技，阳：你拥有〖激昂〗和〖谦逊〗，当你失去手牌后，若你的手牌数不大于2，你发动此技能；"..
  "阴，你拥有〖英姿〗和〖克己〗，一名角色回合开始时，你可以弃置一张牌。",

  ["#mouduan-invoke"] = "谋断：你可以弃置一张牌，转换状态",
}

mouduan:addAcquireEffect(function (self, player, is_start)
  if player:getHandcardNum() > 2 then
    player.room:handleAddLoseSkills(player, "jiang|qianxun|-yingzi|-keji")
  else
    player.room:handleAddLoseSkills(player, "-jiang|-qianxun|yingzi|keji")
  end
end)

mouduan:addLoseEffect(function (self, player, is_death)
  player.room:handleAddLoseSkills(player, "-jiang|-qianxun|-yingzi|-keji")
end)

mouduan:addEffect(fk.AfterCardsMove, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouduan.name) and player:getHandcardNum() < 3 and
      player:getSwitchSkillState(mouduan.name, false) == fk.SwitchYang
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:handleAddLoseSkills(player, "-jiang|-qianxun|yingzi|keji")
  end,
})

mouduan:addEffect(fk.TurnStart, {
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouduan.name) and
      player:getSwitchSkillState(mouduan.name, false) == fk.SwitchYin and
      not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      skill_name = mouduan.name,
      include_equip = true,
      min_num = 1,
      max_num = 1,
      cancelable = true,
      prompt = "#mouduan-invoke",
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:handleAddLoseSkills(player, "jiang|qianxun|-yingzi|-keji")
    room:throwCard(event:getCostData(self).cards, mouduan.name, player, player)
  end,
})

return mouduan
