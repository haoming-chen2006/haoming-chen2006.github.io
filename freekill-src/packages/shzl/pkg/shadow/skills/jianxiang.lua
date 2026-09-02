local jianxiang = fk.CreateSkill {
  name = "jianxiang",
}

Fk:loadTranslationTable{
  ["jianxiang"] = "荐降",
  [":jianxiang"] = "当你成为其他角色使用牌的目标后，你可以令手牌数最少的一名角色摸一张牌。",

  ["#jianxiang-choose"] = "荐降：你可以令手牌数最少的一名角色摸一张牌",

  ["$jianxiang1"] = "曹公得荆不喜，喜得吾二人足矣。",
  ["$jianxiang2"] = "得遇曹公，吾之幸也。",
}

jianxiang:addEffect(fk.TargetConfirmed, {
  anim_type = "support",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(jianxiang.name) and data.from ~= player
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function(p)
      return table.every(room.alive_players, function(p2)
        return p2:getHandcardNum() >= p:getHandcardNum()
      end)
    end)
    local to = room:askToChoosePlayers(player, {
      min_num = 1,
      max_num = 1,
      targets = targets,
      skill_name = jianxiang.name,
      prompt = "#jianxiang-choose",
      cancelable = true,
    })
    if #to > 0 then
      event:setCostData(self, {tos = to})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    event:getCostData(self).tos[1]:drawCards(1, jianxiang.name)
  end,
})

return jianxiang
