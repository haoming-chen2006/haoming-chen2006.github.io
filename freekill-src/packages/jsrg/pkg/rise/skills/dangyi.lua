local dangyi = fk.CreateSkill {
  name = "dangyi",
  tags = { Skill.Lord },
}

Fk:loadTranslationTable{
  ["dangyi"] = "荡异",
  [":dangyi"] = "主公技，当你造成伤害时，你可以令此伤害值+1，本局游戏限X次（X为你获得此技能时已损失体力值+1）。",

  ["@dangyi"] = "荡异",
  ["#dangyi-invoke"] = "荡异：是否令你对 %dest 造成的伤害+1？（还剩%arg次！）",

  ["$dangyi1"] = "哼！斩首示众，以儆效尤。",
  ["$dangyi2"] = "汝等仍存异心，可见心存魏阙。",
}

dangyi:addEffect(fk.DamageCaused, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(dangyi.name) and player:getMark("@dangyi") > 0
  end,
  on_cost = function (self, event, target, player, data)
    local room = player.room
    if room:askToSkillInvoke(player, {
      skill_name = dangyi.name,
      prompt = "#dangyi-invoke::"..data.to.id..":"..player:getMark("@dangyi"),
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    player.room:removePlayerMark(player, "@dangyi", 1)
    data:changeDamage(1)
  end,
})

dangyi:addAcquireEffect(function (self, player, is_start)
  player.room:addPlayerMark(player, "@dangyi", player:getLostHp() + 1)
end)

dangyi:addLoseEffect(function (self, player, is_death)
  player.room:setPlayerMark(player, "@dangyi", 0)
end)

return dangyi
