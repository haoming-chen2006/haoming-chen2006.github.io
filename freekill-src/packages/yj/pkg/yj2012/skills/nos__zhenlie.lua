local zhenlie = fk.CreateSkill {
  name = "nos__zhenlie",
}

Fk:loadTranslationTable{
  ["nos__zhenlie"] = "贞烈",
  [":nos__zhenlie"] = "当你的判定牌生效前，你可以亮出牌堆顶的一张牌代替之。",

  ["#nos__zhenlie-invoke"] = "贞烈：是否亮出牌堆顶一张牌修改你的“%arg”判定？",

  ["$nos__zhenlie1"] = "我，绝不屈服！",
  ["$nos__zhenlie2"] = "休要小看妇人志气！"
}

zhenlie:addEffect(fk.AskForRetrial, {
  anim_type = "control",
  on_cost = function (self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = zhenlie.name,
      prompt = "#nos__zhenlie-invoke:::"..data.reason,
    })
  end,
  on_use = function(self, event, target, player, data)
    player.room:changeJudge{
      card = Fk:getCardById(player.room:getNCards(1)[1]),
      player = player,
      data = data,
      skillName = zhenlie.name,
      response = false,
    }
  end,
})

return zhenlie
