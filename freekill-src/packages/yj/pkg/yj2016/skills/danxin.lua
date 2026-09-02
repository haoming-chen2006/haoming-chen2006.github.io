local danxin = fk.CreateSkill {
  name = "danxin",
}

Fk:loadTranslationTable{
  ["danxin"] = "殚心",
  [":danxin"] = "当你受到伤害后，你可以摸一张牌或修改〖矫诏〗。",

  ["update_jiaozhao"] = "修改矫诏",

  ["$danxin1"] = "司马一族，其心可诛。",
  ["$danxin2"] = "妾身定为我大魏鞠躬尽瘁，死而后已。",
}

danxin:addEffect(fk.Damaged, {
  anim_type = "masochism",
  on_cost = function(self, event, target, player, data)
    local choices = {"draw1", "Cancel"}
    if player:hasSkill("jiaozhao", true) and player:getMark(danxin.name) < 2 then
      table.insert(choices, 2, "update_jiaozhao")
    end
    local choice = player.room:askToChoice(player, {
      choices = choices,
      skill_name = danxin.name,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local choice = event:getCostData(self).choice
    if choice == "draw1" then
      player:drawCards(1, danxin.name)
    else
      player.room:addPlayerMark(player, danxin.name, 1)
    end
  end,
})

return danxin
