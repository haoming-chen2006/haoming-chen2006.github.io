local jieming = fk.CreateSkill({
  name = "jieming",
})

Fk:loadTranslationTable{
  ["jieming"] = "节命",
  [":jieming"] = "当你受到1点伤害后，你可令一名角色将手牌补至X张（X为其体力上限且最多为5）。",

  ["#jieming-choose"] = "节命：令一名角色将手牌补至X张（X为其体力上限且最多为5）",

  ["$jieming1"] = "秉忠贞之志，守谦退之节。",
  ["$jieming2"] = "我，永不背弃。",
}

jieming:addEffect(fk.Damaged, {
  anim_type = "masochism",
  trigger_times = function(self, event, target, player, data)
    return data.damage
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = room.alive_players,
      skill_name = jieming.name,
      prompt = "#jieming-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, { tos = to })
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local to = event:getCostData(self).tos[1]
    local num = math.min(to.maxHp, 5) - to:getHandcardNum()
    if num > 0 then
      to:drawCards(num, jieming.name)
    end
  end,
})

jieming:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 0,
      max_num = 1,
      skill_name = jieming.name,
      benefit_func = function (logic, p)
        local num = math.min(p.maxHp, 5) - p:getHandcardNum()
        if num > 0 then
          logic:drawCards(p, num, jieming.name)
        end
      end,
    })
  end,
})

return jieming
