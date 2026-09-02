local mouKongcheng = fk.CreateSkill({
  name = "mou__kongcheng",
  tags = { Skill.Compulsory },
})

Fk:loadTranslationTable{
  ["mou__kongcheng"] = "空城",
  [":mou__kongcheng"] = "锁定技，当你受到伤害时，若你拥有技能〖观星〗且你的武将牌上："..
  "有“星”，你判定，若结果点数不大于“星”数，则此伤害-1；没有“星”，此伤害+1。",

  ["$mou__kongcheng1"] = "城下千军万马，我亦谈笑自若。",
  ["$mou__kongcheng2"] = "仲达可愿与我城中一叙？",
}

mouKongcheng:addEffect(fk.DamageInflicted, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(mouKongcheng.name) and player:hasSkill("mou__guanxing", true)
  end,
  on_use = function(self, event, target, player, data)
    ---@type string
    local skillName = mouKongcheng.name
    local room = player.room
    player:broadcastSkillInvoke(skillName)
    if #player:getPile("mou__guanxing_star") > 0 then
      room:notifySkillInvoked(player, skillName, "defensive")
      local pattern = ".|1~"..(#player:getPile("mou__guanxing_star") - 1)
      if #player:getPile("mou__guanxing_star") < 2 then
        pattern = "FuckYoka"
      end
      local judge = {
        who = player,
        reason = skillName,
        pattern = pattern,
      }
      room:judge(judge)
      if judge.card.number < #player:getPile("mou__guanxing_star") then
        data:changeDamage(-1)
      end
    else
      room:notifySkillInvoked(player, skillName, "negative")
      data:changeDamage(1)
    end
  end,
})

return mouKongcheng
