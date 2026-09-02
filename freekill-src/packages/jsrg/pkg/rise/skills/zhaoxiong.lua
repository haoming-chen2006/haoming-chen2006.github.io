local zhaoxiong = fk.CreateSkill {
  name = "zhaoxiong",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["zhaoxiong"] = "昭凶",
  [":zhaoxiong"] = "限定技，准备阶段，若你已受伤且发动过〖挟征〗，你可以变更势力至晋，失去〖谦吞〗，获得〖威肆〗〖荡异〗。",

  ["#zhaoxiong-invoke"] = "昭凶：是否变为晋势力、失去“谦吞”、获得“威肆”和“荡异”？",

  ["$zhaoxiong1"] = "若得灭蜀之功，何不可受禅为帝。",
  ["$zhaoxiong2"] = "已极人臣之贵，当一尝人主之威。",
}

zhaoxiong:addEffect(fk.EventPhaseStart, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhaoxiong.name) and player.phase == Player.Start and
      player:usedSkillTimes(zhaoxiong.name, Player.HistoryGame) == 0 and
      player:isWounded() and player:usedSkillTimes("xiezheng", Player.HistoryGame) > 0
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = zhaoxiong.name,
      prompt = "#zhaoxiong-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    if player.general == "js__simazhao" then
      player.general = "js2__simazhao"
      room:broadcastProperty(player, "general")
    elseif player.deputyGeneral == "js__simazhao" then
      player.deputyGeneral = "js2__simazhao"
      room:broadcastProperty(player, "deputyGeneral")
    end
    if player.kingdom ~= "jin" then
      room:changeKingdom(player, "jin", true)
    end
    if not player.dead then
      room:handleAddLoseSkills(player, "-qiantun|weisi|dangyi")
    end
  end,
})

return zhaoxiong
