local caishi = fk.CreateSkill {
  name = "caishi"
}

Fk:loadTranslationTable{
  ["caishi"] = "才识",
  [":caishi"] = "摸牌阶段开始时，你可以选择一项：1.手牌上限+1，本回合你不能对其他角色使用牌；2.回复1点体力，本回合你不能对自己使用牌。",

  ["caishi_maxcards"] = "手牌上限+1，本回合不能对其他角色用牌",
  ["caishi_recover"] = "回复1点体力，本回合不能对自己用牌",

  ["$caishi1"] = "清识难尚，至德可师。",
  ["$caishi2"] = "知书达礼，博古通今。",
}

caishi:addEffect(fk.EventPhaseStart, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(caishi.name) and player.phase == Player.Draw
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local all_choices = {"caishi_maxcards", "caishi_recover", "Cancel"}
    local choices = table.simpleClone(all_choices)
    if not player:isWounded() then
      table.remove(choices, 2)
    end
    local choice = room:askToChoice(player, {
      choices = choices,
      skill_name = caishi.name,
      all_choices = all_choices,
    })
    if choice ~= "Cancel" then
      event:setCostData(self, {choice = choice})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local choice = event:getCostData(self).choice
    room:setPlayerMark(player, choice.."-turn", 1)
    if choice == "caishi_maxcards" then
      room:addPlayerMark(player, MarkEnum.AddMaxCards, 1)
    else
      room:recover{
        who = player,
        num = 1,
        skillName = caishi.name,
      }
    end
  end,
})
caishi:addEffect("prohibit", {
  is_prohibited = function(self, from, to, card)
    if card and from then
      if from:getMark("caishi_maxcards-turn") > 0 and from ~= to then
        return true
      end
      if from:getMark("caishi_recover-turn") > 0 and from == to then
        return true
      end
    end
  end,
})

return caishi
