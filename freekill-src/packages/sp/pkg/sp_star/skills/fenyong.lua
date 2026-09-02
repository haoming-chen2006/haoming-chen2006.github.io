local fenyong = fk.CreateSkill {
  name = "fenyong",
}

Fk:loadTranslationTable{
  ["fenyong"] = "愤勇",
  [":fenyong"] = "每当你受到一次伤害后，你可以竖置你的体力牌；当你的体力牌为竖置状态时，防止你受到的所有伤害。",

  ["@@fenyong"] = "体力牌竖置",
  ["#fenyong-invoke"] = "愤勇：你可以竖置你的体力牌！",
}

fenyong:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fenyong.name)
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = fenyong.name,
      prompt = "#fenyong-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@@fenyong", 1)
  end,
})

fenyong:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(fenyong.name) and
      player:getMark("@@fenyong") > 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    data:preventDamage()
  end,
})

return fenyong
